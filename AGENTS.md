# AGENTS.md — canonical rules for this project

This file is the **single canonical statement of the loop rules**. README, the role
prompts, and any Notion page mirror it — they never restate rules, they point here.
Every agent (Architect, Designer, Builder, and any sub-agent) reads this first.

## Project

- **Name:** Reels Content Creation dashboard
- **What it is:** see `DIRECTION.md` (read before acting). NOTE: `DIRECTION.md` is
  not yet committed and its draft framing conflicts with what has been built (the
  Character Control Room per `dashboardbuildbrief.md`) — open decision **D-2** in
  `docs/HANDOFF.md`; the human owns reconciliation.
- **Stack:** Verified in the foundation — **Next.js 15.5.x (App Router, TypeScript)
  on Vercel**, **Supabase** (Postgres + Auth + RLS) via `@supabase/ssr`. See
  `docs/contracts/data-contract.md`.
- **User:** solo, non-technical founder. Optimize for low-ops and clarity. Explain
  tradeoffs in plain outcomes, not jargon.

## Roles (separation of powers)

- **Architect (Claude)** — judgment only: arbitration, judging raw results vs
  `GATES.md`, writing the next slice spec + a design brief + a builder block. Never
  writes implementation code or design artifacts. Never commits app code.
- **Designer (Gemini)** — UI/UX artifacts into `docs/design/` only. No app code, no
  git.
- **Builder (Codex)** — all app code, all commits, all `HANDOFF.md` updates. Owns
  git. Builds only what the Designer specified and the Architect approved.

## The rules

1. **The repo is the memory** — not in `docs/HANDOFF.md` = didn't happen.
2. **No one grades their own work** — the Builder never judges its own build; the
   Architect judges, the human ratifies.
3. **Disagreement is mandatory** — surface it in your first response, citing real
   files. Silent compliance = failure. Silent scope additions = failure.
4. **Freeze before results exist** — gates in `GATES.md` and contracts in
   `docs/contracts/` are written before the work and are read-only after freeze for
   the rest of the slice, including their author. Changes need an Architect ruling
   logged in `HANDOFF.md`.
5. **Right model on the right job** — Architect spends tokens on judgment, Designer
   on design, Builder on building. Stay in your lane.
6. **Verify against reality** — versions, prices, API shapes, design-platform
   capabilities checked against current reality and cited (source + date). No
   training-data values.

## Git policy (critical)

- Only the Builder (Codex) runs git writes for **app code** (`init`, `add`,
  `commit`, `push`).
- No Cowork/Claude session and no Gemini session may run app-code git writes here —
  sandbox sync corrupts git's atomic writes. They edit files; Codex commits.
- **Exception (logged):** the Architect may commit **docs/markdown only** when no
  Builder is in-session and the execution container is ephemeral, to keep the repo
  memory durable. Never app code.
- Local commits only until a GitHub remote is added on purpose.

## Parallel isolated builders

The Architect may run multiple Codex builders concurrently: one fresh `codex exec`
(xhigh) per lane, each in its own **git worktree**. Builders must argue with the spec
before building (silent compliance = defect), build only their declared files (no two
lanes touch the same file), and report raw results. They physically can't commit — the
sandbox protects `.git`. Lanes merge only after the reviewer's APPROVE.

## Notion → repo sync policy

Notion is consulted only by the Architect, at direction-sync or spec-writing time.
Builders and the Designer never fetch Notion — repo copies (`DIRECTION.md`,
`docs/flow-packets/`) are the only direction sources they read. Insufficiency or
contradiction is raised as a **disagreement, not a fetch**. Every synced doc carries a
**"last synced: <date>"** line; the human triggers re-syncs when direction changes.

## Accessibility & quality baseline (UI work)

- Target WCAG 2.2 AA: contrast, focus states, keyboard nav, reduced-motion, semantic
  structure.
- Every component spec lists all states: default, hover, focus, active, disabled,
  loading, empty, error.
- Responsive from the start: behavior at small / medium / large breakpoints.
