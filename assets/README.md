# Assets

Provenance for everything in this directory.

## Recovered from `Pathway.pptx`

Original hackathon material, extracted from the deck's embedded media and compressed for
the repository. The deck itself is git-ignored — 262 MB, over GitHub's 100 MB file limit.

| File | Deck slide | What it is |
|---|---|---|
| `architecture-original.jpg` | 21 | The technical architecture diagram, rendered from the slide's vector source |
| `demo-dynamic-detection.jpg` | 16 | Frame from the live demo video — YOLO output over the living room, `couch 0.49` |
| `demo-static-mapping.jpg` | 17 | Frame from the LiDAR room-capture video, 3D furniture bounds |
| `demo-app-ui.jpg` | 18 | The Pathway app on the mounted phone: title pill, left button rail |
| `alert-help-screen.jpg` | 20 | The fall-confirmation screen — "Contact emergency" / "Crisis averted" |
| `prototype-walker-mount.jpg` | 20 | The hardware: a clamp on a frame improvised from lacrosse sticks |

## Generated from this repository

| File | What it is |
|---|---|
| `demo-screenshot.jpg` | The browser demo, D.A.I. navigation stage |
| `demo-caregiver-loop.jpg` | The escalation ladder and mock caregiver dashboard |

## Deliberately excluded

Two further screenshots exist in the deck and are **not** included here:

- An iMessage composition showing a real residential address with a map pin
- An outbound call screen showing a real mobile number and contact name

Both are recreated inside the browser demo with placeholder data instead.

## Recording a demo GIF

There is no GIF committed — a good one is 3–5 MB and the demo is more useful live. If you
want one for a README or a slide:

1. Serve the demo (`npm start`) and size the window to about 1400 × 900.
2. Select the **Possible fall** scenario, then press **Play demo flow**. The full six-stage
   sequence, including the HELP countdown and the caregiver escalation, runs in roughly 25
   seconds.
3. Capture the demo area only, not the whole page — the region from the scenario picker
   down to the caregiver dashboard.
4. Record at 12–15 fps. Higher is wasted on this content and triples the file size.

   - **macOS:** <kbd>⇧⌘5</kbd> to record a region, then
     `ffmpeg -i in.mov -vf "fps=14,scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" out.gif`
   - **Cross-platform:** [Peek](https://github.com/phw/peek) or [LICEcap](https://www.cockos.com/licecap/) record straight to GIF.

5. Keep it under 5 MB, or GitHub will be slow to render it. If it will not fit, record the
   fall scenario alone rather than dropping the frame rate further.
