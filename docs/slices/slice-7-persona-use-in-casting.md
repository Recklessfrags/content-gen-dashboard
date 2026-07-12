# Slice #7 — wire the recommended persona into casting ("Use in casting")

_Author: Architect (Claude). Status: **BUILD (read-only up to the existing spend boundary).**
Owner-approved ("proceed with all"); the long-deferred E1.b. **Money-path judgment: this slice does
NOT spend** — pre-filling the persona is in-memory only; ElevenLabs spend still begins solely at the
existing "Generate previews" button (unchanged, keeps its "spends credits" warning). So: read-only/
design delegation class, single-lens (Gemini) review, problem-solver merge nod before prod._

## Why
The "Recommended persona" card (`ChannelProfilesPanel.tsx:899-911`) is display-only — it tells the
operator which persona fits but gives no way to act on it. Meanwhile the Casting Studio already
supports a `suggestedPersonaChipId` prop that pre-fills the design step (the inline Cast tab uses it;
`ControlRoom.tsx:3096`). This slice connects the recommendation to the casting flow.

## Money boundary (verified, non-negotiable)
FREE (this slice): open Casting Studio, select/pre-fill persona chip, edit description — all
`useState`, no network. PAID (untouched): `handleGenerate` → `casting-proxy action:"design"`
("Generate previews", `CastingStudioPanel.tsx:519-564`) and `handleLock` → `action:"create"`. This
slice must not call, move, or weaken that boundary. The persona pre-fill only applies to **uncast**
characters (a saved `voice_recipe` still wins — `CastingStudioPanel.tsx:173-174`); preserve that.

## Build (read-only wiring)
### 1. Modal Casting Studio receives the suggestion (Gap A)
`ControlRoom.tsx` — the **modal** `CastingStudioPanel` (`~2080-2089`) currently omits
`suggestedPersonaChipId`. Add it, sourced from a new state (see #2), defaulting to the same
computation the inline instance uses (`suggestPersonaForChannel(<active character's channel profile>
?? {})?.chipId ?? null`; channel-profile lookup pattern at `~2724-2734`). So opening the modal for an
uncast character pre-fills the recommended persona.

### 2. "Use in casting" button on the recommendation card (Gap B)
- `ChannelProfilesPanel.tsx`: add an optional prop `onUseInCasting?: (characterId: string, chipId:
  string) => void` (props list `~164-179`). In the recommendation card (`~899-911`), when
  `form.character_id` **is** set and `onUseInCasting` is provided, render a **"Use in casting →"**
  button (`btn-secondary`) that calls `onUseInCasting(form.character_id, personaSuggestion.chipId)`.
  Keep the existing "Assign a character to use this recommendation." hint for the `!form.character_id`
  case (they're mutually exclusive). Display-only when no handler passed (backward compatible).
- `ControlRoom.tsx`: implement `onUseInCasting(characterId, chipId)` → (a) make that character the
  active casting target (reuse the existing active-character selection the modal already keys off),
  (b) store `chipId` in a new `castingSuggestedPersona` state, (c) `setCastingOpen(true)` (existing).
  Wire `castingSuggestedPersona` into the modal panel's `suggestedPersonaChipId` (#1). Clear it on
  modal close so a later manual "Cast a voice" falls back to the computed suggestion, not a stale one.

### 3. Fix the dangling default persona id (called-out correctness fix)
`CastingStudioPanel.tsx:109` — `DEFAULT_BUILDER_SELECTIONS.persona = "deadpan-demystifier"` is not a
real `PERSONA_BANK` id (nothing selects), so the design step shows no persona selected without a
suggestion. Change it to the valid intended chip **`"deadpan-absurdist"`** (verify against
`PERSONA_BANK` in `castingPhrases.ts`). Add/extend a tiny test asserting
`DEFAULT_BUILDER_SELECTIONS.persona` is a real `PERSONA_BANK` id (guards against regressions).

## Gates / review
`tsc` · full `vitest` (+ the default-persona-validity test) · `next build`. Single cross-vendor
(Gemini) review — explicitly asked to confirm the spend boundary is untouched. Commit + push to
`claude/wire-aurora-home-5b-lleyyg`; problem-solver merge nod before prod.

## Explicitly NOT in scope
Any change to the Generate-previews / Cast-&-lock spend flow, writing the persona onto the character
record, auto-generating previews, the inline Cast-tab instance (already wired), or the casting design
UI beyond receiving the pre-fill.

## States enumerated (rule 29)
- Recommendation card, no character assigned → existing "Assign a character…" hint, no button.
- Card with character assigned + handler → "Use in casting →" button; click opens the modal with the
  persona pre-filled for that character.
- Uncast character → persona pre-fills; already-cast character (has `voice_recipe`) → saved recipe
  wins, suggestion ignored (unchanged behavior).
- Modal opened via the plain "Cast a voice" button (no explicit "use") → falls back to the computed
  suggestion; no stale carried chipId after a prior close.
- No spend on any of the above; "Generate previews" remains the sole (warned) spend trigger.
- `onUseInCasting` not provided (other call sites / tests) → card stays display-only (no crash).
