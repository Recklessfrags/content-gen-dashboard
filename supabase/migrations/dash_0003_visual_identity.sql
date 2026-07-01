-- Casting phase-2a visual identity - dashboard-owned expand step only.
-- Adds nullable character cast columns, a permissive bible shape CHECK (NOT VALID),
-- and private owner-scoped reference-image storage.

create extension if not exists pg_jsonschema with schema extensions;

alter table public.characters
  add column if not exists reference_image_url text,
  add column if not exists visual_style text;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
      where conname = 'characters_bible_shape'
        and conrelid = 'public.characters'::regclass
  ) then
    alter table public.characters
      add constraint characters_bible_shape
      check (extensions.jsonb_matches_schema(
        '{
          "type": "object",
          "properties": {
            "voice":     {"type": "string"},
            "cadence":   {"type": "string"},
            "vocab":     {"type": "string"},
            "offlimits": {"type": "string"},
            "lines":     {"type": "string"},
            "beats":     {"type": "string"},
            "runtime":   {"type": "string"}
          },
          "additionalProperties": true
        }'::json,
        bible
      )) not valid;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-refs',
  'character-refs',
  false,
  5242880,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do nothing;

drop policy if exists character_refs_select on storage.objects;
drop policy if exists character_refs_insert on storage.objects;
drop policy if exists character_refs_update on storage.objects;
drop policy if exists character_refs_delete on storage.objects;

create policy character_refs_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'character-refs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy character_refs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'character-refs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy character_refs_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'character-refs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'character-refs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy character_refs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'character-refs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
