-- Atomically merge edited pipeline settings into the current channel profile.
-- The patches are intentionally shallow: jsonb || replaces only matching
-- top-level keys and does not recursively merge nested objects.
create or replace function public.merge_channel_profile_patch(
  p_channel text,
  p_sourcing_patch jsonb default null,
  p_research_patch jsonb default null
)
returns setof public.channel_profiles
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_sourcing_patch is not null
     and jsonb_typeof(p_sourcing_patch) <> 'object' then
    raise exception 'p_sourcing_patch must be a JSON object';
  end if;
  if p_research_patch is not null
     and jsonb_typeof(p_research_patch) <> 'object' then
    raise exception 'p_research_patch must be a JSON object';
  end if;

  return query
    update public.channel_profiles as cp
    set
      sourcing = case
        when p_sourcing_patch is null then cp.sourcing
        else coalesce(cp.sourcing, '{}'::jsonb) || p_sourcing_patch
      end,
      research_profile = case
        when p_research_patch is null then cp.research_profile
        else coalesce(cp.research_profile, '{}'::jsonb) || p_research_patch
      end
    where cp.channel = p_channel
    returning cp.*;
end;
$$;

comment on function public.merge_channel_profile_patch(text, jsonb, jsonb) is
  'Shallow-merges top-level sourcing/research_profile patch keys for one channel; null patches preserve the corresponding column.';

revoke all on function public.merge_channel_profile_patch(text, jsonb, jsonb) from public;
grant execute on function public.merge_channel_profile_patch(text, jsonb, jsonb) to authenticated;
