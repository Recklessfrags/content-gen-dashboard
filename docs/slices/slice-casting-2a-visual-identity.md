# Slice — Casting phase-2a: visual identity (upload → lock reference image + style)

_Author: Architect (Claude). Status: **FROZEN (v2)** — after a cross-vendor Gemini
review (REQUEST CHANGES; all three findings verified and folded in: the
no-bucket-prefix upload path, bucket-level size/MIME limits, and the REPLACE-orphan
clarification)._
Operator GO: 2026-07-01 (this session). Pipeline boundary CONFIRMED (HQ, 2026-06-30).
Design artifact: `docs/design/casting-2a-visual-identity.md` (Gemini). Proposal history:
`docs/proposals/casting-phase2-image-style.md` — its open questions are all resolved:
provider = **none** ("dumb receiver": the operator generates the image anywhere and the
dashboard only uploads + locks it); data model = **columns** (symmetric with phase-1
`voice_id`); storage = **private `character-refs` bucket**, worker reads via service
role; spend governance = **moot for 2a** (no generation, no credits)._

> Loop: Architect (spec, cross-vendor reviewed) → Codex (build, incl. the migration) →
> Gemini + Architect review the diff → migration posted to HQ, applied, verified →
> ratify (desktop + 412px) → human merges.

## What ships

Each character gets a **locked visual identity**: exactly one reference image plus a
short free-text style descriptor, authored in the dashboard, stored in a **private**
dashboard-owned bucket, exposed to the pipeline as two columns on `characters`
(`reference_image_url`, `visual_style`) — the same contract shape phase-1 used for
`voice_id`. Assembly will consume the locked image as the `locked_character` master
asset (pipeline work, later; nothing here blocks on it).

## Non-goals (do not build)

- No image **generation** anywhere in the dashboard (no Higgsfield/Gemini calls, no
  provider config). Upload only.
- No candidate galleries / multi-image compare (phase 2b), no image-to-video (2c,
  pipeline-owned), no cropping/editing.
- No public URLs — the bucket is private; the app renders via **short-lived signed
  URLs** only.
- No new deps.

## D-arch obligations folded into this slice (operator GO, 2026-07-01)

This is the **first Casting migration**, so per the D-arch ruling it carries the seam
hardening:

- **`pg_jsonschema`** installed and a **DB-CHECK on `characters.bible`** (the shared
  jsonb surface the pipeline reads) — permissive-additive: root must be an object; the
  seven v1 keys (`voice`, `cadence`, `vocab`, `offlimits`, `lines`, `beats`, `runtime`),
  **when present**, must be strings; unknown extra keys stay allowed (the additive
  jsonb contract). Live rows verified conforming 2026-07-01 (both characters: 7 string
  keys, object root).
- **Expand/contract choreography:** every change here is the **expand** step — new
  columns are nullable, the CHECK is added **`NOT VALID`** (new writes enforced,
  existing rows untouched). The **enforce** step (`VALIDATE CONSTRAINT`) runs as a
  separate, verified, in-session step after confirming live rows pass — never in the
  same breath as the expand.
- **Negative contract tests:** after apply, prove the CHECK rejects a bad shape (e.g.
  `bible.runtime` as a number) and accepts a conforming additive key.

## Migration — `supabase/migrations/dash_0003_visual_identity.sql` (Codex authors)

Idempotent (`if not exists` / `on conflict do nothing` / `drop policy if exists`),
touches **only** dashboard-owned surfaces, never pipeline tables. Contents, exactly:

1. `create extension if not exists pg_jsonschema with schema extensions;`
2. `alter table public.characters
      add column if not exists reference_image_url text,
      add column if not exists visual_style text;`
   Both **nullable**, no defaults (expand step; null = not visually cast).
3. The bible shape CHECK, added NOT VALID and only if absent (idempotency guard —
   wrap in a `do $$ … if not exists (select 1 from pg_constraint …) …$$` block):
   ```sql
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
   ```
4. Private bucket, with **server-side limits** (defense-in-depth — client validation
   alone is bypassable by any authenticated API caller):
   `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('character-refs', 'character-refs', false, 5242880,
            array['image/png','image/jpeg','image/webp'])
    on conflict (id) do nothing;`
5. Owner-scoped storage RLS on `storage.objects` for this bucket only (all four verbs,
   `to authenticated`), path convention **`<owner uuid>/<character id>/<filename>`**:
   `bucket_id = 'character-refs' and (storage.foldername(name))[1] = auth.uid()::text`
   (insert/update also `with check` the same predicate). The pipeline worker reads via
   the **service role** (bypasses RLS) — no worker-facing policy needed.

**`reference_image_url` value format (cross-team surface — receipt posted to HQ):**
the column stores the **durable storage object path** (`<owner>/<char-id>/<file>`,
bucket implied = `character-refs`), **never** a signed URL (they expire) and never a
public URL (the bucket is private). Readers mint their own access: the dashboard via
`createSignedUrl`, the worker via service-role download. Bucket-2 derivation: any
expiring value in the column would break renders; posted to the Coordination Log for
pipeline ack before Assembly consumes it (2c).

## Data layer — `src/lib/castingVisual.ts` (new)

Mirror `src/lib/casting.ts` conventions (typed errors, no `any`):

- `isVisuallyCast(c: Pick<Character, "reference_image_url">)` — non-empty path.
- `validateRefImage(file: File)` — type ∈ {png, jpeg, webp}, size ≤ 5 MB; returns a
  human-readable error string or null.
- `uploadRefImage(supabase, ownerId, characterId, file)` — calls
  `storage.from("character-refs").upload(path, file)` where `path` is exactly
  **`<ownerId>/<characterId>/ref-<crypto.randomUUID()>.<ext>` — NO bucket prefix**
  (review finding 1, verified: supabase-js upload paths are bucket-relative; a
  `character-refs/…` prefix would become part of `storage.objects.name`, making
  `foldername(name)[1]` = the bucket string, and RLS would reject every upload).
  Unique name per upload — no overwrite races. Returns the object path (which is also
  the exact `reference_image_url` column value).
- `lockVisualIdentity(supabase, characterId, path, visualStyle)` — single
  `update characters set reference_image_url, visual_style` (RLS owner-scoped).
- `unlockVisualIdentity(supabase, characterId)` — nulls both columns. **Does NOT
  delete the storage object** (cheap, and history/audit friendly; orphan cleanup is a
  later chore, noted, not built). **REPLACE likewise never deletes** — it uploads a
  new object and points the row at it; the prior object is deliberately orphaned
  (same future chore; do not write delete logic anywhere in 2a).
- `signedRefImageUrl(supabase, path, ttlSeconds = 3600)` — wraps
  `storage.from("character-refs").createSignedUrl`.
- `Character` type + `database.types.ts` pick up the two new columns (regenerate the
  generated types; hand-edit only if regeneration is unavailable in-session).

Unit tests for the pure parts (`validateRefImage`, path construction, `isVisuallyCast`)
in `src/lib/__tests__/castingVisual.test.ts`.

## UI — per the Designer artifact

Build exactly what `docs/design/casting-2a-visual-identity.md` (Gemini) specifies —
placement, states, classnames, microcopy — **minus its two overruled points** (storage
deletion on Replace/Remove; "Permanently delete" confirm copy), per the arbitration
comment at the top of that file. The design's token names are **indicative, not
literal** — the repo's real tokens are `--ink/--ink-2/--ink-3`, `--line/--line-soft`,
`--paper/--paper-dim/--paper-faint`, `--stamp/--stamp-deep`, `--brass`, `--cleared`,
`--focus-ring`, fonts `--display/--body/--mono` (`globals.css:4-9`); map each design
reference to the closest existing token and **add no new tokens**. Hard floors
regardless of design detail:
all six states from the brief (empty / preview-unlocked / locked / in-flight / error /
dangling-path), WCAG 2.2 AA (focus management, labels, `aria-live` for async results),
320–412px clean, reduced-motion respected, **no new tokens/deps**. The character patch
flows through the existing `onCharacterPatched`-style callback so roster state stays
consistent (same pattern as `voice_id`).

## Bible revisions interplay

`reference_image_url`/`visual_style` are **columns, not bible keys** — they do NOT
enter `character_bible_revisions` snapshots, and locking/unlocking must NOT create a
revision (same as phase-1 `voice_id`). The bible CHECK does not apply to the revisions
table (append-only history may hold legacy shapes).

## Acceptance criteria (gates — frozen with the spec)

| # | Gate | How verified |
| --- | --- | --- |
| V-1 | Upload → preview → LOCK persists: hard reload shows the locked image (signed URL renders) + style text; `characters` row has path + style. | Ratify walk + SQL read. |
| V-2 | The bucket is private: the raw storage URL (no token) returns 400/403; anon key cannot list/read the object; a signed URL renders. | REST checks. |
| V-3 | Owner-scoping: an unauthenticated client can neither upload nor read; upload path is `<auth.uid()>/…` (RLS rejects a foreign-uid path). | REST negative checks. |
| V-4 | REPLACE swaps the image (new path, old row updated); REMOVE nulls both columns and returns the empty state. No revision rows created by any of it. | In-browser + SQL (`count(*)` on revisions unchanged). |
| V-5 | The bible CHECK: a `bible` write with `runtime: 42` (number) is **rejected**; a write with an unknown additive key succeeds; the existing editor's save still works end-to-end. | Negative contract tests (SQL) + a real dossier save. |
| V-6 | Pipeline surfaces untouched: no writes to `episodes`/`receipts`/`jobs`; migration touches only `characters`, the new bucket, and its policies. | Diff + migration review. |
| V-7 | `tsc --noEmit`, `npm test`, `npm run build` clean; no new deps. | CI + local. |
| V-8 | Quality floor: all designed states reachable; 412px no overflow; keyboard-only flow completes upload→lock; focus restored on panel close; reduced-motion. | Ratify mobile + manual keyboard walk. |
| V-9 | Enforce step done deliberately: `VALIDATE CONSTRAINT characters_bible_shape` run **after** V-5 passes, as its own logged step; migration name posted to HQ **before** apply. | Session log + HQ page. |

**Floor ≠ done:** V-1/V-2/V-8 are judged on the running app + live storage, not unit
tests. A gate that could pass with a broken signed-URL render (e.g. asserting only the
DB write) does not count.
