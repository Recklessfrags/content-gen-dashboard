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
| **Pipeline-owned, read-only** | `episodes`, `receipts` | the content pipeline (service role) | **read-only** |
| **Pipeline-owned, dashboard-enqueue** | `jobs` | the pipeline **worker** owns all lifecycle/transitions; the dashboard may **INSERT (enqueue-only) + SELECT** | **read + enqueue-only insert** (see `jobs` section) |

The dashboard **must never** create or alter pipeline-owned tables, and **must never**
write the pipeline-owned **lifecycle** columns. The one sanctioned dashboard write is an
**enqueue-only INSERT into `jobs`** (input fields only), permitted by the pipeline's own
RLS policy (`jobs_enqueue`). The pipeline writes everything via the service role, which
bypasses RLS.

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

> **`runtime` is advisory, not authored.** The pipeline reports `runtime` is
> **measured** and **voice-dependent / unstable** (e.g. Mad Dog's real delivery is
> ~100 wpm, so the length model is under review and the earlier `135–160 words` figure
> is withdrawn). Operator edits to `runtime` in the bible editor can therefore be
> overwritten/ignored by the pipeline. **Direction:** the editor should render
> `runtime` **display-only / advisory** ("pipeline-measured, not authored"), not as a
> freely-editable "Runtime target". Ownership ruling is an **open HQ ask** (audit §1a);
> the UI change is queued for the Builder once the pipeline confirms it is
> pipeline-owned.

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

## `jobs` — PIPELINE-owned, dashboard ENQUEUE-ONLY

The work queue. **Pipeline-owned** (the worker, via service role, owns every lifecycle
transition), but the dashboard is the **enqueue surface**: it may INSERT new jobs
(input fields only) and SELECT the queue. **Source of record for this table's schema +
RLS is the pipeline repo** — confirmed live on the HQ contract thread (2026-06-29) and
in the pipeline's `docs/architecture/dashboard-contract.md`. Mirrored here so the
dashboard build has a frozen reference; **do not recreate or alter `jobs` from this
repo.**

**Dashboard-settable INPUT fields** (the only columns the enqueue INSERT may carry):

| field | type | notes |
| --- | --- | --- |
| `food` | text | episode topic/subject |
| `character` | text | **send the verbatim `codename`** (e.g. `Mad Dog McGrath`); the worker slugifies both sides and matches exact-first. No `slug` column needed. |
| `anchor_citation` | text | optional source citation |
| `anchor_url` | text | optional source URL |
| `inject_claims` | — | optional claim injection |
| `episode_cap` | int | **`0 < cap ≤ 50`** (RLS-enforced) |
| `routes` | — | requested routes |
| `live_adapters` | — | adapter toggles |
| `stub_upstream` | bool | stub upstream stages (note: `script_writer` runs live even when set) |
| `spend_approved` | bool | default `false` (migration `0013`). Clears a **spend** park. |
| `publish_approved` | bool | default `false` (migration `0015`). Clears a **publish** park; **double-gated** — never posts without a wired Buffer adapter. |
| `idempotency_key` | text | UNIQUE; **dashboard generates its own** unique-per-logical-job key (no CLI parity). Duplicate → `409` "already queued". |

**Worker-owned columns — the dashboard MUST NOT set them** (RLS `jobs_enqueue` WITH CHECK
rejects a row that does): `status` (defaults `'queued'`), `attempts` (defaults `0`),
`spend`, `episode_id`, `lease_expires_at`, `started_at`, `finished_at`, `error`. Omit
them on insert; all have safe defaults. A forged running/done/spent row is rejected.

**RLS (pipeline-owned, migration `0014`):**
- `jobs_read` — `select to authenticated` (read the queue).
- `jobs_enqueue` — `insert to authenticated`, **enqueue-only** `WITH CHECK`:
  `status='queued'`, `attempts=0`, `episode_cap ∈ (0,50]`, and all worker-owned fields
  above are `null`.

**Approval flow (both spend + publish parks):** approval is a **FRESH job row**, not an
update of the parked one — the parked `ready_for_review` row stays as the audit record.
**Omit `idempotency_key`** (NULLs are exempt from the UNIQUE index) so the re-enqueue
isn't a 409. A **publish** approval re-enqueue sets **both** `publish_approved=true`
**and** `spend_approved=true` ("approve & go", so the live re-run doesn't re-park at the
spend gate). Park kind (spend vs publish) is told apart by the **parked stage in the
run's last receipt** — the dashboard infers it (`detectParkKind`) until/unless the
pipeline exposes an explicit `review_kind`/`park_reason` field (open HQ ask).

> **Re-render caveat (operator-facing copy must say this):** a publish-approval
> re-enqueue re-runs the pipeline **live** — it spends again and `script_writer`
> regenerates, so it posts a **different** cut than the one reviewed in the park. The
> pipeline's **resume-to-distribution** path (post the exact reviewed MP4, no re-spend)
> is **not built yet**; real publishing is held until it lands. Today no Buffer token is
> wired, so any publish approval parks at `approval_required` and never posts.

---

## Migration of record

`supabase/migrations/0001_init.sql` creates the dashboard-owned tables + owner-scoped
RLS, and adds the two read-only policies (`episodes_read`, `receipts_read`) to the
pipeline-owned tables. It is idempotent (`if not exists`, `drop policy if exists`) and
never alters pipeline columns.

**Migration namespacing (shared DB).** Because dashboard and pipeline share one
`reels-content` project, the two repos use **separate version lanes** to avoid
collisions: the **dashboard** uses a `dash_NNNN_*` prefix (e.g.
`dash_0001_casting_usage.sql`); the **pipeline** uses bare `NNNN_*`. The `jobs` table
and its policies are **pipeline-owned** and live in the pipeline's lane —
`0013` (`spend_approved`), `0014` (`jobs_read` + `jobs_enqueue`), `0015`
(`publish_approved`). Those are **not** in this repo and must not be recreated here.
