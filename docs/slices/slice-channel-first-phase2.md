# Slice — Channel-first Phase 2 (character_id FK + casting elevated out of the modal)

_Status: **SPEC — DRAFT, awaiting consensus review** (Fable-5 + Gemini + Codex, per the operator's
autonomous-review contract 2026-07-03). Author: Architect (Claude), 2026-07-03. Direction:
`DIRECTION.md` D-6 + `docs/design/channel-first-redefinition.md` (Phase 2 = character-link FK +
casting elevation). Depends on Phase 1 (hub-and-spoke shell + Aurora) being merged. Review tiers:
`docs/design/channel-first-review-plan.md` §4 (Phase-2 FK migration = **G + S(Fable-5)** on BOTH
spec and build; **HQ heads-up before touch**; Supabase gated apply + VALIDATE)._

---

## 1. Goal

Turn today's **loose free-text** channel→character association into a **real foreign key**, and
**elevate casting** (voice + visual) out of its modal into a first-class split-screen Character
surface inside the channel workspace. Two independently-reviewable lanes:

1. **`channel_profiles.character_id` FK** (expand/contract on the shared live DB) — replaces the
   best-effort name match Phase 1 uses for the cast avatar / Character surface with a durable link.
2. **Casting de-modaled** — the Casting Studio (voice) + Visual Identity panels move from modal
   overlays to a split-screen region of the workspace **Character** tab (reuse their logic/handlers
   verbatim; rebuild the chrome against Aurora).

**Explicitly NOT here:** Phase-3 threading (idea→job→episode) and per-channel Runs/Cost (those need
the pipeline correlation key — `slice-channel-first-phase3.md`). No new casting capability (voice
design, visual upload, audition gate are unchanged — this is a re-home + a link, not a behavior
change).

---

## 2. Non-negotiable constraints

- **D-2 stands** (focused control tool). This slice adds a link + re-homes casting; no new scope.
- **Shared-seam discipline (governance 24, review-plan §3):** `channel_profiles` is read by the
  **pipeline worker via the service role**. Before ANY migration touching it, file an **HQ
  heads-up** and get a **grep-verified answer** on whether the worker reads `channel_profiles.
  character` (the free-text) — do NOT assume. **Expand/contract only:** add nullable `character_id`
  + backfill, **keep `character` live** until the worker is confirmed migrated off it, THEN (a later
  slice) drop `character`. **Never a column swap.**
- **Nothing lost:** casting voice-design (Casting Card, KIT phrase banks, audition gate, birth-
  certificate `voice_recipe`), visual-identity upload→lock, and all their validation must remain
  reachable + behavior-identical after de-modaling.
- **Architect never writes app/design code.** Consensus gate (Fable-5 + Gemini + Codex) on spec AND
  build before merge.

---

## 3. Migration — `dash_0005_channel_profiles_character_id` (expand)

`channel_profiles` today: PK `channel` (text), `character` (text NULL, free-text), no `owner`
(operation-global; `authenticated` full CRUD; worker reads via service role) — per
`docs/contracts/data-contract.md`.

**Expand step (this slice):**
```sql
alter table public.channel_profiles
  add column character_id uuid null references public.characters(id) on delete set null;
```
- **Nullable**, additive, no default → safe on the live shared table; no worker write path touched.
- `on delete set null` — deleting a character must never block or cascade-delete an operator's
  channel config (mirrors `ideas.character_id` semantics).
- **FK across ownership classes is intentional:** `channel_profiles` is operation-global (no owner),
  `characters` is owner-scoped. The FK is structural only (RLS is unaffected); the worker (service
  role) bypasses RLS and can resolve the join. **Verify in review:** does an operation-global row
  referencing an owner-scoped row create any RLS read gap for the `authenticated` operator? (In the
  single-operator model, no — but state it.)
- **Backfill (best-effort, one-time, reviewed):** for each `channel_profiles` row with a non-null
  `character` free-text, set `character_id` = the `characters.id` whose `codename` matches
  case-insensitively / trimmed. **Ambiguous or unmatched → leave null** (the operator resolves in
  the editor). Backfill is a separate reviewed SQL step, NOT folded into the DDL; log the match
  count. **`character` stays populated and live.**
- **RLS:** unchanged (the new column rides the existing `channel_profiles` policies).
- **Gated apply (review-plan §3.3):** HQ heads-up → `apply_migration` → verify structure
  (`list_tables`) → negative contract test (insert a bogus `character_id` → FK rejects; delete a
  test character → link nulls, row survives) → **VALIDATE as a separate step**. Regenerate
  `database.types.ts`.

**Contract update:** add the `character_id` row to the `channel_profiles` table in
`docs/contracts/data-contract.md` with the expand/contract note (drop of `character` deferred to a
later slice, gated on worker-migration confirmation).

---

## 4. App changes

### 4.1 The link (editor + resolution)
- The workspace **Guidelines** editor (`ChannelProfilesPanel`, rebuilt in Phase 1) gains a
  **character picker** bound to `character_id` (a select over the operator's `characters`, with an
  "unassigned" null option). Saving writes `character_id`. **Keep `character` (free-text) writing in
  parallel** during expand/contract (write both, so the not-yet-migrated worker still resolves) —
  the free-text mirrors the picked character's codename.
- Everywhere Phase 1 did a best-effort name match to resolve the cast character (hub avatar,
  Character surface, ideas pre-fill), **prefer `character_id` when set**; fall back to the name match
  only for un-backfilled rows. This removes the Phase-1 §4 "loose free-text only" caveat for
  Character.

### 4.2 Casting de-modaled (workspace → Character tab, split-screen)
- The **Character** tab becomes a split view: left = the character dossier/bible (re-parented in
  Phase 1); right = **casting** — the voice **Casting Studio** (`CastingStudioPanel`) + **Visual
  Identity** (`VisualIdentityPanel`) rendered **inline as panels**, not modal overlays.
- **Reuse their logic/handlers/validation verbatim** (voice design/create/tts via `casting-proxy`,
  the daily-cap, the operator **audition gate** before lock, visual upload→lock, bucket-relative
  paths). **Discard the modal chrome**; rebuild against Aurora (glass panels, `.au-btn*`).
- **Audition gate integrity (money/shared path):** the audition-before-lock focus trap, cancel =
  no-write/no-spend, and the `voice_recipe` birth-certificate write must survive the de-modaling
  unchanged. This is the S(Fable-5) focus at build review.
- **`casting-proxy` untouched** in this slice (no proxy change → no redeploy). If a change becomes
  necessary, redeploy via Supabase MCP with `verify_jwt:true` (it is shared/live).

### 4.3 E1.b (folds in here)
- With the FK live, **pre-select the persona chip** in the Casting Studio for a channel-linked
  character (the deferred E1.b, `slice-channel-onboarding.md`) — resolve the channel's
  `character_id` → its channel profile's persona suggestion (`suggestPersona`) and pre-select that
  chip; non-binding, operator-overridable.

---

## 5. Gates (falsifiable, MEASURED — ratify on the real artifact; QA creds required)

**Migration**
1. `character_id` column exists, nullable, FK to `characters(id)` ON DELETE SET NULL (structure
   verified via `list_tables` + a live insert/delete negative test).
2. Backfill: linked-row count == best-effort match count logged; ambiguous/unmatched rows are null
   (no wrong link); `character` free-text unchanged on every row.
3. Deleting a character nulls the referencing `channel_profiles.character_id` and the row survives
   (no cascade delete, no block).
4. Worker-read safety: HQ-confirmed the worker still resolves the channel→character it needs
   (via `character` during expand); no worker breakage observed after apply.

**App**
5. Guidelines editor character picker writes `character_id` (intercept-and-abort; assert payload has
   `character_id` AND the mirrored `character` free-text).
6. Hub avatar + Character surface resolve via `character_id` when set (a row linked by FK but whose
   free-text was cleared still resolves correctly — proves FK-preference, not name-match).
7. Casting voice + visual are reachable **inline** in the Character tab (no modal), and a full
   voice-design → audition → lock cycle still works with the audition gate intact (cancel = zero
   writes/zero spend — intercept-and-abort proof).
8. E1.b: opening casting for a channel-linked character pre-selects the mapped persona chip;
   overridable.

**Quality**
9. No capability lost vs Phase 1 (reachability walk); AA on the split-screen at 412/mid/1440;
   `:focus-visible`, reduced-motion, keyboard nav across the split.
10. Consensus review (Fable-5 + Gemini + Codex) on spec + build reached; re-walk merged result.

---

## 6. Open items (resolve via the reviewer trio; defer to operator only if blocked)

- **Q1 — worker consumption of `channel_profiles.character`:** MUST be answered by the pipeline
  (grep-verified) via HQ before apply. If the worker reads it, expand/contract holds `character`
  live indefinitely until they migrate; if it does NOT, we can schedule the `character` drop sooner
  (a later slice). **This is the one true cross-team gate.**
- **Q2 — split-screen at 412px:** does casting-inline demand a stacked/disclosure treatment on
  mobile (the two panels can't sit side-by-side)? Reviewer trio to rule the responsive collapse.
- **Q3 — write-both vs write-`character_id`-only** during expand: confirm the worker-safe window; the
  default is write-both until Q1 says the worker is off `character`.
