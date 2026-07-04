-- dash_0008_channel_profiles_description.sql
-- Channel-first: add a plain-language channel description/concept field.
-- Additive, dashboard-facing. The pipeline worker does not read it today (it reads
-- only channel + engagement_posture from channel_profiles). This is the human "what is
-- this channel about" input that will later seed LLM guideline auto-generation.
alter table public.channel_profiles
  add column if not exists description text not null default '';
