# Reconstruction notes

Pathway was built in 36 hours at the Oxford Venture 2026 Hackathon, where it won 1st place in
a field of 115 participants. Most of the code did not survive the event. This repository
rebuilds it into something readable and runnable, and this document records exactly where the
line falls between what was recovered and what was rewritten. The account of the build itself
is in [HACKATHON_STORY.md](./HACKATHON_STORY.md).

The short version: **the hazard detector is original, the decision layer around it is not.**

---

## What survived

| Artefact | Status |
|---|---|
| `vision/hazard_detector.py` | Original code, 261 lines. Was `yolo_example_live_2.py`. |
| `Pathway.pptx` | Original 35-slide deck, including four demo videos and the architecture diagram. |
| Demo footage | Original. Frames extracted into `assets/`. |
| Event photographs | Original. Eight, taken by the team during the hackathon; web-ready versions in `assets/hackathon/`. |
| Screen and camera video | Original. The detector, the hazard filter, the iOS app and its incident log, recorded during the event; compressed clips in `assets/videos/`. |
| `LICENSE` | Original MIT licence, © 2026 Caleb Byrne. |
| Old `README.md` | Two sentences describing the YOLO detector. |

Three compatibility fixes were applied to the Python file, each marked inline with
`# reconstruction:`:

1. `np.int0` → `np.intp` (`np.int0` was removed in NumPy 2.0)
2. An f-string with nested same-type quotes split into a variable (only parses on Python 3.12+)
3. Renamed `yolo_example_live_2.py` → `vision/hazard_detector.py`

No detection logic was changed.

## What was rebuilt

Everything in `src/`, `data/`, `test/`, `docs/` and `index.html`.

| Module | Basis |
|---|---|
| `classifyDetection` | **Direct port** of `isHazard()` from the surviving Python. Thresholds, ignore list and confidence gate are unchanged. |
| `projectPoint` / `projectDetection` | New. Standard pinhole model; parameters chosen so the reconstructed view approximates the demo footage. |
| `scoreHazards` | New. The deck says "hazard triaging" and shows a ranked list, but the ranking function is gone. |
| `detectFallRisk` | New. The deck specifies the *approach* — "angular acceleration driven algorithmic fall detection" — and the architecture slide confirms gyroscope → angular-acceleration analysis. The thresholds are reconstructed. |
| `planGuidance` | New. The deck names "D.A.I. indoor navigation" but never describes the algorithm. |
| `triageEvent` | New. The action ladder follows the deck's "Event Driven" slide (record → text → call → hazard triage) and the architecture slide's bystander measures. |
| Browser demo | New. The original demo ran as a live iOS app plus the Python script on a laptop. |

## Numbers you should treat as reconstructed

These are **engineering judgement calls, not measurements**, and nothing in this repository
has been validated against real falls:

- All weights in `FALL_WEIGHTS` and `HAZARD_WEIGHTS`
- Every threshold in `FALL_SIGNAL_RANGES`
- The `TRIP_SEVERITY` table — informed by NICE falls-prevention guidance (which singles out
  loose rugs, raised thresholds and trailing cables) and by the pitch-deck interviews, but
  not derived from a labelled dataset
- All `TRIAGE_THRESHOLDS`
- The camera intrinsics in `DEFAULT_CAMERA`
- The 8 cm "step over rather than route around" cutoff
- The motion values in `data/sampleEvents.js` — plausible for the events they describe, but
  synthesised, not recorded

The numbers reported from the deck — 32 interviews, 68%, 4 care homes, £0.24 unit cost,
£2.3B NHS cost, 220,000 A&E admissions — are quoted as the team presented them and are not
independently verified here.

## Interpretations, flagged

**"D.A.I."** appears on four slides and is never expanded. This reconstruction models it as
the fusion of **D**ynamic detections **A**nd the **I**ndoor static map. That is an
inference from where the term sits in the demo sequence, not recovered meaning.

**Dynamic vs static sourcing.** The architecture slide splits "Computer Vision →
Dynamic-Object Detection" from "LiDAR Environment Mapping → Fixed-Object Detection". The
sample data reflects that split with a `source` field. Which specific objects came from
which pipeline during the original demo is not recoverable from the deck.

**The rug edge.** The demo video features a rug with a curled-back edge as the trip hazard,
but a curled rug edge is not a COCO class, and the surviving detector only handles COCO
classes. In the reconstruction it is modelled as a fixed hazard from the LiDAR room map,
which is consistent with the architecture slide. Whether the original build actually did
that, or whether the rug simply was not detected, is unknown.

## What is still missing

Nothing in this repository can substitute for these:

- **The iOS app.** SwiftUI views (the app UI, the HELP screen), RoomPlan integration for
  the environment map, and CoreMotion handling. The screenshots in `assets/` and the clips in
  `assets/videos/` are the only record of it.

  **The video does not recover the source.** `original-pathway-ios-app.mp4` and
  `original-incident-log.mp4` show the app running — the control rail, the hazard toasts, the
  red box on a floor object, the incident log with its two entries and timestamps. That
  establishes which behaviours existed and roughly how they were presented, and it is why
  this reconstruction models a toast, a steer arrow and a persistent event log. It supplies
  no SwiftUI, no RoomPlan calls, no CoreMotion handling and no Core ML pipeline. Treat the
  footage as a specification of observable behaviour, not as an implementation.
- **The real alert integration.** The deck's screenshots show a genuine SMS with a location
  pin and a genuine outbound call. Whether that was automated or triggered by hand during
  the demo is not documented. The browser demo simulates both.
- **Recorded sensor traces.** No accelerometer or gyroscope logs survived, which is why
  every motion value in `data/sampleEvents.js` is synthesised. This is the single most
  valuable missing artefact — with real traces the fall thresholds could be fitted instead
  of guessed.
- **The Core ML conversion.** The surviving script runs Ultralytics on CPU. Whatever ran
  on-device is gone.
- **The hardware mount.** No CAD files survived, only the printed object itself. The
  photographs show a 3D-printed mount on a frame improvised from lacrosse sticks and duct
  tape — printed overnight on a borrowed printer, as described in
  [HACKATHON_STORY.md](./HACKATHON_STORY.md).

If any of this resurfaces, the natural homes are `ios/`, `src/alerts/` and `data/traces/`.

## Deliberately not included

- `Pathway.pptx` is 262 MB, which is over GitHub's 100 MB file limit. It is git-ignored.
  Extracted stills live in `assets/` instead.
- Two deck screenshots were left out because they contain a real residential address and a
  real mobile number. The demo recreates both screens with placeholder data.
- Model weights (`*.pt`) are git-ignored; Ultralytics fetches them on first run.

## Standing caveat

This is a hackathon prototype rebuilt as a portfolio artefact. It is not a medical device,
it has not been clinically validated, and the fall-detection thresholds have never been
tested against a real fall. Do not deploy it to anyone who would rely on it.
