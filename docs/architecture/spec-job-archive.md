# Spec — archiving job-backed lists (approvals, errored/stuck, runs)

**Status:** ready to build · **Architect:** Claude · **Builder:** Codex · **Reviewer:** Gemini
**Operator ask (2026-08-18):** *"we also need an archive in the awaiting approval. also being
able to mass archive. along with other long lists in the dashboard"*

## Why, and what "other long lists" actually resolves to

The operator has **107 approvals awaiting** on a phone, most of them dead A/B test runs. He
needs them out of the working list without approving them and without deleting them.

Counted against the live DB before speccing:

| table | rows |
|---|---|
| `jobs` | **364** (248 `error`, 102 `ready_for_review`) |
| `episodes` | 314 (read-only to the dashboard) |
| `ideas` | 4 |
| `characters` | 12 |
| `channel_profiles` | 15 |

**Every long list in the dashboard is the same `jobs` array, filtered differently** — the
Action Center approvals list, the "Errored / stuck" section, and the Runs hub all render from
one `useJobs()` fetch. So this is ONE mechanism, not several. Ideas, characters and channels
are 4/12/15 rows and get **no** archive plumbing — building it there is machinery for a
problem that does not exist.

## The mechanism

Add **`jobs.archived_at timestamptz null`**. Dashboard-owned, pipeline-ignored.

**Not a `status` value.** `status` is the pipeline's state machine and the dashboard is
enqueue-only against it (`DIRECTION.md`); writing a new status would put the dashboard inside
the pipeline's state transitions. A separate nullable column is additive and invisible to the
worker. Precedent: `spend_approved`, `publish_approved`, `fact_approved`, `reveal_approved`
are already dashboard-owned operator columns on this pipeline-owned table.

**A timestamp, not a boolean.** It records *when*, which makes an accidental mass-archive
undoable by time window ("unarchive everything archived in the last hour"). A boolean throws
that away for nothing.

**Verified non-interaction with the worker:** `claim_job_under_cap` selects only
`status = 'queued'` and `status = 'running'` (migration `0025`). Archived rows are parked or
terminal, so they were never claimable and the column cannot change what the worker picks up.

## Semantics — the thing the UI must not get wrong

**Archiving is not a decision.** It does not approve, reject, cancel, or resolve a run. A
parked run that is archived stays parked forever unless someone unarchives it. The failure
mode this spec exists to prevent is an operator archiving 80 runs believing he has dealt with
them. The confirm copy must say plainly: *this hides them, it does not decide them, and you
can bring them back.*

## Requirements

### R1 — Migration `dash_0016_jobs_archived_at.sql`
- `alter table public.jobs add column if not exists archived_at timestamptz;`
- A partial index for the default filter: `create index if not exists jobs_archived_at_idx on public.jobs (archived_at) where archived_at is null;`
- A `comment on column` recording: dashboard-owned, pipeline-ignored, not a decision.
- **Do NOT add a CHECK constraint** tying `archived_at` to `status`. The worker updates
  `status` and knows nothing about this column; a constraint it can trip turns a UI
  convenience into a production write failure. Enforce the rule in the dashboard (R4) only.

### R2 — Types
`archived_at: string | null` on the `jobs` Row / Insert / Update in `src/lib/database.types.ts`.

### R3 — Default views exclude archived
Every job-backed list (approvals, errored/stuck, runs, and the channel-card active-job counts)
excludes rows with a non-null `archived_at` by default. Prefer filtering at the query in
`useJobs()` so the archived rows are not shipped to the client at all; if any consumer needs
the full set, keep the fetch and filter in one shared selector rather than per-component.

### R4 — Per-row archive
- An **Archive** action on each row in the approvals list, the errored/stuck list, and the
  runs list. Secondary styling — it must not compete with the approve action.
- **A `queued` or `running` job is never archivable.** Those are live pipeline work and
  hiding them would hide in-flight spend. Omit or disable the control for those statuses.
- Writes `archived_at = now()`; optimistic update is fine, but a failed write must restore
  the row and surface the error.

### R5 — Mass archive
- A bulk **Archive** control scoped to **the current filtered view only** — never a global
  "archive everything". The count in the button must be the count actually affected.
- Confirm step showing the exact number and the semantics from the section above.
- Silently skips `queued`/`running` rows and says how many it skipped, if any.
- This is safe to build as a bulk action precisely because it is reversible and spends
  nothing. **Bulk approval of spend is NOT in scope and must not be added** — that is
  irreversible and costs money, and it belongs to the standing-spend-authority work.

### R6 — Archived view + undo
- A way to see archived rows (filter/toggle) with the archived **count** visible, so the
  archive is never a black hole.
- **Unarchive**, both per-row and bulk, setting `archived_at = null`.

### R7 — Tests
Cover, at minimum: default lists exclude archived rows; a `queued`/`running` job cannot be
archived (control absent/disabled *and* the handler refuses); bulk archive affects exactly the
filtered set and reports skips; unarchive restores a row to the default view; a failed write
restores the row rather than leaving the UI lying.

## Acceptance
`npx tsc --noEmit` clean, `npm test` green with new tests, `npm run build` passes.
Do **not** commit — the architect reviews the diff and Gemini audits before anything lands.

## Relation to T5 (the operator-owed DELETE)
This is the soft, reversible, self-serve version of the cleanup the operator has been owed for
days (`delete from jobs where status in ('error','ready_for_review') and id <= 359`).
Archiving the 248 error rows gets him the clean screen without a destructive statement. The
DELETE stays available but stops being urgent.
