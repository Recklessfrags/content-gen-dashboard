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
   training-data values. This cuts **both ways**: investigate THEN conclude —
   reflexive agreement and reflexive alarm are the same error (concluding without
   checking). Endorsement is earned by surviving scrutiny, not granted by default.
7. **Keep HQ current (shared convention with the pipeline)** — the Notion 📮
   Coordination Log's **Open Cross-Team Items tracker** is **jointly owned**. Whenever
   something surfaces that is (a) useful to the other team, (b) an upcoming cross-team
   task, or (c) a conflict/roadblock, record it in the Log: add/update its tracker row
   (+ a short dated sub-note if it needs detail) at natural checkpoints — after a
   decision, around coordination-touching work, and **before ending a session**.
   **Re-fetch HQ before relying on it** (it changes between sessions; a cached view is
   how stale-state bugs happen). This is model-judgment, not a hook.
8. **Triage questions before spending operator turnaround (three buckets)** — when the
   team has a question for the operator, the Architect sorts it **first**; a pre-vet that
   rubber-stamps is worse than none (it launders a guess), so the buckets are gated:
   - **Bucket 1 — already answered** by a doc/contract/locked decision: quote the source,
     act **without** the operator.
   - **Bucket 2 — derivable AND cheap-and-reversible**: reason it from the constraints and
     **act on it now — do NOT wait on the operator.** Return the answer **plus its
     derivation** as a proposal the asker can flag, **and log a receipt to the Coordination
     Log** (question · sources · derivation · scope-limit · why-not-bucket-3 · operator-ack
     ∈ pending|acknowledged|rejected). The receipt exists so the operator can review the
     one-off call **asynchronously** — `pending` means "proceeding, flag me if wrong," not
     "blocked waiting for ack." **Two hard exits back to bucket 3:** (a) it would spend
     money, touch a live/prod surface, or commit architecture **the other team** (the
     pipeline — a separate repo/workforce) builds on; (b) the answer would become
     **precedent / a standing rule**.
   - **Bucket 3 — operator-only** (held hard even when derivable): irreversible/external
     (publish, spend, prod/live), **brand & legal** (any GREEN/YELLOW/RED, fact-anchor,
     engagement floor), **product direction** (scope, priorities, what's next), and anything
     expensive-if-wrong that can't be falsified cheaply. Surface as a **sharpened question +
     recommendation**, never a raw pass-through. Derivability is a *floor* for buckets 1/2,
     **not** the only gate — the hard exits force bucket 3 regardless. (Adopted from the
     pipeline's ratified rule, 2026-06-30.)
9. **Every change gets an independent cross-vendor review before it lands** — sharpens
   rule 2 ("no one grades their own work") into concrete gates:
   - **Gate = the push/merge to a shared/handoff branch or the default branch.** Throwaway
     local WIP is exempt; the gate is *landing where another session or the operator treats
     it as real*.
   - **Reviewer is a different vendor than the author** (our split: Codex builds → Gemini +
     the Architect review; **Architect/Claude-authored specs, proposals, and governance/HQ
     docs → Gemini reviews before they land**). "Different vendor than the author" is the
     principle, not "Gemini specifically."
   - **The reviewer grades severity from the raw diff** — the author does **not** pre-label
     it "low-risk" to dodge scrutiny. A genuine typo gets a quick confirming pass; a
     governance rule / money-path / acceptance-criterion change gets a full adversarial,
     **default-NOT-PASS** pass.
   - **Same-vendor can't self-bless** (even a fresh subagent may triage but not satisfy the
     gate); if no different-vendor reviewer is available, don't push/merge. **A fix the
     review prompts is re-audited, not self-blessed** ("I committed it" ≠ "it was ratified").
   - **Applies to docs and specs too**, not just code. **Review the *aggregate* diff that
     will actually land**, not each edit in isolation — isolated-edit reviews hide
     interaction bugs (the lesson that motivated this). (Adopted from the pipeline's
     ratified rule, 2026-06-30.)

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
