# Slice #40 (phase-2 final) — `useIdeas` then `useCharacters` extraction

_Author: Architect (Claude). Status: spec frozen (read-only for the rest of these slices).
The **last and highest-risk** ControlRoom decomposition slice (handoff §4.A): the entangled
characters/ideas state — optimistic writes, `clientWriteState` revert, the dirty-guard, and
`savedSnapshots`. **Behavior-preserving.**_

> **Sequencing:** these build **only after Lane A (`useReceipts`, `claude/decomp-useReceipts-drilldown`)
> merges to production** — both edit `ControlRoom.tsx`. Cut fresh from the updated default
> branch. **Do NOT stack on Lane A's unmerged branch.**

> Loop: Architect (this spec + commit) → Builder (Codex) → independent review (Gemini +
> Architect, neither built) → human ratifies/merges. **One slice = one PR.**

## Ruling: split into TWO PRs (do them in this order)

`useIdeas` is **self-contained** (its writes only touch the ideas list + supabase + a flash
callback). `useCharacters` is **entangled** with `activeId` selection, the dirty-state
computation, `savedSnapshots`, and the save→revision/history flow. Bundling them doubles the
blast radius of the riskiest remaining slice. So:

- **B1 — `useIdeas`** (do first; lower risk).
- **B2 — `useCharacters`** (do second, after B1 merges; highest risk in the whole decomp).

Each is its own branch, build, review, PR. If B1 surfaces a surprise, B2 is unaffected.

---

## B1 — `src/lib/hooks/useIdeas.ts`

### Moves into the hook (all self-contained to the ideas list)
- **State:** `ideas: WireIdea[]`, `ideasLoading`, `ideasError`, `ideaSubmittingTitle`.
- **Refs:** `ideaRequestRef` (fetch race-guard), `ideaSubmittingTitleRef` (re-entrancy guard).
- **Functions (verbatim behavior):** `fetchIdeas` (race-guard + the **local-only merge** that
  preserves in-flight `clientWriteState` cards over refetched remote rows — lines ~441-466),
  `startIdeaInsert` (optimistic insert + `clientWriteState` saving/failed + the **dedup-aware
  swap** at ~1141-1146), `retryIdea`, `dismissIdea`, `setIdeaStatus` (optimistic + revert on
  error), `setIdeaField` (optimistic + revert on error).

### Hook signature
`useIdeas(supabase, { showFlash })` where `showFlash: (msg, err?) => void` is injected (the
hook must not own the toast). Returns:
`{ ideas, loading, error, submittingTitle, refetch, addIdea, retryIdea, dismissIdea, setIdeaStatus, setIdeaField }`
where **`addIdea(title, note, characterId, channel)`** is the supabase-touching core of today's
`logIdea` (mint temp id → optimistic prepend → `startIdeaInsert`).

### Stays in `ControlRoom` (UI orchestration)
- `logIdea()` becomes a thin wrapper: read `draftIdea`/`draftIdeaNote`/`activeId`, clear the
  drafts, `requestAnimationFrame`-focus `ideaTitleRef`, then call `addIdea(...)`. The draft
  state, the textarea ref/focus, and the keyboard handlers stay in ControlRoom.
- Anything reading `ideas` for derived UI (`openIdeas` count, the wire render) consumes the
  hook's `ideas`.

### Behavior that MUST be preserved (verify each in build notes)
1. Optimistic card appears instantly with `clientWriteState: "saving"`; on success swaps to the
   real row (stable `clientKey = tempId`); on failure → `"failed"` + retry affordance.
2. The **dedup swap**: a concurrent refetch landing the real row mid-insert must not leave two
   cards with the same real id.
3. `fetchIdeas` **local-only merge**: in-flight `clientWriteState` cards survive a refetch.
4. Re-entrancy: same-title double-submit is ignored (`ideaSubmittingTitleRef`).
5. `setIdeaStatus`/`setIdeaField` optimistic-then-revert-on-error, and both **no-op on a card
   that still has `clientWriteState`** (don't mutate an unsaved card).

---

## B2 — `src/lib/hooks/useCharacters.ts`  (highest risk — read this twice)

### Moves into the hook
- **State:** `chars: FlatChar[]`, `savedSnapshots`, `loading`, `loadError`.
- **Ref:** `characterRequestRef` (fetch race-guard).
- **Functions:** `fetchCharacters` (race-guarded), and the list-data primitives:
  `setField(id, field, value)` (today's `set`), `applySnapshot(id, snapshot)` (the revert
  body), `patchCharacter(id, patch)`, `addCharacter()` (the supabase insert + `setChars` append
  + `savedSnapshots` seed), and `commitSnapshot(id, snapshot)` (the `setSavedSnapshots` update
  done after a successful save).

### The three entanglements that make this risky — preserve EXACTLY
1. **`fetchCharacters` currently sets `activeId`** (selection: keep current if still present,
   else first char, else null — lines ~434-438). **`activeId` is UI orchestration and STAYS in
   `ControlRoom`** (dirty-guard, history, casting all key off it). Boundary: the hook owns
   `chars`/`savedSnapshots`/fetch and must **not** own `activeId`. Reproduce selection one of two
   ways (Codex picks, behavior identical): (a) `fetchCharacters` returns the flat list and
   ControlRoom resolves `activeId` after the call, or (b) the hook exposes an `onLoaded(flat)`
   callback ControlRoom passes to do the same resolve. **The "keep current else first else null"
   rule must be byte-for-byte.**
2. **`savedSnapshots` feeds the dirty computation.** `savedEditableFields` / `dirty`
   (`useDirtyState`) read `savedSnapshots[activeId]`. The hook owns the map, but the dirty
   derivation stays in ControlRoom and must see the same values at the same times. Do not change
   when snapshots are written (load, after save, on add).
3. **`save()` stays in `ControlRoom`** — it's woven through `active`, `dirty`, `historyOpen`,
   `fetchRevisions`, `isRestoredDraft`, `showFlash`, AND writes `character_bible_revisions`.
   Only its two data-touch points delegate to the hook: the `characters` UPDATE may stay inline,
   but the **`setSavedSnapshots` update becomes `commitSnapshot(...)`**, and the optimistic
   `setChars` edits (`set`, revert, `confirmRestore`, `patchCharacter`, `addChar`'s append) go
   through the hook's primitives. The revision-insert + history-refresh + dirty/flash logic does
   NOT move.

### Stays in `ControlRoom`
`activeId`, `active`/`displayedActive`, the entire dirty-guard machinery, `save()` orchestration,
`confirmRestore`/preview/history, casting `patchCharacter` call-sites' UI, focus refs, and all
render. `guardedAddChar` stays; `addChar` calls the hook's `addCharacter()` then does the
view/URL/activeId bookkeeping.

### Behavior that MUST be preserved (verify each)
1. Load resolves `activeId` identically (keep-current-else-first-else-null); error path clears
   chars + snapshots + activeId + sets loadError (lines ~423-428).
2. Editing a field marks dirty exactly as today; Save persists, writes a revision, updates the
   snapshot so dirty clears, and refreshes history if open.
3. `addChar` creates, appends, seeds its snapshot, selects it, switches to roster, syncs URL.
4. Casting `patchCharacter` (voice_id/voice_settings) still bypasses the dirty/snapshot flow.
5. Restore-from-history still preserves live `voice_id`/`voice_settings` (lines ~808-812).
6. The fetch race-guard still drops stale responses.

---

## Gates (both slices; DONE = green on the real artifact)
1. `npx tsc --noEmit` clean. 2. `npm test` green. 3. `npm run build` succeeds.
4. **Reasoned behavior-parity** in build notes covering every numbered item above.
5. `git diff --stat` touches only the new hook file + `ControlRoom.tsx` (+ this spec). NOT
   `docs/HANDOFF.md`.
6. **Real-artifact ratification** (this is the slice where "floor ≠ done" bites — optimistic
   writes + dirty-guard are UX-visible): log an idea offline-fail→retry, edit+save a character,
   switch dossiers with unsaved edits (dirty guard fires), restore from history. Desktop + mobile
   (412px).

## Builder instructions (Codex)
Argue with this spec first if any boundary is wrong (silent compliance = defect; this is the
slice most likely to have a wrong boundary). Build only the declared files for the slice you're
on (B1 = `useIdeas.ts` + `ControlRoom.tsx`; B2 = `useCharacters.ts` + `ControlRoom.tsx`). You
**cannot commit** — leave edits in the tree; the Architect reviews + commits. Do **not** edit
`docs/HANDOFF.md`. Report raw gate output.
