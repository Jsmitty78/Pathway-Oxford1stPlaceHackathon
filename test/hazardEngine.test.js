/**
 * hazardEngine.test.js
 * -----------------------------------------------------------------------------
 * Behavioural tests for the Pathway decision core.
 *
 * These assert the claims the pitch-deck demo makes, using exactly the pipeline
 * the browser demo runs (`runPathway`). Run with `npm test`.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CORRIDOR_HALF_WIDTH_METERS,
  FALL_WEIGHTS,
  HAZARD_BAND,
  HAZARD_WEIGHTS,
  IGNORED_CLASSES,
  TRIAGE_THRESHOLDS,
  TRIP_SEVERITY,
  classifyDetection,
  detectFallRisk,
  planGuidance,
  projectDetection,
  runPathway,
  scoreHazards,
  triageEvent
} from "../src/pathwayEngine.js";
import { getSampleEvent, sampleEvents } from "../data/sampleEvents.js";

const tripHazard = runPathway(getSampleEvent("living-room-trip-hazard"));
const possibleFall = runPathway(getSampleEvent("hallway-possible-fall"));
const clearPath = runPathway(getSampleEvent("kitchen-clear-path"));

/* -------------------------------------------------------------------------- */
/* Fall detection                                                             */
/* -------------------------------------------------------------------------- */

test("a possible fall scores high on fall risk", () => {
  assert.ok(
    possibleFall.fallRisk.score > 0.8,
    `expected > 0.8, got ${possibleFall.fallRisk.score}`
  );
  assert.equal(possibleFall.fallRisk.stage, "fall-confirmed");
});

test("a clear path scores low on fall risk", () => {
  assert.ok(clearPath.fallRisk.score < 0.25, `expected < 0.25, got ${clearPath.fallRisk.score}`);
  assert.equal(clearPath.fallRisk.stage, "stable");
});

test("a recovered stumble lands between the two, not at either extreme", () => {
  const { score, stage } = tripHazard.fallRisk;
  assert.ok(score > clearPath.fallRisk.score && score < possibleFall.fallRisk.score);
  assert.equal(stage, "instability");
});

test("angular acceleration is the largest single contributor to a fall score", () => {
  const ranked = [...possibleFall.fallRisk.signals].sort((a, b) => b.contribution - a.contribution);
  assert.equal(ranked[0].key, "angularAcceleration");
});

test("fall risk is bounded to 0..1 for absurd sensor input", () => {
  const saturated = detectFallRisk({
    minAccelerationG: -50,
    peakAccelerationG: 900,
    peakAngularVelocityDps: 1e6,
    peakAngularAccelerationDps2: 1e9,
    orientationChangeDeg: 4000,
    postEventStillnessSeconds: 9000
  });
  assert.equal(saturated.score, 1);
  assert.equal(detectFallRisk({}).score, 0);
});

/* -------------------------------------------------------------------------- */
/* Hazard filtering and scoring                                               */
/* -------------------------------------------------------------------------- */

test("the highest-risk hazard is ranked first in the triage queue", () => {
  const [first, second] = tripHazard.triage.hazardQueue;
  assert.equal(first.label, "rug edge");
  assert.equal(second.label, "teddy bear");
  assert.ok(first.risk > second.risk);
});

test("a clear path produces no hazards and a zero hazard score", () => {
  assert.equal(clearPath.hazards.hazards.length, 0);
  assert.equal(clearPath.hazards.score, 0);
  assert.ok(clearPath.hazards.tracked.length > 0, "objects are still tracked, just not flagged");
});

test("ignored COCO classes never become hazards", () => {
  const couch = tripHazard.hazards.objects.find((item) => item.label === "couch");
  assert.ok(couch, "the couch should still be detected and tracked");
  assert.equal(couch.isHazard, false);
  assert.ok(couch.failedChecks.includes("classAllowed"));

  for (const label of IGNORED_CLASSES) {
    const flagged = [tripHazard, possibleFall, clearPath].some((result) =>
      result.hazards.hazards.some((hazard) => hazard.label === label)
    );
    assert.equal(flagged, false, `${label} should never be flagged as a trip hazard`);
  }
});

test("objects above the floor are filtered out even when close", () => {
  // A mug on a worktop, well inside the walking corridor.
  const mug = clearPath.hazards.objects.find((item) => item.label === "cup");
  assert.equal(mug.isHazard, false);
  assert.ok(mug.failedChecks.includes("nearFloor"));
});

test("hazard filtering matches the ported Python frame rules", () => {
  const inBand = {
    label: "backpack",
    confidence: 0.9,
    box: { x1: 0.3, y1: 0.5, x2: 0.6, y2: 0.85 }
  };
  assert.equal(classifyDetection(inBand).isHazard, true);

  // Bottom of the box above the near band -> too far away to be underfoot.
  assert.equal(
    classifyDetection({ ...inBand, box: { ...inBand.box, y2: HAZARD_BAND.nearBandY - 0.01 } })
      .isHazard,
    false
  );

  // Top of the box in the overhead band -> a tall object, not a trip hazard.
  assert.equal(
    classifyDetection({ ...inBand, box: { ...inBand.box, y1: HAZARD_BAND.overheadY - 0.01 } })
      .isHazard,
    false
  );

  // Below the detector's confidence gate.
  assert.equal(classifyDetection({ ...inBand, confidence: 0.4 }).isHazard, false);
});

test("static room-map hazards bypass the COCO ignore list", () => {
  const rugEdge = tripHazard.hazards.hazards.find((hazard) => hazard.label === "rug edge");
  assert.equal(rugEdge.source, "static");
  assert.equal(rugEdge.isHazard, true);
});

test("a hazard directly in the walking corridor outranks the same hazard off to one side", () => {
  const base = {
    label: "backpack",
    source: "dynamic",
    confidence: 0.9,
    distanceMeters: 1.2,
    size: { width: 0.4, height: 0.4 },
    box: { x1: 0.4, y1: 0.5, x2: 0.6, y2: 0.85 }
  };

  const centred = scoreHazards([{ ...base, lateralOffsetMeters: 0 }]);
  const offset = scoreHazards([
    { ...base, lateralOffsetMeters: CORRIDOR_HALF_WIDTH_METERS * 2 }
  ]);

  assert.ok(centred.score > offset.score);
});

test("clutter raises the scene score above the single worst hazard", () => {
  const one = scoreHazards(tripHazard.hazards.hazards.slice(0, 1));
  assert.ok(tripHazard.hazards.score > one.score);
});

/* -------------------------------------------------------------------------- */
/* Frame geometry                                                             */
/* -------------------------------------------------------------------------- */

test("walking toward an object moves it down the frame and into the hazard band", () => {
  const teddy = getSampleEvent("living-room-trip-hazard").detections.find(
    (detection) => detection.label === "teddy bear"
  );

  const far = projectDetection(teddy, { advanceMeters: 0 });
  const near = projectDetection(teddy, { advanceMeters: 1.6 });

  assert.ok(near.box.y2 > far.box.y2, "the object should descend the frame");
  assert.ok(
    near.box.x2 - near.box.x1 > far.box.x2 - far.box.x1,
    "the object should grow as it gets closer"
  );
  assert.equal(classifyDetection(far).isHazard, false);
  assert.equal(classifyDetection(near).isHazard, true);
});

/* -------------------------------------------------------------------------- */
/* Triage and the closed-loop response                                        */
/* -------------------------------------------------------------------------- */

test("triage returns critical for a fall event", () => {
  assert.equal(possibleFall.triage.level, "critical");
  assert.ok(possibleFall.triage.confidence > 0.8);
});

test("a critical event escalates to SMS and then a phone call", () => {
  const channels = possibleFall.triage.actions.map((action) => action.channel);
  assert.ok(channels.includes("sms"));
  assert.ok(channels.includes("call"));

  const sms = possibleFall.triage.actions.find((action) => action.channel === "sms");
  const call = possibleFall.triage.actions.find((action) => action.channel === "call");
  assert.ok(
    call.delaySeconds > sms.delaySeconds,
    "the call must come after the unacknowledged text"
  );

  // The user always gets a chance to cancel before anyone is contacted.
  const confirm = possibleFall.triage.actions.find((action) => action.id === "confirm");
  assert.ok(confirm && confirm.delaySeconds < sms.delaySeconds);
});

test("a trip hazard escalates for guidance but never places a call", () => {
  assert.equal(tripHazard.triage.level, "high");
  const channels = tripHazard.triage.actions.map((action) => action.channel);
  assert.ok(!channels.includes("call"), "a recovered stumble must not ring the caregiver");
});

test("a clear path stays stable and takes no outbound action", () => {
  assert.equal(clearPath.triage.level, "stable");
  const channels = clearPath.triage.actions.map((action) => action.channel);
  assert.deepEqual([...new Set(channels)], ["device"]);
});

test("triage confidence rises with both motion and scene evidence", () => {
  const quietScene = scoreHazards([]);
  const event = getSampleEvent("hallway-possible-fall");

  const withScene = triageEvent(event, possibleFall.fallRisk, possibleFall.hazards);
  const withoutScene = triageEvent(event, possibleFall.fallRisk, quietScene);

  assert.ok(withScene.confidence > withoutScene.confidence);
  assert.equal(withoutScene.level, "critical", "a fall is critical on motion evidence alone");
});

/* -------------------------------------------------------------------------- */
/* Navigation guidance                                                        */
/* -------------------------------------------------------------------------- */

test("guidance steers around standing obstacles and steps over low lips", () => {
  assert.equal(tripHazard.guidance.direction, "left");
  assert.ok(tripHazard.guidance.stepOver.includes("rug edge"));
  assert.match(tripHazard.guidance.message, /lift the frame over/);
});

test("guidance holds course when nothing is flagged", () => {
  assert.equal(clearPath.guidance.direction, "hold");
  assert.deepEqual(clearPath.guidance.stepOver, []);
});

test("guidance stops rather than inventing a route through a blocked corridor", () => {
  const wall = scoreHazards([
    {
      label: "step",
      source: "static",
      confidence: 0.95,
      distanceMeters: 1,
      lateralOffsetMeters: 0,
      size: { width: 4, height: 0.4 },
      box: { x1: 0, y1: 0.6, x2: 1, y2: 0.95 }
    }
  ]);

  assert.equal(planGuidance(wall).direction, "stop");
});

/* -------------------------------------------------------------------------- */
/* Tuning-table invariants                                                    */
/* -------------------------------------------------------------------------- */

const sum = (weights) => Object.values(weights).reduce((total, w) => total + w, 0);

test("weights sum to 1, so scores are readable as a fraction of maximum evidence", () => {
  assert.ok(Math.abs(sum(FALL_WEIGHTS) - 1) < 1e-9, `fall weights sum to ${sum(FALL_WEIGHTS)}`);
  assert.ok(
    Math.abs(sum(HAZARD_WEIGHTS) - 1) < 1e-9,
    `hazard weights sum to ${sum(HAZARD_WEIGHTS)}`
  );
});

test("angular acceleration carries the largest fall weight, per the pitch deck", () => {
  const heaviest = Object.entries(FALL_WEIGHTS).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(heaviest, "angularAcceleration");
});

test("every trip-severity weight is a sane probability-like value", () => {
  for (const [label, severity] of Object.entries(TRIP_SEVERITY)) {
    assert.ok(severity > 0 && severity <= 1, `${label}: ${severity}`);
  }
  // Low lips underfoot must outrank furniture you can see coming.
  assert.ok(TRIP_SEVERITY["rug edge"] > TRIP_SEVERITY.chair);
  assert.ok(TRIP_SEVERITY["door threshold"] > TRIP_SEVERITY["dining table"]);
});

test("triage thresholds are ordered so the levels cannot overlap", () => {
  const { criticalFallRisk, highFallRisk, highCombined, watchCombined } = TRIAGE_THRESHOLDS;
  assert.ok(watchCombined < highCombined, "watch must sit below high");
  assert.ok(highFallRisk < criticalFallRisk, "the high fall gate must sit below critical");
  for (const value of Object.values(TRIAGE_THRESHOLDS)) {
    assert.ok(value > 0 && value < 1, `threshold out of range: ${value}`);
  }
});

/* -------------------------------------------------------------------------- */
/* Data integrity                                                             */
/* -------------------------------------------------------------------------- */

test("every sample scenario runs end to end and stays in range", () => {
  for (const event of sampleEvents) {
    const result = runPathway(event);
    for (const score of [
      result.fallRisk.score,
      result.hazards.score,
      result.triage.confidence
    ]) {
      assert.ok(Number.isFinite(score) && score >= 0 && score <= 1, `${event.id}: ${score}`);
    }
    assert.ok(result.triage.actions.length > 0);
    assert.ok(result.frame.detections.length > 0, `${event.id} should render something on screen`);
  }
});
