# Slice 2 — Run/receipt drill-down + bible version history

_Author: Architect (Claude). Status: **spec frozen, awaiting human ratification of
scope**. Runs through the Designer→Builder→Architect loop next session._

> Roles for this slice (per `AGENTS.md` §Roles): **Architect (Claude)** wrote this
> spec, the gates, and the briefs, and judges raw results — no app code. **Designer
> (Gemini)** produces UI/UX artifacts into `docs/design/` only. **Builder (Codex)**
> writes all app code, the migration, the commits, and the `HANDOFF.md` update, and
> owns git. The human ratifies and owns the contract amendment (W-B below).

## Why this slice

Slice 1 made the foundation trustworthy (all seven gates PASS/ratified). Slice 2 is
the first **net-new product surface** since the foundation: it takes the two
highest-value deferred items from the build brief and builds them on the now-ratified
base —

- **W-A · Run/receipt drill-down** — Runs currently shows one card per episode with a
  summary line. The pipeline already writes rich per-stage `receipts` (provider,
  model, effort, verdict, reason, spend, evidence/result). The operator can't see
  *why* a run landed where it did. Drill-down exposes that. **Read-only; no schema
  change** — fits the frozen contract exactly (`receipts_read` policy already exists).
- **W-B · Bible version history** — saving a character today **overwrites** `bible`
  jsonb with no way back. For a tool whose whole point is iterating a character's
  voice, losing prior versions is a real risk. History lets the operator view and
  restore prior bibles. **Dashboard-owned, but needs a schema addition** (new table
  + migration `0002`), so it requires a **data-contract amendment** ratified by the
  human before the Builder writes it.

## Architect disagreements / flags (rule 3 — raised before building)

1. **Sequence, don't parallelize blindly.** W-A is pure read, zero schema risk;
   W-B is the first schema change since the foundation and touches the save path.
   Recommend **W-A first, W-B second** (or two isolated worktree lanes per
   `AGENTS.md` §Parallel isolated builders — but W-B must not start until its
   contract amendment is ratified). They share no files if W-A touches only the Runs
   view and W-B touches only the dossier/save path + a new module.
2. **W-B reverses the per-slice contract freeze.** `docs/contracts/data-contract.md`
   is frozen; W-B needs a new `character_bible_revisions` table. Per rule 4 that
   requires an **Architect ruling logged in HANDOFF + a human-ratified contract
   amendment** *before* the migration is written. This spec proposes the amendment
   (W-B §Data); it is **not** approved until the human signs off.
3. **Watch the D-2 boundary.** Drill-down deepens the **Runs** surface, which the
   D-2 ruling called the *seed* of a future production board, explicitly deferred.
   W-A is **read-only inspection of a single finished run** — it is **not** the
   kanban/production board. If the Designer's spec starts adding live-nudge controls,
   multi-run orchestration, or status mutation, that is scope creep into the deferred
   board and must stop and return to the human. Stay descriptive, not operational.
4. **No pipeline writes, ever.** `episodes`/`receipts` stay read-only (contract §
   Ownership). W-A reads `receipts`; it must never insert/update/delete them.

## Inputs (read-only)

- `GATES.md`, `docs/contracts/data-contract.md`, `docs/HANDOFF.md`, `AGENTS.md`
- `src/components/ControlRoom.tsx` (current Runs + dossier save path), `src/lib/types.ts`
- The prototype `character-control-room.jsx` (interaction spec of record)
- Live `reels-content` DB for real `receipts` shapes (read-only)

## Frozen gates for this slice (acceptance — read-only after freeze)

No gate may be marked PASS by the actor that wrote the code under test; independent
verification as in Slice 1.

| # | Gate | Applies to |
| --- | --- | --- |
| S2-1 | Clicking a run opens a drill-down showing **every receipt** for that `episode_id` in `seq` order: stage, provider, model, effort (requested/used + clamped), verdict, reason, spend-so-far, timestamp; `evidence`/`result` jsonb viewable without breaking layout. | W-A |
| S2-2 | Drill-down is **read-only**: no control mutates `episodes`/`receipts`; closing returns to the Runs list with no state loss. Empty state when a run has 0 receipts. | W-A |
| S2-3 | Saving a character **creates a new immutable revision** of `bible` (+ codename/concept/status snapshot) without altering the current-save behavior verified in Slice 1 G2. | W-B |
| S2-4 | History lists revisions newest-first with timestamps; selecting one **previews** it read-only; **Restore** loads it into the editor as an unsaved draft (a subsequent Save persists it as the new current **and** a new revision). No destructive overwrite of history. | W-B |
| S2-5 | Revisions are **owner-scoped** (RLS): a user can read/insert only their own; no one reads another owner's history; anon reads `[]`. | W-B |
| S2-6 | Quality floor held (WCAG 2.2 AA): new surfaces responsive incl. 320px, visible `:focus-visible`, reduced-motion respected, all component states specified. Login-input `outline:none` residual from Slice 1 fixed here. | W-A + W-B |
| S2-7 | `next build` clean; no secrets; migration `0002` idempotent and **touches only dashboard-owned tables** (no `episodes`/`receipts`/`jobs` alteration). | W-B |

## Designer brief (Gemini → `docs/design/slice-2-*.md`)

Design artifacts only; no app code, no git. Output a spec the Builder can implement
without guessing. For **every** component list all states (default, hover, focus,
active, disabled, loading, empty, error) and behavior at 320 / tablet / desktop.

1. **Run drill-down (W-A).** Specify the open/close interaction (panel vs route vs
   modal — recommend one, justify), the receipt timeline layout (per-stage rows in
   `seq` order), how to render `verdict`/`reason` and the `evidence`/`result` jsonb
   (collapsed/expandable; never dump raw blobs into the flow), spend running total,
   and the empty state. Reuse existing tokens/`.runcard` styling for continuity.
   **Keep it inspection-only** — no operational controls (see Architect flag 3).
2. **Bible version history (W-B).** Specify where history lives in the dossier
   (drawer/tab/inline list), the revision list item (timestamp, maybe a diff hint),
   the preview state, the **Restore** affordance and its confirmation, and how the
   "unsaved restored draft" state reads against the existing savebar.
3. **Accessibility pass** on both, including the **login-input focus fix** (S2-6):
   replace `.login-card input:focus{outline:none}` guidance with a visible focus
   treatment consistent with the global `:focus-visible`.

Deltas become Builder work items; not approved until the Architect rules.

## Builder block (Codex — all app code, migration, commits, HANDOFF)

Argue with this spec first (silent compliance = defect). Build only what the Designer
specified and the Architect approved. Declare your files before editing.

**W-A · drill-down (no schema change):**
1. Add the drill-down surface to the Runs view per the Designer spec; fetch
   `receipts` for the clicked `episode_id` (`select * ... order by seq`), read-only.
2. Render per the spec; jsonb (`evidence`/`result`) shown safely. No writes to
   pipeline tables.

**W-B · version history (schema change — gated on contract amendment):**
3. **Only after** the human ratifies the contract amendment below: add migration
   `supabase/migrations/0002_bible_revisions.sql` — idempotent, dashboard-owned only:
   - `character_bible_revisions(id uuid pk default gen_random_uuid(), character_id
     uuid not null references characters(id) on delete cascade, owner uuid not null
     default auth.uid() references auth.users(id) on delete cascade, codename text,
     concept text, status text, bible jsonb not null, created_at timestamptz not null
     default now())`
   - RLS enabled; `select`/`insert` policies `to authenticated using/with check
     (owner = auth.uid())`. **No** update/delete policies (revisions are immutable).
4. On character save, insert a revision snapshot (same txn/round-trip as the save).
   Add the history UI + Restore flow per the Designer spec. Do **not** change the
   Slice 1 save semantics that G2 verified.
5. Update `docs/contracts/data-contract.md` (new table section) **and** `HANDOFF.md`
   with raw results; flip Slice 2 gates only to the status the evidence supports.

Builder does not touch Designer artifacts or this spec. Codex physically can't commit
in-sandbox if `.git` is protected — produce reviewed edits; the Architect merges as a
Codex-authored commit (as in Slice 1).

## Proposed data-contract amendment (human ratifies before W-B builds)

Add a third **dashboard-owned** table `character_bible_revisions` (shape above),
owner-scoped RLS, insert-once/immutable (no update/delete). Pipeline-owned tables
untouched. This is the only contract change Slice 2 introduces.

## Architect (judge) + human (ratify)

- Architect judges raw Builder/Designer results vs the frozen S2 gates; flips gates
  to PASS only on independent evidence; logs rulings in `HANDOFF.md`.
- Human ratifies the **scope** (this spec), the **contract amendment** (W-B), and the
  final pass.

## Out of scope (deferred beyond Slice 2)

Multi-user teams, analytics, publishing (remaining build-brief deferrals). The
production/kanban board (D-2 deferral). Any pipeline logic or write to pipeline
tables. Bible diffing beyond a simple revision list (a later slice if wanted).
