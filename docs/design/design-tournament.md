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

_Status: Round 2 in progress. Winners TBD by operator._

---

## Standing constraints (every candidate)
Channels-hub screen · both light + dark (semantic tokens + toggle) · harmonized traffic-light with a
**distinct non-red signature** (red = danger only), AA both modes · honest to the data model (uncast
states, no fabricated per-channel analytics beyond active-jobs + spend, thumbnail-or-placeholder) ·
self-contained (no external fonts/scripts/images) · plain CSS only · product wordmark is the Control
Room's own — never a vendor name.
