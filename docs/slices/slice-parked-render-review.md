# Slice — Task A: parked-render review surface

_2026-07-14. Architect (Claude). Problem-solver Task A (reels#88 `4965601200`), the LEAD item:
real dark_history renders are parking `ready_for_review` with mixed `park_kind`s (+ some
errored) and the owner has no triage surface. **Read-only, zero writes.** Dashboard-only +
gate-green + cross-vendor PASS ⇒ self-merge under the standing delegation (`4965428201`),
then a one-line "merged" entry on reels#88. Approve/repair ACTIONS are explicitly out of
scope (a later task)._

## Shape

Extend the **Action Center** (`?hub=actions`) into the owner's one-stop review loop. Two
changes:

### 1. Errored jobs join the surface
Today ActionCenter receives only actionable/approval jobs. Add an **"Errored / stuck"**
section below the approvals list showing jobs with status `error` (including hard parks
`blocked`/`exhausted` via `park_kind`) — same card layout, no action button (the re-run
affordance exists only where it exists today; do NOT add new actions). Empty state: omit
the section entirely when there are no errored jobs. ControlRoom already fetches all jobs;
pass the errored subset through props alongside the existing actionable list (keep the
existing prop shape backward-compatible — a new optional prop).

### 2. Every card becomes a triage card
For each job on the surface (both sections):
- **Park chip + plain-English explanation.** Copy table (exact strings, keyed off the
  existing `park_kind` resolution — `parkById[job.id].kind` — and status):
  - `fact` — "Paused for your fact call. A flagged claim needs your yes/no before the
    pipeline continues. Approving re-queues the run; money is not spent by this approval."
  - `spend` — "Paused for your spend approval. The next stage costs real money and waits
    for your go."
  - `publish` — "Paused for your publish approval. The video is rendered; nothing posts
    until you approve."
  - `reveal` — "Paused for reveal sign-off. Review the reveal wording in the Reveal hub."
  - `blocked` — "Stopped: the pipeline hit a wall it can't retry through (config, credds,
    or an upstream refusal). Needs a fix on the pipeline side, not an approval."
    (spell "credentials" — no typo)
  - `exhausted` — "Stopped: the pipeline used all its retries on a failing stage. The
    per-worker log below shows which stage and why."
  - status `error` with no/unknown park_kind — "Stopped with an error. The per-worker log
    below shows the failing stage."
  - `unknown`/null on `ready_for_review` — keep today's neutral park line.
- **"Why it parked" details (lazy, read-only):** a collapsed "Why it parked ▸" disclosure
  per card. On first open, load the job's receipts via the SAME loader pattern RunsHub
  uses (`loadRunDiagnostics` in ControlRoom — reuse/thread it, do not duplicate the query)
  and show: the parking/failing stage's latest receipt `reason` (plus verdict chip), and —
  when the receipt payload carries it — the **below-floor cut info** (e.g.
  `below_floor_cuts` / per-cut floor data in the assembly/QA receipt JSON: render count +
  the per-cut reasons if present). Fail-safe: any missing/malformed field simply doesn't
  render; a receipts fetch error shows "Couldn't load the run log." Loading state shown.
- **Render player inline:** the existing `RenderPlayer` (already mounted for
  `job.episode_id` cards) stays exactly as shipped — the explanation + log sit beside it
  so watch + why-it-parked + decide happen in one card.

## Keep / do NOT touch
- No writes, no new actions, no changes to `requestQueueAction`/confirm flow, polling, or
  the reveal read path.
- `parkReason.ts` resolution logic unchanged (column-first, hard parks never inferred).
- RunsHub keeps its own diagnostics view; this reuses the loader, not the UI.

## Acceptance gates
1. `tsc` clean · `vitest` green (+ unit tests for any new pure helpers — e.g. a
   `parkExplanation(kind, status)` copy map and a below-floor extractor, both fail-safe on
   junk input) · `next build` clean.
2. Copy map matches the table above exactly (test-asserted for at least fact/spend/blocked
   /exhausted).
3. Receipts load only on first disclosure open (no N-queries on render — measured by the
   loader being invoked from the disclosure handler, mirroring RunsHub).
4. Errored section renders only when errored jobs exist; approvals behavior (buttons,
   confirm, focus) unchanged.
5. Both themes, 412/700/1440; disclosure is a real button with `aria-expanded`.
6. Cross-vendor (Gemini) review PASS on the aggregate diff → self-merge (standing
   delegation) → "merged" line on reels#88.

## Build notes (Codex)
Declared files: `src/components/aurora/ActionCenter.tsx`, `src/components/ControlRoom.tsx`
(prop threading + errored subset + reusing the diagnostics loader), a new pure lib (e.g.
`src/lib/parkExplanation.ts`) + tests, `src/app/aurora.css`. Argue with the spec first: if
ActionCenter can't reach the diagnostics loader without contortions, or the errored subset
is already surfaced somewhere that makes this redundant, STOP and report. Do not edit
`docs/HANDOFF.md`.
