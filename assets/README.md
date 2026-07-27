# Assets

Provenance for everything in this directory.

- [`assets/`](.) — stills recovered from the original pitch deck, plus two screenshots of the
  reconstructed browser demo.
- [`assets/hackathon/`](./hackathon) — photographs taken by the team during the event.
- [`assets/videos/`](./videos) — video recorded during the event, showing the original
  detector and the original iOS app running.

---

## Hackathon video — `assets/videos/`

**All four clips are original hackathon footage.** They are recordings of the detector and
the iOS app that ran during the event — not recordings of the reconstructed browser demo in
this repository. None of them has been re-created, re-shot or re-rendered.

Sources live in `media-videos/`, which is git-ignored: 692 MB of camera-roll originals, one
of which cannot be published at all (see [Full pitch](#full-pitch--not-published) below).

Encoding applied to all four: **H.264 / yuv420p, 30 fps, `+faststart`** for progressive
playback in the browser, **no audio track** (none of the three sources had one).

| Final file | Original | Duration | Dimensions | Original → final | Trimmed | Cropped | Blurred | Audio |
|---|---|---|---|---|---|---|---|---|
| `original-live-object-detection.mp4` | `liveYOLO-styleobject detection.mp4` | 16.3 s | 810 × 1440 | 63.0 MB → 10.9 MB | No | No | No | None in source |
| `original-floor-hazard-detection.mp4` | `hazardfiltering.mp4` | 16.3 s | 810 × 1440 | 56.0 MB → 10.2 MB | No | No | No | None in source |
| `original-pathway-ios-app.mp4` | `originalPathway phoneapp.mov` | 18.6 s | 786 × 1630 | 43.8 MB → 7.0 MB | **Yes** | No | No | None in source |
| `original-incident-log.mp4` | `originalPathway phoneapp.mov` | 5.4 s | 786 × 1630 | (same source) → 0.6 MB | **Yes** | No | No | None in source |

**What each one shows.** Verified frame by frame, not assumed from the filename:

- **`original-live-object-detection.mp4`** — the surviving detector running over a walk
  through the test lounge, drawing green boxes and confidence labels over everything it
  recognises: `couch 0.92`, `teddy bear 0.72`, cups, the coffee table. Nothing is judged yet.
  A rug with a curled-back edge is visible on the floor throughout.
- **`original-floor-hazard-detection.mp4`** — the same walk with the hazard rule applied.
  The couch, the mugs, the apple and the table get no box at all; only the teddy bear on the
  floor is promoted, with a thick red box, once it enters the hazard band. This is the
  original behaviour that [`classifyDetection()`](../src/pathwayEngine.js) ports.
- **`original-pathway-ios-app.mp4`** — the original Pathway iOS app: the title pill, the
  left rail of large circular controls, a "Rug detected" toast with a steer arrow, then a
  "Teddy bear detected" toast with a red box on the floor object.
- **`original-incident-log.mp4`** — the app's Incident Log sheet, listing
  `t = 1s — Warped rug detected. Trip hazard ahead.` and
  `t = 10s — Teddy bear detected on floor. Trip hazard ahead.`, both dated 21st Feb 2026,
  each with a captured still.

### Two accuracy notes about the app recording

**It is a simulator recording, not a phone held in a room.** The clip opens on a card reading
*"Demo Video Paused — tap play to resume the mockup preview."* The app is being driven from a
recorded walkthrough as its camera source, and the last seconds of the source show Xcode
behind it. The interface, the detection overlays, the toasts and the incident log are all the
real app; the camera feed behind them is a recording. Nothing in this repository describes
this clip as a live camera session.

**It was trimmed for that reason.** The source runs 27.9 s and ends by switching to Xcode.
The published app clip stops at 18.6 s and the incident-log clip covers 18.4–23.8 s, so the
IDE reveal at ~25.5 s is not published. No content was removed other than that tail.

### Privacy review of the published clips

Every frame of all three sources was inspected. **Nothing was blurred or redacted, because
nothing needed to be.** Specifically checked for and not present: phone numbers, addresses,
map pins, contact names, notifications, private messages, email addresses, browser tabs,
login screens, QR codes, ID cards and account details. No person appears in any of the four
published clips. None of the sources carries an audio track, so there is no private
conversation to remove.

The only on-screen text is the app's own UI, the detector's own labels, and a simulator
status bar showing `01:54` with no carrier name.

### Full pitch — not published

`FinalPitchDemo.MOV` — 552.9 MB, 7 min 56 s, 1920 × 1080, HEVC, 30 fps, stereo AAC plus a
four-channel spatial track. Filmed on a tripod from the back of the lecture theatre. The
slides are legible at full resolution, the presenters are audible, and the live-demo segment
is clearly visible.

**It is deliberately not committed and not published anywhere — not in the repository, not as
a Release asset, and not on any video host.** Four things in it would be published with it:

| # | What | Where | Legible? |
|---|---|---|---|
| 1 | A **real UK mobile number** and a **contact name** on the projected outbound-call mockup | ≈ 238–262 s | Yes — transcribable at full resolution, on both projector screens |
| 2 | A **named individual** with a **portrait photograph**, quoted on the "Validation Synthesis" slides | ≈ 100–135 s | Yes — name and face both clear |
| 3 | The **name of a care home** the team had contacted, on the closing slides | ≈ 320–460 s | Yes |
| 4 | An audience of **other hackathon participants**, filmed without documented consent | throughout | Mostly from behind |

Item 1 is the same call screen the team already excluded from the pitch-deck stills in this
directory. Items 2 and 3 are the same details redacted from
`hackathon/whiteboard-planning-session.jpg` and from
[PITCH_DECK_SUMMARY.md](../docs/PITCH_DECK_SUMMARY.md).

The camera never moves, so fixed redaction boxes over windows 1–3 would be technically
reliable. That work has not been done here because publishing the video at all is a decision
about a named third party's face and name, which is not a decision this repository should
make silently.

`thumbnails/original-final-pitch.jpg` is taken from **34 s** — the thesis slide, *"We mount
standardised NHS walking frames to make them smart."* That frame contains none of the four
items above.

---

## Hackathon photographs — `assets/hackathon/`

All eight were taken by the team at the Oxford Venture 2026 Hackathon. None are staged
recreations and none were generated.

Every file was processed the same way before being committed:

- resized so the longest edge is at most **1600 px**
- saved as **progressive JPEG, quality 82**
- **all EXIF discarded**, including any GPS coordinates and device identifiers
- privacy redactions burned in **at full resolution, before the downscale**, so redacted
  pixels cannot be recovered from the published file

The originals live in `media-images/`, which is git-ignored — committing both the HEIC and
the JPEG of each photograph would roughly triple the size of the repository for no benefit,
and GitHub does not render HEIC in Markdown at all.

| File | Original | What it shows | Converted from HEIC | Cropped | Redacted |
|---|---|---|---|---|---|
| `first-place-team.jpg` | `1stPlaceTeamPic.jpg` | The four-person team holding the first-prize certificate in front of the announcement screen | No | No | No |
| `first-place-announcement.jpg` | `1stPlaceScreen.HEIC` | The announcement screen: "Oxford Venture Hackathon · 1st Prize · Pathway" | **Yes** | No | No |
| `final-presentation.jpg` | `FinalPresentation.jpg` | Presenting the Pathway title slide to the judges | No | No | No |
| `outdoor-walker-test.jpg` | `OutsideWalkerTest.jpg` | Testing the improvised frame with the phone mounted, outdoors in Oxford | No | No | No |
| `oxford-street-interview.jpg` | `StreetInterview.jpg` | A team member interviewing a member of the public who uses a walking frame | No | No | **Yes — face obscured** |
| `overnight-team-working.jpg` | `TeamWorking.HEIC` | The team room overnight; 3D-printer filament and printed brackets on the table | **Yes** | No | No |
| `walker-fall-test.jpg` | `WalkerFall.HEIC` | Assembling the lacrosse-stick frame with the printed brackets during fall testing | **Yes** | No | No |
| `whiteboard-planning-session.jpg` | `WhiteboardSession.HEIC` | The glass whiteboard carrying the problem framing, the statistics and the pitch structure | **Yes** | No | **Yes — two text blocks** |

No image was cropped. Framing is unchanged from the original in every case, so nothing has
been removed from the context of a photograph.

### Privacy edits made

**`oxford-street-interview.jpg` — face obscured.** The person being interviewed is a member
of the public, not a team member, and did not consent to their photograph being published.
Their face is pixelated and blurred (irreversibly, at full resolution). Everything else in
the frame is untouched: the street, the walking frame and the interaction all remain
legible, which is the part that documents the field research. The team member in the
photograph is not obscured.

**`whiteboard-planning-session.jpg` — two blocks redacted.** Two solid boxes were burned
into the image:

1. A draft alert script written on the board, reading in part *"your grandma [name] has
   fallen at her home in [street]"*. It contained a personal first name and a residential
   street name. Whether it was a real example or an invented one, it does not belong in a
   public repository.
2. A boxed **care-home name**. Two of the four care homes the team contacted expressed
   interest in a follow-up test or a scheduled demonstration; naming one of them publicly
   would identify a third-party organisation that never agreed to be named, and risks
   implying a formal arrangement that does not exist.

The rest of the whiteboard is unaltered. The remaining handwriting is the team's own problem
framing, the published NHS/NICE statistics, and the pitch structure — with team members'
first names against the sections they owned, which are already published in the README.

### Checked and found clear

Every image was inspected at full resolution before processing. Specifically checked for,
and **not** present: phone numbers, email addresses, home addresses, QR codes, student or
staff ID numbers, login screens, private messages, and maps with residential pins.

Two things were found, inspected closely, and left in deliberately:

- **Lanyard badges in `first-place-team.jpg`.** Two are legible at full zoom and show two
  team members' own names, which the README already publishes. No affiliation, ID number or
  contact detail is readable.
- **Laptop screens in `overnight-team-working.jpg`.** The visible screen shows the team's own
  pitch deck — the slide reading "Falls cost the NHS around £2.3 billion annually". No
  personal accounts, inboxes or private browser tabs are visible.

### Not published

No photograph was excluded outright. Two **pitch-deck screenshots** are excluded — see
"Deliberately excluded" below — and the git-ignored originals in `media-images/` are the only
place the unredacted whiteboard and unblurred interview photograph exist.

---

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
| `prototype-walker-mount.jpg` | 20 | The hardware: a 3D-printed mount on a frame improvised from lacrosse sticks |

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

## Video thumbnails — `assets/videos/thumbnails/`

One frame per published clip, chosen for a readable overlay and no motion blur.

| File | Frame | Why this frame |
|---|---|---|
| `live-object-detection.jpg` | 9.0 s | `couch 0.92` and `teddy bear 0.72` both boxed and legible |
| `floor-hazard-detection.jpg` | 10.5 s | The red hazard box on the teddy bear, with the couch, mugs and table visibly *not* boxed |
| `original-ios-app.jpg` | 12.0 s | "Teddy bear detected" toast, steer arrow, red box, full control rail |
| `incident-log-demo.jpg` | 2.0 s | Both log entries readable, including the warped-rug entry |
| `original-final-pitch.jpg` | 34.0 s | The thesis slide; no private data in frame (see above) |

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
