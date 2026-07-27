# Roadmap

Ordered by what unblocks the most. Everything here is beyond the hackathon prototype.

---

## Phase 0 — recover the ground truth

Nothing else is worth building until the numbers stop being guesses.

- [ ] **Record real sensor traces.** Instrument a frame with the phone and capture
      accelerometer + gyroscope at 200 Hz across normal walking, kerb steps, sitting down,
      hand-offs, and staged falls onto crash mats. Land them in `data/traces/`.
- [ ] **Fit the fall thresholds to that data** instead of asserting them. Report
      sensitivity and, more importantly, false-positive rate per hour of normal use — a
      fall detector that cries wolf gets switched off.
- [ ] **Label a small indoor hazard set** from the demo footage so hazard ranking can be
      evaluated rather than argued about.

## Phase 1 — make the detector fit the problem

- [ ] **Train a custom detector for floor hazards.** COCO has no class for a curled rug
      edge, a raised threshold, a trailing cable or a door sill — which are precisely the
      things the interviews said matter. This is the single biggest accuracy gap.
- [ ] **Add temporal tracking.** The current script scores every frame independently, so
      the hazard flag flickers. Track detections across frames and require persistence
      before flagging.
- [ ] **Use real depth.** Replace the frame-position proxy with LiDAR depth on phones that
      have it, falling back to the geometric estimate on those that do not.
- [ ] **Convert to Core ML** and measure frames per second and battery drain on the class
      of phone this actually targets — a five-year-old handset, not a current flagship.
- [ ] **Calibrate the mount angle at runtime** from device attitude rather than assuming
      20°. A phone knocked out of alignment silently breaks the frame-position rule.

## Phase 2 — rebuild the device app

- [ ] **SwiftUI app** recovering the screens in `assets/`: the camera view with the title
      pill and button rail, the HELP takeover, settings.
- [ ] **RoomPlan integration** for the persistent environment map, keyed by room, so a
      hazard found on Monday is still known on Friday.
- [ ] **Familiar-voice audio guidance** — the deck's phrase. Recorded by a family member,
      not a synthetic voice.
- [ ] **Real SMS and voice escalation** via a provider, with the cancel window enforced
      on-device and delivery receipts driving the call fallback.
- [ ] **Offline-first.** Falls happen in hallways with no signal. Queue and retry.

## Phase 3 — the outdoor branch

Designed in the pitch deck, never built.

- [ ] **Pedestrian approach detection**: LiDAR depth → human-form detection → rate-of-approach analysis.
- [ ] **Torch strobe** to acquire an approaching pedestrian's attention.
- [ ] Decide whether this is worth it at all — the interviews said most walker users stay
      indoors, so this may be the wrong thing to build second.

## Phase 4 — caregiver side

- [ ] Replace the mock dashboard with a real one: event history, hazard map per room,
      trend view ("three near-misses in the hallway this week").
- [ ] Escalation contact chains and quiet hours.
- [ ] Weekly digest rather than per-event noise for anything below `critical`.
- [ ] **Consent and data-protection design.** This is a camera in someone's home. Who can
      see the footage, how long it is kept, and how the user revokes it are product
      questions, not settings — and they need answering before any pilot.

## Phase 5 — validation

- [ ] **Accessibility testing with actual older adults**, not proxies. Text size, contrast,
      target size, audio clarity, and whether the HELP screen is comprehensible under
      stress.
- [ ] **Care-home pilot.** Two of the four care homes contacted during the hackathon
      expressed interest in a follow-up test or a scheduled demonstration — that is the
      natural starting point. Neither is named here; neither agreed to a trial.
- [ ] **Clinical framing.** Establish what regulatory class this falls into before it is
      described as a fall-detection device to anyone.
- [ ] Physiotherapist review of the guidance behaviour. "Move left 0.55 m" may be exactly
      the wrong instruction to give someone mid-stumble.

## Known open questions

- **Does guidance help or distract?** Telling someone about a hazard 1 m ahead might make
  them look down at the phone, which is itself a fall risk. This needs testing, not
  assumption.
- **What is the right cancel window?** 15 seconds is a guess. Too short and it alarms on
  every stumble; too long and help is delayed.
- **Battery.** Continuous camera + LiDAR + inference on an old phone is brutal. If it only
  runs for two hours the product does not work, and no amount of algorithm quality fixes
  that.
- **Does the mount survive real use?** The prototype is a laser-cut clamp on a frame made
  of lacrosse sticks.

## Repository housekeeping

- [ ] Add a linter and formatter config (currently formatted by hand, consistently).
- [ ] Publish the demo to GitHub Pages — see the README.
- [ ] Record a demo GIF of the full six-stage flow.
