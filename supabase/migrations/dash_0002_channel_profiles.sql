-- Channel profiles - dashboard-owned operation-global config.
-- This migration only creates dashboard-owned storage; it does not touch
-- pipeline-owned episodes, receipts, or jobs. The dashboard owns table shape and
-- editor writes; the pipeline worker reads via the service role, which bypasses
-- RLS.
--
-- RLS is authenticated full CRUD by design: channel profiles are operation-global
-- config, not owner-scoped user data, so there is no owner column.

create table if not exists public.channel_profiles (
  channel              text primary key,
  display_name         text not null default '',
  fact_anchor          text not null default 'none' check (
    fact_anchor in ('fda_standard_of_identity', 'declassified_primary_doc', 'none')
  ),
  treatment            text not null default 'archival_documentary' check (
    treatment in ('archival_documentary', 'motion_graphic', 'avatar', 'live_demo')
  ),
  character            text,
  source_ladder        jsonb not null default '[]'::jsonb,
  voice_archetype      text,
  packaging            jsonb not null default '{}'::jsonb,
  engagement_posture   jsonb not null default '{"claim_discipline":"fact_first","arousal_ceiling":"conservative"}'::jsonb,
  length_target        jsonb not null default '{}'::jsonb,
  platforms            jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists channel_profiles_set_updated_at on public.channel_profiles;
create trigger channel_profiles_set_updated_at
  before update on public.channel_profiles
  for each row execute function public.set_updated_at();

alter table public.channel_profiles enable row level security;

drop policy if exists channel_profiles_select on public.channel_profiles;
drop policy if exists channel_profiles_insert on public.channel_profiles;
drop policy if exists channel_profiles_update on public.channel_profiles;
drop policy if exists channel_profiles_delete on public.channel_profiles;
create policy channel_profiles_select on public.channel_profiles
  for select to authenticated using (true);
create policy channel_profiles_insert on public.channel_profiles
  for insert to authenticated with check (true);
create policy channel_profiles_update on public.channel_profiles
  for update to authenticated using (true) with check (true);
create policy channel_profiles_delete on public.channel_profiles
  for delete to authenticated using (true);

-- Reproduces today's food behavior; a null/unknown jobs.channel resolves to this.
insert into public.channel_profiles (
  channel,
  display_name,
  fact_anchor,
  treatment,
  character,
  source_ladder,
  voice_archetype,
  packaging,
  engagement_posture,
  length_target,
  platforms
)
values (
  'default',
  'Default (food behavior)',
  'fda_standard_of_identity',
  'archival_documentary',
  null,
  '["archival","still_motion","generated"]'::jsonb,
  null,
  '{}'::jsonb,
  '{"claim_discipline":"fact_first","arousal_ceiling":"conservative"}'::jsonb,
  '{"short_s":75}'::jsonb,
  '[]'::jsonb
)
on conflict (channel) do nothing;
