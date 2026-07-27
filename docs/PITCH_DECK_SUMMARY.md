# Pitch deck summary

Source: `Pathway.pptx`, 35 slides, Oxford Venture 2026 Hackathon. The file itself is
git-ignored (262 MB — over GitHub's file limit); extracted stills are in [`assets/`](../assets/).

**This deck won 1st place in a field of 115 participants.** It was presented at the end of a
36-hour build by a team that formed at the event. The narrative around the deck — the field
research, the improvised hardware, the live fall demonstration — is in
[HACKATHON_STORY.md](./HACKATHON_STORY.md).

Two sets of images document the same project from different angles:

- [`assets/`](../assets/) holds stills pulled out of **this deck** — the demo footage, the app
  UI, the architecture slide. They show what the original build produced.
- [`assets/hackathon/`](../assets/hackathon) holds **photographs taken during the event** — the
  whiteboard, the street interviews, the improvised frame, the presentation and the result.
  They show how it was produced. Provenance and privacy redactions for both sets are in
  [assets/README.md](../assets/README.md).

---

## Positioning

> **Pathway** /ˈpɑːθweɪ/ — a cost-driven, environmental mobility solution for an ageing
> population. ML-driven software + hardware.

**Thesis (slide 7):** *"We mount standardised NHS walking frames to make them smart."*

## Problem (slides 2–4)

- 220,000 UK A&E admissions in 2024 were due to falls — *NICE*
- Falls are the leading cause of injury-related death in over-65s: 38,000+ deaths in 2021 — *US CDC*
- Falls cost the NHS around £2.3 billion annually — *NHS England, Falls Improvement Programme*

## Solution (slides 5–10)

The NHS gives walking frames away free. Most families have an old phone in a drawer.
Pathway joins those two facts.

Four capabilities, numbered on slide 8:

1. Powered by a repurposed old phone mounted to the frame, hands-free
2. Angular-acceleration-driven algorithmic fall detection
3. A novel "D.A.I." approach to indoor obstacle avoidance and hazard mapping
4. Visual device-user visibility haptics for oncoming pedestrians — outdoor crash avoidance

**Event driven (slide 9):** *"Each event triggers a closed loop feedback mechanism that
records the event, initiates text messages, phone-calls and hazard triaging."*

**Differentiation (slide 10):** environment-centric and cost-driven for accessibility.

## Validation (slides 11–14)

| | |
|---|---|
| **32** | public interviews conducted around Oxford |
| **68%** | knew an adult who had fallen in the last year |
| **4** | care homes contacted; **2** expressed interest in a follow-up test or a scheduled demonstration |
| **2** | elderly-care experts expressed interest |

Neither care home became a formal partner and no trial was agreed.

> *"My **biggest fear** isn't falling myself; it's my parents falling when **no one's there
> to catch them**."* — Sarah, 42, from Oxfordshire

Persistent themes from the synthesis slides:

- People worry about knowing whether their loved ones are safe
- **Most walker users stay indoors**, and the biggest risks are trip hazards inside
- Technology can be difficult for elderly users to understand
- Indoor obstacles are the biggest risk → hazard triaging (building a list of hazards)
- Caretakers would feel better if they were **in the loop**

Each of these has a direct consequence in the build — see the "What the interviews changed"
section of the demo page.

## Demo (slides 15–20)

The demo section ran four labelled segments over live footage, then a live demo:

1. **Dynamic object detection**
2. **Static environment mapping**
3. **Hazardous object detection**
4. **Indoor novel D.A.I. approach to indoor navigation**

Then live: the phone mounted to the frame, walked through a living room containing a sofa,
a low glass coffee table, mugs on a side table, a soft toy on the floor and a rug with a
curled-back edge.

Recovered stills:

| Still | What it shows |
|---|---|
| [`demo-dynamic-detection.jpg`](../assets/demo-dynamic-detection.jpg) | Live YOLO output, green boxes, `couch 0.49` |
| [`demo-static-mapping.jpg`](../assets/demo-static-mapping.jpg) | LiDAR room capture with 3D furniture bounds |
| [`demo-app-ui.jpg`](../assets/demo-app-ui.jpg) | The Pathway app: title pill, left rail of large circular buttons |
| [`alert-help-screen.jpg`](../assets/alert-help-screen.jpg) | Full-screen red HELP, "Contact emergency" / "Crisis averted" |
| [`prototype-walker-mount.jpg`](../assets/prototype-walker-mount.jpg) | The rig — a 3D-printed mount on a frame improvised from lacrosse sticks |

Two further screenshots in the deck show a real SMS with a location pin and a real outbound
call. Both are excluded here because they contain a residential address and a mobile
number; the browser demo recreates both screens with placeholder data.

## Technical architecture (slide 21)

Reproduced as [`architecture-original.jpg`](../assets/architecture-original.jpg) and walked
through in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Market (slides 22–26)

| | |
|---|---|
| **TAM** | 2.2M UK users — 13M aged 65+, 17% use walkers |
| **SAM** | 334,000 users — 16,700 care homes × 45 residents × 45% |
| **SOM** | 16,700 users — 5% care-home penetration |
| **Global** | ~96M older adults worldwide rely on walkers (US 7M, JP 4.5M, DE 2.6M) |

## Next steps (slide 28)

1. Scheduled meeting with an interested care home to demonstrate the product. The slide names
   it; this repository does not, and the name is redacted from the published whiteboard
   photograph, because the care home never agreed to be identified publicly
2. Looking into protecting the IP specific to NHS walkers
3. Considering both D2C and B2B (selling to care homes)
4. Starting fundraising goal of £75,000

## Appendices (slides 30–35)

**Competitive position.** Camino bills itself as the world's first smart walker: founded
six years ago, still not shipping, $2,499 pre-release / $2,999 list, plus $50/month. It
assists *mechanically* — a parallel market, not a safety product.

Pathway's counter: **£0.24 unit cost**, built in one day, ~10⁴× more cost effective, and it
takes both proactive (avoid falls) and reactive (attract assistance) measures.

**Accessibility.** Cited research that age-specific UI optimisation measurably improves
cognitive performance and reduces perceived effort for elderly mobile app users. This is
why the on-device interface is one pill, one rail of large buttons and a full-screen
confirmation. See [ACCESSIBILITY.md](./ACCESSIBILITY.md).

**E-waste.** 40.4% of people upgrade their phone every two to three years; over 5 billion
phones are discarded worldwide every year. Repurposing one is the environmental half of the
"cost-driven, environmental" positioning.

**ICPs.** Three profiles: the individual (70–85, uses a walker daily, wants independence),
the caretaker (responsible for a parent or patient, tech-comfortable, wants peace of mind)
and the business (UK care homes, budget conscious, wants fewer fall incidents and an ROI).
The deck maps these against decision power: the NHS sponsors, caretakers own, family
advocates, and the elderly are the primary users.

**Acknowledged alternative.** A mentor raised smart glasses as a lower-friction form
factor. The team agreed, noting low current adoption and that the approach could extend to
other devices later.

---

*Figures above are reported as the team presented them. They are not independently
verified in this repository.*
