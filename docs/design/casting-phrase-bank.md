# Casting Card — phrase bank + assembler grammar (curated craft content)

_Author: Architect (Claude), 2026-07-02. Source of truth for `src/lib/castingPhrases.ts`
(Codex transcribes this into typed constants). This is the "Casting Card" synthesis
(Fable-5 design pass, Gemini-sanity-checked): tappable chips → curated rich clauses →
an assembler emits an editable ~200–600 char ElevenLabs `voice_description` paragraph in
CASTING KIT slot order. Slider-level ease, KIT-compliant richness. **§ PERSONA is
operator-facing — send it to the operator to redline.**_

Craft standard (CASTING KIT): one dense paragraph, plain English, stacked vivid
adjectives, no jargon, no bracket tags, always opens "Perfect audio quality, studio
recording." Gold target the banks must match in register:

> Perfect audio quality, studio recording. Female, 40s, neutral General American
> accent, educated but conversational. A low, warm alto with natural resonance and a
> slightly husky edge; deliberate, unhurried pacing with small ironic pauses and
> precise emphasis — a documentary narrator who finds federal food law genuinely funny.
> Deadpan but never flat: lived-in, conversational inflection with a knowing half-smile
> in the read.

## Assembler grammar (`assembleKitDescription(selections)` — pure, deterministic, snapshot-tested)

Fixed opener, then one sentence per slot group, in this order. Any slot may be unset →
its fragment is skipped and glue degrades gracefully (never leaves a dangling "; " or
" — "). `Cap(x)` upper-cases the first letter.

1. **Opener** (always): `Perfect audio quality, studio recording.`
2. **Voice**: ` {Gender}, {ageBand}, {accentClause}.`  — e.g. `Female, 40s, neutral General American accent, educated but conversational.`
3. **Timbre (+ Pitch)**: ` Cap({timbreClause})` + ( Pitch set → `; {pitchClause}` ) + `.`
4. **Pace (+ Persona)**: ` Cap({paceClause})` + ( Persona set → ` — {personaClause}` ) + `.`
5. **Emotion**: ` Cap({emotionClause}).`

Worked example (Voice=Female/40s/GenAm · Timbre=warm-smooth · Pitch=downward · Pace=measured · Persona=deadpan-demystifier · Emotion=dry-amused) → ~430 chars, matches the gold register:
> Perfect audio quality, studio recording. Female, 40s, neutral General American accent, educated but conversational. A warm, smooth tone with a rounded, easy resonance; it lands each statement with a downward drop that reads as authority. Deliberate, unhurried pacing with small pauses and precise emphasis — a sharp explainer who finds the rules genuinely funny. Deadpan but never flat, a knowing half-smile in the read.

**Provenance:** `builder_state` (the chip selections) is stored in `voice_recipe.design_prompt`
alongside the canonical `voice_description_raw` (the assembled/edited text actually sent
to EL). On re-open: rehydrate chips from `builder_state`; if the stored text ≠ a fresh
reassembly of `builder_state`, open **detached** (text is authoritative, chips greyed —
see the UI spec). Never reverse-parse text into chips.

---

## VOICE — Gender × Age (structured pick, not a phrase bank)

- **Gender** (one): `Male` · `Female` · `Androgynous` (Androgynous → the Voice sentence
  begins `An androgynous voice, {ageBand}, {accent}…`, no leading gender word).
- **Age band** (one): `early 20s` · `late 20s` · `30s` · `late 30s` · `40s` · `50s` · `60s`.

## VOICE — accent (one of)

| Chip | Emitted clause |
| --- | --- |
| General American | neutral General American accent, educated but conversational |
| British RP | crisp British Received Pronunciation, polished and articulate |
| Soft Southern US | a gentle Southern US lilt, warm and unhurried |
| New York edge | a flat New York edge, quick and streetwise |
| Light Irish | a light Irish warmth to the vowels, lyrical but grounded |
| Working-class London | a working-class London accent, plain-spoken and direct |

## TIMBRE & grit (one of)

| Chip | Emitted clause |
| --- | --- |
| Warm & smooth | a warm, smooth tone with a rounded, easy resonance |
| Bright & reedy | a bright, reedy timbre with a clean cutting edge |
| Deep & gravelly | a deep, gravelly voice with a rough low-end rasp |
| Dry & close-mic'd | a dry, close-mic'd sound, present and up against the ear |
| Rich & resonant | a rich, resonant tone with full chest and body |
| Thin & wiry | a thin, nasal-edged timbre with a wiry character |
| Breathy & intimate | a breathy, intimate tone with soft air on every word |

## PITCH & dynamics (one of)

| Chip | Emitted clause |
| --- | --- |
| Wide & expressive | wide, expressive pitch that rises and falls freely |
| Narrow & controlled | a narrow, controlled pitch range held tightly in check |
| Downward authority | it lands each statement with a downward drop that reads as authority |
| Upward & bright | pitch that lifts brightly at phrase-ends, open and eager |
| Flat with pops | a mostly flat delivery with sudden pops of emphasis |

## PACE & cadence (one of)

| Chip | Emitted clause |
| --- | --- |
| Measured & unhurried | deliberate, unhurried pacing with small pauses and precise emphasis |
| Rapid-fire & clipped | rapid-fire, clipped delivery that barely stops for breath |
| Conversational | an easy conversational rhythm, relaxed and natural |
| Punchy & staccato | punchy, staccato cadence that hits each beat hard |
| Flowing & legato | a flowing, legato cadence that glides between phrases |
| Urgent & driving | an urgent, driving pace that pushes relentlessly forward |

## EMOTIONAL register (one of)

| Chip | Emitted clause |
| --- | --- |
| Dry & amused | deadpan but never flat, a knowing half-smile in the read |
| Warm & reassuring | warm and reassuring, every line offered like a steady hand |
| Intense & commanding | intense and commanding, brooking no argument |
| Sincere & earnest | sincere and earnest, fully believing every word |
| Playful & mischievous | playful and mischievous, always half in on the joke |
| Ominous & foreboding | ominous and foreboding, a quiet threat under every phrase |

## PERSONA archetype (one of) — ⚑ OPERATOR REDLINE

_This slot carries the character — the vividness budget lives here (the physics slots
above can safely repeat across the roster). Draft below spans the known/likely roster;
the operator adds/edits to taste (they know the channel lineup)._

| Chip | Emitted clause | roster fit |
| --- | --- | --- |
| Deadpan demystifier | a sharp explainer who finds the rules genuinely funny | Fine Print / food |
| Drill instructor | a relentless drill instructor hammering every point home | Mad Dog |
| Warm grandmother | a warm grandmother sharing hard-won kitchen wisdom | Grandma Pearl |
| True-crime skeptic | a true-crime narrator quietly picking apart the official story | |
| Late-night confessor | a late-night radio host letting you in on a secret | |
| Carnival barker | a carnival barker with a glint in the eye and a pitch to make | |
| Jaded insider | a jaded industry insider who has seen how it all really works | |
| Giddy obsessive | a giddy obsessive who cannot wait to show you the best part | |
| No-nonsense authority | a no-nonsense authority laying the facts down flat | |
| Conspiratorial whisperer | a conspiratorial whisperer leaning in close to the mic | |
| Wry professor | a wry professor making dry material land with a smirk | |
| Patient guide | a patient guide walking you through it step by careful step | |

## Clash notes (advisory only — the paragraph is always editable; do NOT hard-block)

Each slot is single-select, so intra-slot contradiction is impossible. Cross-slot combos
that read oddly (author is aware; the editable box is the escape hatch): _Breathy &
intimate_ vs _Intense & commanding_; _Wide & expressive_ pitch vs _Flat with pops_
(different slots, fine); _Dry & amused_ / _Playful_ emotion under a _No-nonsense
authority_ persona. v1 ships no clash-blocking — the operator hears it and re-taps.

## Escape hatches

- Every slot offers **"Other…"** → an inline one-line field whose text slots in verbatim
  at that slot's position.
- The **assembled paragraph is fully editable**; direct edits detach the card (chips
  greyed, "Reset to picks" restores; re-tapping a chip after a manual edit warns before
  overwriting — Gemini finding).
