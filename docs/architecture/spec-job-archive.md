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

## The mechanism — AMENDED 2026-08-18 after Codex blocked on the original

**The original spec said: add `jobs.archived_at`. That was wrong, and Codex was right to stop
rather than work around it.** Verified against the live database:

- RLS on `public.jobs` has exactly two policies — `jobs_read` (SELECT) and `jobs_enqueue`
  (INSERT, with a strict `with_check` demanding `status='queued'`, no spend, no episode). There
  is **no UPDATE policy at all.** The browser cannot update `jobs`, by design.
- That is not an oversight, it is the contract: `DIRECTION.md` says `jobs` is **enqueue-only**
  to the dashboard. Confirmed in the code — approving a run does **not** update it. It calls
  `buildSpendApprovalReenqueue` / `buildFactApprovalReenqueue` and **inserts a brand-new job
  row** carrying the approval flag (`src/lib/jobs.ts`).

Codex proposed a session-gated Edge Function to get UPDATE rights. **Rejected.** That punches a
service-role hole through the enqueue-only contract, and deploys an auth surface, so that the
operator can hide a row from his own screen. The write is not a pipeline write at all.

**Archive is a VIEW preference, so it lives in a dashboard-owned table.**

```sql
create table public.job_archive (
  job_id      bigint      primary key,
  owner       uuid        not null default auth.uid(),
  archived_at timestamptz not null default now()
);
```

- Archive = INSERT. Unarchive = DELETE. Both are plain, reversible, and need no new policy
  shape — mirror the `ideas` / `characters` idiom exactly: `select`/`insert`/`delete` for
  `authenticated` gated on `owner = auth.uid()`.
- **No foreign key to `jobs.id`.** A hard FK would make a future `jobs` cleanup (like the T5
  delete) fail or cascade unexpectedly; a stale archive row for a deleted job is harmless and
  is simply ignored on join.
- The pipeline never reads this table and cannot be affected by it. `claim_job_under_cap`
  touches only `status='queued'`/`'running'`, so archived rows were never claimable anyway.
- Cost of the join: negligible. `jobs` is 21 rows after the T5 cleanup.

## Semantics — the thing the UI must not get wrong

**Archiving is not a decision.** It does not approve, reject, cancel, or resolve a run. A
parked run that is archived stays parked forever unless someone unarchives it. The failure
mode this spec exists to prevent is an operator archiving 80 runs believing he has dealt with
them. The confirm copy must say plainly: *this hides them, it does not decide them, and you
can bring them back.*

## Requirements

### R1 — Migration `dash_0016_job_archive.sql`
- Create `public.job_archive` exactly as above; enable RLS; add `select`/`insert`/`delete`
  policies for `authenticated` gated on `owner = auth.uid()`, matching the `ideas` policies.
- No foreign key to `jobs`, for the reason given above.
- Header comment in the style of `dash_0015_channel_profiles_ai_disclosure.sql`, recording
  that this is a dashboard-owned VIEW preference and that `jobs` stays enqueue-only.
- Write the file; **do not apply it.**

### R2 — Types
Add the `job_archive` table to `src/lib/database.types.ts` (Row / Insert / Update) in the
existing generated style.

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
- Archiving inserts into `job_archive`; unarchiving deletes. Optimistic update is fine, but a
  failed write must restore the row and surface the error.

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

### R8 — Archive the parent when an approval re-enqueues it

**This is the root cause of the backlog, found while amending this spec.** Approving does not
resolve the run it approves — it inserts a *new* job and leaves the parent sitting at
`ready_for_review` forever. So every approval permanently adds a row to the approvals list. The
operator reached 107 partly by *doing his job*.

When the dashboard re-enqueues an approval (spend, fact, publish, reveal), it must also archive
the parent row in the same user action. If the archive write fails, the approval still stands —
the re-enqueue is the real work and must not be rolled back over a view preference; surface the
failure and leave the parent visible.

This is what turns the archive from a chore into something that keeps itself clean.

## Acceptance
`npx tsc --noEmit` clean, `npm test` green with new tests, `npm run build` passes.
Do **not** commit — the architect reviews the diff and Gemini audits before anything lands.

## Relation to T5 (the operator-owed DELETE)
This is the soft, reversible, self-serve version of the cleanup the operator has been owed for
days (`delete from jobs where status in ('error','ready_for_review') and id <= 359`).
Archiving the 248 error rows gets him the clean screen without a destructive statement. The
DELETE stays available but stops being urgent.
