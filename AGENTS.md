# AGENTS.md — project-specific rules for this repo

**The loop rules are canonical in [`governance.md`](governance.md)** (the shared
41-rule file merged cross-team, adopted 2026-07-02 from the pipeline-repo canonical
via the HQ verbatim mirror — rules 1–29 then 30–34 (model budget), 20 & 32 refined,
35–41 promoted + 34 strengthened — see the Coordination Log governance rows). Read
`governance.md` FIRST; this file supplies only what is **specific to this
project**: the vendor/role mapping, dashboard-local operator directives (marked
ADDITIVE — they extend, never override, governance), git mechanics, and operational
setup. README, role prompts, and Notion pages point here and to `governance.md`;
they never restate rules.

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

**Canonical: [`governance.md`](governance.md) rules 1–41.** Project bindings for its
role/place-holders: durable store = this repo (`docs/HANDOFF.md` + `GATES.md` +
`docs/contracts/*`) — not in the repo = didn't happen; coordination log = the Notion
📮 Coordination Log's **Open Cross-Team Items tracker**; learnings log = the HQ
**Process Learnings Ledger**; frozen-AC changes = an Architect ruling logged in
`HANDOFF.md`; "another team" in the triage hard-exits = the pipeline (separate
repo/workforce); brand & legal (GREEN/YELLOW/RED, fact-anchor, engagement floor) is
always human-only.

**Dashboard-local ADDITIVE rules** (operator directives; they extend governance,
never override it):

- **L-1 · HQ before any "nothing to do" claim (2026-07-01)** — never tell the
  operator "nothing is buildable" from a cached view; a fresh Coordination Log fetch
  comes FIRST (sharpens governance rule 22 — the other team ships between our
  fetches).
- **L-2 · The "suerta" reviewer (2026-07-02)** — the orchestrating Architect is not
  the final Architect-side reviewer on important slices (spec-author blind spots).
  Before landing anything touching a migration, a money path, or a shared contract,
  spawn a **fresh independent Claude agent ("suerta")** to review the aggregate
  working-tree diff Architect-style — *in addition to* the cross-vendor gate, never
  a substitute (suerta is same-vendor; governance rule 4 stands). Live-validated day
  one: suerta caught a BLOCKER three prior review passes missed. _Tier per
  governance rule 33 (2026-07-02 model-budget adoption): the suerta seat defaults
  to **Opus** and escalates to Fable-5 by judgment when the review itself is
  high-stakes; never down-tiered below the work's stakes._
- **L-3 · Terse operator updates (2026-07-01)** — per task, chat carries at most:
  one line at start, a prompt only on a real problem or human-only decision
  (sharpened question + recommendation, concise), and the final result. No
  narration between tool steps. Chat volume only — repo/HQ record-keeping
  (governance rule 1) and mandatory disagreement (rule 14) are unreduced. The
  operator adjusts the volume by saying so.
- **L-4 · Our vendor split for the review gate** — Codex builds → Gemini + the
  Architect review; Architect-authored specs/proposals/governance docs → Gemini
  reviews before they land. "Different vendor than the author" is the principle,
  not "Gemini specifically." _Rule-33 staffing (2026-07-02): for high-stakes
  changes (money-path / governance / contract / AC) the two distinct-lens seats
  are **Gemini (cross-vendor anchor — always required, rule 4)** + **suerta
  (L-2)**; suerta adds the second lens but never substitutes for the cross-vendor
  seat._
- **L-5 · Tier→model mapping (2026-07-02, per governance rules 30–34)** — top
  tier = **Claude Fable-5** (hardest architecture/forks, high-stakes review
  escalation); capable default = **Claude Opus** (Architect sessions, suerta
  default, ordinary judgment work); cheaper tiers = **Claude Sonnet/Haiku**
  (coordination errands, bulk-mechanical sweep subagents — never judgment or
  shared-surface work); builder seat = **Codex**; cross-vendor reviewer =
  **Gemini** (`scripts/gemini.sh`, prompt on STDIN, first arg = model;
  `gemini-3.1-pro-preview` default, flash for light passes).

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
