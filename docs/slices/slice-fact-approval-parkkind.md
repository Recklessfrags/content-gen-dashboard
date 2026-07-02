# Slice — fact approval + `park_kind` column adoption

_Author: Architect (Claude). Status: **FROZEN (v2)** — Gemini spec review: two
verified findings folded in: (1) the fact-dialog copy is **conditional on
`job.spend_approved`** — if already true, the dialog must warn the run executes
immediately with no spend park (carrying the flag is correct; lying about it is the
trap); (2) the canonical idempotency input **destructures out** `channel` and
`fact_approved` before conditionally re-adding them (a plain conditional spread
fails to strip an explicit `false`/`undefined`, breaking byte-stability)._
Unblocked 2026-07-02: the worker now WRITES `jobs.park_kind` (pipeline PR #42,
operator-ruled merged vocabulary — supersedes 0016's `approval_required`):
approval parks (`status='ready_for_review'`) = **`fact` | `spend` | `publish`**
(each cleared by its flag); hard parks (`status='error'`) = **`blocked` |
`exhausted`**; **`null`** = not parked OR unmapped/legacy (fail-safe; self-healing —
every job finish writes the key, explicit null on done/no_op/crash). `fact` =
operator sign-off on **regulated-YELLOW claims** (pipeline 0017; mirror of
`spend_approved`). RLS: `fact_approved` is NOT in the `jobs_enqueue` WITH CHECK
(verified live 2026-07-02) — enqueue-settable._

## What ships

1. **Column-first park resolution:** for `ready_for_review` jobs the dashboard reads
   `job.park_kind` directly when it is an approval kind (`fact`/`spend`/`publish`)
   and **skips the receipts round-trip**; the existing receipt-stage inference
   (`detectParkKind`) remains ONLY as the fallback for `park_kind = null` (legacy
   rows parked before the worker deploy — self-healing means the fallback ages out
   naturally; do NOT delete it yet).
2. **Fact approval:** a `fact`-parked job gets an approval action — a **fresh
   re-enqueue** with `fact_approved: true` (the established parked-row-stays-as-audit
   pattern), preserving every input field including `channel`.

## Non-goals

- No migration, no DB objects (both columns are pipeline-owned and live).
- No change to spend/publish approval semantics (publish keeps its "approve & go"
  both-flags + `publish_only` resume path).
- **A fact approval does NOT auto-set `spend_approved`** (unlike publish): the fact
  gate is a *claims* sign-off, not a spend decision; the original row's
  `spend_approved` state carries via `jobInputFromRow`, and if the re-run later hits
  the spend gate, parking there is the correct behavior, not a trap (spend is a
  separate operator decision — governance rule 20 posture).
- No removal of `detectParkKind` (fallback for legacy-null rows); no changes to
  hard-park (`blocked`/`exhausted`) display — `job.park_kind` is already rendered on
  error rows since PR #21.

## Changes

### `src/lib/jobs.ts`
- `JobEnqueueInput.fact_approved?: boolean`; `buildJobInsert` emits
  `fact_approved: input.fact_approved ?? false`.
- **Idempotency-hash stability (same rule as `channel`, sharpened v2):** the
  canonical input includes `fact_approved` **only when true** — and the
  implementation must **destructure the conditional keys out of the base before
  conditionally re-adding them** (an explicit `fact_approved: false` in the input
  must hash identically to an omitted key; a plain conditional spread over a base
  that already contains the key does NOT remove it). Legacy inputs must produce
  **byte-identical** keys — pin test against the pre-slice implementation, computed
  BEFORE the edit and independently re-derived. Note the same audit applies to the
  existing `channel` conditional (an explicit `channel: null` is already stripped —
  verify with a test, don't assume).
- `buildFactApprovalReenqueue(originalInput)` — mirror of
  `buildSpendApprovalReenqueue`: `fact_approved: true`, `idempotency_key: null`
  (NULLs exempt from the partial unique index).
- `jobInputFromRow` carries `fact_approved: job.fact_approved`.
- `resolveParkKind(parkKindColumn, lastReceiptStage)` — returns
  `"fact" | "spend" | "publish" | "unknown"`: the column value when it is one of the
  three approval kinds, else the existing `detectParkKind(lastReceiptStage)`
  fallback. (Hard-park values / null never reach this path — it is only called for
  `ready_for_review` rows.)

### `src/components/ControlRoom.tsx`
- Park-resolution effect: when `job.park_kind` ∈ {fact, spend, publish}, resolve
  immediately from the column — **no receipts fetch** for that job. Null →
  existing receipts-inference path unchanged.
- `confirmQueueAction` gains the `"fact"` action → `buildFactApprovalReenqueue`;
  flash copy on failure mirrors spend's.
- The `ready_for_review` action button copy handles the `fact` kind.

### `src/components/controlroom/QueueActionDialog.tsx`
- `"fact"` action variant: title/copy = operator sign-off on **regulated-YELLOW
  claims** (0017); states the re-enqueue is a fresh row and the parked row stays as
  the audit record. **The spend-gate sentence is CONDITIONAL (v2, review finding):**
  if `job.spend_approved` is false → "the run may still park later at the spend
  gate"; if **already true** → a visible warning: "⚠ this job is already
  spend-approved — approving facts starts a run that will NOT park again before
  spending." (Never clear the carried flag; never claim a safety net that isn't
  there.) All existing dialog states/a11y unchanged.

### Docs (Architect)
- `docs/contracts/data-contract.md`: `park_kind` merged vocabulary + 0016
  supersession note; `fact_approved` row updated (enqueue-settable, approval-only);
  the "detectParkKind until park_kind lands" sentence updated to column-first +
  legacy fallback.
- HANDOFF entry; tracker update.

## Acceptance criteria (gates)

| # | Gate | How verified |
| --- | --- | --- |
| F-1 | `buildFactApprovalReenqueue`: `fact_approved=true`, null idempotency key, all inputs (incl. `channel`) preserved, worker-owned fields absent. | Unit tests. |
| F-2 | Idempotency keys byte-stable for `fact_approved`-less/false inputs vs the pre-slice implementation (pinned value computed pre-edit, independently re-derived); `fact_approved: true` changes the key. | Unit test + independent re-derivation. |
| F-3 | `resolveParkKind`: column-first for the three approval kinds; falls back to stage inference on null; never consumes hard-park values. | Unit tests. |
| F-4 | A `ready_for_review` job whose `park_kind` is an approval kind triggers **zero receipts requests** in the park-resolution path; a null-`park_kind` parked job still resolves via receipts. | Ratify walk, bridge request log (live rows permitting; else a mocked-row assertion at the unit level + honest note). |
| F-5 | Fact dialog renders with the 0017 copy; confirming produces an intercept-and-abort captured INSERT with `fact_approved: true` + preserved fields; **no submit reaches the live queue**. | Ratify walk (intercept-and-abort; needs a fact-parked row — if none exists live, drive the dialog via the existing mocked poll response through the bridge, else verify at the unit layer + honest note). |
| F-6 | `tsc --noEmit`, `npm test`, `npm run build` clean; no new deps. | Local + CI. |
| F-7 | 412px no overflow on the queue view + dialog; keyboard/a11y states unchanged. | Ratify mobile. |

**Ratification honesty note:** no live `fact`-parked row exists until the worker
parks one; F-4/F-5's live halves are exercised by serving a **bridge-mocked jobs
poll response** (a synthetic `ready_for_review` row with `park_kind:'fact'`) to the
real UI — real code, synthetic data, zero queue writes — with that substitution
stated in the gate evidence.
