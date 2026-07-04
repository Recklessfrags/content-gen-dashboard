-- Channel-guideline auto-gen usage cap — dashboard-owned. Backs the soft
-- per-user/day limit the channel-guideline-proxy edge function enforces so a
-- dashboard bug can't burn the shared Anthropic budget. Only the edge function
-- (service role) writes here; the operator can read their own row to show
-- "N/M generations left today". Separate table from casting_usage on purpose:
-- distinct budgets must not starve each other. Dashboard-owned storage only;
-- does not touch pipeline-owned episodes, receipts, or jobs.

create table if not exists public.channel_guideline_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default current_date,
  count    int  not null default 0,
  primary key (user_id, day)
);

alter table public.channel_guideline_usage enable row level security;

drop policy if exists channel_guideline_usage_select on public.channel_guideline_usage;
create policy channel_guideline_usage_select on public.channel_guideline_usage
  for select to authenticated using (user_id = auth.uid());

-- Atomic increment-and-check; the conflict WHERE guard makes the limit race-safe.
create or replace function public.channel_guideline_bump_usage(p_user uuid, p_limit int)
returns table (allowed boolean, used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.channel_guideline_usage as cu (user_id, day, count)
  values (p_user, current_date, 1)
  on conflict (user_id, day)
  do update set count = cu.count + 1
  where cu.count < p_limit
  returning cu.count into v_count;

  if v_count is null then
    select cu.count into v_count
      from public.channel_guideline_usage cu
      where cu.user_id = p_user and cu.day = current_date;
    return query select false, coalesce(v_count, p_limit);
    return;
  end if;

  return query select true, v_count;
end;
$$;

revoke all on function public.channel_guideline_bump_usage(uuid, int) from public;
grant execute on function public.channel_guideline_bump_usage(uuid, int) to service_role;
