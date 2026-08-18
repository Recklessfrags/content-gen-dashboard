-- dash_0015_channel_profiles_ai_disclosure.sql
--
-- The AI-content disclosure toggle. Operator ruling, 2026-08-18:
--   "we don't need to worry about the ai disclosure tag being mandatory, it should
--    just be a toggle in the dashboard, never a reason to park a job."
--
-- Before this, the AI-disclosure label was a hard format gate in the pipeline's
-- Distribution stage. The script-writer's `disclosure` field is nullable and no prompt
-- ever asked for it, so the model filled it on roughly half of all runs — and every run
-- where it did not, ALL FIVE platforms were dropped at publish. The gate was not buying
-- compliance either: publishing goes through Buffer, which carries text + media only and
-- has no AI-content field. See docs/measurements/t52-ai-disclosure-2026-08-18.md
-- (pipeline repo) for the receipts.
--
-- FLAT top-level column, matching how the pipeline reads channel config off
-- ChannelProfile.raw = dict(row):
--   * ai_disclosure — src/pipeline/stages/distribution.py  _ai_disclosure_enabled()
-- A nested container would read as dict(row)["<container>"] and silently no-op.
--
-- DEFAULT TRUE — the safe direction. Every existing row keeps disclosing, so applying
-- this changes no channel's behavior; only an operator explicitly switching a channel
-- off changes anything. The pipeline reads ONLY an explicit boolean: a missing, null, or
-- non-boolean value is never treated as a decision to stop disclosing.
--
-- Additive with a safe default, so existing rows and every legacy upsert path stay valid.
alter table public.channel_profiles
  add column if not exists ai_disclosure boolean not null default true;

comment on column public.channel_profiles.ai_disclosure is
  'Whether this channel claims the platforms native AI-content flag at publish. '
  'Default true. NEVER a gate: the pipeline records it on the distribution plan and '
  'parks nothing over it (operator ruling 2026-08-18). Dashboard-owned, pipeline-read '
  '(distribution.py _ai_disclosure_enabled).';
