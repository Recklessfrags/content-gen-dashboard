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
| **Dashboard-owned** | `characters`, `ideas`, `idea_job_map`, `character_bible_revisions` | the dashboard (authenticated user) | owner-scoped; revisions insert/read only |
| **Dashboard-owned, operation-global** | `channel_profiles` | the dashboard (authenticated user) | **`authenticated` full CRUD** (NOT owner-scoped — shared operator config); pipeline worker **reads** via service role |
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
| `bible` | jsonb NOT NULL | `default '{}'` — see bible keys below; **shape-enforced** by `characters_bible_shape` CHECK (pg_jsonschema, `dash_0003`, VALIDATED live 2026-07-01): root object, the 7 v1 keys must be strings *when present*, unknown additive keys allowed |
| `created_at` | timestamptz NOT NULL | `default now()` |
| `updated_at` | timestamptz NOT NULL | `default now()`, refreshed by `set_updated_at` trigger |
| `voice_id` | text NULL | casting phase-1 (applied live); non-null = voice-cast |
| `voice_settings` | jsonb NULL | casting phase-1 voice parameters |
| `reference_image_url` | text NULL | casting phase-2a (`dash_0003`) — **bucket-relative storage object path** `<owner>/<character_id>/ref-<uuid>.<ext>` in the private `character-refs` bucket; **NEVER a URL** (signed URLs expire; readers mint their own access). Non-null = visually cast. Pipeline (Assembly) will consume it as the `locked_character` master asset via service-role download (their 2c). |
| `visual_style` | text NULL | casting phase-2a — short operator-authored style descriptor accompanying the locked image |
| `voice_recipe` | jsonb NULL | voice-templates slice (`dash_0004`, applied + VALIDATED 2026-07-02) — **immutable cast-time provenance snapshot** `{design_prompt, voice_settings, template_name?}` written with every cast (no FK/reference to `voice_templates` — the pipeline's "birth-certificate, don't link" rule). **Worker-invisible** (TTS reads `voice_id`/`voice_settings` only). Shape-enforced by `characters_voice_recipe_shape` CHECK (null-whitelisted, permissive-additive). |

**`bible` keys (v1):** `voice`, `cadence`, `vocab`, `offlimits`, `lines`, `beats`,
`runtime`. **jsonb on purpose** — new sections (catchphrase bank, voice-sample URL,
do/don't gallery) are new keys, **no migration**. Consumers must treat unknown keys
as additive and never assume a fixed key set.

> **`runtime` is OPERATOR-OWNED (dashboard-authored) — keep it editable.** Pipeline
> ruling, HQ 2026-06-29 (resolves audit §1a — no ownership conflict). `runtime` is the
> **operator's content-length lever**: the script-writer parses the "N–M spoken words"
> target out of it to size the script. The pipeline **reads** `runtime`, it **never
> writes** it. So the bible editor keeps `runtime` **operator-editable** ("Runtime
> target") — do **not** lock it display-only.
> - The **measured real-VO length** is a *separate*, pipeline-owned output — it lives in
>   `receipts` / the render manifest (informational; ADR-004 makes it the master clock
>   *at render time* but it never writes back to `runtime`).
> - **Optional dashboard polish:** show the last measured render length *beside* the
>   field as read-only advisory (from `receipts`) so the operator tunes the target
>   against reality — no write-back to `runtime`.
> - **Coordination rule:** if the pipeline/architect ever needs to change a `runtime`
>   (e.g. live calibration), route it through the operator / flag it on the HQ so it
>   can't clobber a dashboard edit. (The "instability" seen during this week's
>   calibration was the pipeline owner hand-tuning the value *as operator*, not
>   measurement overwriting it.)

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

## `idea_job_map` — dashboard-owned

Added by `dash_0006` for channel-first Phase 3 Lane 1. Records the dashboard-owned
provenance link from a job idempotency key back to the originating idea, including
approval re-runs whose keys are echoed by the worker into `episodes.correlation_key`.

| column | type | notes |
| --- | --- | --- |
| `idempotency_key` | text PK | the job key written by the dashboard |
| `idea_id` | uuid NULL | → `ideas(id)` ON DELETE SET NULL, so job/spend history survives idea deletion |
| `owner` | uuid NOT NULL | `default auth.uid()` → `auth.users(id)` ON DELETE CASCADE |
| `channel` | text NULL | denormalized from the job payload |
| `created_at` | timestamptz NOT NULL | `default now()` |

**Indexes:** `(idea_id)` and `(owner, channel)`.

**RLS:** enabled, owner-scoped on all four verbs. Inserts and updates also enforce
ownership integrity: a non-null `idea_id` must point at an idea owned by the same
authenticated user.

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

## `channel_profiles` — dashboard-owned (operation-global config)

Per-channel config the pipeline worker resolves at job-start (`jobs.channel → profile`).
Same ownership split as `characters` (dashboard owns table + migration + editor; worker
**reads only**), but access is **operation-global, not owner-scoped** — there is **no
`owner` column**. Contract agreed cross-team (HQ, 2026-06-30); migration
`dash_0002_channel_profiles` applied live.

**Columns:** `channel` text **PK** (= `jobs.channel` codename) · `display_name` text ·
`fact_anchor` text (light CHECK: `fda_standard_of_identity`/`declassified_primary_doc`/`none`)
· `treatment` text (light CHECK: `archival_documentary`/`motion_graphic`/`avatar`/`live_demo`)
· `character` text null · `voice_archetype` text null (open vocabulary, no check) ·
`source_ladder` jsonb (array) · `packaging` jsonb (`{title_style, thumbnail_style}`) ·
`engagement_posture` jsonb (`{claim_discipline, arousal_ceiling}`) · `length_target` jsonb
(`{short_s}`) · `platforms` jsonb (array) · `created_at`/`updated_at` timestamptz.

**Conventions:** enum-ish fields are **text, not PG enums** (forward-compatible — add values
without a type migration); structured fields are **jsonb-on-purpose** (new keys, no
migration). A seeded `default` row reproduces today's food behavior; a null/unknown
`jobs.channel` resolves to it.

**RLS:** enabled; **`authenticated` full CRUD** (`select`/`insert`/`update`/`delete`, all
`using (true)`/`with check (true)`) — trusted-operator, shared config. The worker reads via
the **service role** (bypasses RLS).

**Enforcement status:** the `engagement_posture` dials (`claim_discipline`,
`arousal_ceiling`) are **stored, not yet enforced** — the worker-read + ADR-005 tiering are
later pipeline work. The editor surfaces them as "stored — not yet active" until then.

---

## `voice_templates` — dashboard-owned (operation-global config)

Voice-templates slice (`dash_0004`, applied + VALIDATED live 2026-07-02). Reusable
voice **recipes** (Casting Studio design sliders + clamped ElevenLabs settings) the
operator saves/applies/deletes. Same ownership class as `channel_profiles`:
**operation-global config**, `authenticated` full CRUD (all four verbs,
`using (true)`/`with check (true)`), no `owner` column. **The pipeline worker never
reads this table** — its TTS path is `characters.voice_id` + `voice_settings`,
unchanged.

**Columns:** `id` uuid PK · `name` text (unique on `lower(name)`) · `description`
text · `design_prompt` jsonb (`{age, grit, comedy_menace, bombast, gender}` — numbers
0–1 + string; shape-CHECKed permissive-additive) · `voice_settings` jsonb (EL
settings; shape-CHECKed) · `source_codename` text NULL (freeform breadcrumb, **not**
a FK) · `created_at`/`updated_at` (+ `set_updated_at` trigger).

On use, the recipe is **copied** into `characters.voice_recipe` — never referenced —
so template deletion can never dangle a character.

---

## `character-refs` storage bucket — dashboard-owned (PRIVATE)

Casting phase-2a (`dash_0003`, applied + verified live 2026-07-01). Holds each
character's locked reference image.

- **Private** (`public=false`), server-side limits: **5 MB**, MIME
  `image/png|jpeg|webp`.
- **Path convention:** `<owner uuid>/<character id>/ref-<uuid>.<ext>` —
  bucket-relative (supabase-js `.upload()` paths never include the bucket name).
- **RLS on `storage.objects`:** all four verbs `to authenticated`, gated by
  `bucket_id='character-refs' AND (storage.foldername(name))[1] = auth.uid()::text`
  (owner-scoped by first path segment). The **pipeline worker reads via the service
  role** (bypasses RLS) — same contract shape as `channel_profiles`.
- **App code never deletes objects** (2a ruling: REPLACE/REMOVE orphan the prior
  object deliberately — audit-friendly; cleanup is a future chore). The delete
  *policy* exists as owner-scoped capability only.
- Frontend renders via **short-lived signed URLs** (`createSignedUrl`), never a
  public URL.

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
| `character_id` | uuid NULL | **pipeline-stamped** per run (`= characters.id`); **loose uuid, NO FK** (a dashboard character delete never blocks a historical row). null when a job has no `character`. |
| `created_at` | timestamptz NOT NULL | `default now()` |
| `updated_at` | timestamptz NOT NULL | `default now()` |

> **Per-character linkage — schema/writer LIVE, data not yet populated** (pipeline
> migration `0006`). The column exists and the worker is wired to resolve `jobs.character`
> → `characters.id` and stamp `episodes.character_id`, BUT **0 episodes are linked yet** —
> no character-driven run has happened (the keystone Mad Dog → Acoustic Kitty run, D-1).
> So Tier-2 per-character cost is **schema-unblocked** (the Cost Box has the
> group-by-`character_id` seam) but **data-blocked** until that first run. Pipeline-owned +
> read-only for the dashboard. (Resolves D-1's schema concern; the populating run is still
> pending.)

**RLS:** enabled. Added by this dashboard: `episodes_read` = `select to authenticated
using (true)`. **No** insert/update/delete policies — clients can never write.

> **Incoming (agreed, NOT yet in schema) — `episodes.correlation_key`.** Cross-team ask ANSWERED
> 2026-07-03: the pipeline will add an **additive nullable `correlation_key`** the worker writes
> from the job's `idempotency_key` at `begin_episode`, letting the dashboard join idea→job→episode
> robustly (`ideas.id` ↔ `idempotency_key` dashboard-owned map ↔ `episodes.correlation_key`).
> Read-only for us; legacy/absent rows fall back to `food`+`character_id`+window. **Status: QUEUED,
> not started — owner-to-act = operator to sequence** (shared-schema migration + live-worker
> write). Gates dashboard **Phase 3** (threaded Production); non-blocking for Phase 1/2. Pipeline
> will post a migration/worker-write heads-up when it lands.

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
in the pipeline repo's `docs/architecture/dashboard-contract.md` (**that file lives in the
pipeline repo, NOT this one — don't look for it here**). Mirrored here so the
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
| `channel` | text | pipeline `0018` (**APPLIED live 2026-07-01**, operator GO) — routes the job to a `channel_profiles` row. **Tolerant resolution worker-side:** absent/`null`/unknown → the `default` profile, so it is always safe to omit. Participates in the dashboard's idempotency hash **only when non-null** (legacy keys stay byte-stable). |
| `fact_approved` | bool | pipeline `0017` — operator sign-off gate for **regulated-YELLOW claims** (mirror of `spend_approved`; RED/Gate behavior unaffected). Not in the `jobs_enqueue` WITH CHECK (verified live 2026-07-02) — the dashboard's `buildJobInsert` emits an explicit `false` on every insert and `true` only on a **fact approval re-enqueue** (fresh row, parked row stays as audit, fresh non-null re-run idempotency key). Participates in the idempotency hash **only when `true`** (explicit `false` hashes identically to omitted — legacy keys byte-stable). A fact approval does **NOT** auto-set `spend_approved` (a claims sign-off is not a spend decision); the parked row's spend state carries, and the dialog **warns** when it is already `true` (the re-run will not park again before spending). **Fact approval UI SHIPPED 2026-07-02.** |

**Worker-owned columns — the dashboard MUST NOT set them** (RLS `jobs_enqueue` WITH CHECK
rejects a row that does): `status` (defaults `'queued'`), `attempts` (defaults `0`),
`spend`, `episode_id`, `lease_expires_at`, `started_at`, `finished_at`, `error`. Omit
them on insert; all have safe defaults. A forged running/done/spent row is rejected.

**RLS (pipeline-owned, migration `0014`):**
- `jobs_read` — `select to authenticated` (read the queue).
- `jobs_enqueue` — `insert to authenticated`, **enqueue-only** `WITH CHECK`:
  `status='queued'`, `attempts=0`, `episode_cap ∈ (0,50]`, and all worker-owned fields
  above are `null`.

**Approval flow (fact + spend + publish parks):** approval is a **FRESH job row**, not an
update of the parked one — the parked `ready_for_review` row stays as the audit record.
The dashboard sends a non-null idempotency key on every dashboard-originated job:
initial enqueues use the derived hash, and every fact/spend/publish/stale re-enqueue
sends a FRESH unique key `job_rerun_<parentJobId>_<ts>`. It never collides (so no
409), and the worker echoes it into `episodes.correlation_key`, so a money-spending
re-run is threadable back to its idea via the dashboard-owned `idea_job_map` (Phase 3
Lane 1). A **publish** approval re-enqueue sets **both** `publish_approved=true`
**and** `spend_approved=true` ("approve & go", so the live re-run doesn't re-park at the
spend gate). A **fact** approval sets only `fact_approved=true` (carrying the parked
row's other flags — see the `fact_approved` row above).

**`park_kind` — WRITTEN by the worker since pipeline PR #42 (2026-07-02, operator-ruled
merged vocabulary; SUPERSEDES 0016's `approval_required` value):** approval parks
(`status='ready_for_review'`) carry **`fact` | `spend` | `publish`** (each cleared by
its flag); hard parks (`status='error'`) carry **`blocked` | `exhausted`**; **`null`** =
not parked or unmapped/legacy (fail-safe; self-healing — every job finish writes the
key, explicit null on done/no_op/crash). **The dashboard resolves column-first**
(`resolveParkKind`): an approval-kind column value is authoritative and skips the
receipts round-trip; recognized hard-park values resolve "unknown" (never inferred);
**`null` falls back to the legacy `detectParkKind` receipt-stage inference** (kept for
rows parked before the worker deploy; the fallback cannot classify `fact` — such rows
surface as unclassified, not mislabeled — and ages out via self-healing).

> **APPLIED + LIVE — pipeline-owned, bare `0016`** (HQ 2026-06-30). The dashboard wired
> the resume-to-distribution publish path against these in **PR #21/#22** (publish approval
> enqueues `publish_only=true` + `source_episode_id`; `park_kind` surfaced in the run-queue).
> The three `jobs` columns:
> - **`park_kind text`** — originally documented as a spend-vs-publish discriminator;
>   **vocabulary superseded 2026-07-02** (see the `park_kind` block above — pipeline
>   PR #42 writes `fact|spend|publish|blocked|exhausted|null`).
> - **`publish_only boolean not null default false`** + **`source_episode_id text`** —
>   the **resume-to-distribution** path: when set, the worker SKIPS research→assembly and
>   runs only Distribution against `source_episode_id`'s existing manifest + rendered MP4
>   (posts the exact reviewed cut, no re-render, no double-spend). The dashboard's
>   publish-approval button should switch from the both-flags re-enqueue to this safe path
>   once the columns are live.
>
> **Error reasons:** `jobs.error` carries the full human-readable string (e.g.
> `parked: exhausted: word_count …`, `parked: blocked: duration …`); its prefix
> (`blocked` / `exhausted` / `approval_required`) is a stable discriminator. The run-queue
> renders `jobs.error`; the final receipt's `verdict`/`reason` is the drill-down detail.

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
`dash_0001_casting_usage.sql`, `dash_0002_channel_profiles.sql`,
`dash_0003_visual_identity.sql` — the first D-arch expand/contract migration:
NOT VALID CHECK on apply, `VALIDATE CONSTRAINT` as a separate verified step,
negative contract tests in between); the **pipeline** uses bare
`NNNN_*` (incl. `0016` = `publish_only`/`source_episode_id`/`park_kind`). The `jobs` table
and its policies are **pipeline-owned** and live in the pipeline's lane —
`0013` (`spend_approved`), `0014` (`jobs_read` + `jobs_enqueue`), `0015`
(`publish_approved`). Those are **not** in this repo and must not be recreated here.
