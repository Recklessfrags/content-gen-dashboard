# Data Contract — Supabase (FROZEN)

> **Frozen artifact.** Per `AGENTS.md` rule 4, this contract is read-only for the
> duration of a slice, including for its author. Changes require an Architect
> ruling logged in `docs/HANDOFF.md`.
>
> Supabase project: **`reels-content`** (`tyeejhaknqkeftjykqog`, region `us-east-1`).
> This project is **shared with the content pipeline** — see the two ownership
> classes below. Last verified against the live DB: **2026-08-18**.

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

## Pipeline-owned vocabularies

The dashboard vendors the pipeline repo's `docs/contracts/vocabularies.json` as
`src/lib/pipeline-vocabularies.json`. Pipeline disclosures are adopted by copying the
source file; `src/lib/SYNC.md` records that sync procedure. The pipeline remains the
owner of these vocabulary values, while dashboard-specific display ordering and
defaults remain local behavior.

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

**Live columns not yet driven by the editor (regen 2026-08-12):** the live table also carries
`editing` jsonb null and `script` jsonb null. They are in `database.types.ts` for schema
accuracy but the dashboard neither reads nor writes them; every upsert omits them (preserved).

### Distribution + register columns (migrations `dash_0014`, `dash_0015` — both APPLIED)

Channel-generic config that lets a NON-food channel drive its own distribution copy and word
register. Modeled as **three independent FLAT top-level columns** — **not** a nested `raw`
container. > **Verified:** the pipeline reads these as top-level row columns off
`ChannelProfile.raw = dict(row)` (`channel_profiles.py:61`) — `lexicon` (`lexicon.py:77`),
`hashtags` (`distribution.py:82`), `cta_target`→`cta`→`call_to_action` (`prompts.py:405`);
a nested `raw` column would read as `dict(row).get("lexicon") == None` → silent no-op, so the
flat shape is the correct contract (confirmed against pipeline `main` + live schema).
**Dashboard owns them; the pipeline reads only.** The editor exposes them under the channel's
"Distribution & register" advanced section.

Columns the editor writes today:

| column | type | notes |
|---|---|---|
| `lexicon` | jsonb `not null default '{}'`, shape `{ "substitutions": { "<source>": "<replacement>", … } }` | **ADVISORY register data ONLY.** See the safety note below. |
| `hashtags` | jsonb `not null default '[]'` (array of strings) | distribution tags; pipeline caps count per platform, blank ⇒ neutral defaults |
| `cta_target` | text null | default call-to-action target — **see the CTA pin note** |
| `ai_disclosure` | boolean `not null default true` | whether this channel claims each platform's native AI-content flag at publish — **never a gate**, see below |

Column the pipeline will read but the editor does **NOT** add or write (HELD):

| column | status |
|---|---|
| `visual_style` | **HELD — pipeline has not built it.** No column, no UI. ⚠️ Do **NOT** conflate with `characters.visual_style` (an unrelated casting free-text field on the `characters` table). |

**The AI-disclosure toggle is a labelling preference, NEVER a gate** (operator ruling,
2026-08-18: *"we don't need to worry about the ai disclosure tag being mandatory, it should
just be a toggle in the dashboard, never a reason to park a job."*). The pipeline reads it in
`distribution._ai_disclosure_enabled`, records it on `DistributionPlan.ai_disclosure`, and
parks nothing over it in either Distribution or Assembly. **Both readers default to ON for
anything that is not an explicit boolean** — a missing, null, or non-boolean value is not a
decision to stop disclosing, and `parseChannelAiDisclosure` mirrors the pipeline exactly so
the toggle can never show a state the pipeline does not act on. Known gap: nothing yet
transmits the flag to the platforms (publishing goes through Buffer, which carries text +
media only), so this records the decision rather than enforcing it — see
`docs/measurements/t52-ai-disclosure-2026-08-18.md` in the pipeline repo.

**SAFETY — the advisory floor is non-negotiable.** The `lexicon` column **cannot weaken,
disable, reorder, or narrow the universal advertiser-safety floor.** It is register tuning
over the pipeline's own generated copy, never a floor-override control. The pipeline
(`src/pipeline/lexicon.py::resolve_channel_lexicon`) is the sole authority: it applies the
floor AFTER substitution and **silently rejects any pair whose source OR replacement text
would breach the floor**. The dashboard performs NO floor enforcement of its own (doing so
would falsely imply authority) — the editor is a labeled advisory pass-through, and the UI
says so.

**Omit-preserves safety property (locked by test).** The upsert builder
(`buildChannelProfileUpsert`) writes each of `hashtags`/`cta_target`/`lexicon`/`ai_disclosure`
**only if it was edited this session**; an un-edited column is left off the payload. Because the editor
uses `.upsert(…, { onConflict: "channel" })`, an omitted column keeps its stored value
(partial-column update semantics). Because these are three independent columns, editing one
never touches the others — and the HELD `visual_style` has no column here, so it can never be
written. Editing a column to empty is an explicit clear (`cta_target → null`,
`lexicon → { substitutions: {} }`), distinct from omitting an untouched column. This matches
how `packaging`/`engagement_posture` (other dashboard-owned columns) are snapshot-upserted.

**CTA field-name PIN (coordinator, pending final confirmation).** The canonical CTA column is
pinned to **`cta_target`**. The pipeline (`src/pipeline/prompts.py`) reads
`cta_target` → `cta` → `call_to_action` in that order, so `cta_target` is read today. **Flag
for ratification:** confirm `cta_target` as the single cross-repo name.

**`jobs.park_kind` — new terminal member.** The P24 channel-lexicon block introduces a new
`jobs.park_kind` value (a lexicon/register terminal block reason). `park_kind` is an open
`text` column (`string | null` in types), so no type change is required; readers must treat
the vocabulary as open and not switch exhaustively on it. (The park-kind vocabulary tripwire
lives in `pipeline-vocabularies.json`; sync it when the pipeline finalizes the member name.)

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

## `job_archive` — dashboard-owned (a VIEW PREFERENCE, not a decision)

**Live since 2026-08-18** (migration `dash_0016_job_archive.sql`). Added because the operator
had 107 approvals in one list and needed them out of the working view without approving them
and without deleting them.

```sql
job_id      bigint      not null
owner       uuid        not null default auth.uid()
archived_at timestamptz not null default now()
primary key (job_id, owner)
```

RLS enabled; `select` / `insert` / `delete` for `authenticated`, each gated on
`owner = auth.uid()` — the same shape as `ideas` and `characters`. Archive is an INSERT,
unarchive a DELETE.

**The pipeline never reads this table**, and must not start: hiding a row from one operator's
screen says nothing about the run. Specifically:

- **Archiving is NOT a decision.** It does not approve, reject, cancel or resolve anything. A
  parked run that is archived stays parked; the pipeline's view of it is unchanged.
- **`jobs` remains ENQUEUE-ONLY to the dashboard.** This table exists precisely so that hiding a
  row needs no `UPDATE` on `jobs` — that boundary was the reason a column on `jobs` was rejected
  during design, along with a proposed service-role Edge Function to get around it.
- **The composite PK is deliberate.** With per-owner RLS, a single-column key would make one
  operator's archive row block another's insert against a row they cannot even see.
- **There is deliberately NO foreign key to `jobs.id`.** A hard FK would make a future `jobs`
  cleanup (like the 343-row delete of 2026-08-18) fail or cascade unexpectedly. A stale archive
  row for a deleted job is harmless and is ignored on join.

Spec: `docs/architecture/spec-job-archive.md` (dashboard repo).

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
Lane 1). A **publish** approval re-enqueue sets `publish_approved=true`,
`publish_only=true`, and `source_episode_id` (resume distribution from the reviewed
episode). It is `publish_only`, so the worker **skips gen/render** — it does not
re-spend — and therefore does **NOT** force `spend_approved`; the parked row's spend
state carries verbatim (verified by `buildPublishApprovalReenqueue` + its unit tests,
`src/lib/jobs.ts` / `src/lib/__tests__/jobs.test.ts`). A **fact** approval sets only
`fact_approved=true` (carrying the parked row's other flags — see the `fact_approved`
row above).

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

**Applied 2026-08-18** (both verified against the live DB after apply):
`dash_0015_channel_profiles_ai_disclosure.sql` — adds `channel_profiles.ai_disclosure`
(`boolean not null default true`), read by the pipeline as a per-channel publish toggle;
`dash_0016_job_archive.sql` — creates `public.job_archive` (see its section above).

⚠️ **Process note, recorded because the control failed and not the outcome:** both of these were
applied to the shared production database **before** the `AGENTS.md` L-2 suerta review ran. L-2
exists to catch problems *before* landing anything touching a migration, a money path or a
shared contract; reviewing an applied migration leaves only a follow-up migration as a lever.
Neither needed reverting — that was luck, not process. **Apply after the L-2 pass, not before.**

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

---

## Reveal-approval contract (RATIFIED 2026-07-12 — Architect ruling)

Ratified on HQ (reels#88 problem-solver `4952962040`, pipeline pin `4952902874`, dashboard
draft `4952832716`) as part of the content-spine/gate-rebuild spec
(`reels: docs/architecture/spec-channel-dna-and-reveal-spine.md`, §8). A new mid-stream
approval-park (`reveal`) that mirrors the existing fact/spend/publish approval machinery.
Recorded here per the ratify's housekeeping item; jobs columns land in the **pipeline's**
migration lane (owner GO + dated #88 heads-up) — NOT recreated in this repo.

**Park signal (pipeline writes, dashboard reads):** the conductor parks the job after
`reveal_auditor` / before `assembly` at `status='ready_for_review'`, `park_kind='reveal'`
(new value in the existing `jobs.park_kind` vocabulary). Dashboard detects it via
`resolveParkKind`, exactly like `fact`/`spend`/`publish`.

**`reveal_auditor` receipt (pipeline-owned, read-only to dashboard):** `result` jsonb =
`{ reveals: [ { reveal_id (ordinal "r1","r2",… stable across resume/repair), reveal_text,
grade ("green"|"yellow"|"red"), reason, brand_specific ({ flagged, detail? }),
component_claims[] (the SAME shape as the `fact_check` receipt claims — id + citation +
source_span + status — reused by the #2-display renderer) } ] }`. Read the **max-seq**
`reveal_auditor` receipt per episode (latest-wins); join `(episode_id, reveal_id)`.

**`jobs` reveal columns (PIPELINE-OWNED — pipeline migration lane, owner GO):** dashboard
gets an **approval-write RLS grant** (same class as `spend_approved`) to UPDATE **only**
these, and only on a `park_kind='reveal'` job — never lifecycle columns:
- `reveal_approved boolean` — dashboard sets `true` → conductor resumes to assembly.
- `reveal_override jsonb` — `[{ reveal_id, edited_text }]`; conductor re-runs `reveal_auditor`
  grounding checks (§6/§7) on the edit before render (pass → proceed; **fail → re-park
  `reveal` with a `grade:"red"` + reason receipt** surfaced back to the owner). The owner is
  sovereign over *which* reveal, **not** over grounding.
- `reveal_rejected jsonb` — `{ reason }` (owner's optional steer); conductor re-queues
  `script_writer` with it threaded as `retry_feedback`, bounded by `max_iterations` → then
  re-park for the owner (never an unbounded loop). **Field type converged to jsonb**
  (dashboard adopted the pipeline's shape, HQ `4952961083`).

**`reveal_approvals` (DASHBOARD-OWNED, new — owner-scoped RLS like `characters`):** durable
audit record `{ id, episode_id, reveal_id, decision ('approved'|'edited'|'rejected'),
edited_text, steer, owner, decided_at }`. The jobs flags are the pipeline-read *resume
signal*; this table is the *record*. Dashboard migration lane (`dash_NNNN_*`).

**Dashboard build:** the §8 preview surface (list `park_kind='reveal'` jobs → render each
reveal + grounding via the shared fact-claim component → approve/edit/reject controls). It is
a **render/spend-gating write path → two-lens review (Gemini + suerta/Opus) + owner GO to
merge.** Build order: read + UI + `reveal_approvals` table first (no dependency on the
pipeline columns); wire the jobs write-back once the pipeline lands the columns + posts the
#88 heads-up.
