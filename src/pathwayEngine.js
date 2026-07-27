/**
 * pathwayEngine.js
 * -----------------------------------------------------------------------------
 * The reconstructed decision core of Pathway, a low-cost smart-walker retrofit
 * built at the Oxford Venture 2026 Hackathon.
 *
 * The engine models the pipeline described in the pitch deck's technical
 * architecture slide:
 *
 *   phone camera  -> dynamic-object detection  \
 *                                               >-- hazard filtering -> triage
 *   LiDAR room map -> fixed-object detection   /
 *   gyroscope      -> angular-acceleration analysis -> fall detection
 *
 * The hazard filter is a direct port of `isHazard()` from the surviving
 * on-device Python detector (`vision/hazard_detector.py`), so the browser demo
 * and the original YOLO script apply the same admission rule.
 *
 * Every module here is pure: no DOM, no I/O, no timers. That keeps it testable
 * (`npm test`) and lets the same code run in a browser, in Node, or inside a
 * React Native / Swift bridge later on.
 */

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Clamp to the unit interval. */
const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * Normalise a raw sensor reading onto 0..1 using a "quiet" floor and an
 * "unambiguous" ceiling. Below `floor` the signal contributes nothing; at or
 * above `ceiling` it contributes fully.
 */
const ramp = (value, floor, ceiling) => clamp01((value - floor) / (ceiling - floor));

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const round = (value, places = 3) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/* -------------------------------------------------------------------------- */
/* 1. Camera model and frame geometry                                         */
/* -------------------------------------------------------------------------- */

/**
 * Pinhole model for a phone clamped to the crossbar of a standard NHS walking
 * frame, angled down so the near floor is inside the field of view.
 *
 * `focalX` / `focalY` are expressed in *normalised frame widths / heights*
 * rather than pixels, so the model is resolution independent. They differ
 * because the frame is not square. Values are tuned so the reconstructed view
 * approximates the hackathon demo footage; a real deployment would read the
 * intrinsics from AVFoundation instead of hard-coding them.
 */
export const DEFAULT_CAMERA = {
  heightMeters: 0.92, // walker crossbar height
  pitchDegrees: 20, // tilted down toward the floor
  focalX: 0.714, // ~70 deg horizontal field of view
  focalY: 0.952
};

/**
 * Project a world point into normalised frame coordinates.
 *
 * World frame: origin on the floor directly beneath the camera, `x` positive to
 * the user's right, `y` positive up, `z` positive along the direction of travel.
 * Frame coordinates: `(0, 0)` top-left, `(1, 1)` bottom-right, matching the
 * convention OpenCV uses in the original Python detector.
 *
 * @returns {{x: number, y: number, depth: number}} `depth` is the distance along
 *   the optical axis; points with `depth <= 0` are behind the camera.
 */
export function projectPoint({ x, y, z }, camera = DEFAULT_CAMERA) {
  const pitch = toRadians(camera.pitchDegrees);
  const sin = Math.sin(pitch);
  const cos = Math.cos(pitch);

  // Height of the point relative to the optical centre.
  const relativeHeight = y - camera.heightMeters;

  // Rotate the world point into the (downward-pitched) camera frame.
  const depth = -relativeHeight * sin + z * cos;
  const vertical = relativeHeight * cos + z * sin;

  return {
    x: 0.5 + (camera.focalX * x) / depth,
    y: 0.5 - (camera.focalY * vertical) / depth,
    depth
  };
}

/**
 * Project a detection's world-space bounding volume into a 2D frame box.
 *
 * Detections are authored in metres (`position`, `size`) so the demo can walk
 * the user forward and watch objects grow, descend the frame, and cross the
 * hazard band — the same behaviour the on-device detector sees in a real room.
 *
 * @param {object} detection
 * @param {object} [options]
 * @param {number} [options.advanceMeters] metres already travelled toward the scene
 * @param {object} [options.camera]
 * @returns {object} the detection augmented with `box`, `distanceMeters`,
 *   `lateralOffsetMeters` and `onScreen`
 */
export function projectDetection(detection, options = {}) {
  const { advanceMeters = 0, camera = DEFAULT_CAMERA } = options;

  const distanceMeters = detection.position.z - advanceMeters;
  const halfWidth = detection.size.width / 2;
  const base = detection.elevationMeters ?? 0;
  const top = base + detection.size.height;

  const corners = [
    projectPoint({ x: detection.position.x - halfWidth, y: base, z: distanceMeters }, camera),
    projectPoint({ x: detection.position.x + halfWidth, y: base, z: distanceMeters }, camera),
    projectPoint({ x: detection.position.x - halfWidth, y: top, z: distanceMeters }, camera),
    projectPoint({ x: detection.position.x + halfWidth, y: top, z: distanceMeters }, camera)
  ];

  const behindCamera = corners.some((corner) => corner.depth <= 0.05);
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  const box = {
    x1: Math.min(...xs),
    y1: Math.min(...ys),
    x2: Math.max(...xs),
    y2: Math.max(...ys)
  };

  return {
    ...detection,
    box,
    distanceMeters,
    lateralOffsetMeters: detection.position.x,
    onScreen: !behindCamera && box.x2 > 0 && box.x1 < 1 && box.y2 > 0 && box.y1 < 1
  };
}

/* -------------------------------------------------------------------------- */
/* 2. Hazard filtering (ported from the original Python detector)             */
/* -------------------------------------------------------------------------- */

/**
 * COCO classes the original detector refused to treat as trip hazards.
 *
 * Mirrors `EXCLUDED_OBJECT_NAMES` in `vision/hazard_detector.py`. A person is a
 * pedestrian (handled by a separate branch of the architecture), and beds,
 * suitcases and sofas are large furniture the user navigates around rather than
 * trips over.
 */
export const IGNORED_CLASSES = Object.freeze(["person", "bed", "suitcase", "couch"]);

/**
 * Frame-geometry thresholds copied verbatim from the Python `isHazard()`.
 *
 * `nearBandY` — the bottom of the box must fall below 65% of the frame height,
 *   i.e. the object makes contact with the floor close to the walker. With the
 *   default camera that corresponds to roughly 1.6 m ahead.
 * `overheadY` — the top of the box must sit below 15% of the frame height. Tall
 *   objects (walls, doorframes, refrigerators, standing people) break this rule
 *   and are discarded: you walk past them, not over them.
 * `minConfidence` — the detector's own confidence gate.
 */
export const HAZARD_BAND = Object.freeze({
  nearBandY: 0.65,
  overheadY: 0.15,
  minConfidence: 0.5
});

/**
 * How likely each object class is to actually put a walker user on the floor.
 *
 * Weights are a judgement call informed by the pitch-deck interviews ("indoor
 * obstacles are the biggest risk") and NICE falls-prevention guidance, which
 * singles out loose rugs, raised thresholds and trailing cables. They are not
 * derived from a labelled fall dataset — see docs/RECONSTRUCTION_NOTES.md.
 */
export const TRIP_SEVERITY = Object.freeze({
  "rug edge": 0.88,
  "door threshold": 0.82,
  "trailing cable": 0.86,
  "step": 0.9,
  "teddy bear": 0.72,
  backpack: 0.66,
  handbag: 0.64,
  book: 0.58,
  bottle: 0.55,
  bowl: 0.52,
  "sports ball": 0.78,
  "potted plant": 0.5,
  chair: 0.46,
  "dining table": 0.34,
  tv: 0.3
});

const DEFAULT_SEVERITY = 0.45;

/**
 * Direct port of `isHazard()` from the surviving Python detector.
 *
 * Returns the admission decision plus the individual reasons, so the UI can
 * explain *why* something was filtered out instead of showing a bare boolean.
 */
export function classifyDetection(detection, options = {}) {
  const band = { ...HAZARD_BAND, ...(options.band ?? {}) };
  const { box, label, confidence = 1, source = "dynamic" } = detection;

  // Fixed hazards come from the LiDAR room map rather than the COCO detector,
  // so the class allow-list does not apply to them.
  const classAllowed = source === "static" || !IGNORED_CLASSES.includes(label);
  const nearFloor = Math.max(box.y1, box.y2) > band.nearBandY;
  const notOverhead = Math.min(box.y1, box.y2) > band.overheadY;
  const confident = confidence > band.minConfidence;

  const checks = { classAllowed, nearFloor, notOverhead, confident };
  const isHazard = classAllowed && nearFloor && notOverhead && confident;
  const failedChecks = Object.keys(checks).filter((key) => !checks[key]);

  return {
    isHazard,
    checks,
    failedChecks,
    rejectedBy: failedChecks[0] ?? null
  };
}

/** Human-readable explanations for each admission check, used by the demo UI. */
export const CHECK_LABELS = Object.freeze({
  classAllowed: "class is not on the ignore list",
  nearFloor: "sits low enough in frame to be underfoot",
  notOverhead: "top of the box is not up in the overhead band",
  confident: "detector confidence above 0.5"
});

/* -------------------------------------------------------------------------- */
/* 3. Hazard scoring                                                          */
/* -------------------------------------------------------------------------- */

export const HAZARD_WEIGHTS = Object.freeze({
  proximity: 0.36, // how soon the user reaches it
  pathAlignment: 0.26, // how squarely it sits in the walking corridor
  severity: 0.28, // how dangerous the object class is underfoot
  confidence: 0.1 // how sure the detector is
});

/** Objects beyond this are logged to the room map but not scored as imminent. */
const PROXIMITY_HORIZON_METERS = 3;

/** Half the width of the walking corridor a standard frame needs. */
export const CORRIDOR_HALF_WIDTH_METERS = 0.45;

/**
 * Score a frame of detections and rank them into a triage queue.
 *
 * Scene score uses a "dominant hazard plus clutter" model rather than a mean:
 * one severe hazard should not be diluted by a tidy background, but a cluttered
 * floor should still read as worse than a single obstacle.
 *
 * @param {Array<object>} detections detections carrying a normalised `box`
 * @param {object} [options]
 * @returns {{score: number, hazards: Array, tracked: Array, objects: Array, topHazard: object|null}}
 */
export function scoreHazards(detections = [], options = {}) {
  const weights = { ...HAZARD_WEIGHTS, ...(options.weights ?? {}) };

  const assessed = detections.map((detection) => {
    const classification = classifyDetection(detection, options);

    const distance = detection.distanceMeters ?? PROXIMITY_HORIZON_METERS;
    const lateral = Math.abs(detection.lateralOffsetMeters ?? 0);
    const severity = TRIP_SEVERITY[detection.label] ?? DEFAULT_SEVERITY;

    const proximity = ramp(PROXIMITY_HORIZON_METERS - distance, 0, PROXIMITY_HORIZON_METERS);
    const pathAlignment = 1 - clamp01(lateral / CORRIDOR_HALF_WIDTH_METERS);
    const confidence = ramp(detection.confidence ?? 1, HAZARD_BAND.minConfidence, 0.95);

    const risk = classification.isHazard
      ? clamp01(
          proximity * weights.proximity +
            pathAlignment * weights.pathAlignment +
            severity * weights.severity +
            confidence * weights.confidence
        )
      : 0;

    return {
      ...detection,
      ...classification,
      severity,
      risk: round(risk),
      factors: {
        proximity: round(proximity),
        pathAlignment: round(pathAlignment),
        severity: round(severity),
        confidence: round(confidence)
      }
    };
  });

  const hazards = assessed
    .filter((item) => item.isHazard)
    .sort((a, b) => b.risk - a.risk || a.distanceMeters - b.distanceMeters);

  const tracked = assessed.filter((item) => !item.isHazard);

  const dominant = hazards[0]?.risk ?? 0;
  const clutter =
    hazards.length > 1
      ? hazards.slice(1).reduce((total, item) => total + item.risk, 0) / (hazards.length - 1)
      : 0;

  return {
    score: round(clamp01(dominant + (1 - dominant) * clutter * 0.55)),
    hazards,
    tracked,
    objects: assessed,
    topHazard: hazards[0] ?? null
  };
}

/* -------------------------------------------------------------------------- */
/* 4. Fall detection                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Weights for the fall-risk signals. Angular acceleration carries the largest
 * single share because the pitch deck describes Pathway's approach as
 * "angular acceleration driven algorithmic fall detection" — a walker tipping
 * about its front legs produces a rotational signature that ordinary walking,
 * kerb bumps and hand-offs do not.
 */
export const FALL_WEIGHTS = Object.freeze({
  freeFall: 0.14,
  impact: 0.22,
  angularVelocity: 0.16,
  angularAcceleration: 0.28,
  orientation: 0.1,
  inactivity: 0.1
});

const FALL_SIGNAL_RANGES = Object.freeze({
  // A fall begins with the frame unloading: measured g dips well below 1.
  freeFall: { floor: 0.75, ceiling: 0.3, invert: true },
  // Ground contact spike, in g.
  impact: { floor: 1.3, ceiling: 3.2 },
  // Peak gyroscope magnitude, deg/s.
  angularVelocity: { floor: 90, ceiling: 400 },
  // Peak angular acceleration, deg/s^2 — the headline signal.
  angularAcceleration: { floor: 250, ceiling: 1900 },
  // Change in device pitch/roll between before and after the event, degrees.
  orientation: { floor: 15, ceiling: 75 },
  // Seconds of near-zero movement after the event.
  inactivity: { floor: 1.5, ceiling: 6 }
});

const FALL_SIGNAL_LABELS = Object.freeze({
  freeFall: "Free-fall / unloading dip",
  impact: "Impact acceleration spike",
  angularVelocity: "Peak angular velocity",
  angularAcceleration: "Peak angular acceleration",
  orientation: "Orientation change",
  inactivity: "Post-event inactivity"
});

/**
 * Score a motion window from the phone's accelerometer and gyroscope.
 *
 * This is a threshold-and-weight detector, not a learned classifier: the
 * hackathon build had no labelled fall data, and a transparent scorer is easier
 * to tune with clinicians than a black box. Each signal is normalised onto 0..1
 * between a "quiet" floor and an "unambiguous" ceiling, then blended.
 *
 * @param {object} motion
 * @param {number} motion.minAccelerationG lowest measured g during the window
 * @param {number} motion.peakAccelerationG highest measured g during the window
 * @param {number} motion.peakAngularVelocityDps peak gyroscope magnitude, deg/s
 * @param {number} motion.peakAngularAccelerationDps2 peak angular acceleration, deg/s^2
 * @param {number} motion.orientationChangeDeg pitch/roll change across the event
 * @param {number} motion.postEventStillnessSeconds seconds of stillness after impact
 * @returns {{score: number, stage: string, reason: string, signals: Array}}
 */
export function detectFallRisk(motion = {}) {
  const raw = {
    freeFall: motion.minAccelerationG ?? 1,
    impact: motion.peakAccelerationG ?? 1,
    angularVelocity: motion.peakAngularVelocityDps ?? 0,
    angularAcceleration: motion.peakAngularAccelerationDps2 ?? 0,
    orientation: motion.orientationChangeDeg ?? 0,
    inactivity: motion.postEventStillnessSeconds ?? 0
  };

  const signals = Object.entries(FALL_SIGNAL_RANGES).map(([key, range]) => {
    const value = raw[key];
    const normalised = range.invert
      ? clamp01((range.floor - value) / (range.floor - range.ceiling))
      : ramp(value, range.floor, range.ceiling);

    return {
      key,
      label: FALL_SIGNAL_LABELS[key],
      value,
      normalised: round(normalised),
      weight: FALL_WEIGHTS[key],
      contribution: round(normalised * FALL_WEIGHTS[key])
    };
  });

  const score = round(
    clamp01(signals.reduce((total, signal) => total + signal.normalised * signal.weight, 0))
  );

  let stage = "stable";
  let reason = "Gait and frame orientation within normal range.";

  if (score >= 0.8) {
    stage = "fall-confirmed";
    reason = "Free-fall, impact and rotation signature consistent with a fall.";
  } else if (score >= 0.5) {
    stage = "fall-suspected";
    reason = "Fall-like rotation detected — awaiting user confirmation.";
  } else if (score >= 0.22) {
    stage = "instability";
    reason = "Stumble or loss of balance detected, user recovered.";
  }

  return { score, stage, reason, signals };
}

/* -------------------------------------------------------------------------- */
/* 5. D.A.I. navigation guidance                                              */
/* -------------------------------------------------------------------------- */

/** Hazards under this height are stepped over rather than walked around. */
const TRAVERSABLE_HEIGHT_METERS = 0.08;

/**
 * Fuse the dynamic detections and the static room map into a steer instruction.
 *
 * The pitch deck calls this the "D.A.I. approach to indoor navigation" but never
 * expands the acronym; this reconstruction models it as the layer that combines
 * Dynamic detections And the Indoor static map into a single corridor decision.
 * See docs/RECONSTRUCTION_NOTES.md.
 *
 * Low lips — rug edges, door thresholds — are handled differently from standing
 * obstacles. You do not steer a walking frame around a 4 cm sill; you slow down
 * and lift the frame over it, which is what a physiotherapist would advise.
 *
 * @returns {{direction: 'hold'|'left'|'right'|'slow'|'stop', offsetMeters: number,
 *   message: string, stepOver: Array<string>}}
 */
export function planGuidance(hazardResult, options = {}) {
  const halfWidth = options.corridorHalfWidth ?? 0.3; // walker footprint
  const buffer = options.bufferMeters ?? 0.15;
  const searchLimit = options.searchLimitMeters ?? 1.2;
  const horizon = options.guidanceHorizonMeters ?? 2.5;

  const blocking = hazardResult.hazards.filter((hazard) => hazard.distanceMeters <= horizon);
  const traversable = blocking.filter((hazard) => hazard.size.height <= TRAVERSABLE_HEIGHT_METERS);
  const obstructing = blocking.filter((hazard) => hazard.size.height > TRAVERSABLE_HEIGHT_METERS);
  const stepOver = traversable.map((hazard) => hazard.label);

  const withStepOver = (message) =>
    stepOver.length === 0
      ? message
      : `${message} Then lift the frame over the ${stepOver.join(" and ")}.`;

  if (blocking.length === 0) {
    return {
      direction: "hold",
      offsetMeters: 0,
      stepOver,
      message: "Path ahead is clear. Keep going."
    };
  }

  if (obstructing.length === 0) {
    return {
      direction: "slow",
      offsetMeters: 0,
      stepOver,
      message: `Raised ${stepOver.join(" and ")} ahead. Slow down and lift the frame over it.`
    };
  }

  const blocked = obstructing.map((hazard) => {
    const half = hazard.size.width / 2 + buffer;
    return [hazard.lateralOffsetMeters - half, hazard.lateralOffsetMeters + half];
  });

  const fits = (centre) =>
    blocked.every(([low, high]) => centre + halfWidth <= low || centre - halfWidth >= high);

  // Sweep outward from dead-ahead and take the smallest correction that fits.
  for (let offset = 0; offset <= searchLimit + 1e-9; offset += 0.05) {
    for (const candidate of offset === 0 ? [0] : [-offset, offset]) {
      if (!fits(candidate)) continue;

      const rounded = round(candidate, 2);
      if (Math.abs(rounded) < 0.05) {
        return {
          direction: "hold",
          offsetMeters: 0,
          stepOver,
          message: withStepOver("Path ahead is clear.")
        };
      }

      const side = rounded < 0 ? "left" : "right";
      return {
        direction: side,
        offsetMeters: rounded,
        stepOver,
        message: withStepOver(
          `Move ${side} about ${Math.abs(rounded).toFixed(2)} m to clear the ${obstructing[0].label}.`
        )
      };
    }
  }

  return {
    direction: "stop",
    offsetMeters: 0,
    stepOver,
    message: `No clear route around the ${obstructing[0].label}. Stop and ask for help.`
  };
}

/* -------------------------------------------------------------------------- */
/* 6. Event triage and the closed-loop escalation ladder                      */
/* -------------------------------------------------------------------------- */

export const TRIAGE_THRESHOLDS = Object.freeze({
  criticalFallRisk: 0.8,
  highCombined: 0.6,
  highFallRisk: 0.5,
  highHazard: 0.7,
  watchCombined: 0.3
});

/** Confidence blend: motion evidence outweighs scene evidence. */
const TRIAGE_BLEND = Object.freeze({ fall: 0.62, hazard: 0.38 });

/**
 * Build the escalation ladder for an event.
 *
 * The action set mirrors the pitch deck's "event driven" slide — record the
 * event, then text messages, phone calls and hazard triaging — plus the
 * bystander-attraction measures (torch strobe, audio alert) from the technical
 * architecture slide.
 */
function buildActions(level, event) {
  const carer = event.caregiver?.name ?? "the primary caregiver";
  const location = event.location ?? "the home";

  const record = {
    id: "record",
    channel: "device",
    label: "Record event",
    detail: `Timestamped clip, sensor window and room tag (${location}) written to the local event log.`,
    delaySeconds: 0
  };

  if (level === "critical") {
    return [
      record,
      {
        id: "confirm",
        channel: "device",
        label: "On-screen HELP prompt",
        detail: 'Full-screen prompt with a "Crisis averted" cancel button and spoken confirmation.',
        delaySeconds: 0
      },
      {
        id: "strobe",
        channel: "device",
        label: "Torch strobe and audio alert",
        detail: "Attracts nearby bystanders while the countdown runs.",
        delaySeconds: 2
      },
      {
        id: "sms",
        channel: "sms",
        label: `Text ${carer}`,
        detail: `"Pathway detected a possible fall in the ${location}." Sent with a live location pin.`,
        delaySeconds: 15
      },
      {
        id: "call",
        channel: "call",
        label: `Call ${carer}`,
        detail: "Placed automatically if the text is not acknowledged.",
        delaySeconds: 45
      }
    ];
  }

  if (level === "high") {
    return [
      record,
      {
        id: "guidance",
        channel: "device",
        label: "Guide the user around it",
        detail: "Directional arrow plus familiar-voice audio prompt on the mounted phone.",
        delaySeconds: 0
      },
      {
        id: "map",
        channel: "device",
        label: "Pin to the room hazard map",
        detail: "Persists the hazard so it is flagged on every future pass.",
        delaySeconds: 0
      },
      {
        id: "digest",
        channel: "sms",
        label: `Notify ${carer}`,
        detail: "Non-urgent message summarising the hazard and where it was found.",
        delaySeconds: 60
      }
    ];
  }

  if (level === "watch") {
    return [
      record,
      {
        id: "guidance",
        channel: "device",
        label: "Guide the user around it",
        detail: "Directional arrow plus familiar-voice audio prompt on the mounted phone.",
        delaySeconds: 0
      },
      {
        id: "map",
        channel: "device",
        label: "Pin to the room hazard map",
        detail: "Added to the weekly caregiver digest rather than alerting immediately.",
        delaySeconds: 0
      }
    ];
  }

  return [
    {
      ...record,
      label: "Log passively",
      detail: `Nothing to escalate in the ${location}. The room map is refreshed and monitoring continues.`
    }
  ];
}

/**
 * Combine motion risk and scene risk into a single prioritised response.
 *
 * @param {object} event the event under assessment
 * @param {object} fallRisk output of {@link detectFallRisk}
 * @param {object} hazards output of {@link scoreHazards}
 * @returns {{level: string, confidence: number, message: string, actions: Array, hazardQueue: Array}}
 */
export function triageEvent(event, fallRisk, hazards) {
  const combined = round(
    clamp01(fallRisk.score * TRIAGE_BLEND.fall + hazards.score * TRIAGE_BLEND.hazard)
  );
  const location = event.location ?? "the home";
  const carer = event.caregiver?.name ?? "the primary caregiver";

  let level = "stable";
  let message = `No urgent event in the ${location}. Passive monitoring continues.`;

  if (fallRisk.score >= TRIAGE_THRESHOLDS.criticalFallRisk) {
    level = "critical";
    message =
      `Possible fall in the ${location}. Confirming with the user, then texting and ` +
      `calling ${carer}.`;
  } else if (
    combined >= TRIAGE_THRESHOLDS.highCombined ||
    fallRisk.score >= TRIAGE_THRESHOLDS.highFallRisk ||
    hazards.score >= TRIAGE_THRESHOLDS.highHazard
  ) {
    level = "high";
    const topHazard = hazards.topHazard?.label ?? "obstacle";
    message =
      `High-risk ${topHazard} in the ${location}. Guiding the user around it and ` +
      `flagging it for ${carer}.`;
  } else if (combined >= TRIAGE_THRESHOLDS.watchCombined) {
    level = "watch";
    const topHazard = hazards.topHazard?.label ?? "obstacle";
    message = `Trip hazard (${topHazard}) logged in the ${location}. User prompted, caregiver digest updated.`;
  }

  return {
    level,
    confidence: combined,
    message,
    actions: buildActions(level, event),
    hazardQueue: hazards.hazards.map((hazard, index) => ({
      rank: index + 1,
      label: hazard.label,
      risk: hazard.risk,
      distanceMeters: round(hazard.distanceMeters, 2),
      source: hazard.source ?? "dynamic"
    }))
  };
}

/* -------------------------------------------------------------------------- */
/* 7. End-to-end pipeline                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Run one full pass of the Pathway loop over a sample event.
 *
 * This is the function the demo UI and the tests both call, so what you see in
 * the browser is exactly what is asserted in `npm test`.
 *
 * @param {object} event a scenario from `data/sampleEvents.js`
 * @param {object} [options]
 * @param {number} [options.advanceMeters] extra metres walked toward the scene
 * @returns {{event, frame, fallRisk, hazards, guidance, triage}}
 */
export function runPathway(event, options = {}) {
  const camera = options.camera ?? event.camera ?? DEFAULT_CAMERA;
  const advanceMeters = options.advanceMeters ?? event.advanceMeters ?? 0;

  const projected = event.detections
    .map((detection) => projectDetection(detection, { advanceMeters, camera }))
    .filter((detection) => detection.onScreen);

  const fallRisk = detectFallRisk(event.motion);
  const hazards = scoreHazards(projected, options);
  const guidance = planGuidance(hazards, options);
  const triage = triageEvent(event, fallRisk, hazards);

  return {
    event,
    frame: { camera, advanceMeters, detections: projected },
    fallRisk,
    hazards,
    guidance,
    triage
  };
}
