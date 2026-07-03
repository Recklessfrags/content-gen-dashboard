# Design tournament — Channels hub visual language

_Operator-run, tournament-style (like the Casting Studio voice tournament): each round generates a
slate, the operator judges, winners advance and get evolved/crossed, converging on one design
language for Phase 1. The operator is the judge (taste call — like the voice audition); the
Architect seeds with a critique + the design rubric; Gemini designs; artifacts in `docs/design/`._

**Rubric (seeding aid, not the decision):** character/point-of-view · hierarchy & scannability for a
daily approval loop · legibility + WCAG AA (both modes) · honesty to the data model · distinctiveness
· buildability in plain CSS.

---

## Bracket

### Round 1 — opening field
- **v1** (`directions/`): A Editorial · B Console · C Operator — **all eliminated** ("dry/stale/
  bland/generic"; colors never briefed).
- **v2** (`directions-v2/`): Transmission · Marquee · Signal — character-forward retry.
  - **Transmission** liked; its color problem fixed in `directions-v2/transmission-colors/`
    (CT1 teal / CT2 brass / CT3 indigo palette options) — **held as a contender.**
- **v3** (`directions-v3/`): N1 Bento Soft · N2 Neo-Brutalist · N3 Terminal Noir.
  - **WINNERS (operator): N1 Bento Soft + N3 Terminal Noir.** N2 Neo-Brutalist eliminated.

**Advancing to Round 2:** N1 Bento Soft, N3 Terminal Noir (+ Transmission held).

### Round 2 — evolve + cross the two winners (`directions-v4/`)
Field:
- **R2-A — Bento Soft v2** (evolve N1): refine craft/hierarchy, elevate the signature.
- **R2-B — Terminal Noir v2** (evolve N3): push editorial serif + hairline grid + Broadcast Pink;
  fix the stray product-name nit.
- **R2-C — Hybrid "Bento × Editorial"** (cross N1×N3): bento tile modularity + massive italic serif
  channel names + a signature; soft depth meets editorial authority.
- **R2-D — Autonomous fusion** (Gemini's call): design a new winner that captures the best of both
  N1 and N3 in its own way.

Architect seeded read: C and B led. **Operator winners: C (Bento×Editorial hybrid) + D (Autonomous
fusion).** Operator noted the round looked too similar — because it CONVERGED (evolve/cross the
winners). Correction: next round diverges.

### Round 3 — DIVERGE, fresh distinct territory (`directions-v5/`)
C and D held untouched. Four brand-new design languages, forbidden from resembling the five explored
looks (dossier/bento/brutalist/terminal-noir/console); two free-roam (operator likes the autonomous
option):
- **R3-1 Spatial / Aurora** — dimensional depth + ambient light, cyan.
- **R3-2 Risograph** — print-craft spot-ink/overprint, orange+blue duotone.
- **R3-3 Avant-garde "TRANSMIT"** (free roam) — bento + colored status edge-bars + outlined numerals.
- **R3-4 Timeless "CHROMA"** (free roam) — restrained Swiss-premium, blue.

_Round 3: operator liked **R3-1 Spatial/Aurora + R3-2 Risograph** (near-opposites). Operator elected
to **narrow toward a decision.**_

### FINAL BALLOT — pick one to become the Phase-1 design language
Finalists: **C** (Bento×Editorial hybrid, `directions-v4/r2c-…`), **D** (Autonomous fusion,
`directions-v4/r2d-…`), **R3-1** (Spatial/Aurora, `directions-v5/r3-1-…`), **R3-2** (Risograph,
`directions-v5/r3-2-…`).

Architect's decision-useful read (for a **daily, dense, money/brand control tool**, solo non-tech
operator, must be AA + fast to scan + work at 412px + endure):
- **C — best all-rounder:** character (editorial serif) + scannable bento + approachable. Low
  build/legibility risk. _Risk: all-pink signature can tire; serif needs care at small sizes._
- **R3-1 — most premium/novel:** luminous depth, beautiful. _Risk: gradients/glow can date and can
  fight data legibility; AA-on-gradient needs care; heaviest to build well._
- **R3-2 — most personality:** distinctive print-craft brand. _Risk: HIGHEST for a daily tool —
  limited-ink/halftone + spot color can hurt dense-data legibility + AA, and can tire; most niche/
  least timeless._
- **D — safest/most conventional:** confident dark operator deck. _Risk: least distinctive._

**Architect recommendation:** **C** for the best character↔usability↔longevity balance; **R3-1** if
you want maximum premium/novelty and accept a bit more build+legibility care. (Taste is the
operator's — this is a starting point.)

_Finalists renamed 1-4 (see `finalists/README.md`): 1 Editorial (C) · 2 Night Ops (D) · 3 Aurora (R3-1) · 4 Risograph (R3-2)._

_Status: **FINAL BALLOT open** — awaiting operator's single pick → then the full Phase-1 design
system + all screens are built against it, through the Gemini + suerta(Fable-5 on money path) gate._

---

## Standing constraints (every candidate)
Channels-hub screen · both light + dark (semantic tokens + toggle) · harmonized traffic-light with a
**distinct non-red signature** (red = danger only), AA both modes · honest to the data model (uncast
states, no fabricated per-channel analytics beyond active-jobs + spend, thumbnail-or-placeholder) ·
self-contained (no external fonts/scripts/images) · plain CSS only · product wordmark is the Control
Room's own — never a vendor name.
