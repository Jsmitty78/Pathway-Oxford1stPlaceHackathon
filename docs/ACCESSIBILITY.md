# Accessibility notes

Two different interfaces with two different users, and they pull in opposite directions.

The **on-device interface** is used by someone in their seventies or eighties, possibly
mid-stumble, holding a walking frame with both hands. The **project page** is read by
developers and caregivers on a laptop. Only the second one is built here; the first exists
as a mock inside the demo and as screenshots in `assets/`.

The deck cites research that age-specific UI optimisation measurably improves cognitive
performance and reduces perceived effort for elderly mobile-app users. That is the design
constraint, and one of the three persistent interview themes was that *technology can be
difficult for elderly users to understand*.

---

## On-device interface

Reconstructed from `assets/demo-app-ui.jpg` and `assets/alert-help-screen.jpg`.

- **One title pill, one rail of large circular buttons.** No menus, no tabs, no gestures to
  learn. Targets are ~44 px and evenly spaced.
- **The HELP screen is the whole screen.** Full-bleed red, one word in the largest type the
  device can render, two full-width buttons. Nothing to find, nothing to scroll to.
- **The escape hatch is a first-class button.** "Crisis averted" is the same size and
  prominence as "Contact emergency". A cancel action hidden in a corner is a cancel action
  nobody finds under stress.
- **Guidance is redundant across channels.** The deck's frontend specifies *visual
  directional guidance* **and** *familiar-voice auditory guidance* — an arrow for anyone who
  is looking at the phone, a voice for anyone who is not. Recorded by a family member,
  because a familiar voice cuts through where a synthetic one does not.
- **Nothing requires precise input.** No text entry, no drag targets, no long-press.

**Untested.** None of this has been in front of an older adult. That is phase 5 of the
[roadmap](./ROADMAP.md) and it is the part most likely to invalidate the current design.

## Project page

What is actually implemented in `index.html` and `src/styles.css`.

### Never colour alone

Every score appears three ways: a bar, a percentage, and a sentence.

```
Fall risk   ████████████░░  92%
            fall confirmed — Free-fall, impact and rotation
            signature consistent with a fall.
```

Triage level is a coloured badge **and** the word `critical`. The hazard queue shows a
rank number, a label, a distance and a percentage — not a colour ramp.

The fall-risk bar takes its colour from the detector *stage*, not from bar width, so a 92%
score renders red rather than a green gradient that happens to be nearly full. A meter that
looks reassuring at its most alarming value is worse than no meter.

### Structure and semantics

- One `<h1>`, sections under `<h2>`, no skipped levels.
- The scenario picker is a `role="radiogroup"` of buttons with `aria-checked`.
- Stage buttons carry `aria-current`.
- The triage message is `role="status"` `aria-live="polite"`, so a screen reader announces
  the outcome when a scenario changes without interrupting.
- The canvas has an `aria-label` explaining that it is a simulated camera view, and states
  that every value in it is also available as text in the readout panel — which it is.
- The module table has a `<caption>`, visually hidden.
- A skip link jumps straight to the demo.

### Motion

`prefers-reduced-motion: reduce` collapses every transition and animation to ~0 ms, and the
caregiver dashboard emits its whole event log at once instead of staggering entries. Smooth
scrolling is disabled at the same time.

### Keyboard

- Everything interactive is a real `<button>`, `<a>`, `<input>` or `<details>` — nothing is
  a clickable `<div>`.
- `:focus-visible` gives a 2 px mint outline with 3 px offset against every background.
- <kbd>Escape</kbd> dismisses the HELP takeover, which is the only thing resembling a modal.
- Focus is never trapped or moved without user action.

### Contrast

Against `#080c11`:

| Token | Hex | Ratio | Use |
|---|---|---|---|
| `--text` | `#e9f0f6` | ~16:1 | body |
| `--text-muted` | `#93a7b8` | ~7.6:1 | secondary |
| `--text-dim` | `#6c8093` | ~4.9:1 | captions, ≥14 px only |
| `--mint` | `#3ddc97` | ~10:1 | links, positive state |
| `--red` | `#ff5d5d` | ~5.7:1 | critical state |

All body copy clears WCAG AA comfortably; `--text-dim` is restricted to non-essential
captions that always duplicate information available elsewhere.

### Typography and layout

- System font stack — respects the reader's own font settings, and loads instantly.
- No fixed pixel heights on text containers, so browser zoom and larger default font sizes
  reflow rather than clip.
- Numeric readouts use `font-variant-numeric: tabular-nums` so figures do not jitter as
  they update.
- Responsive down to 360 px; the demo grid collapses to a single column at 1040 px.

## Known gaps

- No screen-reader testing with VoiceOver, NVDA or JAWS. Only semantics and ARIA have been
  reasoned about, which is not the same thing.
- The canvas is decorative-with-a-text-alternative rather than genuinely described. A
  richer `aria-label` that names the current detections would be better.
- No light theme. The demo is a camera view and reads better dark, but a reader who needs a
  light background has no option.
- Colour choices have not been checked against the common forms of colour vision
  deficiency, though the never-colour-alone rule limits the damage.
