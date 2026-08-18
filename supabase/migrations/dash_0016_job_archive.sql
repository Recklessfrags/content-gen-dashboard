-- Job archive — dashboard-owned view preference. Hiding a job is not a
-- pipeline decision: it does not approve, reject, cancel, or resolve the job.
-- The dashboard continues to treat public.jobs as enqueue-only; archive and
-- unarchive write only this table. There is deliberately no foreign key to
-- jobs.id, so future pipeline cleanup cannot be blocked or cascaded here.

create table if not exists public.job_archive (
  job_id      bigint      not null,
  owner       uuid        not null default auth.uid(),
  archived_at timestamptz not null default now(),
  primary key (job_id, owner)
);

alter table public.job_archive enable row level security;

drop policy if exists job_archive_select on public.job_archive;
create policy job_archive_select on public.job_archive
  for select to authenticated using (owner = auth.uid());
drop policy if exists job_archive_insert on public.job_archive;
create policy job_archive_insert on public.job_archive
  for insert to authenticated with check (owner = auth.uid());
drop policy if exists job_archive_delete on public.job_archive;
create policy job_archive_delete on public.job_archive
  for delete to authenticated using (owner = auth.uid());
