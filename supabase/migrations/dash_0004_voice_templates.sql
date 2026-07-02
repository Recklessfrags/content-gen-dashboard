-- Casting voice templates - dashboard-owned expand step only.
-- Adds a reusable voice recipe library and immutable per-character provenance.

create extension if not exists pg_jsonschema with schema extensions;

create table if not exists public.voice_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text not null default '',
  design_prompt   jsonb not null default '{}'::jsonb,
  voice_settings  jsonb not null default '{}'::jsonb,
  source_codename text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists voice_templates_name_idx
  on public.voice_templates (lower(name));

drop trigger if exists voice_templates_set_updated_at on public.voice_templates;
create trigger voice_templates_set_updated_at
  before update on public.voice_templates
  for each row execute function public.set_updated_at();

alter table public.voice_templates enable row level security;

drop policy if exists voice_templates_select on public.voice_templates;
drop policy if exists voice_templates_insert on public.voice_templates;
drop policy if exists voice_templates_update on public.voice_templates;
drop policy if exists voice_templates_delete on public.voice_templates;

create policy voice_templates_select on public.voice_templates
  for select to authenticated
  using (true);

create policy voice_templates_insert on public.voice_templates
  for insert to authenticated
  with check (true);

create policy voice_templates_update on public.voice_templates
  for update to authenticated
  using (true)
  with check (true);

create policy voice_templates_delete on public.voice_templates
  for delete to authenticated
  using (true);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
      where conname = 'voice_templates_design_prompt_shape'
        and conrelid = 'public.voice_templates'::regclass
  ) then
    alter table public.voice_templates
      add constraint voice_templates_design_prompt_shape
      check (extensions.jsonb_matches_schema(
        '{
          "type": "object",
          "properties": {
            "age": {"type": "number"},
            "grit": {"type": "number"},
            "comedy_menace": {"type": "number"},
            "bombast": {"type": "number"},
            "gender": {"type": "string"}
          },
          "additionalProperties": true
        }'::json,
        design_prompt
      )) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
      where conname = 'voice_templates_voice_settings_shape'
        and conrelid = 'public.voice_templates'::regclass
  ) then
    alter table public.voice_templates
      add constraint voice_templates_voice_settings_shape
      check (extensions.jsonb_matches_schema(
        '{
          "type": "object",
          "properties": {
            "stability": {"type": "number"},
            "similarity_boost": {"type": "number"},
            "style": {"type": "number"},
            "speed": {"type": "number"},
            "use_speaker_boost": {"type": "boolean"}
          },
          "additionalProperties": true
        }'::json,
        voice_settings
      )) not valid;
  end if;
end $$;

alter table public.characters
  add column if not exists voice_recipe jsonb;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
      where conname = 'characters_voice_recipe_shape'
        and conrelid = 'public.characters'::regclass
  ) then
    alter table public.characters
      add constraint characters_voice_recipe_shape
      check (
        voice_recipe is null
        or extensions.jsonb_matches_schema(
          '{
            "type": "object",
            "properties": {
              "design_prompt": {"type": "object"},
              "voice_settings": {"type": "object"},
              "template_name": {"type": "string"}
            },
            "additionalProperties": true
          }'::json,
          voice_recipe
        )
      ) not valid;
  end if;
end $$;
