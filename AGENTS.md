# AGENTS.md — canonical rules for this project

This file is the **single canonical statement of the loop rules**. README, the role
prompts, and any Notion page mirror it — they never restate rules, they point here.
Every agent (Architect, Designer, Builder, and any sub-agent) reads this first.

## Project

- **Name:** Reels Content Creation dashboard
- **What it is:** see `DIRECTION.md` (committed; read before acting). It is product
  ground truth — the **Character Control Room**, a focused control tool, NOT a
  kanban/production board (decision **D-2**, LOCKED). (Historical note: the original
  `dashboardbuildbrief.md` brief is no longer in the repo; `DIRECTION.md` supersedes it.)
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
- **Builder (Codex)** — authors all app code + migrations (edits files in the
  sandbox). **Cannot commit** in this environment (sandbox `.git` is read-only), so the
  Architect commits Codex's reviewed edits. Builds only what the Designer specified and
  the Architect approved.

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

- **Codex authors app code but CANNOT commit** (sandbox `.git` is read-only). The
  **Architect commits** — docs/markdown AND Codex's reviewed app-code edits — and pushes.
  The Architect **never authors** app code; it only commits what Codex wrote. This
  preserves "no one grades their own work": Codex builds, an independent reviewer (the
  vendor that did NOT build) + the human ratify.
- Codex habitually edits `docs/HANDOFF.md` to narrate its work — **revert that**
  (`git checkout -- docs/HANDOFF.md`) before committing.
- Designer (Gemini) never runs git.
- A GitHub remote exists; the human merges PRs (squash) to the default branch
  (`claude/new-session-3l99vs`). Branch-level commits may show Unverified; the
  squash-merge via the GitHub API confers verification on the commit that lands.

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
