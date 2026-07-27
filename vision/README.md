# vision/ — the original hazard detector

`hazard_detector.py` is **original hackathon code**, not a reconstruction. It is the
live YOLO detector that produced the footage in the pitch deck's demo section, and it
is the reference implementation that `src/pathwayEngine.js` was ported from.

It is kept here unchanged apart from three compatibility fixes, each marked inline with
`# reconstruction:` and listed in the module docstring.

## Running it

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r vision/requirements.txt

# Live webcam, showing every detection
python vision/hazard_detector.py --camera 0

# Live webcam, showing only what survives the hazard filter
python vision/hazard_detector.py --camera 0 --hazards

# Against a recorded clip
python vision/hazard_detector.py --camera ./media/videos/video1.mp4
```

The model weights (`yolo26n.pt` by default) are **not** committed — `.gitignore` excludes
`*.pt`. Ultralytics downloads them on first run.

Three windows' worth of output are written per run: the raw frame, the frame with all
detection boxes, and the frame with only hazard boxes. Flagged objects are also appended
to `log.txt`.

## The rule that matters

```python
def isHazard(frame_height, cls, conf, y1, y2=None):
    if y2 is not None:
        return (max(y1, y2) > frame_height * 0.65
                and min(y1, y2) > frame_height * 0.15
                and (not cls in EXCLUDED_OBJECTS)
                and (True if conf is None else conf > 0.5))
```

Four conditions, no learned component:

| Condition | Meaning |
|---|---|
| `max(y1, y2) > 0.65 · H` | the object touches the floor close to the walker |
| `min(y1, y2) > 0.15 · H` | it is not a tall object reaching into the overhead band |
| `cls not in EXCLUDED_OBJECTS` | not a person, bed, suitcase or sofa |
| `conf > 0.5` | the detector is reasonably sure |

`EXCLUDED_OBJECT_NAMES = ['person', 'bed', 'suitcase', 'couch']` — things you walk
*around*, not *over*. People are excluded here because the pitch deck's architecture
gives pedestrians their own branch (approach-rate analysis, not trip risk).

Because the rule is expressed in frame position rather than metres, it depends on how the
phone is mounted. With the camera model in `src/pathwayEngine.js` — 0.92 m up, angled
20° down — the 0.65 threshold corresponds to floor contact within roughly **1.6 m**.

## Known limitations

- **COCO classes only.** The curled rug edge that features in the demo video is not a COCO
  class and is never boxed by this script. In the reconstruction it is handled as a fixed
  hazard from the room map instead. Detecting soft floor hazards needs a custom-trained
  model — see [../docs/ROADMAP.md](../docs/ROADMAP.md).
- **No tracking.** Every frame is scored independently, so the flag flickers on marginal
  detections. Temporal smoothing is the obvious next fix.
- **No depth.** Distance is inferred purely from vertical frame position, which assumes a
  flat floor and a fixed mount angle.
- **CPU inference by default**, which is not real-time on an older phone. The device build
  would use Core ML.
