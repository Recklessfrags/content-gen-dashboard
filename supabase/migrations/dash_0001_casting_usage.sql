-- Casting usage cap — dashboard-owned. Backs the soft per-user/day limit the
-- casting-proxy edge function enforces so a dashboard bug can't burn the shared
-- ElevenLabs render quota. Only the edge function (service role) writes here;
-- the operator can read their own row to show "N/M casts left today".
-- This migration only creates dashboard-owned storage; it does not touch
-- pipeline-owned episodes, receipts, or jobs.

create table if not exists public.casting_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default current_date,
  count    int  not null default 0,
  primary key (user_id, day)
);

alter table public.casting_usage enable row level security;

-- Owner-scoped SELECT only. No authenticated insert/update/delete: the cap can
-- only be moved by the service role (which bypasses RLS) inside the edge function.
drop policy if exists casting_usage_select on public.casting_usage;
create policy casting_usage_select on public.casting_usage
  for select to authenticated using (user_id = auth.uid());

-- Atomic increment-and-check. Returns whether the action is allowed and the
-- resulting used-count. The conflict WHERE guard makes the limit race-safe:
-- a concurrent caller can't push count past p_limit.
create or replace function public.casting_bump_usage(p_user uuid, p_limit int)
returns table (allowed boolean, used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.casting_usage as cu (user_id, day, count)
  values (p_user, current_date, 1)
  on conflict (user_id, day)
  do update set count = cu.count + 1
  where cu.count < p_limit
  returning cu.count into v_count;

  if v_count is null then
    -- update guard rejected it (already at/over the cap): report current count.
    select cu.count into v_count
      from public.casting_usage cu
      where cu.user_id = p_user and cu.day = current_date;
    return query select false, coalesce(v_count, p_limit);
    return;
  end if;

  return query select true, v_count;
end;
$$;

-- Least privilege: only the service role (edge function) may bump usage.
revoke all on function public.casting_bump_usage(uuid, int) from public;
grant execute on function public.casting_bump_usage(uuid, int) to service_role;
