# Slice — Channel-first Phase 2 (character_id FK + casting elevated out of the modal)

_Status: **SPEC — v2, consensus round-1 folded** (Fable-5 + Gemini + Codex all REQUEST-CHANGES on v1;
converged blockers folded below — the migration is now `NOT VALID`+`VALIDATE`, the mirror can no
longer implicitly wipe the worker-visible free-text, backfill is owner-scoped+logged, and the
cross-owner FK/RLS reality is named with a defensive UI state + gates). **Round-2 consensus pending.**
Author: Architect (Claude), 2026-07-03. Direction: `DIRECTION.md` D-6 +
`docs/design/channel-first-redefinition.md`. Depends on Phase 1 merged. Review tiers
(`docs/design/channel-first-review-plan.md` §4): **Phase-2 FK migration = G + S(Fable-5)** on spec
AND build; **HQ heads-up + grep-verified worker-read answer before touch**; Supabase gated apply +
separate VALIDATE._

---

## 0. Operating invariant (load-bearing — declared, not assumed)

**The dashboard is single-operator today** (solo founder — `AGENTS.md` "User"). BUT `characters`,
`ideas`, and `character-refs` are **owner-scoped** (`owner = auth.uid()`), while `channel_profiles`
is **operation-global** (no `owner`, `authenticated` full CRUD, pipeline worker reads via service
role). That asymmetry is a real hazard the reviewers flagged: a FK from a global table to an
owner-scoped table means a `channel_profiles.character_id` can point at a character the *current*
authenticated reader cannot see (multi-owner) — and, because the migration/backfill runs as the
service role, a wrong-owner link can even be manufactured at apply time. **This slice accepts the
single-operator invariant as a live precondition, records it in the contract note, AND still builds
the defensive UI states below** (so a future multi-owner mode degrades safely instead of silently
wiping data). Everywhere below, "the operator's characters" = characters readable under the current
session.

---

## 1. Goal

Turn the loose free-text channel→character association into a real FK, and elevate casting (voice +
visual) out of its modal into a first-class split-screen Character surface. Two reviewable lanes:

1. **`channel_profiles.character_id` FK** (expand/contract on the shared live DB).
2. **Casting de-modaled** — Casting Studio (voice) + Visual Identity move from modal overlays into a
   split-screen region of the workspace **Character** tab (reuse logic/handlers verbatim; rebuild
   chrome against Aurora).

**NOT here:** Phase-3 threading + per-channel Runs/Cost (`slice-channel-first-phase3.md`). No new
casting capability — a re-home + a link, not a behavior change.

---

## 2. Non-negotiable constraints

- **D-2 stands.** Adds a link + re-homes casting; no new scope.
- **Shared-seam discipline (governance 24, review-plan §3):** `channel_profiles` is read by the
  pipeline worker via the service role. **HQ heads-up + a grep-verified answer on whether the worker
  reads `channel_profiles.character` BEFORE apply** (the ask is already filed, 2026-07-03). **Expand/
  contract only:** add nullable `character_id` + backfill, **keep `character` live** until the worker
  is confirmed off it, THEN (a later slice) drop `character`. Never a column swap.
- **Nothing lost:** casting voice-design (Casting Card, audition gate, birth-certificate
  `voice_recipe`), visual upload→lock, all validation reachable + behavior-identical after de-modal.
- **Architect never writes app/design code.** Consensus gate (Fable-5 + Gemini + Codex) on spec AND
  build before merge.

---

## 3. Migration — `dash_0005_channel_profiles_character_id` (expand, NOT VALID + VALIDATE)

`channel_profiles` today: PK `channel` text, `character` text NULL (free-text), no `owner`.

**Expand DDL (two statements so the gated VALIDATE step is real — reviewer BLOCKER: an inline
`references` validates at DDL time, leaving nothing to VALIDATE; use the `dash_0003` `NOT VALID`
precedent, safer on a live shared table):**
```sql
-- 1. add the column (nullable, additive, no default)
alter table public.channel_profiles add column character_id uuid null;
-- 2. add the FK as NOT VALID (does not scan/lock existing rows), then VALIDATE separately
alter table public.channel_profiles
  add constraint channel_profiles_character_id_fkey
  foreign key (character_id) references public.characters(id) on delete set null not valid;
-- (separate gated step, after structure verify:)
-- alter table public.channel_profiles validate constraint channel_profiles_character_id_fkey;
```
- `on delete set null` — deleting a character never blocks/cascades an operator's channel config.
- **Backfill (owner-scoped, single-match, LOGGED — reviewer BLOCKER):** the backfill runs as the
  service role (sees ALL owners' characters), so a naive `codename` subquery can (a) crash with
  `21000: more than one row` on duplicate codenames, or (b) silently link a **wrong owner's**
  character on a single cross-owner match. Rule: link `character_id` only where **exactly one**
  character (scoped to the single operator's `owner`, hard-coded to the known operator uuid for this
  apply) matches `character` case-insensitively/trimmed; **ambiguous OR zero OR cross-owner → leave
  null.** Emit the **full match list** (channel → matched character id/codename/owner), not just a
  count, for operator review. Separate reviewed SQL step; `character` stays populated.
- **RLS:** unchanged. **Contract note (log the ruling):** a global→owner-scoped FK lets any
  authenticated user set `character_id` to any character uuid without proving readability, and an
  FK-probe can oracle-test uuid existence — **accepted under the single-operator invariant (§0),
  recorded here + in `data-contract.md`.** The FK is structural; RLS on `characters` is unchanged.
- **Gated apply (review-plan §3.3):** HQ heads-up → `apply_migration` (statements 1–2) → verify
  structure (`list_tables`) → negative test (bogus `character_id` → FK rejects once VALIDATE'd;
  delete a test character → link nulls, row survives) → **`VALIDATE CONSTRAINT` as the separate
  step** → regenerate `database.types.ts`. Update the `channel_profiles` table + note in
  `data-contract.md`.

---

## 4. App changes

### 4.1 The link — read authority, mirror-write, and the no-implicit-wipe rule (reviewer BLOCKERS)
- **`character_id` is the read authority** when non-null (hub avatar, Character surface, ideas
  pre-fill prefer it; fall back to the free-text name-match ONLY for FK-null rows). The free-text
  `character` becomes a **write-only projection** for the worker during the expand window.
- The Guidelines editor gains a **character picker** bound to `character_id` (a select over the
  operator's readable `characters`, plus an explicit "unassigned"/null option).
- **NO IMPLICIT WIPE (the core fix):** `buildChannelProfileUpsert` today does
  `character: input.character?.trim() || null` — so a save with the picker unresolved would **null
  the worker-visible free-text inside the very expand window we promised to protect.** Rule:
  - Picker resolves to a readable character → write BOTH `character_id` AND `character` = that
    character's current codename.
  - Picker "unassigned" OR `character_id` present-but-unreadable (cross-owner, §0) → **leave the
    existing `character` free-text UNTOUCHED and preserve `character_id`.** The free-text is cleared
    ONLY via an explicit, labeled "clear cast" action, and only after Q1 confirms the worker is off
    `character`.
  - **Linked-but-unreadable state:** if `character_id` is non-null but not readable, the editor shows
    a labeled "Linked — not visible in this session" state and a save of any OTHER field preserves
    `character_id` + `character` verbatim (never nulls them).
- **Codename-rename drift (reviewer SHOULD):** the mirror is written on profile save, so renaming a
  character's `codename` later leaves `channel_profiles.character` stale (worker resolves old name,
  dashboard resolves the FK). Fix: on a character `codename` change, **sync the mirror** on every
  `channel_profiles` row whose `character_id` == that character (a dashboard-owned write), OR surface
  "cast free-text out of date" in the editor. Pick sync (cleaner); gate it.

### 4.2 Casting de-modaled (workspace → Character tab, split-screen)
- Character tab = split view: left = dossier/bible (Phase 1); right = casting inline — Casting Studio
  + Visual Identity as **panels, not modals**. Reuse handlers/validation verbatim (voice design/
  create/tts via `casting-proxy`, daily cap, the operator **audition gate** before lock, visual
  upload→lock, bucket-relative paths). Discard modal chrome; rebuild against Aurora.
- **Audition-gate integrity (money/shared path — S(Fable-5) focus):** the audition-before-lock focus
  trap, cancel = no-write/no-spend, and the `voice_recipe` birth-certificate write survive de-modal
  unchanged.
- **Unreadable-character casting:** if the channel's `character_id` is present-but-unreadable, the
  casting panel shows the labeled state (not a 403 crash on the private `character-refs` ref image).
- `casting-proxy` untouched (no redeploy) unless changed → then redeploy via Supabase MCP,
  `verify_jwt:true`.

### 4.3 E1.b (folds in)
- With the FK live, **pre-select the persona chip** in the Casting Studio: resolve the channel's
  `character_id` → the channel_profiles row's `suggestPersona(...)` chip (the existing
  `src/lib/suggestPersona.ts` maps channel fields/`voice_archetype` → a `PERSONA_BANK` chip);
  non-binding, operator-overridable.

---

## 5. Gates (falsifiable, MEASURED; QA creds required)

**Migration**
1. `character_id` column exists, nullable; FK to `characters(id)` ON DELETE SET NULL exists and is
   **VALIDATED as a separate step** (structure via `list_tables`; post-VALIDATE a bogus uuid insert
   is rejected).
2. Backfill: the **match list** (not just count) is produced; every linked row is a single
   same-owner codename match; ambiguous/zero/cross-owner rows are null; `character` unchanged on
   every row.
3. Deleting a character nulls the referencing `character_id` and the row survives (no cascade/block).
4. **Worker-read safety (named measurement):** the pipeline's grep answer to "does the worker read
   `channel_profiles.character`?" is quoted in the HQ thread BEFORE apply; if yes, `character` is
   confirmed still populated post-apply on the touched rows (one live worker run resolving a touched
   profile, or the quoted grep + a manual row check).

**App — the no-wipe guarantees**
5. Save the Guidelines editor with the picker **unassigned** on a row that has pre-existing
   `character` free-text → intercepted payload **preserves** `character` (does NOT null it) and
   preserves `character_id`.
6. Save an unrelated field on a row whose `character_id` is present-but-unreadable → payload
   preserves BOTH `character_id` and `character`; the editor shows the labeled "linked — not visible"
   state (no 403 crash on the ref image).
7. Picker resolves to a readable character → payload writes BOTH `character_id` and the mirrored
   `character` codename; renaming that character's codename later syncs the mirror (or surfaces
   staleness) — assert the mirror matches after rename.
8. Hub avatar + Character surface resolve via `character_id` when set (an FK-linked row whose
   free-text was cleared still resolves — proves FK-preference over name-match).

**Casting + quality**
9. Casting voice + visual reachable **inline** in the Character tab (no modal); a full voice-design →
   audition → lock cycle works with the audition gate intact (cancel = zero writes/zero spend —
   intercept-and-abort proof). E1.b pre-selects the mapped persona chip; overridable.
10. No capability lost vs Phase 1 (reachability walk); AA on the split at 412/mid/1440;
    `:focus-visible`, reduced-motion, keyboard nav. Consensus review (Fable-5 + Gemini + Codex) on
    spec + build; re-walk merged result.

---

## 6. Open items (reviewer trio first; operator only if blocked)

- **Q1 — worker consumption of `channel_profiles.character`:** filed to HQ 2026-07-03; MUST be
  answered (grep-verified) before apply. Gates when we can retire `character` (a later slice).
- **Q2 — split-screen at 412px:** stacked/disclosure treatment on mobile (panels can't sit
  side-by-side). Reviewer trio to rule the collapse.
- **Q3 — mirror sync on rename vs surface-staleness:** default = sync the mirror on codename change;
  confirm no worker-race in the sync write.
