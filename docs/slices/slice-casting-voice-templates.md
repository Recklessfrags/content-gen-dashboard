# Slice — Casting: `voice_templates` (recipe library + immutable provenance)

_Author: Architect (Claude). Status: **FROZEN (v2)** — cross-vendor Gemini review:
PASS with implementation guidelines folded in below (§Migration notes: idempotency
traps; explicit null-whitelist on the `voice_recipe` CHECK). One reviewer suggestion
adapted rather than adopted verbatim: for CHECK idempotency use the `do $$ … if not
exists (pg_constraint) …$$` guard (as `dash_0003` does) instead of DROP-then-ADD —
dropping and re-adding on a re-run would silently reset a constraint's VALIDATED
state._
Operator "proceed": 2026-07-01 (this session; next roadmap item after 2a/#37).
Contract intent pinned by the pipeline heads-up (HQ, 2026-07-01, "Casting/Voice
architecture — PENDING ENCODE") and the D-arch ruling (expand/contract + DB-as-contract).
EL two-key split is **verified viable on one workspace** (HQ) — it is **ops config, not
dashboard code**, and is a non-goal here._

## What ships

A **voice template library**: named, reusable voice *recipes* (the Casting Studio's
design sliders + the clamped ElevenLabs voice settings) stored in a new
dashboard-owned config table. The operator can save the current design as a template,
apply a template as the starting point for a new casting run, and delete templates.
On every cast (template-seeded or manual), the **full recipe is copied onto the
character row** — immutable provenance, never a reference to the template.

## Non-goals (do not build)

- **No synthesis/preview from the template browser** — previews burn Voice Design
  credits (pipeline warning: "seed from real designed voices, never hypotheticals").
  Audio happens only through the existing design→preview flow after APPLY.
- **No migration-seeded template rows** — the design prompts for already-cast voices
  live only in per-browser bracket state; the operator seeds the library via "Save as
  template" from real designed voices in the UI.
- **No EL key changes / no worker coupling** — the worker never reads
  `voice_templates`; it keeps reading `characters.voice_id` (+ `voice_settings`) via
  service role, TTS-only. The two-key split is operator ops (ElevenLabs console +
  edge-function secret), out of scope.
- **No FK / reference from `characters` to `voice_templates`** (the pipeline's
  explicit anti-pattern: template rows must never pollute the roster; characters stay
  self-contained).
- No new deps, no changes to `casting_usage` caps or the casting-proxy edge function.

## Migration — `supabase/migrations/dash_0004_voice_templates.sql` (Codex authors)

Idempotent, dashboard-lane, additive-only (expand step). Contents:

1. Table:
   ```sql
   create table if not exists public.voice_templates (
     id             uuid primary key default gen_random_uuid(),
     name           text not null,
     description    text not null default '',
     design_prompt  jsonb not null default '{}'::jsonb,
     voice_settings jsonb not null default '{}'::jsonb,
     source_codename text,
     created_at     timestamptz not null default now(),
     updated_at     timestamptz not null default now()
   );
   ```
   plus a `unique` index on `lower(name)` (case-insensitive names; a duplicate save is
   a clear inline error, not a silent second row) and the existing `set_updated_at`
   trigger. `source_codename` is a **freeform text breadcrumb** (which character's
   voice seeded this), NOT a FK.
2. **RLS: operation-global config** (same class as `channel_profiles`): enabled;
   `authenticated` full CRUD (`using (true)` / `with check (true)`, all four verbs).
   No `owner` column. The worker never reads it, so no service-role note applies.
3. **pg_jsonschema CHECKs** (DB-as-contract, D-arch; added **NOT VALID**, then
   VALIDATE as the separate enforce step — trivially safe on a new empty table but the
   choreography stays uniform):
   - `voice_templates_design_prompt_shape`: object; keys `age`/`grit`/
     `comedy_menace`/`bombast` when present are numbers; `gender` when present is a
     string; additional keys allowed.
   - `voice_templates_voice_settings_shape`: object; `stability`/`similarity_boost`/
     `style`/`speed` when present are numbers; `use_speaker_boost` when present is a
     boolean; additional keys allowed.
4. **Provenance column (expand):**
   `alter table public.characters add column if not exists voice_recipe jsonb;`
   nullable, no default. Holds the **recipe snapshot written at cast time**
   (`{design_prompt, voice_settings, template_name?}` — `template_name` is a text
   snapshot when the cast started from a template, absent for manual designs).
   Worker-invisible (TTS reads `voice_id`/`voice_settings` only). Add
   `characters_voice_recipe_shape` CHECK (NOT VALID → VALIDATE): null or object with
   `design_prompt`/`voice_settings` objects when present, additive keys allowed.

**Migration notes (review-folded):** every statement idempotent —
`create unique index if not exists voice_templates_name_idx on public.voice_templates (lower(name));`,
`drop trigger if exists … create trigger …` for `set_updated_at`, and **all three
CHECKs guarded by `do $$ … if not exists (select 1 from pg_constraint where conname=… and conrelid=…) …$$`**
(never DROP-then-ADD — that resets VALIDATED state on re-run). The
`characters_voice_recipe_shape` CHECK expression explicitly whitelists null:
`check (voice_recipe is null or extensions.jsonb_matches_schema('{…}', voice_recipe)) not valid`.

## Data layer — `src/lib/voiceTemplates.ts` (new)

Mirror `channelProfiles.ts` conventions:
- `listVoiceTemplates(supabase)` — name-ordered.
- `createVoiceTemplate(supabase, {name, description, designPrompt, voiceSettings, sourceCodename})`
  — client-side validation: name 2–60 chars; prompt/settings clamped through the
  existing `casting.ts` clamp helpers before write. Surfaces the unique-name violation
  as a readable error.
- `deleteVoiceTemplate(supabase, id)`.
- `templateRecipe(t)` → the `{design_prompt, voice_settings, template_name}` snapshot
  shape used for `characters.voice_recipe`.
- Unit tests for validation + snapshot shaping in
  `src/lib/__tests__/voiceTemplates.test.ts`.

## Casting integration (the provenance write)

- `saveVoiceWinner` (in `src/lib/casting.ts`) gains the recipe: the winner's stamped
  `prompt_state` + clamped settings (+ `template_name` if the bracket was seeded from
  a template) are written to `characters.voice_recipe` **in the same update** that
  writes `voice_id`/`voice_settings`. Manual designs get a recipe too (provenance is
  universal, not template-only).
- Casting from a template must **not** create bible revisions and must not touch
  `bible` (same rule as phase-1/2a).

## UI — per the Designer artifact

`docs/design/casting-voice-templates.md` (Gemini) governs placement/states/copy.
Hard floors: lives inside the existing Casting Studio panel flow; APPLY prefills the
design sliders (+gender) and is clearly a *starting point* (operator still runs
design→preview→create); SAVE-AS-TEMPLATE captures the current design + settings with
name/description; DELETE confirms; unique-name error is inline; list shows
name/description/`source_codename`; empty state explains seeding from real voices; no
audio playback in the browser/list; WCAG 2.2 AA states; 320–412px clean; existing
tokens only; no new deps.

## Acceptance criteria (gates — frozen with the spec)

| # | Gate | How verified |
| --- | --- | --- |
| T-1 | Save-as-template persists (name/desc/prompt/settings/source) and survives reload; duplicate name → inline error, no row. | Ratify walk + SQL. |
| T-2 | APPLY prefills the design sliders/gender from the template; completing the normal cast flow writes `voice_id` + `voice_settings` **+ `voice_recipe`** (with `template_name`) in one update. | Ratify walk + SQL on the character row. |
| T-3 | A manual (non-template) cast also writes `voice_recipe` (no `template_name`). | SQL after a manual-flow cast. |
| T-4 | No bible revisions and no `bible` writes from any template/cast action. | Revision count unchanged; bible byte-identical. |
| T-5 | RLS: anon can neither read nor write `voice_templates`; authed CRUD works. | REST negative checks. |
| T-6 | jsonschema CHECKs live + VALIDATED: numeric-string `age` rejected; additive key accepted; `voice_recipe` bad shape rejected. | Negative contract tests (SQL). |
| T-7 | No template browsing triggers any casting-proxy/EL call (0 edge-function hits from list/apply/save/delete). | Bridge request log during the walk. |
| T-8 | `tsc --noEmit`, `npm test`, `npm run build` clean; no new deps; migration posted to HQ before apply; VALIDATE as separate step. | CI/local + session log. |
| T-9 | Quality floor: 412px no overflow; keyboard-operable; focus management inside the panel unchanged; reduced-motion. | Ratify mobile + review. |

**Floor ≠ done:** T-2/T-5/T-7 are judged on the running app + live DB with the bridge
request log, not unit tests.
