# Slice #8 phase 2 — reveal-approval write-back (real reveals + writes)

_Author: Architect (Claude). Status: **BUILD (money/DB-write path).** Problem-solver directed to start
in parallel (reels#88 `4959828504`); owner aware/directing. Against the **locked** contract
(`docs/contracts/data-contract.md` → "Reveal-approval contract"). **TWO-LENS review (Gemini +
suerta/Opus). Merge = owner GO** (render/spend-gating). Built in lockstep with the pipeline: the
dashboard-owned `reveal_approvals` table + read path + guarded write path land now; the `jobs.reveal_*`
write **activates** the instant @pipeline lands its columns + posts the #88 heads-up._

## What phase 1 left (recap)
`?hub=reveal` (`RevealHub.tsx`) renders reveals from `MOCK_REVEAL_FIXTURES`, decisions local-only,
disabled "Submit decisions". Phase 2 makes it real: read parked reveals, capture decisions to a durable
table, and (guarded) set the pipeline resume flags.

## Contract (locked — build to this exactly)
- Park: `jobs.status='ready_for_review'`, `jobs.park_kind='reveal'` (after `reveal_auditor`, before
  assembly). Detect via `resolveParkKind` (extend to surface `reveal`).
- Reveal payload: **max-seq `reveal_auditor` receipt** per episode, `result.reveals[]`
  `{reveal_id, reveal_text, grade, reason, brand_specific, component_claims[] (fact_check shape)}` —
  parse via the existing `parseRevealAuditorResult`.
- Write-back (dashboard → `jobs` UPDATE, pipeline RLS approval-write class, **only** on
  `park_kind='reveal'` jobs): `reveal_approved bool`, `reveal_override jsonb [{reveal_id,edited_text}]`,
  `reveal_rejected jsonb {reason}`. **These columns are PIPELINE-OWNED and land in their migration.**

## Build

### 1. `reveal_approvals` table — DASHBOARD-OWNED, land now (zero pipeline dependency)
Migration `supabase/migrations/dash_NNNN_reveal_approvals.sql` (dash lane; additive/expand-contract):
- Columns: `id uuid PK default gen_random_uuid()`, `owner uuid NOT NULL default auth.uid()` →
  `auth.users(id) ON DELETE CASCADE`, `episode_id text NOT NULL`, `reveal_id text NOT NULL`,
  `decision text NOT NULL CHECK (decision in ('approved','edited','rejected'))`,
  `edited_text text NULL`, `steer text NULL`, `decided_at timestamptz NOT NULL default now()`.
- **Owner-scoped RLS** (mirror `characters`): SELECT/INSERT `owner = auth.uid()` (with_check on
  insert). No UPDATE/DELETE policy (append-only audit record). Enable RLS.
- Add to `src/lib/database.types.ts` (hand-add the Row/Insert/Update for the new table).
- Record in `docs/contracts/data-contract.md` (dashboard-owned class) + a dated #88 tracker heads-up
  (shared-surface: it's a new dashboard table, additive).

### 2. Read the real parked reveals (replace the mock source)
- `ControlRoom.tsx`: build the reveal-hub props from live data — query `jobs` where
  `classifyJobStatus = ready_for_review` **and** `park_kind = 'reveal'`; for each, load its **max-seq
  `reveal_auditor` receipt** and `parseRevealAuditorResult(result)`. Shape into the existing
  `RevealFixture[]` the hub already consumes (id=episode_id, title, channel, reveals). Reuse the
  existing receipts-loading pattern (as RunsHub diagnostics / the fact-claim load do).
- Until the pipeline's `reveal_auditor`/park are live, this returns **empty** → the hub's existing
  empty state. Keep `MOCK_REVEAL_FIXTURES` available only under an explicit dev/mock flag (or drop from
  the live path); the live surface must NOT show mocks as if real.

### 3. Write path — `reveal_approvals` now; `jobs.reveal_*` guarded
- `src/lib/revealApproval.ts`: add pure builders `buildRevealApprovalRow(decision)` (→ the
  `reveal_approvals` insert) and `buildJobsRevealPatch(decisions)` (→ `{reveal_approved?}` /
  `{reveal_override?}` / `{reveal_rejected?}` from the batch's decisions). Pure, unit-tested.
- On "Submit decisions" (now enabled once every reveal in the batch is decided):
  1. **INSERT** the `reveal_approvals` rows (dashboard-owned; works immediately).
  2. **UPDATE** the parked job's `jobs.reveal_*` per the batch — **GUARDED**: only attempt when the
     capability is present (the columns exist). Capability check: a small `revealWriteEnabled`
     flag/probe (env flag OR a one-time `information_schema`/`error-tolerant` check). Until enabled,
     the `jobs` UPDATE is skipped and the UI shows "recorded your decision; resume activates when the
     pipeline's columns land" — the `reveal_approvals` audit still captured. **No silent failure.**
- The `jobs` UPDATE writes **only** the reveal_* fields on a `park_kind='reveal'` job (never lifecycle
  columns) — relies on the pipeline's approval-write RLS grant.

### 4. UI (RevealHub) — enable submission
- Enable "Submit decisions" when `isBatchDecided`; on submit call the injected `onSubmit(episode,
  decisions)` handler (ControlRoom wires it to §3). Loading/success/error states (rule 29). Keep the
  Phase-1 card UI; the disabled-note becomes the guarded-capability note when writes aren't live yet.
- Edited reveal: the note stays "edited reveals re-check grounding before render" (pipeline re-runs the
  auditor; a returned `grade:'red'` re-park surfaces on the next read).

## Gates / review
`tsc` · full `vitest` (+ new pure-helper tests) · `next build`. **TWO-LENS: Gemini + suerta (Opus)** —
adversarial on the write path (RLS scope, guard correctness, no lifecycle-column write, idempotency of
resubmit). Migration applied to the live DB via Supabase MCP **only after** review + owner GO (or apply
to a branch/verify first). **Merge = owner GO.** Coordinate the migration timing with @pipeline
(their `reveal_*` columns) per the shared-seam rule (additive-first; their columns before my write-back
enables).

## Explicitly NOT in scope
The pipeline's `reveal_auditor`/park/columns/script-retry; changing the Phase-1 card layout; the
Channel-DNA object; multi-user.

## States enumerated (rule 29)
- No parked reveals → empty state (the steady state until the pipeline's half is live).
- Batch partially decided → submit disabled; fully decided → enabled.
- Submit with columns NOT yet present → `reveal_approvals` written, `jobs` write skipped, clear
  "resume activates when pipeline columns land" message (not an error).
- Submit with columns present → `reveal_approvals` written + `jobs.reveal_*` set → pipeline resumes.
- Resubmit / double-tap → idempotent (don't duplicate audit rows for the same decision; guard).
- RLS: dashboard can write only `reveal_approvals` (its own) + the reveal_* fields on a
  `park_kind='reveal'` job — never lifecycle columns; a non-reveal job UPDATE is denied by RLS.
- Write error (network/RLS) → surfaced, decision not falsely reported as submitted.
