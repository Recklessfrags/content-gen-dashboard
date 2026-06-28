-- Character bible revision history — dashboard-owned, immutable snapshots.
-- This migration only creates dashboard-owned history storage. It does not touch
-- pipeline-owned episodes, receipts, or jobs.

create table if not exists public.character_bible_revisions (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid not null references public.characters (id) on delete cascade,
  owner         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  codename      text,
  concept       text,
  status        text,
  bible         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists character_bible_revisions_character_created_idx
  on public.character_bible_revisions (character_id, created_at desc);

alter table public.character_bible_revisions enable row level security;

drop policy if exists character_bible_revisions_select on public.character_bible_revisions;
drop policy if exists character_bible_revisions_insert on public.character_bible_revisions;
drop policy if exists character_bible_revisions_update on public.character_bible_revisions;
drop policy if exists character_bible_revisions_delete on public.character_bible_revisions;

create policy character_bible_revisions_select on public.character_bible_revisions
  for select to authenticated using (owner = auth.uid());

create policy character_bible_revisions_insert on public.character_bible_revisions
  for insert to authenticated with check (owner = auth.uid());
