# Slice — Casting Studio basic mode: prompt-first drafting + progressive disclosure

_2026-07-14. Architect (Claude). **Owner-directed this session** ("go") — pulls forward the
phase-2 "AI expand" deferred in the locked Casting-Card decision (2026-07-02), with the
owner's shape: **one surface; Basic is the default working view; Advanced just EXPANDS the
fields; the audition TOURNAMENT stays in Basic.** Casting is sanctioned under the freeze.
**Money-path adjacent + live edge-function change → two-lens review (Gemini + suerta) before
landing; owner has already GONE the new LLM-spend path (pennies/call, capped).** The EL
spend flow (design/create caps, audition gate before lock) is UNTOUCHED._

## Rule-40 dimension-check (new governance rule — this touches the casting seam)
- **Assumes:** `characters.voice_recipe` stays permissive-additive (it is — CHECKs are
  additive by design); the EL design/create contract via `casting-proxy` is unchanged; the
  `channel-guideline-proxy` Anthropic path + key remain deployed.
- **Breaks if wrong:** a stricter future recipe CHECK could reject the added `prompt_raw`
  key (mitigation: additive key inside the existing `design_prompt` object, same place
  `voice_description_raw` lives); nothing else consumes these fields (worker reads only
  `voice_id`/`voice_settings` — verified in the 07-14 pipeline heads-up).
- **Reversal cost:** low — UI-level + one new edge-function action; no migration, no
  contract change, no new table.

## A. UI — `CastingStudioPanel` respects the global mode (same pattern as ChannelProfilesPanel)

ControlRoom passes `basicMode={!uiAdvanced}` + `onShowAdvanced` to BOTH CastingStudioPanel
mounts (modal + inline). One surface, progressive disclosure:

**BASIC (default) shows, top to bottom:**
1. **Voice prompt box** (new) — label "Describe the voice"; helper: "Plain language.
   References welcome — e.g. 'a cross between Yosemite Sam and R. Lee Ermey in Full Metal
   Jacket, minced-oath fury, no hard profanity.'" With a **"Draft description"** button →
   calls the new `cast_describe` action → fills the SAME `voice_description` field the kit
   uses today (one-way: drafting overwrites the description after the same
   discard-confirm the chip builder uses when the description was hand-edited; never
   reverse-parses).
   **Recast-target seeding:** if `character.voice_recipe` carries a recorded recast target
   (the pipeline's intent-capture shape, e.g. Mad Dog's
   `status: "recast_target_recorded_not_cast"` + target text), pre-fill the prompt box from
   it (pure parser, fail-safe null on any other shape).
2. **The drafted description** — the existing editable textarea (visible in basic: the
   operator must see and can tweak exactly what will be sent to the voice designer).
3. **Generate previews → the TOURNAMENT** — the existing audition bracket
   (candidates/favorites/winner, lock with confirm) EXACTLY as today. Stays in basic per
   the owner.
4. A **"Show all casting controls"** affordance → flips the global mode to advanced
   (`onShowAdvanced`), mirroring the channel editor's pattern.

**ADVANCED additionally expands (nothing replaced, fields added):** the six KIT chip
pickers, the preview-text editor, guidance presets — all exactly as today. The prompt box
remains available in advanced too (chips and prompt both feed the same description; the
existing assemble/detach semantics are preserved — drafting from the prompt marks the
description detached from the chips, same as a hand edit).

**Provenance:** on lock, the birth-certificate `voice_recipe.design_prompt` additionally
records `prompt_raw` — the **last successfully drafted** prompt (kept in its own state
variable at draft time; never the live input-box value, which the operator may have edited
after drafting without re-submitting) — additive key, nothing else changes.

**States (rule 29):** prompt box empty/typing; Draft = idle/loading/error (LLM failure →
inline error, description untouched); draft-overwrite confirm when description was
hand-edited; cap-reached error surfaced verbatim; both themes; 412/700/1440; all controls
≥44px, `:focus-visible`.

## B. Edge function — `channel-guideline-proxy` gains action `cast_describe`

(The Anthropic key lives ONLY here — do not copy it into casting-proxy.)
- Request: `{ action: "cast_describe", prompt: string, character?: { codename?, concept? } }`.
  Auth: same session gate as `generate`. Soft per-user/day cap **25** on this action
  (mirror the existing cap mechanics).
- Server prompt (system): expand the operator's prompt into (a) ONE paragraph, 200–600
  chars, KIT-format rich voice description (timbre, pacing, register, texture, age,
  accent, energy), **transforming any real-person/character references into original trait
  language — the output must contain NO real names** (evokes, never copies — the Mad Dog
  bible pattern); advertiser-safe; AND (b) a matching **in-character performance/preview
  script** (~2–4 sentences — the casting lesson: rich description + long performance
  script is what produced the good voice). Include the character codename/concept as
  context when provided. Model: the function's existing `ANTHROPIC_MODEL`.
- **Input cap:** `prompt` ≤ 1000 chars — enforced in the UI (`maxLength`) AND server-side
  (400 with a plain error).
- Response: `{ voice_description: string, preview_text: string }`; 4xx with a plain error
  string on cap/validation. **Basic mode uses the drafted `preview_text`** for Generate
  previews; if the operator never drafts, previews fall back to today's default behavior
  (Codex: verify what the studio currently sends when preview text is untouched, and keep
  it working in basic — the EL design call must never fire with an empty script).
- **Cap: SHARED with `generate` (Architect ruling 2026-07-14, amending the freeze —
  logged, not silent).** The builder correctly stopped on the original action-scoped-cap
  requirement: the live cap store is keyed `(user_id, day)` and the RPC takes
  `(p_user, p_limit)` — action scoping needs a migration, which is disproportionate for a
  soft anti-runaway cap on a solo-operator tool at pennies/call. `cast_describe` therefore
  draws from the SAME daily quota as `generate` (25/day combined). Receipt: question ·
  the builder's evidence · this derivation · scope-limit (revisit if multi-user lands or
  the quota starts pinching) · status: proceeding, flag to veto.
- **Recast-target parser — exact live shape (verified via Supabase 2026-07-14):**
  `voice_recipe = { status: "recast_target_recorded_not_cast", target: "<owner's verbatim
  text>", note, source, recorded_at }`. Seed the prompt box with `target` iff
  `status === "recast_target_recorded_not_cast"` AND `target` is a non-empty string;
  any other shape → null (fail-safe). Note: the recipe's own `note` marks the actual
  RE-CAST (EL spend) as owner-gated — seeding the prompt is convenience only; nothing
  auto-generates.
- **Backward-compatible** (new action only; `generate` untouched). Deployed via Supabase
  MCP `deploy_edge_function` (keep `verify_jwt: true`) AFTER the two-lens review passes —
  the function is live shared infra, not branch-scoped.

## Acceptance gates
1. `tsc` clean · vitest green (+ tests: recast-target parser fail-safe; the cast_describe
   request builder; prompt→description overwrite/detach logic if extracted pure) ·
   `next build` clean.
2. Basic/advanced: with mode=basic the chip pickers, preview-text editor, and guidance
   presets are NOT rendered; the tournament IS. With mode=advanced everything renders.
   (Component-level assertion or measured render.)
3. The EL flow is untouched: `casting-proxy` diff is EMPTY; design/create caps and the
   lock confirm are unchanged.
4. Edge function: post-deploy, an UNAUTHENTICATED call returns 401 (deployment + gating
   verified live); the authenticated happy path is verified by the owner's first real
   draft (Mad Dog recast — the audition gate is the owner's ear, rule 37).
5. Two-lens review: Gemini cross-vendor + suerta (L-2) on the aggregate diff (UI + edge
   function). Merge after both; edge deploy after review, before or with the merge
   (backward-compatible either way). #88 entry after landing.

## Build notes (Codex)
Declared files: `src/components/controlroom/CastingStudioPanel.tsx`,
`src/components/ControlRoom.tsx` (prop threading only), `src/lib/casting.ts` (request
helper) or a new small lib + tests, `src/lib/castingRecast.ts` (recast-target parser) +
tests, `supabase/functions/channel-guideline-proxy/index.ts`, `src/app/aurora.css` /
`globals.css` (minimal styles). Argue with the spec first — especially: where the
description-overwrite confirm should reuse existing dialog machinery, and whether the
inline (non-modal) casting mount renders the tournament identically. STOP and report on
any mismatch. Do not touch `casting-proxy`. Do not edit `docs/HANDOFF.md`.
