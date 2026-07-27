# Assets

Provenance for everything in this directory.

- [`assets/`](.) — stills recovered from the original pitch deck, plus two screenshots of the
  reconstructed browser demo.
- [`assets/hackathon/`](./hackathon) — photographs taken by the team during the event.

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
