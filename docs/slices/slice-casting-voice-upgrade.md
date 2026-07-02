# Slice — Casting Studio voice-design upgrade (rich persona + v3 + birth-certificate)

_Author: Architect (Claude). **Status: FROZEN (v2, 2026-07-02).** §3 ruled **Option ①
— retire sliders** (operator deferred "no preference" on a reviewed question →
Architect recommendation applied: the KIT scaffold already covers ②'s blank-page
argument and ① avoids re-introducing the composer the KIT blames). `quality` UI cut —
Architect decision (derivable/reversible, rule 20; operator informed) — plumbing kept.
Gemini spec review (2026-07-02, `gemini-3.1-pro-preview`) = REQUEST-CHANGES;
all verified findings folded (v2): `composeVoiceDescription` retained as a legacy
read-side adapter regardless of §3 (was a §4/§12 contradiction that would blank/crash
legacy characters); G-2 rewritten to test the proxy **directly**, bypassing the client
clamp, so a missing server clamp can't false-pass; `quality` UI cut (undocumented
range — plumbing kept, no control); seed re-roll guard added (credit safety);
legacy-template LOAD PROFILE + G-5b added; cleared-box disables Generate. Source of
truth for the craft: the HQ **CASTING KIT** child page (playbook mirror, 2026-07-02) +
the **FOOD CHANNEL design brief**; contract truth: `docs/contracts/data-contract.md`.
Handoff trigger: `docs/SESSION-HANDOFF.md` §4.A. Loop: spec → Gemini spec review [done]
→ Codex → Gemini + suerta(Opus) → measured ratification + operator audition._

---

## 1. Why — the diagnosis this slice fixes

The operator's verdict on the first casts: _"no depth, no inflections, generic AI
voice."_ The CASTING KIT pins two mechanical causes, both **verified in the current
code**:

1. **The proxy never sends `model_id`, so ElevenLabs silently uses its default
   `eleven_multilingual_ttv_v2`** — the older, flatter model — instead of the
   expressive `eleven_ttv_v3`. (`supabase/functions/casting-proxy/index.ts:185` sends
   only `{ voice_description, text }`.)
2. **The design prompt is a one-line, slider-composed string** — the exact
   "too short/vague → the model free-fills → bland, generic, non-brandable"
   anti-pattern the KIT names. (`src/lib/casting.ts:223` `composeVoiceDescription`
   emits a single sentence from 4 buckets.)

Supporting gaps: no `guidance_scale`/`seed`/`quality` control (so no
creativity/fidelity spread and no reproducibility), preview auditioning on whatever
text the operator happens to type (KIT: audition on **representative channel copy**),
templates and `voice_recipe` that record only the slider state (not the prose that
actually determined the voice), and **no audition step before a voice is locked to a
character** — generative quality has no programmatic gate, so the operator's ear must
be a real gate in the flow (ledger, 2026-07-02: "the operator's ear/eye IS the gate").

**The winning cast (Fine Print) already proves the target shape.** Its live
`voice_recipe.design_prompt` carries a hand-written `voice_description_raw` (~440-char
persona paragraph) and `preview_text_raw` (performance-script preview). This slice
makes the studio *produce* what the operator had to hand-craft outside it.

## 2. Scope (and explicit non-scope)

**In scope** (the five handoff items):

- **S1 — Rich free-text persona description** as the design input (§3 fork decides
  whether sliders are retired, seed a draft, or toggle).
- **S2 — Proxy passthrough with server clamps:** `model_id` (pinned `eleven_ttv_v3`),
  `guidance_scale`, `seed`, `quality` — a server-side clamped allowlist. The proxy is
  the safety boundary (the worker does not clamp; an out-of-range value errors at EL).
- **S3 — Performance-script preview guidance:** longer, punctuation-driven, real
  cold-open + reveal beat; a one-tap KIT preview scaffold.
- **S4 — Templates store the raw description** (and the generation params), not just
  the sliders.
- **S5 — Operator audition gate** in the lock flow.

**Explicitly OUT of scope** (do not build; log if tempted — governance rule 15):

- **Re-casting Fine Print / Mad Dog / Grandma Pearl.** Re-cast is an operator brand
  call (§4.D / KIT §4); this slice only upgrades the *tool*.
- **Any migration.** All target CHECKs are permissive-additive (§4) — the new recipe
  and template keys are already accepted live. If a migration seems needed, STOP and
  escalate; it changes the review tier (rule 33) and needs an HQ heads-up.
- **Changing the worker's TTS path.** The pipeline reads `characters.voice_id` +
  `voice_settings` only; `voice_recipe`/templates stay worker-invisible (data
  contract). This slice must not touch that contract.
- **The daily cap (25), auth/session gating, CORS, the delete path.** Untouched.
- **Visual identity / 2b.** Separate slice.

## 3. RULED — primary design-input mode = Option ① (retire sliders)

_This fork was presented even-handedly (rule 17); Gemini's spec review forced-steelmanned
all three options and ranked ② (sliders-seed-draft) first for ergonomics; the operator,
on a separately-reviewed question, deferred ("no preference"), so the Architect
recommendation stands._

**RULING: Option ① — the rich free-text persona box is the single voice-design input;
the 4 sliders (age/grit/comedy_menace/bombast) + gender toggle are removed from the UI.**
Rationale: the one-tap **"insert KIT scaffold"** button (a static slot skeleton, not
slider-derived prose) answers the blank-page ergonomics that were ②'s only advantage,
while ① avoids re-introducing the very `composeVoiceDescription` one-liner the KIT
blames for generic voices, and carries the least build/test/review surface.

**The persona box** is slot-ordered per KIT §1 rule 2 (audio-quality tag / age+gender+
accent / timbre+grit / pitch+dynamics / pace+cadence / emotion+character), target
~200–600 chars, hard-min 200 (shorter → generic). A **gender affordance is retained**
only as a convenience that inserts/updates the gender clause in the box text (the box,
not a discrete field, is the source of truth) — or is folded into the scaffold; Codex's
call, as long as the string sent to EL is the operator-visible box text verbatim.

`composeVoiceDescription` is **NOT deleted** — it survives as the legacy read-side
adapter only (§4, §6, §8): displaying/loading pre-v3 slider-only recipes and templates.
It is never used to build the string sent to EL for a new cast.

## 4. Data model — recipe birth-certificate (NO migration)

All three shape CHECKs are `additionalProperties: true` / no `required` keys
(verified live 2026-07-02): `characters_voice_recipe_shape`,
`voice_templates_design_prompt_shape`, `voice_templates_voice_settings_shape`. So the
keys below are **already accepted** with no DDL. TS types stay `Json` (loose); shape is
owned by `clamp*` helpers + these CHECKs.

Extend `VoiceRecipe` (`src/lib/casting.ts`) — following the **Fine Print precedent**
(raw strings live inside `design_prompt`) plus a new `generation` block for KIT rule-5
provenance:

```
VoiceRecipe = {
  design_prompt: {
    // slider fields age/grit/comedy_menace/bombast present ONLY if §3 keeps sliders;
    gender?: "male" | "female" | "androgynous",
    voice_description_raw: string,   // NEW — exact prose sent to EL (source of truth)
    preview_text_raw: string,        // NEW — exact preview/audition text used
  },
  generation: {                      // NEW — the birth certificate (KIT §1 rule 5)
    model_id: "eleven_ttv_v3",
    guidance_scale: number,
    seed: number | null,
    quality: number | null,
  },
  voice_settings: VoiceSettings,     // unchanged (live synthesis knobs)
  template_name?: string,            // unchanged
}
```

- `voice_description_raw` and `preview_text_raw` are the **new source of truth** for a
  cast (the sliders, if kept, become a convenience that seeds prose — the prose, not
  the sliders, is what was sent). `composeVoiceDescription` is **retained in the client
  library regardless of the §3 ruling** — it is the **read-side adapter for legacy
  slider-only recipes/templates** (Fine Print and any pre-v3 rows have no
  `voice_description_raw`, so the reader composes display prose from their sliders; see
  §12). It is **never** the string *sent to EL* when a raw description exists.
- `AuditionCandidate` gains the per-candidate generation context so the winner's exact
  params flow into the recipe unchanged: `voice_description_raw`, `preview_text_raw`,
  `model_id`, `guidance_scale`, `seed`, `quality`. Reproducible tournament preserved
  (the stamp is now prose+params, a strictly better birth certificate than sliders).
- `writeCastToCharacter` assembles the recipe from the **winning candidate's** stamped
  context (not from current UI state) for `design_prompt.*_raw` + `generation`;
  `voice_settings` continues to come from the live synth state (unchanged behavior).

## 5. Edge function — `casting-proxy` `design` action passthrough + clamps

The proxy is the **only** clamp boundary. Extend the `design` branch
(`index.ts:179`) to accept and forward four optional params, each clamped
**server-side** before the EL call. **Codex must confirm each exact bound against the
current ElevenLabs `POST /v1/text-to-voice/design` API reference at build time** (the
reference is the authority; recommended values below):

| param | rule | recommended |
| --- | --- | --- |
| `model_id` | allowlist `{eleven_ttv_v3, eleven_multilingual_ttv_v2}`; anything else or absent → **`eleven_ttv_v3`** (pin v3, KIT §1 rule 3) | default `eleven_ttv_v3` |
| `guidance_scale` | numeric; clamp to EL's documented range; non-numeric/absent → default | default **5**, clamp **[0, 100]** (confirm max) |
| `seed` | integer; clamp to EL's documented non-negative int range; non-integer/absent/null → **omit** (EL random) | clamp **[0, 4294967295]** |
| `quality` | numeric; **absent/null → omit** (EL default). Passthrough plumbing exists, but EL publishes **no range** for this field, so the proxy only forwards it if the caller sends a value within a Codex-confirmed documented range; otherwise omit. **No operator UI control in v1** (§7) — always omit today. | default omit |

Rules that make this falsifiable (frozen regardless of the exact literals):

- An **out-of-range** value is **clamped, never rejected** (a bad client can't break
  casting) — and the **clamped value is what reaches EL** (the ratification gate
  captures the forwarded payload and asserts it, §10 G-2).
- `model_id` is **never** operator-free-text; only the allowlist. Default is **v3**.
- Keep the existing `text` 100–1000 validation and `voice_description` non-empty
  validation. Validate BEFORE consuming a cap unit (existing order preserved).
- No new secret, no new action, no auth/CORS/cap change. `tts`/`create`/`delete`
  branches unchanged.
- The client `generateVoicePreviews` wrapper (`casting.ts:329`) passes the four
  params through; it also **clamps client-side** to the same bounds (defense in depth
  + honest UI), exported as constants so the test and the proxy agree.

## 6. Client library — `src/lib/casting.ts`

- Add `voice_description_raw` handling: a validator `isValidVoiceDescription(s)` —
  hard-min 200 chars (KIT: shorter → generic), soft-warn above ~600; non-empty
  required (matches the proxy's existing non-empty check). Bounds exported.
- Add `GENERATION_DEFAULTS` + clamp helpers for `guidance_scale`/`seed`/`quality`
  mirroring `clampVoiceSettings` (single source the proxy mirror-documents).
- `generateVoicePreviews(client, { voice_description_raw, preview_text, model_id,
  guidance_scale, seed, quality })` — sends the **raw description verbatim** as
  `voice_description` (no `composeVoiceDescription` when a raw description is present),
  `text = preview_text`, plus the four params. Stamps each returned candidate with the
  full generation context (§4).
- `saveVoiceWinner` / `writeCastToCharacter` updated to carry the new recipe shape
  (§4). The `.update(...).eq("id").select("id").single()` zero-row-guard behavior is
  preserved (keeps `casting.test.ts` green).
- `sampleTextFor` retained as the **preview** seed default; add a `KIT_PREVIEW_SCAFFOLD`
  and (if §3 keeps a scaffold) a `KIT_DESCRIPTION_SCAFFOLD` constant sourced from the
  KIT — static text, not slider-derived.

## 7. UI — `CastingStudioPanel.tsx` (states enumerated, rule 29)

Input UI = §3 Option ① (rich text, sliders retired):

- **Persona description box** (the single design input): slot-ordered, ~200–600 char
  target, hard-min 200; a **"insert KIT scaffold"** button seeds the empty slot
  skeleton (`KIT_DESCRIPTION_SCAFFOLD`, §6). The exact box text is what is sent to EL.
  A gender convenience (§3) may insert/update the gender clause. The 4 sliders + their
  `Prompt sent:` hint are **removed** from the panel.

- **Generation controls** (new): `guidance_scale` control (a slider or a
  low/mid/high preset that maps to concrete values — KIT §1 rule 4: run a spread),
  and an optional `seed` integer field (blank = random; shown on each candidate so a
  good seed can be reused). **No `quality` control in v1** (§5 — undocumented range).
  `model_id` shown **read-only** as "Voice Design v3" (pinned).
- **Seed re-roll guard** (credit safety): a **loaded** seed (from a template or a
  prior candidate) does **not** silently carry into the next Generate — the field
  shows the loaded value with a visible **"↻ new seed / clear"** affordance, because
  regenerating with an unchanged seed + text returns byte-identical audio from EL and
  burns a cap unit for nothing. Default for a fresh Generate is random (blank) unless
  the operator deliberately pins a seed.
- **Preview text**: relabel to make clear it is the **audition script**; keep the
  100–1000 counter; add "insert KIT preview scaffold". Guidance copy: "Use a real
  cold-open + a reveal beat; punctuation drives the delivery."
- **Audition gate before lock** (§9).
- **States** — default; **loading** (`designing`/`locking`/`testing` — existing
  `aria-busy`/label swaps extend to the new controls); **error** (existing role=alert
  banner; EL errors surfaced verbatim from the proxy); **cap-reached** (existing
  "N of M casts left"; Generate disabled); **empty** (no pool/favorites → tournament
  hidden; template drawer empty state); **invalid** (Generate disabled unless
  description ≥200 chars AND preview 100–1000 — both counters shown; **clearing the
  description box disables Generate immediately**, not only on a threshold cross);
  **uncast** (Live
  Synthesis Tuning still gated by `isCast`). Reduced-motion + `:focus-visible` +
  44px coarse-tap floors hold for every new control (WCAG 2.2 AA baseline).

## 8. Templates store the raw description — `src/lib/voiceTemplates.ts`

- `buildVoiceTemplateInsert` / `createVoiceTemplate` capture the raw description +
  generation params into `design_prompt` (the `voice_description_raw`/`preview_text_raw`
  keys and a `generation` block — permissive-additive CHECK already accepts them). The
  human-facing `description` **column** stays the operator's free-text REMARKS (do not
  overload it with the voice prose).
- `templateRecipe(template)` returns the raw description + generation params so
  **loading a template repopulates the description box and generation controls**, not
  just sliders. A loaded template must reproduce the voice, not approximate it.
- `LOAD PROFILE` in the panel applies the raw description + params to the inputs.
  **Legacy (slider-only) templates** — no `voice_description_raw` — LOAD by running
  their sliders through the retained `composeVoiceDescription` (§4/§6) to seed the
  description box, so an old profile always yields editable prose, never a blank box or
  crash. Generation controls default (guidance 5, seed cleared) for legacy loads.
- Name/description validation (2–60 / trimmed) unchanged; `23505` duplicate-name
  message unchanged (keeps `voiceTemplates.test.ts` green).

## 9. Operator audition gate — `CastingStudioPanel.tsx`

Generative quality has no programmatic gate, so lock becomes a deliberate,
audition-confirmed act (currently "Lock as winner" writes immediately —
`CastingStudioPanel.tsx:397`, no confirm):

- "Lock as winner" opens a **confirm dialog** (same pattern as the template PURGE
  confirm) that:
  - shows the exact `voice_description_raw`, `preview_text_raw`, and generation params
    (`model_id`/`guidance_scale`/`seed`/`quality`) that will be recorded, and the
    target character codename;
  - requires an explicit **"I've auditioned this voice on representative copy"**
    acknowledgement (checkbox or a distinct two-step confirm) — the write does **not**
    fire until it is given;
  - Confirm → the existing `handleLock` write path (§4/§6); Cancel → **no write, no
    credit spend, no `voice_id` change** (focus returns to the candidate).
- Keyboard/focus-trap correct (Esc cancels, focus returns) — reuse the panel's
  existing dialog mechanics; no regression of the S2 dual-focus-trap lesson.

## 10. Acceptance criteria — FROZEN gates (measured on the real artifact)

_"Floor ≠ done": each gate is the **experienced** property, not presence. Ratify at
412px + a mid-width spot-check + 1440px (per the ratify harness). Generated-audio
quality is judged by the **operator audition** (G-9), not a script._

| # | Gate | How measured |
| --- | --- | --- |
| G-1 | **v3 is actually used.** A design call's forwarded EL payload carries `model_id:"eleven_ttv_v3"` when the caller requests default. | Intercept the proxy→EL request (bridge/capture); assert `model_id`. |
| G-2 | **The SERVER is the clamp boundary (not the client).** Out-of-range `guidance_scale`/`seed`/`quality` and a bad `model_id` arrive at EL **clamped/pinned**, not raw, not rejected. **Test by calling the proxy DIRECTLY** (authed curl per the handoff password-grant pattern), **bypassing the client-side clamp entirely** — so a missing server clamp cannot false-pass behind the client's. | Direct authed proxy call with deliberate out-of-range values + bad `model_id`; assert the captured proxy→EL payload equals the clamped/pinned values. |
| G-3 | **Raw description is sent verbatim.** The `voice_description` in the proxy→EL payload equals the operator's raw text (no `composeVoiceDescription` substitution). | Capture payload; byte-compare to input. |
| G-4 | **Birth certificate persists.** After a lock, `characters.voice_recipe` contains `design_prompt.voice_description_raw`, `design_prompt.preview_text_raw`, and `generation.{model_id,guidance_scale,seed,quality}` matching the winning candidate. | Read the row post-lock (live REST at assert time). |
| G-5 | **Template round-trip.** Saving a template then LOAD PROFILE repopulates the description box + generation controls to identical values (not slider approximations). | UI action + field assert; row read. |
| G-5b | **Legacy round-trip (no crash).** LOAD PROFILE on a pre-v3 slider-only template (and switching to a legacy character like Fine Print/Grandma Pearl) populates an editable description box via `composeVoiceDescription` — never blank, never a crash. | Load a legacy template + open a legacy character; assert non-empty editable prose. |
| G-6 | **Audition gate blocks lock.** With the acknowledgement NOT given, no write occurs (intercept-and-abort: zero `characters` PATCH, zero create-voice credit spend); giving it then Confirm performs exactly one write. | `page.on` dialog + intercept POST/PATCH; assert counts. |
| G-7 | **Input validation states.** Generate disabled when description <200 chars or preview outside 100–1000; both counters render; cap-reached still disables. | Drive the fields; assert disabled + counter text. |
| G-8 | **No contract / migration drift.** No new/changed migration; worker TTS path (`voice_id`+`voice_settings`) untouched; `voice_recipe`/templates remain worker-invisible; `next build` clean; `casting.test.ts` + `voiceTemplates.test.ts` green (updated for the new shape). | `git` diff of `supabase/migrations`; grep; build + test run. |
| G-9 | **Operator audition (the real quality gate).** The operator generates on v3 with a rich description + representative preview and confirms the voices have depth/inflection vs. the old flat output. | Operator ear, live. Human-only; blocks merge for the quality claim. |
| G-10 | **Quality floor.** Every new control: `:focus-visible`, reduced-motion, 44px coarse tap, no 412px horizontal overflow, keyboard-reachable; dialog focus-trap correct. | Measured at the three widths. |

## 11. Build sequencing + review loop

1. **Gemini spec review** (this doc) — including the §3 forced-steelman — before any
   build. Fold verified findings; then surface §3 to the operator with the review in
   hand (bucket-3).
2. **Codex build** (governance rule 25 if parallelized):
   - Lane P — `supabase/functions/casting-proxy/index.ts` (§5).
   - Lane L — `src/lib/casting.ts` + `src/lib/voiceTemplates.ts` + tests (§4/§6/§8).
   - Lane U — `CastingStudioPanel.tsx` + `globals.css` (§7/§9) — rich-text input
     (§3 ①), generation controls, seed guard, audition gate. Slider UI removed.
   (P and L share the clamp constants — L owns them, P mirrors/documents; declare files
   disjoint. If lane overlap is unavoidable, serialize.)
3. **Gemini + suerta(Opus) reviews** of the aggregate diff (rule 33: the diff is
   contract-adjacent — recipe shape + the proxy money/credit path). Fix blockers,
   re-audit (rule 7).
4. **Measured ratification** (G-1…G-8, G-10) on a preview/prod build + **operator
   audition** (G-9) before merge. Re-walk the merged result after any conflict
   resolution (ledger).

## 12. Risks / residuals

- **Exact EL clamp bounds** (`guidance_scale` max, `quality` range) are
  build-time-confirmed against the EL reference, not frozen here — G-2 tests the
  *behavior* (clamped == forwarded) with whatever constant Codex sets, so a wrong
  literal fails review, not silently ships.
- **§3 unresolved** blocks only the input UI lane; the proxy/recipe/audition value
  lands regardless of the ruling.
- **Old slider-only templates/recipes** (Fine Print, any earlier) remain valid — the
  reader treats missing `voice_description_raw` as "legacy slider recipe" and falls
  back to `composeVoiceDescription` for display only. No backfill.
```
