-- Channel-guideline keep-rate telemetry — dashboard-owned. On each channel Save
-- that followed an auto-generation, the client records, per field, what the model
-- proposed vs. what the operator actually saved. This lets us learn which fields
-- the model gets right and which the operator always overrides, to tune the
-- generation prompt over time. Write-only from the client's perspective; nothing
-- reads it in-app yet. Dashboard-owned storage only; unrelated to any
-- pipeline-owned table (episodes, receipts, jobs, characters).

create table if not exists public.channel_guideline_telemetry (
  id           uuid primary key default gen_random_uuid(),
  -- default auth.uid() so the client insert never has to plumb the user id; the
  -- RLS with-check still pins each row to the caller.
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  channel      text not null,
  field        text not null,
  proposed     text,
  saved        text,
  generated_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists channel_guideline_telemetry_channel_idx
  on public.channel_guideline_telemetry (channel);

alter table public.channel_guideline_telemetry enable row level security;

-- Owner-scoped: an authenticated operator may insert their own rows and read them
-- back. No update/delete policy (append-only log).
drop policy if exists channel_guideline_telemetry_insert on public.channel_guideline_telemetry;
create policy channel_guideline_telemetry_insert on public.channel_guideline_telemetry
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists channel_guideline_telemetry_select on public.channel_guideline_telemetry;
create policy channel_guideline_telemetry_select on public.channel_guideline_telemetry
  for select to authenticated using (user_id = auth.uid());
