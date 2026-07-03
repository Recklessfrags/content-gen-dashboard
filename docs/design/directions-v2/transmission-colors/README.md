# Transmission — color treatments (style locked, palette explored)

_Operator likes the **Transmission** style + the **traffic-light** status idea, but not its
colors. Root problem (see `../../design-research-2026.md` §4b): Transmission's red `--accent` doubled
as **both** brand and danger — violating "a status color must never be the brand color." These three
treatments keep the Transmission **style byte-identical** (verified: only color-token values, a new
`--signature` token, and `var(--accent)`→`var(--signature)` re-pointing on brand/priority elements
changed — no layout/markup/type edits) and rework only the palette: a **distinct non-red signature**
frees red for danger-only, and the green/amber/red trio is tuned into a **harmonious family**. All
AA in both modes (ratios in each `.md`); both light + dark ship._

| # | File | Signature (brand) | Status trio | Feel |
| --- | --- | --- | --- | --- |
| **CT1 — Teal signature** | `transmission-ct1-teal.html` | cool **teal/jade** (`#0D6E66` / dark `#2DD4BF`) | earthy green / warm amber / clear red | warm base + a crisp modern brand layer that pops; highest contrast between brand and status |
| **CT2 — Warm brass/terracotta** | `transmission-ct2-brass.html` | rich **brass/ochre-gold** (`#936718` / dark `#C99738`) | olive / ochre / brick — all muted | fully warm, vintage-editorial "aged broadcast manual"; most subdued & premium |
| **CT3 — "Earth & Phosphor" (Gemini's choice)** | `transmission-ct3-designerschoice.html` | **electric indigo** (`#4338CA` / dark `#939BF4`) | kelp green / rust amber / faded crimson | the experiment — a sharp digital indigo brand deliberately contrasting a warm "analog" status system; confident & unexpected |

**The experiment (CT3):** commissioned with the palette left entirely to the designer (Gemini) —
no direction on hue. It chose electric indigo as a "purely digital" brand signal set against an
earthy traffic-light, calling it *Earth & Phosphor*. Rationale in its `.md`.

**All three fix the core issue** — brand color ≠ status color — so the traffic light finally reads
as one calm system. Pick a palette (or a hybrid, e.g. "CT1's teal but CT2's muted status trio"),
and it becomes Transmission's locked color layer for the full Phase-1 design system. Two known mock
nits carried over (toggle button label doesn't update on click; both modes still switch correctly).
