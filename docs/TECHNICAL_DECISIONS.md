# Technical decisions

Why the reconstruction is built the way it is. Each entry states the alternative that was
rejected, because that is the part that is usually more informative.

---

## 1. Port the original frame-position rule instead of writing a better one

`classifyDetection()` reproduces `isHazard()` from the surviving Python exactly —
thresholds, ignore list, confidence gate. A metric-space rule ("flag anything on the floor
within 1.5 m") would be cleaner and easier to reason about.

**Why not:** the port is the thing that makes this repository credible. It anchors the
reconstruction to code that actually ran during the hackathon, and it means the browser
demo and the Python detector agree by construction rather than by coincidence. Improving
the rule would have been easy and would have quietly severed that link.

The frame-position formulation is also not as crude as it looks. It needs no depth sensor
and no calibration beyond the mount angle, which is exactly the constraint of running on a
five-year-old donated phone.

## 2. World-space sample data with a pinhole camera, not hard-coded pixel boxes

Detections in `data/sampleEvents.js` are authored in metres and projected through a camera
model. Writing normalised boxes directly would have been far less code.

**Why not:** the hazard rule is about *frame position*, so hand-placed boxes would make the
demo circular — objects would be hazards because I typed coordinates that made them
hazards. Going through the projection means the geometry decides. Walking forward makes
objects grow, descend the frame, and cross the 0.65 threshold on their own, which is both a
better demonstration and a real test of the rule. The `advance-slider` in the demo exists
because of this decision, and `projectDetection` is covered by its own test.

## 3. A threshold-and-weight fall scorer, not a classifier

Six normalised signals, fixed weights, weighted sum.

**Why not a model:** there is no labelled fall data — none survived the hackathon and none
has been collected since. Any classifier would be fitted to invented data, which is worse
than an honest heuristic because it launders a guess through a training run.

The transparent scorer has a practical advantage too. `detectFallRisk()` returns every
signal with its normalised value and its contribution, so the demo can show *why* a score
is 92%, and a clinician can argue with a specific threshold instead of with a black box.
When real traces exist, the same six signals become features and the weights become
something to fit. See [ROADMAP.md](./ROADMAP.md) phase 0.

## 4. Scene score is "dominant hazard plus clutter", not a mean

```
score = dominant + (1 − dominant) · meanOfRest · 0.55
```

**Why not a mean:** a mean lets a tidy background dilute a genuinely dangerous obstacle —
one severe hazard plus four trivial ones scores lower than the severe hazard alone, which
is backwards. **Why not just the max:** then a floor strewn with obstacles reads identically
to a floor with one. This form keeps the worst hazard as the floor of the score and lets
clutter push it up, which matches how a person would describe the room.

## 5. A fall is critical on motion evidence alone

`triageEvent` blends fall risk and hazard score for *confidence*, but the `critical`
threshold reads fall risk only.

**Why:** the camera must not be able to veto the gyroscope. A fall in an empty, immaculate
hallway is still a fall, and a scene-aware blend would score it lower precisely when there
is nothing around to help. The hazard queue's job in a critical event is to tell the
caregiver what the person probably tripped over — not to decide whether to call them.

## 6. Escalate through a cancel window before contacting anyone

Nothing leaves the device for 15 seconds, and "Crisis averted" stops it.

**Why:** the interviews were clear that alarm fatigue is what kills these products. A
detector tuned to catch every fall will fire on stumbles, on the frame being knocked over,
on the phone being unclipped. Putting a human veto between detection and escalation lets
the detector run sensitive without burning the caregiver's trust. It also matches the deck
screenshot exactly — the two buttons are "Contact emergency" and "Crisis averted".

## 7. Low lips are stepped over, not routed around

`planGuidance` splits hazards at 8 cm.

**Why:** the corridor search treats every hazard as an obstacle to avoid, which produces
absurd advice for a rug lip spanning the walking line — "move right 0.95 m" when the
correct instruction is "slow down and lift the frame over it". The split is a small amount
of code that stops the planner giving physically wrong guidance.

## 8. No framework, no build step, no dependencies

`package.json` has an empty `dependencies` and an empty `devDependencies`. Tests run on
Node's built-in runner; the demo is served by `python3 -m http.server`.

**Why:** this is a portfolio artefact for a project that no longer has a team. A build chain
is a liability — in two years `npm install` fails and the demo is dead. Any static file
server will still serve this one. It also keeps the engine trivially portable into a React
Native or Swift bridge later, since it is plain ES modules with no runtime.

The cost is real: no type checking, no bundling, no tree-shaking. For ~700 lines of engine
that is the right trade.

## 9. A rendered scene rather than the original demo footage as the camera backdrop

The demo canvas draws a synthetic room instead of using the recovered video frames.

**Why not the footage:** overlay boxes would have to be hand-placed to match the photo, and
they would then be decorative rather than computed — the same circularity as decision 2.
With a rendered scene, the walls, the objects and the detection boxes all come out of one
camera model, so they cannot disagree. The original footage is still in the repository as
`assets/`, presented as what it is: evidence of the hackathon demo.

## 10. Every score is stated three ways

Bar width, a percentage, and a sentence.

**Why:** the product is for people with age-related vision changes and their caregivers.
Encoding anything in colour or bar length alone fails the users it exists for, and the deck
explicitly cites research on age-specific UI optimisation. The same principle drives the
fall-risk bar changing colour by *detector stage* rather than by value — a 92% score should
never render green just because green is where the gradient starts. See
[ACCESSIBILITY.md](./ACCESSIBILITY.md).
