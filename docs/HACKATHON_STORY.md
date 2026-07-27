# The 36-hour build

How Pathway went from four strangers in a room to **1st place in a field of 115 participants**
at the Oxford Venture 2026 Hackathon.

This is the human record of the build. The engineering record lives in
[ARCHITECTURE.md](./ARCHITECTURE.md), [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md)
and [RECONSTRUCTION_NOTES.md](./RECONSTRUCTION_NOTES.md).

---

## The team formed at the event

Jake Smith, Caleb Byrne, Antony He and Aiyush Gupta had not met before the hackathon. There
was no pre-existing team, no shared repository, no idea agreed in advance. They met on site,
formed a team there, and spent the first hours doing the thing that decided everything
afterwards: choosing a problem worth 36 hours.

What each of them brought turned out to be complementary rather than overlapping — user
research, software architecture and computer vision, CAD and market analysis, product
framing and the pitch. That is why the project ended up spanning software, hardware and
field research instead of being four people editing the same file.

<table>
<tr>
<td width="50%"><img src="../assets/hackathon/whiteboard-planning-session.jpg" alt="A glass whiteboard covered in the team's problem framing, statistics and pitch structure"></td>
<td width="50%"><img src="../assets/hackathon/overnight-team-working.jpg" alt="Two team members working at laptops in the hackathon room, 3D-printer filament on the table"></td>
</tr>
<tr>
<td><sub><b>Mapping the problem.</b> The whiteboard carries the structure the pitch ended up following. Two areas are redacted — see <a href="../assets/README.md">assets/README.md</a>.</sub></td>
<td><sub><b>Building through the night.</b> Filament spool and printed brackets on the table, next to the deck.</sub></td>
</tr>
</table>

## Choosing the problem

Falls in older adults were on the whiteboard within the first session, and the numbers held
up: 220,000 UK A&E admissions from falls in 2024 (NICE), falls as the leading cause of
injury-related death in the over-65s (US CDC), roughly £2.3 billion a year to the NHS (NHS
England).

The gap the team went after was not detection technology. It was cost. The NHS gives walking
frames away. The one competing smart walker starts at $2,499 plus a monthly subscription
and, six years after founding, still is not shipping. Meanwhile most households have a
retired smartphone in a drawer that already contains a camera, an accelerometer, a
gyroscope, connectivity and a processor.

Pathway is the join between those two facts: **retrofit the frame the user already has with
the phone that is already in the drawer.**

## Leaving the building

The team did not want to build on desk research alone, so they went out into Oxford and
spoke to people.

**32 interviews with members of the public.** **68%** knew an older adult who had fallen in
the previous year. Three findings changed the build:

| Finding | What changed |
|---|---|
| Most walker users spend their time **indoors** | Indoor hazard detection became the core of the product; the outdoor pedestrian-visibility branch was descoped |
| Caregivers want to be **in the loop**, not informed afterwards | Every event ends in a triage decision that can escalate to a person, not a silent log entry |
| Technology is often **hard for older users** | One status pill, one rail of large buttons, and a full-screen confirmation with an equally prominent way out |

In parallel the team contacted **four care homes**; **two expressed interest in a follow-up
test or a scheduled demonstration**. **Two elderly-care experts** also expressed interest.
None of this was a formal partnership or a committed trial, and it is not described as one
anywhere in this repository.

<table>
<tr>
<td width="50%"><img src="../assets/hackathon/oxford-street-interview.jpg" alt="A team member interviewing a member of the public who is using a walking frame, on an Oxford street"></td>
<td width="50%"><img src="../assets/hackathon/outdoor-walker-test.jpg" alt="A team member pushing the improvised walker frame with the phone mounted, on a wet Oxford pavement"></td>
</tr>
<tr>
<td><sub><b>Talking to people, not just to search results.</b> 32 interviews around Oxford. The interviewee's face is obscured for privacy.</sub></td>
<td><sub><b>Testing outdoors.</b> The improvised frame, phone mounted, walked over real paving.</sub></td>
</tr>
</table>

## The walking frame that never arrived

A retrofit product needs something to retrofit. The team asked **three hospitals and Oxford
medical contacts** whether a walking frame could be borrowed for the weekend.

It was a weekend. Nobody could get one released in time.

The options were to drop the hardware demonstration and present software on a laptop, or to
build a frame. The team built a frame — out of **old lacrosse sticks and duct tape**, sized
so that a phone could be mounted at roughly the height and angle a real crossbar would give.

It held the phone. It rolled. It could be tipped over on purpose. That was enough to
demonstrate the concept end to end.

It should be read for exactly what it is: **an improvised hackathon rig, not production
hardware, and not a medical device.** Nothing about its geometry, stability or materials has
been validated against a real walking frame.

## 2:00 a.m., and a 45-minute walk

The phone still needed a mount that would hold it at a fixed, known angle — the camera
projection only makes sense if the camera stays put.

At around **2:00 a.m.**, a friend agreed to lend the team a 3D printer. The team walked
roughly **45 minutes** to collect it, carried it back, then designed and printed a
smartphone holder for the improvised frame before the presentation.

The printed brackets are visible on the table in the overnight photograph above, and clamped
to the frame in the fall test below.

## Overnight testing

The rest of the night went into the loop that mattered: mount the phone, walk the frame at
hazards, watch what the detector admitted and what it filtered out, tip the frame over,
watch whether the fall logic fired, adjust, repeat.

<table>
<tr>
<td width="50%"><img src="../assets/hackathon/walker-fall-test.jpg" alt="A team member on the floor assembling the lacrosse-stick frame with 3D-printed brackets during fall testing"></td>
<td width="50%"><img src="../assets/hackathon/final-presentation.jpg" alt="A team member presenting the Pathway title slide to the judges"></td>
</tr>
<tr>
<td><sub><b>Simulated-fall testing.</b> The frame, the printed brackets, and a lot of controlled tipping.</sub></td>
<td><sub><b>Presenting to the judges.</b> The final pitch, 36 hours after the team met.</sub></td>
</tr>
</table>

## What the footage caught

Four recordings from those hours survived, and they are the closest thing left to the
original build actually running. They are in [`assets/videos/`](../assets/videos) and are
laid out in the [README](../README.md#original-hackathon-footage).

Two are camera recordings of the detector: one pass through the test lounge with everything
boxed and labelled, and the same pass with the hazard rule applied, where the couch and the
mugs and the table all drop away and only the soft toy on the floor keeps a red box. Watching
them back to back is the clearest statement of what Pathway actually did.

The other two are screen recordings of the iOS app — the control rail, a "Rug detected"
toast, a "Teddy bear detected" toast, and the incident log listing a warped rug at one second
and a floor obstacle at ten, each with a captured still and a timestamp.

That log is the part worth pausing on. It is the "caregivers want to be in the loop" finding
from the street interviews, turned into a screen, inside 36 hours.

The full pitch was also filmed, and is **not published** — the projected slides carry a real
phone number, a named individual and a named care home. See
[assets/README.md](../assets/README.md) for the detail.

## The live demonstration

The final presentation ended with the demonstration the team had spent the night earning.

They **tipped the prototype over in front of the judges** to simulate a fall. Pathway
detected the event and ran the escalation workflow — and a **real phone call was placed to
the team's phone, live, in the room.**

The point was not the phone ringing. The point was that the loop closed: sensor event →
detection → triage → contact, with no human in the middle. Most hackathon safety demos stop
at a mock-up screen.

Two honest caveats, which the team also made in the room:

- It was a **hackathon prototype**, not a clinically validated safety system. The fall
  thresholds were engineering judgement, never fitted to recorded falls.
- The escalation ran on the team's own phone and contacts. **This repository's browser demo
  simulates that flow — it is not wired to any live SMS or voice service**, and no real
  number or address appears anywhere in it.

## The result

🏆 **1st Place, Oxford Venture 2026 Hackathon** — 1st place in a field of 115 participants,
36 hours after four strangers sat down together.

The award was announced by the Oxford Saïd Entrepreneurship Centre at Saïd Business School;
the prize was £1,500 alongside sponsor credits.

<table>
<tr>
<td width="55%"><img src="../assets/hackathon/first-place-team.jpg" alt="The four-person Pathway team holding the first-prize certificate in front of the announcement screen"></td>
<td width="45%"><img src="../assets/hackathon/first-place-announcement.jpg" alt="The announcement screen reading Oxford Venture Hackathon, 1st Prize, Pathway"></td>
</tr>
<tr>
<td><sub><b>The team after winning 1st place in a field of 115 participants.</b></sub></td>
<td><sub><b>The result on screen</b> at the Oxford Venture 2026 Hackathon.</sub></td>
</tr>
</table>

## What we learned

**Field research beats desk research, and it is faster than it looks.** Walking into Oxford
and asking 32 people a question took an afternoon and reversed a product decision — indoors,
not outdoors. No amount of reading would have produced that with the same confidence.

**Constraint is a design tool.** No walking frame available meant improvising one, and the
£0.24 hardware figure the deck leads on came from having no budget in the first place. The
cheapness became the pitch rather than an apology inside it.

**Demonstrate the loop, not the screen.** The judges did not need to see a detection
overlay; they needed to see a phone ring. Building toward one end-to-end moment shaped what
was worth finishing and what was worth cutting.

**Write down which numbers are measured.** Almost everything quantitative in the original
build was judgement — thresholds, weights, severities. Recording that honestly at the time
made this reconstruction possible; the alternative would have been a repository full of
numbers nobody could defend. See [RECONSTRUCTION_NOTES.md](./RECONSTRUCTION_NOTES.md).

**Sleep is a real dependency.** The 2:00 a.m. printer walk was fun and it was also the
symptom of a plan with no slack in it.

## Original versus reconstructed

The distinction matters, so it is stated in every document rather than assumed.

**Original — produced during the 36 hours:** the surviving hazard detector
[`vision/hazard_detector.py`](../vision/hazard_detector.py), the 35-slide pitch deck and its
demo footage, the architecture slide, the physical prototype and its 3D-printed mount, the
live phone-call demonstration, the 32 field interviews and the care-home outreach, the
photographs on this page, and the video in [`assets/videos/`](../assets/videos).

**Reconstructed — written afterwards for this repository:** the browser interface, the
JavaScript engine in [`src/pathwayEngine.js`](../src/pathwayEngine.js), the camera
projection model, the hazard scoring and triage models, the synthetic motion scenarios in
[`data/sampleEvents.js`](../data/sampleEvents.js), the mock caregiver dashboard, the 27
automated tests, and this documentation set.

**Still missing, and not reconstructable:** the original iOS app **source** (SwiftUI,
RoomPlan, CoreMotion), the recorded sensor traces, the real SMS and voice integration, the
Core ML deployment code, and any clinically validated fall thresholds. The footage shows the
app running; it does not bring the code back.

---

*Pathway is a hackathon prototype and a portfolio artefact. It is not a medical device, it
has not been clinically validated, and it must not be relied on by anyone at risk of
falling.*
