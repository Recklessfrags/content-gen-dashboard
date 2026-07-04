# Slice — Channel auto-gen (LLM guideline generation from the channel concept)

_Status: **SPEC v2 "grandiose"** — Architect (Claude), 2026-07-04. v1 (single-shot map → form-fill) is the
substrate; v2 layers four operator-selected features on top with **no shared-seam change**. Grounded by a
Preset-A design pass (3 blind cross-vendor lanes) over `docs/slices/…` + the live schema + the pipeline's
canonical channel-onboarding recipe (HQ 2026-07-02). Direction: D-6 (channel-first); the recipe's
"channel-researcher" boundary (operator-invoked, dashboard-side, guideline-only, outputs a cast brief,
NEVER casts / NEVER writes `characters`)._

## 1. Goal
An **operator-invoked** "Generate from concept" action. The operator writes the channel `description` and
clicks Generate → an LLM writes an **editorial brief**, then maps it to the channel's **guideline fields** +
a **cast brief** → the operator **reviews each field (accept/reject)** → accepted fields land in the existing
editable Guidelines form → the operator Saves through the unchanged `buildChannelProfileUpsert` path. Nothing
auto-persists. The `ANTHROPIC_API_KEY` lives ONLY in the edge function.

## 2. The four grandiose layers (all on the v1 response substrate)
1. **Two-stage rich generation** (edge-internal). One click = one cap unit = **two** Anthropic calls:
   - **Stage 1 — brief:** a plain messages call → a free-prose editorial brief (positioning, audience,
     hook posture, evidence stance, packaging voice). ~1024 tokens.
   - **Stage 2 — map:** a forced-tool call that consumes the brief → the guideline schema + `assumptions`
     + `cast_brief`. ~1536 tokens.
   - Response: `{ brief, suggestions, assumptions, cast_brief }`. The brief is surfaced (read-only) so the
     operator sees the reasoning, not just the dials.
2. **Voice / cast-brief seed** (boundary-respecting bridge). Stage 2 also emits
   `cast_brief: { voice_archetype, voice_description }` — `voice_description` is 200–600 chars of
   ElevenLabs-ready prose. `voice_archetype` fills the form field. `voice_description` is shown + copyable in
   a "Cast brief" area and **stashed in `localStorage` keyed by channel** (`channel_cast_brief_<channel>`) on
   Save. The **Casting Studio** offers it as a **one-click seed** for the active character whose channel
   matches. Auto-gen NEVER casts and NEVER writes `characters` — the operator still generates/auditions in the
   Studio (its own `casting-proxy` cap). Durable server-side `channel_profiles.cast_brief` is a **future
   expand pending HQ worker-read confirmation**; localStorage keeps v2 free of the shared seam (casting
   brackets already persist client-side, so this matches precedent).
3. **Accept/reject review panel** (client). Generation fills a **staged `proposals` object**, NOT the form.
   A review panel lists each field: label · proposed value · current value · an accept toggle (default on).
   Enforced dials (claim_discipline, arousal_ceiling) are flagged "ENFORCED — review". "Apply accepted"
   pushes accepted fields into the form via the same `updateForm` used for manual edits. Save is still a
   distinct, later action. Reject = the field is left at its current value.
4. **Keep-rate telemetry** (dashboard-owned). `dash_0010_channel_guideline_telemetry` — a fully
   dashboard-owned table. On **Save**, for each field present in the last applied proposal, write
   `{ channel, field, proposed, saved }` (best-effort, never blocks the Save). Lets us learn which fields the
   model gets right vs. which the operator always overrides. No shared seam (own table, RLS owner-scoped).

## 3. Non-negotiable constraints (from the pipeline recipe + schema + review-plan)
- **§C guideline-only:** generate guideline fields ONLY. Never a must-do, never `character`/`character_id`,
  never a pipeline-owned table. The cast brief is advisory prose, not a cast. Worker stays read-only on
  `channel_profiles`; v2 adds **no column** to it.
- **Enum safety is structural + server-side:** the stage-2 tool schema OMITS `aggressive` (unrepresentable),
  AND the edge function clamps every enum to the real catalog (`FACT_ANCHOR`/`TREATMENT`/`CLAIM_DISCIPLINE`/
  `AROUSAL_CEILING`) — invalid/omitted → clamp to a safe default. `aggressive` stripped even if the schema is
  bypassed.
- **Key custody:** `ANTHROPIC_API_KEY` only in the edge function (Supabase secret). Browser never holds it.
  Session-JWT-gated, `verify_jwt: true`.
- **Cost:** per-user daily cap (**10/day**); the cap is consumed **once per click** and gates BOTH stage
  calls (cap-check before stage 1). Validate description length (30–2000) BEFORE the cap. `max_tokens` bounded
  per stage; low temperature.
- **Non-binding / two gates:** generation → staged proposals → operator accept/reject → form → operator Save.
  Enforced dials are flagged; nothing writes without the explicit Save.
- **Loop:** Architect specs → Codex builds (pass A edge+libs, pass B client UX) → **Fable reviews the
  LLM/spend/enum/no-persist path** → Architect ratifies live (intercept-and-abort the edge call + upsert;
  enum fuzz; cap; two-stage shape; telemetry) → merge. `casting-proxy` untouched.

## 4. Migrations
- **`dash_0009_channel_guideline_usage`** (copy of dash_0001): `channel_guideline_usage(user_id, day, count)` +
  `security definer` RPC `channel_guideline_bump_usage(p_user, p_limit)` — atomic increment-and-check guard;
  `grant execute … to service_role`; owner-scoped select. Separate budget from `casting_usage`.
- **`dash_0010_channel_guideline_telemetry`** (dashboard-owned): `channel_guideline_telemetry(id uuid pk,
  user_id, channel text, field text, proposed text, saved text, generated_at timestamptz, created_at)`;
  RLS: owner-scoped `insert` (with check user_id = auth.uid()) + `select`. No RPC. Client writes directly
  (authenticated). No relation to any pipeline table.

## 5. Edge function — `supabase/functions/channel-guideline-proxy/index.ts` (casting-proxy clone)
One action `"generate"`. OPTIONS/CORS → session validation → parse + validate description length (30–2000)
BEFORE cap → daily cap via the RPC (429) → **stage 1** (brief) → **stage 2** (forced tool over the brief) →
server-side clamp → `{ brief, suggestions, assumptions, cast_brief }`. Model `claude-opus-4-8`. Handle
`stop_reason: "refusal"` (200 + typed error) and no-tool-block/`max_tokens` (200 + typed error). Every enum
clamped to a Deno-local catalog mirror via `clampToCatalog`; `length_target.short_s` → `clampNumber(…,15,180,60)`
rounded to int; lists filtered to non-empty strings; `voice_description` trimmed + length-guarded; suggestions
built field-by-field (never spread raw → no `character`/`character_id` leak). Errors never leak the key.

## 6. Client
- `src/lib/channelGuideline.ts` — typed `functions.invoke("channel-guideline-proxy", …)` wrapper +
  `GuidelineGenError` + `edgeErrorMessage`-style 429/401 mapping. Returns `{ brief, suggestions, assumptions,
  cast_brief }`.
- `src/lib/channelGuidelineTelemetry.ts` — `logGuidelineKeepRate(client, channel, rows)` best-effort insert;
  swallows errors (telemetry must never break Save).
- `ChannelProfilesPanel.tsx` — "Generate from concept" button (disabled < 30 chars) → staged `proposals`;
  the **review panel** (accept/reject per field, enforced-dial flag, brief display, cast-brief display +
  copy); "Apply accepted" → `updateForm`; on Save, stash the cast brief in localStorage + fire telemetry.
- `CastingStudioPanel.tsx` — read `channel_cast_brief_<channel>` for the active character's channel; if
  present, a "Seed from channel cast brief" one-click that drops `voice_description` into the design field.
- E1 `suggestPersona` still recomputes for free (keys off form fields) and remains the **zero-spend fallback**.

## 7. Gates (falsifiable, MEASURED; QA creds + ANTHROPIC_API_KEY set for the live-gen gate)
1. **Enum-safety (hard blocker):** many generations incl. concepts demanding `aggressive`/garbage → **0**
   invalid enums, **0** `aggressive` reach proposals/form/DB (mock the Anthropic stage-2 response with garbage
   → server clamp fires).
2. **No auto-persist / accept-gated:** generation writes **0** rows AND fills **0** form fields until the
   operator clicks accept+apply; only Save (existing `buildChannelProfileUpsert`) commits.
3. **Cap:** RPC returns **429** at 10; a capped click reaches Anthropic **0** times (cap before stage 1); one
   click consumes exactly **one** cap unit though it makes two calls; the atomic guard is race-safe.
4. **Two-stage shape:** one click → exactly two Anthropic requests (brief, then map) → response carries a
   non-empty `brief` + mapped `suggestions`; intercept-and-abort proves the shape with zero live writes.
5. **Cast-brief boundary:** grep the diff — no write to `characters`/`character_id` anywhere in the auto-gen
   path; the Casting Studio seed only *reads* localStorage + fills an editable field.
6. **Telemetry:** rows written only on Save, only for applied-proposal fields, and a telemetry failure never
   fails the Save (wrap in try/catch, swallow).
7. **Key custody + no leak:** key only in the function; errors never echo it; `verify_jwt:true`.
8. **Live-gen (operator quality gate):** one real generation → a coherent brief, plausibly-useful fields, and
   a usable 200–600 char cast brief; the operator's eye is the quality oracle.

## 8. Deferred (post-v2)
Durable server-side `channel_profiles.cast_brief` column (needs HQ worker-read confirmation → then the cast
brief persists cross-device instead of localStorage). A telemetry read-out view. Per-field regenerate ("try
this field again"). All ride on the same edge response shape — no rework.
