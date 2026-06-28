# Data Contract — Supabase (FROZEN)

> **Frozen artifact.** Per `AGENTS.md` rule 4, this contract is read-only for the
> duration of a slice, including for its author. Changes require an Architect
> ruling logged in `docs/HANDOFF.md`.
>
> Supabase project: **`reels-content`** (`tyeejhaknqkeftjykqog`, region `us-east-1`).
> This project is **shared with the content pipeline** — see the two ownership
> classes below. Last verified against the live DB: **2026-06-28**.

## Ownership classes

| Class | Tables | Writer | Dashboard access |
| --- | --- | --- | --- |
| **Dashboard-owned** | `characters`, `ideas`, `character_bible_revisions` | the dashboard (authenticated user) | owner-scoped; revisions insert/read only |
| **Pipeline-owned** | `episodes`, `receipts` | the content pipeline (service role) | **read-only** |

The dashboard **must never** create, alter, or write to the pipeline-owned tables.
The pipeline writes them via the service role, which bypasses RLS.

---

## `characters` — dashboard-owned

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | `default gen_random_uuid()` |
| `owner` | uuid NOT NULL | `default auth.uid()` → `auth.users(id)` ON DELETE CASCADE |
| `codename` | text NOT NULL | `default 'New character'` |
| `concept` | text NOT NULL | `default ''` |
| `status` | text NOT NULL | `default 'draft'`, CHECK in (`active`, `draft`) |
| `bible` | jsonb NOT NULL | `default '{}'` — see bible keys below |
| `created_at` | timestamptz NOT NULL | `default now()` |
| `updated_at` | timestamptz NOT NULL | `default now()`, refreshed by `set_updated_at` trigger |

**`bible` keys (v1):** `voice`, `cadence`, `vocab`, `offlimits`, `lines`, `beats`,
`runtime`. **jsonb on purpose** — new sections (catchphrase bank, voice-sample URL,
do/don't gallery) are new keys, **no migration**. Consumers must treat unknown keys
as additive and never assume a fixed key set.

**RLS:** enabled. Policies (all `to authenticated`): `select/insert/update/delete`
each gated by `owner = auth.uid()`.

## `ideas` — dashboard-owned

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | `default gen_random_uuid()` |
| `owner` | uuid NOT NULL | `default auth.uid()` → `auth.users(id)` ON DELETE CASCADE |
| `title` | text NOT NULL | |
| `note` | text NOT NULL | `default ''` |
| `character_id` | uuid NULL | → `characters(id)` ON DELETE SET NULL |
| `channel` | text NOT NULL | `default 'Food'` |
| `status` | text NOT NULL | `default 'backlog'`, CHECK in (`backlog`, `active`, `used`) |
| `created_at` | timestamptz NOT NULL | `default now()` |

**RLS:** enabled, owner-scoped on all four verbs (same shape as `characters`).

---

## `character_bible_revisions` — dashboard-owned, immutable history

Added by human-ratified Slice 2 ruling D-4. Each row is a save-time snapshot of a
character bible plus the scalar dossier identity fields needed for history preview.
Rows are immutable: dashboard clients may insert and read their own snapshots, but
there are no update/delete policies.

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | `default gen_random_uuid()` |
| `character_id` | uuid NOT NULL | → `characters(id)` ON DELETE CASCADE |
| `owner` | uuid NOT NULL | `default auth.uid()` → `auth.users(id)` ON DELETE CASCADE |
| `codename` | text NULL | save-time snapshot |
| `concept` | text NULL | save-time snapshot |
| `status` | text NULL | save-time snapshot |
| `bible` | jsonb NOT NULL | `default '{}'` — save-time snapshot of the full bible payload |
| `created_at` | timestamptz NOT NULL | `default now()` |

**Indexes:** `(character_id, created_at desc)` for newest-first history reads.

**RLS:** enabled. Policies (all `to authenticated`): `select` using
`owner = auth.uid()` and `insert` with check `owner = auth.uid()`. **No**
`update`/`delete` policies; history is append-only.

---

## `episodes` — PIPELINE-owned (READ-ONLY for dashboard)

Discovered already-present in the shared project. **Do not recreate or alter.**

| column | type | notes |
| --- | --- | --- |
| `episode_id` | text **PK** | pipeline-assigned id |
| `food` | text NOT NULL | the episode topic/subject |
| `status` | text NOT NULL | pipeline status |
| `final_stage` | text NULL | stage the run ended at |
| `message` | text NULL | |
| `spend` | numeric NOT NULL | `default 0` |
| `sentinels` | jsonb NOT NULL | `default '[]'` — array of gate verdicts (`stage`, `provider`, `verdict`, `reason`, …) |
| `created_at` | timestamptz NOT NULL | `default now()` |
| `updated_at` | timestamptz NOT NULL | `default now()` |

> **No `owner`, no `character_id`.** There is **no per-character linkage** in this
> schema. The dashboard cannot filter episodes "by active character" without a
> change to the pipeline's table — out of scope for this repo. See open decision
> **D-1** in `docs/HANDOFF.md`.

**RLS:** enabled. Added by this dashboard: `episodes_read` = `select to authenticated
using (true)`. **No** insert/update/delete policies — clients can never write.

## `receipts` — PIPELINE-owned (READ-ONLY for dashboard)

| column | type | notes |
| --- | --- | --- |
| `id` | bigint **PK** | |
| `episode_id` | text | → `episodes(episode_id)`; UNIQUE composite with `seq` |
| `seq` | int | per-episode sequence |
| `stage`, `provider`, `model`, `effort_requested`, `effort_used`, `verdict`, `reason` | text | per-stage receipt |
| `iteration` | int | |
| `clamped` | boolean | |
| `evidence`, `result` | jsonb | |
| `spend_so_far` | numeric | |
| `ts` | timestamptz | |

**RLS:** enabled. Added by this dashboard: `receipts_read` = `select to authenticated
using (true)`. Read-only; no write policies.

---

## Migration of record

`supabase/migrations/0001_init.sql` creates the dashboard-owned tables + owner-scoped
RLS, and adds the two read-only policies to the pipeline-owned tables. It is
idempotent (`if not exists`, `drop policy if exists`) and never alters pipeline
columns.
