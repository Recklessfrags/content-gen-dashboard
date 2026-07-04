-- dash_0006_idea_job_map.sql
-- Dashboard-owned idea->job provenance map (channel-first Phase 3 Lane 1).
-- Records idempotency_key -> idea_id so an enqueued/re-enqueued job threads back
-- to its originating idea. Owner-scoped; ownership-integrity insert/update check.
create table if not exists public.idea_job_map (
  idempotency_key text primary key,
  idea_id         uuid references public.ideas (id) on delete set null,
  owner           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  channel         text,
  created_at      timestamptz not null default now()
);
create index if not exists idea_job_map_idea_id_idx on public.idea_job_map (idea_id);
create index if not exists idea_job_map_owner_channel_idx on public.idea_job_map (owner, channel);

alter table public.idea_job_map enable row level security;

drop policy if exists idea_job_map_select on public.idea_job_map;
drop policy if exists idea_job_map_insert on public.idea_job_map;
drop policy if exists idea_job_map_update on public.idea_job_map;
drop policy if exists idea_job_map_delete on public.idea_job_map;

create policy idea_job_map_select on public.idea_job_map
  for select to authenticated using (owner = auth.uid());
create policy idea_job_map_insert on public.idea_job_map
  for insert to authenticated with check (
    owner = auth.uid()
    and (idea_id is null or exists (
      select 1 from public.ideas i where i.id = idea_id and i.owner = auth.uid()
    ))
  );
create policy idea_job_map_update on public.idea_job_map
  for update to authenticated using (owner = auth.uid()) with check (
    owner = auth.uid()
    and (idea_id is null or exists (
      select 1 from public.ideas i where i.id = idea_id and i.owner = auth.uid()
    ))
  );
create policy idea_job_map_delete on public.idea_job_map
  for delete to authenticated using (owner = auth.uid());
