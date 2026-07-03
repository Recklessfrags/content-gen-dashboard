# Slice — Casting: guard an empty bible at voice lock

_Status: **SPEC — ready for the builder (fresh session / Codex). INTERIM STOPGAP** under
`slice-bible-autogen.md` — the **real** fix is bible **auto-draft** (manual authoring is the weak
link; the empty bible was predictable, not a fluke). This guard only *catches* the bad state;
auto-draft *prevents* it and removes the manual burden. The guard still stays valid after auto-draft
lands (a draft can be skipped/rejected/edited to empty). Author: Architect (Claude), 2026-07-03.
Source: HQ heads-up "Fine Print `characters.bible` was EMPTY … Casting Studio gap" (pipeline,
2026-07-02). Best folded into the Phase-2 Character rebuild; low enough rework to ship standalone if
the operator wants the protection sooner._

## Problem (real, cost-bearing)
The Casting Studio can **lock a voice** (`voice_id`/`voice_settings`/`voice_recipe` written) while
`characters.bible` is still **all-empty** (all keys `""`). The pipeline derives the character word
window (`bible.runtime` → `_word_bounds`) and register from the bible; an empty bible = no length
target + no register guidance → **Gate-2 render job #36 parked `exhausted`** after 3 over-length
iterations, burning ~$0.126 LLM spend before failing. Voice assets and bible text are separate
completions and nothing enforces the second.

## Fix (dashboard-owned; small)
Treat a **non-empty bible as part of the character "ready/locked" done-check**, so a character can't
silently be voice-locked-but-unwritable:
- **Primary:** on the voice/character **lock/attestation** action, validate that `characters.bible`
  has **all required keys present and non-empty** (the keys enforced by the `bible` pg_jsonschema
  CHECK — Codex reads the exact key list from the migration/contract; the HQ note says 7). If empty/
  incomplete, **block the lock** with a clear message ("Write the character bible before locking —
  the pipeline needs `runtime` + register to render") and focus the bible editor.
- **Secondary (also surface it):** on any **already-locked** character whose bible is empty, show a
  persistent **"empty bible — won't render"** warning badge on the dossier/Character surface, since
  legacy rows (Fine Print pre-fix, and the re-audit candidates below) can already be in this state.
- **No migration, no pipeline change, no spend.** Pure client-side validation + a warning state. The
  pipeline is adding its own complementary guard (park `blocked` on empty bible BEFORE LLM spend) —
  ours prevents the bad state from being created; theirs fails closed if one slips through.

## States to cover (per AGENTS.md UI baseline)
Lock button: enabled (bible complete) · disabled-with-reason (bible empty/incomplete) · the warning
badge on locked-but-empty characters (default/hover for the tooltip). Keep it accessible (not
color-alone — icon + text).

## Also affected (field-completeness re-audit — flag, don't auto-fix)
- **Mad Dog McGrath** — live row `voice_settings` null, `voice_recipe` null (bible populated).
- **Grandma Pearl** — `voice_recipe` null.
These predate the casting playbook; surface them via the same completeness check as re-audit
candidates (operator decides re-cast). Not part of this guard's code, just the same lens.

## Sequencing / interference note (Architect)
Phase 1 re-parents and Phase 2 **rebuilds** the Casting/Character surface against the Aurora design
system, so building this guard against **today's** Casting Studio code risks light rework. Recommend
**folding this done-check into the Phase-2 casting elevation** (natural home — casting becomes
first-class there). It is small and re-appliable, so a standalone build now is acceptable **if** the
operator wants to stop the wasted-render failure mode before Phase 2 lands. Either way: **not the
Architect's to build — routes through Codex, reviewed (Gemini + Architect), then ratified.**

## Gates (when built)
- Attempting to lock a character with an empty bible is **blocked** (assert the lock write is
  prevented + the message shows).
- A character with a complete bible locks normally (no false block).
- A pre-existing locked-but-empty character shows the warning badge (Fine Print's pre-fix state, or a
  seeded test row).
- Accessibility: reason/warning conveyed by text+icon, keyboard-reachable, AA.
