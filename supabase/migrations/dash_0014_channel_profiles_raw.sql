-- dash_0014_channel_profiles_raw.sql
-- ⚠️ UNAPPLIED / OPERATOR-GATED. This migration is committed on the build branch so the
-- slice is landable, but it MUST NOT be applied to the shared production DB without the
-- coordinator's sign-off — the pipeline READS channel_profiles and its read path for the
-- new keys is not yet aligned (see the cross-repo flag in docs/contracts/data-contract.md,
-- "channel_profiles.raw").
--
-- Introduces the `raw` shared-surface CONTAINER: a single jsonb column that holds the new
-- channel-generic config the dashboard drives and the pipeline reads. Modeled as ONE
-- container (not N flat columns) so the "omit-preserves" safety property has a single
-- object to protect and so future shared keys need no further migrations.
--
-- Sub-keys the dashboard editor writes today (all OPTIONAL, absent = pipeline default):
--   raw.lexicon.substitutions : jsonb object { "<source>": "<replacement>", ... }
--                               ADVISORY register data ONLY. It CANNOT weaken, disable, or
--                               override the universal advertiser-safety floor: the pipeline
--                               (src/pipeline/lexicon.py resolve_channel_lexicon) rejects any
--                               substitution whose source OR replacement hits the floor. Never
--                               a floor-override control.
--   raw.hashtags              : jsonb array of strings (distribution tags; per-platform capped)
--   raw.cta_target            : text  (call-to-action target — coordinator PIN, see contract)
-- Sub-key the pipeline will read but the dashboard does NOT edit yet (HELD):
--   raw.visual_style          : jsonb — placeholder; pipeline has not built it. The editor
--                               never writes it; upserts preserve it. (Do NOT conflate with
--                               characters.visual_style, an unrelated casting text field.)
--
-- Additive + NOT NULL DEFAULT '{}' so existing rows and every legacy upsert path stay valid.
alter table public.channel_profiles
  add column if not exists raw jsonb not null default '{}'::jsonb;

comment on column public.channel_profiles.raw is
  'Dashboard-owned, pipeline-read shared-surface container. Sub-keys: lexicon.substitutions '
  '(ADVISORY register map — cannot weaken the universal safety floor), hashtags (string[]), '
  'cta_target (text), visual_style (HELD — pipeline-incoming, editor does not write it). '
  'Editor upserts that omit this column preserve it. See docs/contracts/data-contract.md.';
