-- dash_0007_channel_profiles_character_id.sql
-- Channel-first Phase 2 Lane 1: real channel->character link.
-- The pipeline worker does NOT read channel_profiles.character (grep-verified, HQ 2026-07-04:
-- load_channel_profile()/_profile_from_row() consume only channel + engagement_posture), so this
-- FK is safe with NO expand/contract window and NO pipeline migration. character_id becomes the
-- dashboard's read authority; the free-text `character` stays as a denormalized mirror + fallback.
--
-- NOT VALID + a separate VALIDATE step (dash_0003 precedent) so the gated VALIDATE is real and the
-- add does not scan/lock. channel_profiles is operation-global (no owner) and characters is
-- owner-scoped — the global->owner FK is accepted under the single-operator invariant (slice §0).
alter table public.channel_profiles add column if not exists character_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'channel_profiles_character_id_fkey'
      and conrelid = 'public.channel_profiles'::regclass
  ) then
    alter table public.channel_profiles
      add constraint channel_profiles_character_id_fkey
      foreign key (character_id) references public.characters (id)
      on delete set null
      not valid;
  end if;
end $$;

create index if not exists channel_profiles_character_id_idx
  on public.channel_profiles (character_id);

-- Backfill + VALIDATE are run as SEPARATE gated steps (see the ratify notes), not in this file.
