-- dash_0014_channel_profiles_distribution_lexicon.sql
-- ⚠️ UNAPPLIED / OPERATOR-GATED. Committed on the build branch so the slice is landable,
-- but it MUST NOT be applied to the shared production DB without the coordinator's sign-off
-- (the pipeline READS channel_profiles). See docs/contracts/data-contract.md.
--
-- Adds the new channel-generic distribution + register config as THREE FLAT top-level
-- columns, matching how the pipeline actually reads them off ChannelProfile.raw = dict(row):
--   * lexicon    — src/pipeline/lexicon.py:77  resolve_channel_lexicon → raw.get("lexicon")
--   * hashtags   — src/pipeline/stages/distribution.py:82  raw.get("hashtags")
--   * cta_target — src/pipeline/prompts.py:405  raw.get("cta_target") (→ cta → call_to_action)
-- A nested `raw` jsonb container would read as dict(row)["raw"] and silently no-op, so the
-- flat-column shape is the correct contract (verified vs pipeline main + live schema).
--
-- `lexicon` shape: { "substitutions": { "<source>": "<replacement>", ... } }
--   ADVISORY register data ONLY. It CANNOT weaken, disable, or override the universal
--   advertiser-safety floor: the pipeline rejects any substitution whose source OR
--   replacement hits the floor. Never a floor-override control.
-- `hashtags` shape: array of strings (distribution tags; pipeline caps count per platform).
-- `cta_target`: default call-to-action target text (coordinator PIN; nullable = unset).
--
-- HELD: `visual_style` gets NO column here — the pipeline has not built it yet.
-- (Do NOT conflate with characters.visual_style, an unrelated casting free-text field.)
--
-- All additive with safe defaults, so existing rows and every legacy upsert path stay valid.
alter table public.channel_profiles
  add column if not exists lexicon jsonb not null default '{}'::jsonb,
  add column if not exists hashtags jsonb not null default '[]'::jsonb,
  add column if not exists cta_target text;

comment on column public.channel_profiles.lexicon is
  'ADVISORY register map { substitutions: { <source>: <replacement> } }. Cannot weaken the '
  'universal safety floor — the pipeline drops any floor-breaching pair. Dashboard-owned, '
  'pipeline-read (lexicon.py resolve_channel_lexicon). Omitting it from an upsert preserves it.';
comment on column public.channel_profiles.hashtags is
  'Distribution hashtags (jsonb string array). Pipeline caps the count per platform. '
  'Dashboard-owned, pipeline-read (distribution.py).';
comment on column public.channel_profiles.cta_target is
  'Default call-to-action target text. Coordinator PIN; pipeline reads cta_target -> cta -> '
  'call_to_action. Dashboard-owned, pipeline-read (prompts.py).';
