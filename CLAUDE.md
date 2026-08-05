# CLAUDE.md — Reels Content Creation dashboard

Claude Code orientation for this repo. This file is a **pointer, not a second source
of truth** — the rules, product direction, and live state each have one canonical
home below; nothing here overrides them. Its job is to hand a fresh Claude session
the read order.

## Read in this order

1. **[`governance.md`](governance.md)** — the canonical 42-rule working governance
   (cross-team; shared with the pipeline repo — one canonical statement, keep the
   two copies in sync per its rule 2). Read FIRST.
2. **[`AGENTS.md`](AGENTS.md)** — what is specific to THIS project: the vendor/role
   mapping (Architect = Claude, judgment only, holds the commit pen; Designer =
   Gemini; Builder = Codex, cannot commit), the dashboard-local ADDITIVE rules
   L-1…L-6 (HQ-first, the suerta reviewer, terse operator updates, vendor split,
   tier→model mapping, HQ-then-handoff wrap-up), git policy, and parallel builder
   lanes.
3. **[`DIRECTION.md`](DIRECTION.md)** — product ground truth (human-owned): the
   Control Room, channel-first spine (D-6), the ownership split — the dashboard
   owns inputs (channels, characters/bibles, ideas), the pipeline owns the middle,
   runs/receipts are read-only, `jobs` is enqueue-only.
4. **[`docs/SESSION-HANDOFF.md`](docs/SESSION-HANDOFF.md)** — live state: the
   newest session close-out first (rule 41); entries older than the two most
   recent are rotated verbatim into `docs/handoff-archive/` (rule 34).
5. **[`GATES.md`](GATES.md)** + **[`docs/contracts/data-contract.md`](docs/contracts/data-contract.md)**
   — the frozen acceptance gates and the cross-repo data contract.

## Cross-team boundary

The content pipeline is a **separate repo/workforce**:
`recklessfrags/reels-content-generation` (its own `CLAUDE.md` +
`docs/SESSION-HANDOFF.md`, same rotation pattern). Both share one Supabase
project; coordination happens through the Notion 📮 Coordination Log per
governance — never by assuming the other repo's state from a cached view (L-1).
