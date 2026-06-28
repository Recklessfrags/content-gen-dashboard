-- Character Control Room — schema + owner-scoped RLS.
-- Auth model: "me now, scoped others later". The dashboard's own tables
-- (characters, ideas) carry `owner` (defaults to auth.uid()); RLS restricts every
-- operation to the owner.
--
-- The pipeline's tables (episodes, receipts) already exist in this shared Supabase
-- project and are OWNED BY THE PIPELINE — this dashboard only READS them. We do not
-- create or alter them here; we only add read-only RLS policies so the signed-in
-- operator can read pipeline output while the pipeline keeps writing via the
-- service role (which bypasses RLS).

-- ── helper: keep updated_at fresh ───────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── characters (dashboard-owned) ────────────────────────────────────────────
create table if not exists public.characters (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  codename    text not null default 'New character',
  concept     text not null default '',
  status      text not null default 'draft' check (status in ('active', 'draft')),
  -- jsonb on purpose: new bible sections are new keys, no migration needed.
  bible       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists characters_owner_idx on public.characters (owner);

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

-- ── ideas / the wire (dashboard-owned) ──────────────────────────────────────
create table if not exists public.ideas (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null,
  note          text not null default '',
  character_id  uuid references public.characters (id) on delete set null,
  channel       text not null default 'Food',
  status        text not null default 'backlog' check (status in ('backlog', 'active', 'used')),
  created_at    timestamptz not null default now()
);
create index if not exists ideas_owner_idx on public.ideas (owner);
create index if not exists ideas_character_idx on public.ideas (character_id);

-- ── RLS: dashboard-owned tables, owner-scoped ───────────────────────────────
alter table public.characters enable row level security;
alter table public.ideas      enable row level security;

drop policy if exists characters_select on public.characters;
drop policy if exists characters_insert on public.characters;
drop policy if exists characters_update on public.characters;
drop policy if exists characters_delete on public.characters;
create policy characters_select on public.characters
  for select to authenticated using (owner = auth.uid());
create policy characters_insert on public.characters
  for insert to authenticated with check (owner = auth.uid());
create policy characters_update on public.characters
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy characters_delete on public.characters
  for delete to authenticated using (owner = auth.uid());

drop policy if exists ideas_select on public.ideas;
drop policy if exists ideas_insert on public.ideas;
drop policy if exists ideas_update on public.ideas;
drop policy if exists ideas_delete on public.ideas;
create policy ideas_select on public.ideas
  for select to authenticated using (owner = auth.uid());
create policy ideas_insert on public.ideas
  for insert to authenticated with check (owner = auth.uid());
create policy ideas_update on public.ideas
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy ideas_delete on public.ideas
  for delete to authenticated using (owner = auth.uid());

-- ── RLS: pipeline tables (read-only for the dashboard) ──────────────────────
-- These tables already exist (created by the pipeline) with RLS enabled and no
-- policies — i.e. deny-all to clients while the pipeline writes via service role.
-- Add SELECT-only policies so the signed-in operator can read pipeline output.
-- No insert/update/delete policies: the dashboard can never write these.
alter table public.episodes enable row level security;
alter table public.receipts enable row level security;

drop policy if exists episodes_read on public.episodes;
create policy episodes_read on public.episodes
  for select to authenticated using (true);

drop policy if exists receipts_read on public.receipts;
create policy receipts_read on public.receipts
  for select to authenticated using (true);
