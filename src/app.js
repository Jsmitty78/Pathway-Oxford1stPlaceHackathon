/**
 * app.js
 * -----------------------------------------------------------------------------
 * Demo controller for the Pathway prototype.
 *
 * Responsibilities:
 *   1. Render a reconstruction of the walker-mounted camera view onto a canvas,
 *      using the same pinhole model the engine scores against, so every overlay
 *      box is exactly the box `classifyDetection()` made its decision on.
 *   2. Walk through the six stages of the pitch-deck demo flow.
 *   3. Drive the closed-loop response: the on-device HELP prompt, the escalation
 *      ladder, and the mock caregiver dashboard.
 *
 * No framework, no build step, no dependencies. Open index.html and it runs.
 */

import { sampleEvents } from "../data/sampleEvents.js";
import {
  CHECK_LABELS,
  CORRIDOR_HALF_WIDTH_METERS,
  DEFAULT_CAMERA,
  HAZARD_BAND,
  projectPoint,
  runPathway
} from "./pathwayEngine.js";

/* -------------------------------------------------------------------------- */
/* Presentation constants                                                     */
/* -------------------------------------------------------------------------- */

/** Colours copied from the original Python detector (converted from BGR). */
const DETECTOR_COLOURS = {
  tracked: "rgb(0, 255, 0)", // OBJECT_COLOUR  (0, 255, 0)
  hazard: "rgb(200, 50, 0)", // HAZARD_COLOUR  (0, 50, 200) in BGR
  map: "rgba(150, 220, 255, 0.95)"
};

const STAGES = [
  {
    id: "dynamic",
    title: "Dynamic object detection",
    copy:
      "The phone camera runs an on-device detector over every frame and boxes what it recognises — the same green boxes the original Python script drew. At this point nothing has been judged: a sofa and a soft toy are equally just objects."
  },
  {
    id: "static",
    title: "Static environment mapping",
    copy:
      "Room geometry that persists between passes is held in a LiDAR-derived map: furniture that never moves, plus fixed hazards like a raised threshold or a curled rug lip that no COCO class covers. The map is what lets Pathway remember a room instead of rediscovering it."
  },
  {
    id: "hazard",
    title: "Hazardous object detection",
    copy:
      "The admission rule ported from the original detector: the object must sit low enough in frame to be underfoot, must not reach into the overhead band, must clear the confidence gate, and must not be on the ignore list. Only survivors get the thick red box."
  },
  {
    id: "navigation",
    title: "D.A.I. indoor navigation",
    copy:
      "Dynamic detections and the indoor static map are fused into one corridor decision. Pathway sweeps outward from dead-ahead for the smallest correction that fits the walker footprint — and separates standing obstacles you route around from low lips you lift the frame over."
  },
  {
    id: "fall",
    title: "Fall detection",
    copy:
      "Independently of the camera, the gyroscope and accelerometer are scored on six signals. Angular acceleration carries the most weight: a frame tipping about its front legs rotates in a way that ordinary walking, kerb bumps and hand-offs do not."
  },
  {
    id: "event",
    title: "Event-driven response",
    copy:
      "Every event closes the loop. It is recorded, triaged into the hazard queue, and escalated only as far as it deserves — an on-screen prompt with a way out, then a text with a location pin, then a phone call if nobody answers."
  }
];

/**
 * Per-scenario scene dressing. Presentation only — never feeds the scoring.
 * `room` dimensions are in metres and are projected through the same camera as
 * the detections, so the walls sit in correct perspective around the objects.
 */
const SCENES = {
  "living-room-trip-hazard": {
    wall: ["#243343", "#16212c"],
    floor: ["#8a6a52", "#3d2e24"],
    skirting: "#2f3d4b",
    room: { back: 6.6, halfWidth: 2.6, height: 2.4 },
    rug: { x: -0.15, z: 3.2, width: 3.2, depth: 3.4, colour: "#9c6b52" }
  },
  "hallway-possible-fall": {
    wall: ["#36434f", "#1c252e"],
    floor: ["#75634f", "#362c23"],
    skirting: "#414f5d",
    room: { back: 7.5, halfWidth: 1.15, height: 2.3 },
    rug: null,
    door: { z: 1.1, halfWidth: 0.5, height: 2.05 }
  },
  "kitchen-clear-path": {
    wall: ["#33414f", "#1d2833"],
    floor: ["#6a747e", "#2e363d"],
    skirting: "#3c4a57",
    room: { back: 5.8, halfWidth: 2.1, height: 2.4 },
    rug: null
  }
};

const OBJECT_COLOURS = {
  couch: "#2f3b4a",
  chair: "#3a4757",
  "dining table": "#4a3a2c",
  refrigerator: "#414d59",
  "potted plant": "#2f4a35",
  "teddy bear": "#96703c",
  backpack: "#3f4a5c",
  cup: "#d8d3c8",
  person: "#37506b",
  "rug edge": "#8d5b41",
  "door threshold": "#6b5a44"
};

/** Demo timing. The real escalation delays live in the engine, not here. */
const DEMO_SPEED = 4;
const STAGE_DURATION_MS = 3400;

/* -------------------------------------------------------------------------- */
/* DOM                                                                        */
/* -------------------------------------------------------------------------- */

const $ = (selector) => document.querySelector(selector);

const dom = {
  scenarioList: $("#scenario-list"),
  stageList: $("#stage-list"),
  stageTitle: $("#stage-title"),
  stageCopy: $("#stage-copy"),
  canvas: $("#camera"),
  phonePill: $("#phone-pill"),
  phoneBanner: $("#phone-banner"),
  phoneBannerTitle: $("#phone-banner-title"),
  phoneBannerBody: $("#phone-banner-body"),
  railAlert: $("#rail-alert"),
  helpScreen: $("#help-screen"),
  helpBody: $("#help-body"),
  helpCancel: $("#help-cancel"),
  helpNow: $("#help-now"),
  slider: $("#advance-slider"),
  sliderReadout: $("#advance-readout"),
  fallBar: $("#fall-bar"),
  fallScore: $("#fall-score"),
  fallStage: $("#fall-stage"),
  hazardBar: $("#hazard-bar"),
  hazardScore: $("#hazard-score"),
  hazardNote: $("#hazard-note"),
  confidenceBar: $("#confidence-bar"),
  confidenceScore: $("#confidence-score"),
  triagePanel: $("#triage-panel"),
  triageLevel: $("#triage-level"),
  triageMessage: $("#triage-message"),
  triageGuidance: $("#triage-guidance"),
  hazardQueue: $("#hazard-queue"),
  filterList: $("#filter-list"),
  signalList: $("#signal-list"),
  actionList: $("#action-list"),
  dashboardLog: $("#dashboard-log"),
  playButton: $("#play-demo"),
  playLabel: $("#play-label"),
  resetButton: $("#reset-demo")
};

const ctx = dom.canvas.getContext("2d");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

const state = {
  eventId: sampleEvents[0].id,
  stageId: STAGES[0].id,
  advanceMeters: sampleEvents[0].advanceMeters,
  playing: false,
  helpVisible: false,
  onHelpExpire: null,
  result: null
};

const timers = new Set();

function later(fn, delay) {
  const id = window.setTimeout(() => {
    timers.delete(id);
    fn();
  }, delay);
  timers.add(id);
  return id;
}

function clearTimers() {
  for (const id of timers) window.clearTimeout(id);
  timers.clear();
}

const currentEvent = () => sampleEvents.find((event) => event.id === state.eventId);

/** Keep the nearest object at a sane distance so the projection stays stable. */
function maxAdvanceFor(event) {
  const nearest = Math.min(...event.detections.map((detection) => detection.position.z));
  return Math.max(0, nearest - 0.7);
}

/* -------------------------------------------------------------------------- */
/* Canvas rendering                                                           */
/* -------------------------------------------------------------------------- */

const W = () => dom.canvas.width;
const H = () => dom.canvas.height;

const toCanvas = (point) => ({ x: point.x * W(), y: point.y * H() });

const project = (x, y, z) => toCanvas(projectPoint({ x, y, z }, DEFAULT_CAMERA));

/** Fill a polygon given world-space points. */
function fillQuad(points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach((point, index) =>
    index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)
  );
  ctx.closePath();
  ctx.fill();
}

function drawRoom(scene) {
  const width = W();
  const height = H();
  const advance = state.advanceMeters;
  const { back, halfWidth, height: wallHeight } = scene.room;

  // The room recedes as the user walks into it, but never collapses.
  const backZ = Math.max(2.2, back - advance);

  // A plane at constant z projects to a horizontal line, so the base of the
  // back wall is a single row of the frame.
  const wallBase = project(0, 0, backZ).y;

  const wall = ctx.createLinearGradient(0, 0, 0, wallBase);
  wall.addColorStop(0, scene.wall[1]);
  wall.addColorStop(1, scene.wall[0]);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, width, Math.max(0, wallBase) + 1);

  const floor = ctx.createLinearGradient(0, wallBase, 0, height);
  floor.addColorStop(0, scene.floor[1]);
  floor.addColorStop(1, scene.floor[0]);
  ctx.fillStyle = floor;
  ctx.fillRect(0, wallBase, width, height - wallBase);

  // Side walls, drawn as receding quads so the room reads as a box.
  for (const side of [-1, 1]) {
    const x = side * halfWidth;
    fillQuad(
      [
        project(x, wallHeight, 0.35),
        project(x, wallHeight, backZ),
        project(x, 0, backZ),
        project(x, 0, 0.35)
      ],
      side < 0 ? shade(scene.wall[0], 0.78) : shade(scene.wall[0], 1.1)
    );
  }

  // Skirting board along the back wall.
  ctx.fillStyle = scene.skirting;
  ctx.fillRect(0, wallBase - 7, width, 8);

  if (scene.door) {
    const { z, halfWidth: dw, height: dh } = scene.door;
    const doorZ = z - advance;
    if (doorZ > 0.4) {
      for (const side of [-1, 1]) {
        fillQuad(
          [
            project(side * halfWidth, dh, doorZ),
            project(side * (halfWidth - 0.12), dh, doorZ),
            project(side * (halfWidth - 0.12), 0, doorZ),
            project(side * halfWidth, 0, doorZ)
          ],
          "rgba(255, 255, 255, 0.06)"
        );
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 2;
      const jambL = project(-dw, 0, doorZ);
      const jambR = project(dw, 0, doorZ);
      const headL = project(-dw, dh, doorZ);
      const headR = project(dw, dh, doorZ);
      ctx.beginPath();
      ctx.moveTo(jambL.x, jambL.y);
      ctx.lineTo(headL.x, headL.y);
      ctx.lineTo(headR.x, headR.y);
      ctx.lineTo(jambR.x, jambR.y);
      ctx.stroke();
    }
  }

  if (scene.rug) {
    const { x, z, width: rw, depth, colour } = scene.rug;
    fillQuad(
      [
        project(x - rw / 2, 0, z - depth / 2 - advance),
        project(x + rw / 2, 0, z - depth / 2 - advance),
        project(x + rw / 2, 0, z + depth / 2 - advance),
        project(x - rw / 2, 0, z + depth / 2 - advance)
      ],
      colour
    );
  }

  // Perspective floor grid, 0.5 m spacing — the reference the camera model uses.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
  ctx.lineWidth = 1;
  for (let z = 0.5; z <= backZ; z += 0.5) {
    const left = project(-halfWidth, 0, z);
    const right = project(halfWidth, 0, z);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }
  for (let x = -halfWidth; x <= halfWidth + 1e-9; x += 0.5) {
    const near = project(x, 0, 0.35);
    const far = project(x, 0, backZ);
    ctx.beginPath();
    ctx.moveTo(near.x, near.y);
    ctx.lineTo(far.x, far.y);
    ctx.stroke();
  }
}

/**
 * Draw a detection as a solid block. The front face sits at exactly the plane
 * the engine projected, so the overlay box always hugs the object.
 */
function drawObject(detection) {
  const z = detection.distanceMeters;
  if (z <= 0.3) return;

  const halfWidth = detection.size.width / 2;
  const depth = detection.size.depth ?? detection.size.width * 0.7;
  const base = detection.elevationMeters ?? 0;
  const top = base + detection.size.height;
  const x = detection.position.x;

  const front = [
    project(x - halfWidth, top, z),
    project(x + halfWidth, top, z),
    project(x + halfWidth, base, z),
    project(x - halfWidth, base, z)
  ];
  const back = [
    project(x - halfWidth, top, z + depth),
    project(x + halfWidth, top, z + depth),
    project(x + halfWidth, base, z + depth),
    project(x - halfWidth, base, z + depth)
  ];

  const colour = OBJECT_COLOURS[detection.label] ?? "#39434f";

  // Contact shadow first, so the object sits on top of it.
  const shadow = project(x, base, z + depth / 2);
  const shadowWidth = Math.abs(front[1].x - front[0].x) * 0.8;
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(shadow.x, shadow.y, shadowWidth, shadowWidth * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top face, then the visible side, then the front face.
  fillQuad([back[0], back[1], front[1], front[0]], shade(colour, 1.3));
  fillQuad(
    x > 0 ? [back[0], front[0], front[3], back[3]] : [back[1], front[1], front[2], back[2]],
    shade(colour, 0.72)
  );
  fillQuad(front, colour);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  front.forEach((point, index) =>
    index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)
  );
  ctx.closePath();
  ctx.stroke();
}

function shade(hex, factor) {
  const value = parseInt(hex.slice(1), 16);
  const clamp = (channel) => Math.min(255, Math.round(channel * factor));
  const r = clamp((value >> 16) & 255);
  const g = clamp((value >> 8) & 255);
  const b = clamp(value & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function strokeBox(box, colour, lineWidth) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(box.x1 * W(), box.y1 * H(), (box.x2 - box.x1) * W(), (box.y2 - box.y1) * H());
}

function drawLabel(box, text, colour) {
  ctx.font = "600 15px ui-monospace, SFMono-Regular, Menlo, monospace";
  const metrics = ctx.measureText(text);
  // Clamp so labels on boxes that start off-screen stay readable.
  const x = Math.min(Math.max(box.x1 * W(), 8), W() - metrics.width - 10);
  const y = Math.max(20, box.y1 * H() - 6);
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(x - 3, y - 15, metrics.width + 8, 19);
  ctx.fillStyle = colour;
  ctx.fillText(text, x + 1, y);
}

function dimFrame(alpha = 0.5) {
  ctx.fillStyle = `rgba(6, 10, 14, ${alpha})`;
  ctx.fillRect(0, 0, W(), H());
}

/** The 65% line the ported admission rule tests against. */
function drawHazardBand() {
  const y = HAZARD_BAND.nearBandY * H();
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = "rgba(255, 184, 77, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W(), y);
  ctx.stroke();
  ctx.restore();

  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "rgba(255, 184, 77, 0.95)";
  ctx.textAlign = "right";
  ctx.fillText("hazard band · y > 0.65", W() - 14, y - 8);
  ctx.textAlign = "left";
}

function drawCorridor(guidance) {
  const offset = guidance.offsetMeters;
  const half = CORRIDOR_HALF_WIDTH_METERS;
  const blocked = guidance.direction === "stop";

  const quad = [
    project(offset - half, 0, 0.62),
    project(offset + half, 0, 0.62),
    project(offset + half, 0, 3.2),
    project(offset - half, 0, 3.2)
  ];

  ctx.fillStyle = blocked ? "rgba(255, 93, 93, 0.18)" : "rgba(61, 220, 151, 0.16)";
  ctx.strokeStyle = blocked ? "rgba(255, 93, 93, 0.85)" : "rgba(61, 220, 151, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  quad.forEach((point, index) =>
    index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Steer arrow.
  const arrowY = H() * 0.86;
  const arrowX = W() / 2 + offset * W() * 0.22;
  ctx.save();
  ctx.translate(arrowX, arrowY);
  ctx.fillStyle = blocked ? "rgba(255, 93, 93, 0.95)" : "rgba(61, 220, 151, 0.95)";
  ctx.beginPath();
  if (guidance.direction === "left" || guidance.direction === "right") {
    const sign = guidance.direction === "left" ? -1 : 1;
    ctx.moveTo(sign * 34, 0);
    ctx.lineTo(sign * 6, -20);
    ctx.lineTo(sign * 6, -8);
    ctx.lineTo(-sign * 30, -8);
    ctx.lineTo(-sign * 30, 8);
    ctx.lineTo(sign * 6, 8);
    ctx.lineTo(sign * 6, 20);
  } else {
    ctx.moveTo(0, -24);
    ctx.lineTo(20, 4);
    ctx.lineTo(8, 4);
    ctx.lineTo(8, 22);
    ctx.lineTo(-8, 22);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-20, 4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Illustrative gyroscope trace synthesised from the scenario's motion window. */
function drawMotionTrace(fallRisk) {
  const panelHeight = H() * 0.3;
  const top = H() - panelHeight - 16;
  ctx.fillStyle = "rgba(8, 13, 18, 0.86)";
  ctx.fillRect(16, top, W() - 32, panelHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.strokeRect(16, top, W() - 32, panelHeight);

  const peak = fallRisk.signals.find((signal) => signal.key === "angularAcceleration");
  const amplitude = peak.normalised;
  const midline = top + panelHeight * 0.6;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.moveTo(24, midline);
  ctx.lineTo(W() - 24, midline);
  ctx.stroke();

  ctx.strokeStyle = amplitude > 0.7 ? "rgb(255, 93, 93)" : "rgb(61, 220, 151)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const left = 24;
  const right = W() - 24;
  for (let px = left; px <= right; px += 2) {
    const t = (px - left) / (right - left);
    // Quiet gait, then an impulse, then a decaying oscillation.
    const gait = Math.sin(t * 22) * 0.05;
    const impulse = Math.exp(-((t - 0.45) ** 2) / 0.0016) * amplitude;
    const ring = Math.exp(-Math.max(0, t - 0.5) * 9) * Math.sin((t - 0.5) * 60) * amplitude * 0.35;
    const y = midline - (gait + impulse + (t > 0.5 ? ring : 0)) * panelHeight * 0.5;
    px === left ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
  }
  ctx.stroke();

  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "rgba(230, 237, 243, 0.85)";
  ctx.fillText("angular acceleration (deg/s²)", 26, top + 20);
  ctx.fillStyle = amplitude > 0.7 ? "rgb(255, 93, 93)" : "rgb(61, 220, 151)";
  ctx.fillText(`peak ${Math.round(peak.value)}`, W() - 120, top + 20);
}

function render() {
  const event = currentEvent();
  const result = state.result;
  const scene = SCENES[event.id];

  ctx.clearRect(0, 0, W(), H());
  drawRoom(scene);

  const ordered = [...result.frame.detections].sort(
    (a, b) => b.distanceMeters - a.distanceMeters
  );
  ordered.forEach(drawObject);

  const stage = state.stageId;

  if (stage === "dynamic") {
    for (const detection of ordered) {
      if (detection.source !== "dynamic") continue;
      strokeBox(detection.box, DETECTOR_COLOURS.tracked, 2);
      drawLabel(
        detection.box,
        `${detection.label} ${detection.confidence.toFixed(2)}`,
        DETECTOR_COLOURS.tracked
      );
    }
  }

  if (stage === "static") {
    for (const detection of ordered) {
      if (!detection.persistent) continue;
      ctx.save();
      ctx.setLineDash([6, 4]);
      strokeBox(detection.box, DETECTOR_COLOURS.map, 1.5);
      ctx.restore();
      drawLabel(detection.box, `map · ${detection.label}`, DETECTOR_COLOURS.map);
    }
    const mapped = ordered.filter((detection) => detection.persistent).length;
    ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "rgba(150, 220, 255, 0.9)";
    ctx.fillText(`room map · ${event.location} · ${mapped} fixed features`, 16, H() - 16);
  }

  if (stage === "hazard" || stage === "navigation") {
    dimFrame(0.22);
    drawHazardBand();

    // The corridor goes down first so the hazard boxes stay legible on top.
    if (stage === "navigation") drawCorridor(result.guidance);

    for (const detection of result.hazards.hazards) {
      strokeBox(detection.box, DETECTOR_COLOURS.hazard, 6);
      drawLabel(
        detection.box,
        `${detection.label} · risk ${(detection.risk * 100).toFixed(0)}%`,
        "rgb(255, 150, 120)"
      );
    }
  }

  if (stage === "fall" || stage === "event") {
    dimFrame(0.55);
    drawMotionTrace(result.fallRisk);
  }
}

/* -------------------------------------------------------------------------- */
/* Readout rendering                                                          */
/* -------------------------------------------------------------------------- */

const percent = (value) => `${Math.round(value * 100)}%`;

function renderScenarioPicker() {
  dom.scenarioList.innerHTML = "";
  for (const event of sampleEvents) {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "radio";
    button.className = "segment";
    button.setAttribute("aria-checked", String(event.id === state.eventId));
    button.innerHTML = `<span>${event.shortLabel}</span><small>${event.location}</small>`;
    button.addEventListener("click", () => selectScenario(event.id));
    dom.scenarioList.appendChild(button);
  }
}

function renderStageList() {
  dom.stageList.innerHTML = "";
  STAGES.forEach((stage, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stageButton";
    button.setAttribute("aria-current", String(stage.id === state.stageId));
    button.innerHTML = `<span class="stageIndex">${index + 1}</span><span>${stage.title}</span>`;
    button.addEventListener("click", () => selectStage(stage.id));
    item.appendChild(button);
    dom.stageList.appendChild(item);
  });

  const stage = STAGES.find((item) => item.id === state.stageId);
  dom.stageTitle.textContent = stage.title;
  dom.stageCopy.textContent = stage.copy;
}

function renderMeters(result) {
  dom.fallBar.style.width = percent(result.fallRisk.score);
  dom.fallBar.dataset.stage = result.fallRisk.stage;
  dom.fallScore.textContent = percent(result.fallRisk.score);
  dom.fallStage.textContent = `${result.fallRisk.stage.replace("-", " ")} — ${result.fallRisk.reason}`;

  dom.hazardBar.style.width = percent(result.hazards.score);
  dom.hazardScore.textContent = percent(result.hazards.score);
  const flagged = result.hazards.hazards.length;
  const tracked = result.hazards.tracked.length;
  dom.hazardNote.textContent =
    flagged === 0
      ? `No hazards admitted. ${tracked} object${tracked === 1 ? "" : "s"} tracked and mapped.`
      : `${flagged} hazard${flagged === 1 ? "" : "s"} admitted, ${tracked} object${
          tracked === 1 ? "" : "s"
        } filtered out.`;

  dom.confidenceBar.style.width = percent(result.triage.confidence);
  dom.confidenceScore.textContent = percent(result.triage.confidence);
}

function renderTriage(result) {
  const { level, message } = result.triage;
  dom.triageLevel.textContent = level;
  dom.triageLevel.className = `badge badge--${level}`;
  dom.triagePanel.dataset.level = level;
  dom.triageMessage.textContent = message;
  dom.triageGuidance.textContent = `Guidance: ${result.guidance.message}`;
}

function renderHazardQueue(result) {
  dom.hazardQueue.innerHTML = "";
  if (result.triage.hazardQueue.length === 0) {
    const empty = document.createElement("li");
    empty.className = "queueEmpty";
    empty.textContent = "Nothing admitted. The path ahead is clear.";
    dom.hazardQueue.appendChild(empty);
    return;
  }

  for (const hazard of result.triage.hazardQueue) {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="queueRank">${hazard.rank}</span>
      <span class="queueBody">
        <strong>${hazard.label}</strong>
        <small>${hazard.distanceMeters.toFixed(2)} m ahead · ${hazard.source} detection</small>
      </span>
      <span class="queueRisk">${percent(hazard.risk)}</span>`;
    dom.hazardQueue.appendChild(item);
  }
}

function renderFilterList(result) {
  dom.filterList.innerHTML = "";
  for (const item of result.hazards.tracked) {
    const reasons = item.failedChecks
      .map((check) => `did not pass: ${CHECK_LABELS[check]}`)
      .join("; ");
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.label}</strong> <small>${item.distanceMeters.toFixed(
      2
    )} m</small><span>${reasons}</span>`;
    dom.filterList.appendChild(li);
  }
  if (result.hazards.tracked.length === 0) {
    dom.filterList.innerHTML = "<li><span>Every detection in view was admitted.</span></li>";
  }
}

function renderSignals(result) {
  dom.signalList.innerHTML = "";
  const ranked = [...result.fallRisk.signals].sort((a, b) => b.contribution - a.contribution);
  for (const signal of ranked) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="signalLabel">${signal.label}</span>
      <span class="signalTrack"><span style="width:${percent(signal.normalised)}"></span></span>
      <span class="signalValue">${percent(signal.contribution)}<small> of ${percent(
        signal.weight
      )}</small></span>`;
    dom.signalList.appendChild(li);
  }
}

function renderActions(result) {
  dom.actionList.innerHTML = "";
  for (const action of result.triage.actions) {
    const li = document.createElement("li");
    li.className = `action action--${action.channel}`;
    li.innerHTML = `
      <span class="actionChannel">${action.channel}</span>
      <span class="actionBody">
        <strong>${action.label}</strong>
        <small>${action.detail}</small>
      </span>
      <span class="actionDelay">${action.delaySeconds === 0 ? "now" : `+${action.delaySeconds}s`}</span>`;
    dom.actionList.appendChild(li);
  }
}

function renderPhoneChrome(result) {
  const { level } = result.triage;
  dom.phonePill.textContent = level === "stable" ? "Pathway" : result.event.location;
  dom.railAlert.dataset.level = level;

  if (state.stageId === "navigation" || state.stageId === "hazard") {
    dom.phoneBanner.hidden = false;
    dom.phoneBanner.dataset.level = level;
    dom.phoneBannerTitle.textContent =
      result.hazards.topHazard?.label.toUpperCase() ?? "PATH CLEAR";
    dom.phoneBannerBody.textContent = result.guidance.message;
  } else {
    dom.phoneBanner.hidden = true;
  }
}

function clearDashboard() {
  dom.dashboardLog.innerHTML =
    '<li class="logEmpty">No events yet. Run the demo flow to see what Emily receives.</li>';
}

function pushDashboard({ time, title, body, tone = "info" }) {
  if (dom.dashboardLog.querySelector(".logEmpty")) dom.dashboardLog.innerHTML = "";
  const li = document.createElement("li");
  li.className = `logItem logItem--${tone}`;
  li.innerHTML = `<span class="logTime">${time}</span><span class="logBody"><strong>${title}</strong><small>${body}</small></span>`;
  dom.dashboardLog.appendChild(li);
  dom.dashboardLog.scrollTop = dom.dashboardLog.scrollHeight;
}

const clockTime = (offsetSeconds = 0) =>
  new Date(Date.now() + offsetSeconds * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

/* -------------------------------------------------------------------------- */
/* Recompute + repaint                                                        */
/* -------------------------------------------------------------------------- */

function update() {
  const event = currentEvent();
  state.result = runPathway(event, { advanceMeters: state.advanceMeters });

  const nearest = state.result.hazards.topHazard;
  dom.sliderReadout.textContent = `${state.advanceMeters.toFixed(2)} m walked · ${
    nearest ? `nearest hazard ${nearest.distanceMeters.toFixed(2)} m` : "no hazard admitted"
  }`;

  renderStageList();
  renderMeters(state.result);
  renderTriage(state.result);
  renderHazardQueue(state.result);
  renderFilterList(state.result);
  renderSignals(state.result);
  renderActions(state.result);
  renderPhoneChrome(state.result);
  render();
}

/* -------------------------------------------------------------------------- */
/* Interaction                                                                */
/* -------------------------------------------------------------------------- */

function selectScenario(eventId) {
  stopPlayback();
  hideHelp();
  state.eventId = eventId;
  const event = currentEvent();
  state.advanceMeters = Math.min(event.advanceMeters, maxAdvanceFor(event));
  state.stageId = STAGES[0].id;

  dom.slider.max = String(Math.round(maxAdvanceFor(event) * 100));
  dom.slider.value = String(Math.round(state.advanceMeters * 100));

  clearDashboard();
  renderScenarioPicker();
  update();
}

function selectStage(stageId) {
  stopPlayback();
  state.stageId = stageId;
  if (stageId !== "fall" && stageId !== "event") hideHelp();
  update();

  if (stageId === "event") {
    hideHelp();
    replayEventLoop();
  }
}

function hideHelp() {
  state.helpVisible = false;
  dom.helpScreen.hidden = true;
}

/**
 * Show the on-device fall confirmation and run its countdown.
 *
 * The window matches the engine's real SMS delay, played back at DEMO_SPEED so
 * the demo does not stall for fifteen seconds. `onExpire` fires only if the user
 * does not intervene.
 */
function showHelp(onExpire) {
  const result = state.result;
  if (result.triage.level !== "critical") {
    onExpire?.();
    return;
  }

  const sms = result.triage.actions.find((action) => action.channel === "sms");
  const window_ = sms?.delaySeconds ?? 15;

  state.helpVisible = true;
  state.onHelpExpire = onExpire ?? null;
  dom.helpScreen.hidden = false;

  const carer = result.event.caregiver?.name ?? "your caregiver";
  dom.helpBody.innerHTML = `Pathway detected a possible fall.<br />Contacting ${carer} in <strong id="help-countdown">${window_}</strong>s.`;

  let remaining = window_;
  const countdown = dom.helpScreen.querySelector("#help-countdown");

  const tick = () => {
    remaining -= 1;
    if (countdown) countdown.textContent = String(Math.max(0, remaining));
    if (remaining > 0) {
      later(tick, 1000 / DEMO_SPEED);
    } else {
      hideHelp();
      const next = state.onHelpExpire;
      state.onHelpExpire = null;
      next?.();
    }
  };
  later(tick, 1000 / DEMO_SPEED);
}

function resolveHelp(outcome) {
  clearTimers();
  stopPlayback();
  state.onHelpExpire = null;
  hideHelp();

  if (outcome === "cancelled") {
    pushDashboard({
      time: clockTime(),
      title: "Fall alert cancelled by the user",
      body: '"Crisis averted" pressed on the frame. Nothing was sent — the event stays in the log.',
      tone: "ok"
    });
    state.stageId = "event";
    update();
    return;
  }

  state.stageId = "event";
  update();
  replayEventLoop({ immediate: true });
}

/** Play the escalation ladder into the caregiver dashboard. */
function replayEventLoop({ immediate = false } = {}) {
  const result = state.result;
  clearDashboard();

  if (result.triage.level === "stable") {
    pushDashboard({
      time: clockTime(),
      title: `Clear pass through the ${result.event.location}`,
      body: "Nothing escalated. The room map was refreshed and monitoring continues.",
      tone: "ok"
    });
    return;
  }

  result.triage.actions.forEach((action, index) => {
    const tone =
      action.channel === "call" ? "alert" : action.channel === "sms" ? "warn" : "info";
    const emit = () =>
      pushDashboard({
        time: clockTime(action.delaySeconds),
        title: action.label,
        body: action.detail,
        tone
      });

    if (immediate || prefersReducedMotion) emit();
    else later(emit, index * 700);
  });
}

/* -------------------------------------------------------------------------- */
/* Guided playback                                                            */
/* -------------------------------------------------------------------------- */

function stopPlayback() {
  clearTimers();
  state.playing = false;
  dom.playLabel.textContent = "Play demo flow";
  dom.playButton.classList.remove("isPlaying");
}

/**
 * Advance the demo one stage at a time.
 *
 * Chained rather than pre-scheduled, so a stage that has to wait on something —
 * the fall-confirmation countdown — holds the sequence instead of being run over
 * by the next timer.
 */
function runStage(index) {
  if (!state.playing) return;

  if (index >= STAGES.length) {
    stopPlayback();
    return;
  }

  const stage = STAGES[index];
  state.stageId = stage.id;
  update();

  if (stage.id === "fall" && state.result.triage.level === "critical") {
    later(() => showHelp(() => runStage(index + 1)), 900);
    return;
  }

  if (stage.id === "event") {
    replayEventLoop();
    later(stopPlayback, 2600);
    return;
  }

  later(() => runStage(index + 1), STAGE_DURATION_MS);
}

function startPlayback() {
  clearTimers();
  hideHelp();
  clearDashboard();
  state.playing = true;
  state.onHelpExpire = null;
  dom.playLabel.textContent = "Stop";
  dom.playButton.classList.add("isPlaying");
  runStage(0);
}

/* -------------------------------------------------------------------------- */
/* Wiring                                                                     */
/* -------------------------------------------------------------------------- */

dom.slider.addEventListener("input", (fired) => {
  stopPlayback();
  state.advanceMeters = Number(fired.target.value) / 100;
  update();
});

dom.playButton.addEventListener("click", () => {
  if (state.playing) {
    stopPlayback();
    return;
  }
  startPlayback();
});

dom.resetButton.addEventListener("click", () => selectScenario(state.eventId));
dom.helpCancel.addEventListener("click", () => resolveHelp("cancelled"));
dom.helpNow.addEventListener("click", () => resolveHelp("escalated"));

document.addEventListener("keydown", (fired) => {
  if (fired.key === "Escape" && state.helpVisible) resolveHelp("cancelled");
});

// Keep the canvas crisp on high-density displays without changing the model.
function sizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const base = { width: 720, height: 540 };
  dom.canvas.width = base.width * ratio;
  dom.canvas.height = base.height * ratio;
  render();
}
window.addEventListener("resize", sizeCanvas);

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

clearDashboard();
selectScenario(sampleEvents[0].id);
sizeCanvas();
