-- Reveal-approval audit trail — dashboard-owned. Records the operator's
-- per-reveal decisions immediately while the pipeline-owned jobs.reveal_*
-- resume fields remain capability-gated. Append-only by design: authenticated
-- operators can read and insert only their own records. Does not touch
-- pipeline-owned episodes, receipts, or jobs.

create table if not exists public.reveal_approvals (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  episode_id  text not null,
  reveal_id   text not null,
  decision    text not null check (decision in ('approved', 'edited', 'rejected')),
  edited_text text null,
  steer       text null,
  decided_at  timestamptz not null default now()
);

create index if not exists reveal_approvals_owner_idx
  on public.reveal_approvals (owner);
create index if not exists reveal_approvals_episode_reveal_idx
  on public.reveal_approvals (episode_id, reveal_id);

alter table public.reveal_approvals enable row level security;

drop policy if exists reveal_approvals_select on public.reveal_approvals;
drop policy if exists reveal_approvals_insert on public.reveal_approvals;
drop policy if exists reveal_approvals_update on public.reveal_approvals;
drop policy if exists reveal_approvals_delete on public.reveal_approvals;
create policy reveal_approvals_select on public.reveal_approvals
  for select to authenticated using (owner = auth.uid());
create policy reveal_approvals_insert on public.reveal_approvals
  for insert to authenticated with check (owner = auth.uid());
