/**
 * sampleEvents.js
 * -----------------------------------------------------------------------------
 * Three replayable scenarios for the Pathway demo.
 *
 * The living-room scene is modelled on the room used in the hackathon demo
 * video (see assets/demo-dynamic-detection.jpg): a leather sofa, a low glass
 * coffee table, a mug on a side table, a soft toy left on the floor, and a rug
 * with a curled-back edge. The hallway and kitchen scenes were written for this
 * reconstruction to exercise the fall path and the all-clear path.
 *
 * Geometry is authored in **metres in world space**, not pixels:
 *
 *   position.x  lateral offset from the walker centre line (+ is to the user's right)
 *   position.z  distance ahead of the phone, before `advanceMeters` is applied
 *   size        width, height and depth of the object's bounding volume
 *   elevation   height of the object's base above the floor (a mug on a table)
 *   persistent  true if the object was present on previous passes and lives in
 *               the room map, rather than being new to this frame
 *
 * `src/pathwayEngine.js` projects those through the walker-mounted camera model,
 * so the frame-position hazard rule ported from the original Python detector
 * operates on geometry it would genuinely see. Walking forward makes objects
 * grow, descend the frame and cross into the hazard band on their own.
 *
 * Detection sources follow the pitch deck's technical architecture slide:
 *   `dynamic` — COCO-class objects from the on-device YOLO detector
 *   `static`  — fixed geometry from the LiDAR room map (rug lips, thresholds)
 */

export const sampleEvents = [
  {
    id: "living-room-trip-hazard",
    label: "Indoor trip hazard",
    shortLabel: "Trip hazard",
    location: "living room",
    summary:
      "A soft toy on the floor and a curled rug edge sit across the walking line. The user stumbles but recovers.",
    caregiver: { name: "Emily", relationship: "daughter" },
    advanceMeters: 1.6,
    motion: {
      // Stumble and recovery: a real rotation transient, no impact, no stillness.
      minAccelerationG: 0.66,
      peakAccelerationG: 1.9,
      peakAngularVelocityDps: 210,
      peakAngularAccelerationDps2: 720,
      orientationChangeDeg: 22,
      postEventStillnessSeconds: 0.8
    },
    detections: [
      {
        label: "rug edge",
        classId: null,
        source: "static",
        persistent: true,
        confidence: 0.93,
        position: { x: -0.05, z: 2.95 },
        size: { width: 1.1, height: 0.07, depth: 0.18 },
        note: "Curled-back rug lip captured by the room map, not by COCO."
      },
      {
        label: "teddy bear",
        classId: 77,
        source: "dynamic",
        confidence: 0.71,
        position: { x: 0.12, z: 2.6 },
        size: { width: 0.34, height: 0.36, depth: 0.3 },
        note: "Left on the floor between passes — the classic dynamic hazard."
      },
      {
        label: "dining table",
        classId: 60,
        source: "dynamic",
        persistent: true,
        confidence: 0.82,
        position: { x: -0.5, z: 3.9 },
        size: { width: 1.3, height: 0.42, depth: 0.8 },
        note: "Low glass coffee table. Tracked, but too far to be underfoot."
      },
      {
        label: "chair",
        classId: 56,
        source: "dynamic",
        persistent: true,
        confidence: 0.77,
        position: { x: 1.15, z: 4.2 },
        size: { width: 0.66, height: 0.95, depth: 0.55 },
        note: "Tall enough that its top breaks the overhead rule."
      },
      {
        label: "potted plant",
        classId: 58,
        source: "dynamic",
        persistent: true,
        confidence: 0.64,
        position: { x: 0.95, z: 3.7 },
        size: { width: 0.44, height: 0.62, depth: 0.44 }
      },
      {
        label: "cup",
        classId: 41,
        source: "dynamic",
        confidence: 0.69,
        position: { x: -1.25, z: 4.6 },
        size: { width: 0.09, height: 0.11, depth: 0.09 },
        elevationMeters: 0.5,
        note: "On the side table — elevated, so it never enters the hazard band."
      },
      {
        label: "couch",
        classId: 57,
        source: "dynamic",
        persistent: true,
        confidence: 0.88,
        position: { x: -1.35, z: 4.9 },
        size: { width: 2.2, height: 0.85, depth: 0.9 },
        note: "On the detector's ignore list: furniture you steer around, not over."
      }
    ]
  },

  {
    id: "hallway-possible-fall",
    label: "Possible fall",
    shortLabel: "Possible fall",
    location: "hallway",
    summary:
      "The frame catches on a raised door threshold. Angular acceleration, impact and post-event stillness all fire.",
    caregiver: { name: "Emily", relationship: "daughter" },
    advanceMeters: 0,
    motion: {
      // Unloading dip, hard impact, large rotation, then the user does not move.
      minAccelerationG: 0.42,
      peakAccelerationG: 3.1,
      peakAngularVelocityDps: 386,
      peakAngularAccelerationDps2: 1740,
      orientationChangeDeg: 74,
      postEventStillnessSeconds: 6.2
    },
    detections: [
      {
        label: "door threshold",
        classId: null,
        source: "static",
        persistent: true,
        confidence: 0.91,
        position: { x: 0.05, z: 1.1 },
        size: { width: 1, height: 0.045, depth: 0.12 },
        note: "Raised sill logged by the room map on a previous pass."
      },
      {
        label: "backpack",
        classId: 24,
        source: "dynamic",
        confidence: 0.68,
        position: { x: -0.3, z: 1.45 },
        size: { width: 0.48, height: 0.42, depth: 0.3 },
        note: "Laundry bag left against the wall."
      },
      {
        label: "person",
        classId: 0,
        source: "dynamic",
        confidence: 0.86,
        position: { x: 0.75, z: 4.4 },
        size: { width: 0.5, height: 1.7, depth: 0.4 },
        note: "Ignored by the hazard filter — pedestrians have their own branch."
      },
      {
        label: "potted plant",
        classId: 58,
        source: "dynamic",
        persistent: true,
        confidence: 0.58,
        position: { x: -1.1, z: 3.6 },
        size: { width: 0.4, height: 0.7, depth: 0.44 }
      }
    ]
  },

  {
    id: "kitchen-clear-path",
    label: "Clear path",
    shortLabel: "Clear path",
    location: "kitchen",
    summary:
      "Everything in view is either elevated, tall or far away. Nothing survives the hazard filter and nothing is escalated.",
    caregiver: { name: "Emily", relationship: "daughter" },
    advanceMeters: 0,
    motion: {
      minAccelerationG: 0.88,
      peakAccelerationG: 1.34,
      peakAngularVelocityDps: 96,
      peakAngularAccelerationDps2: 300,
      orientationChangeDeg: 9,
      postEventStillnessSeconds: 0
    },
    detections: [
      {
        label: "dining table",
        classId: 60,
        source: "dynamic",
        persistent: true,
        confidence: 0.86,
        position: { x: -0.9, z: 3.4 },
        size: { width: 1.4, height: 0.75, depth: 0.8 }
      },
      {
        label: "chair",
        classId: 56,
        source: "dynamic",
        persistent: true,
        confidence: 0.81,
        position: { x: 0.75, z: 3 },
        size: { width: 0.56, height: 0.95, depth: 0.55 }
      },
      {
        label: "cup",
        classId: 41,
        source: "dynamic",
        confidence: 0.74,
        position: { x: 1.05, z: 2.6 },
        size: { width: 0.09, height: 0.11, depth: 0.09 },
        elevationMeters: 0.9,
        note: "On the worktop — well above the hazard band."
      },
      {
        label: "refrigerator",
        classId: 72,
        source: "dynamic",
        persistent: true,
        confidence: 0.92,
        position: { x: -1.7, z: 3.9 },
        size: { width: 0.8, height: 1.8, depth: 0.7 },
        note: "Its top leaves the frame, so the overhead rule rejects it."
      }
    ]
  }
];

/** Convenience lookup used by the demo UI and the tests. */
export const getSampleEvent = (id) =>
  sampleEvents.find((event) => event.id === id) ?? sampleEvents[0];

export default sampleEvents;
