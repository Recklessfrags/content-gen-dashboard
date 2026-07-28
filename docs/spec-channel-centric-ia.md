# Spec — Channel-centric IA (survey + design, v1 read-only)

> **Status:** SPEC ONLY — no UI built this round. Authored by a dashboard work
> session (Claude/Opus) reporting to the Coordinator. Independent cross-vendor
> review: see §11.
> **Date:** 2026-07-28.
> **Scope:** survey of what exists, the real live data map, the proposed
> information architecture, the read-only→editable upgrade path, pushback, and
> the open questions — routed in §10 by who can actually answer them.

---

## 0. The ask, and the one-line answer

The operator asked:

> "I want to log into the dashboard and see what channels I have, clicking a
> channel takes me to an informational page about that channel. from there I
> can see the different components of the channel and click through them."

**That navigation already exists and shipped under ruling D-6.** There is a
Channels index, channel cards are clickable, and each opens a per-channel
workspace with tabs (`production · character · guidelines · cost`).

What does **not** exist is the thing the operator actually feels missing: the
workspace shows almost none of the configuration that governs a run, and the
configuration it *does* let you edit is largely inert. Concretely, measured
this session:

- **~62 pipeline-read configuration keys** live in the `sourcing`, `editing`,
  `script`, and `research_profile` jsonb blobs. **Zero** of them are rendered
  anywhere in the dashboard.
- The two parser functions written for this (`parseSourcing`,
  `parseResearchProfile`, `src/lib/channelProfiles.ts:174` and `:195`) are
  **dead code** — exported, unit-tested, imported by nothing.
- The `editing` and `script` columns are **not even present in the generated
  types** (`src/lib/database.types.ts`) — they were added to the DB after the
  last type generation.
- Meanwhile the channel form *does* let the operator edit **five fields the
  pipeline never reads at all** (§3.4).

So this is not an IA project. **It is a "make the real configuration visible,
and stop showing fake configuration" project, delivered inside the IA that is
already ratified and built.** Redrawing the IA would be rework; §7 proposes an
additive extension instead.

---

## 1. Survey — what the dashboard is today

### 1.1 Routing and shell

There is exactly **one application route**: `src/app/page.tsx` (`/`), plus
`/login` and `/auth/signout`. Everything else is a single 3,224-line client
component, `src/components/ControlRoom.tsx`, which switches surfaces from
in-memory state mirrored to the query string.

Navigation state is a discriminated union in `src/lib/route.ts:11`:

```ts
export type AppScope =
  | { kind: "hub"; hub: HubKey }                                  // ?hub=channels
  | { kind: "workspace"; channel: string; tab: WorkspaceTab };    // ?channel=weird_food&tab=guidelines

HubKey       = channels | actions | overview | characters | ideas | runs | review | reveal
WorkspaceTab = production | character | guidelines | cost
```

`parseScope()` (`route.ts:45`) canonicalises the query string, validates the
channel against a `knownChannels` allowlist, and falls back to
`{hub:"channels"}` on anything unrecognised. **URLs are shareable and
deep-linkable** — this is a real router, just implemented over search params
rather than filesystem routes.

*Implication for this spec:* new surfaces should extend `AppScope`, not
introduce `app/channels/[channel]/page.tsx`. Migrating to filesystem routes is
a separate, larger refactor and is **not** required by the ask.

### 1.2 Authentication

- `@supabase/ssr` cookie session. `middleware.ts` matches all non-static paths
  and calls `updateSession()` (`src/lib/supabase/middleware.ts`), which
  refreshes the session and **redirects any unauthenticated request to
  `/login`**; authenticated requests to `/login` bounce to `/`.
- `src/app/page.tsx` independently re-checks `supabase.auth.getUser()` and
  redirects — defence in depth.
- The browser holds the **anon/publishable key only**; every read is gated by
  RLS. Single-operator deployment; no roles, no org model.

### 1.3 Data access layer

All application data is fetched **client-side** from browser hooks in
`src/lib/hooks/` — `useChannelProfiles`, `useCharacters`, `useEpisodes`,
`useJobs`, `useReceipts`, `useIdeas`, `useCostReceipts` — each doing a
`supabase.from(...).select("*")` with a request-generation guard, refreshed by
`usePolling`. `src/app/page.tsx` does no data fetching beyond the auth check.

`useChannelProfiles` already does `select("*")`, so **the sourcing/editing/
script/research_profile blobs are already in the browser's memory today.** They
are simply never rendered. Nothing about the fetch layer needs to change to
make them visible.

*Consequence:* every screen in this spec is achievable with existing data flow
— no server components, no route handlers, no new network shape.

### 1.4 What channel data is surfaced today

| Surface | File | Shows |
|---|---|---|
| Channels index | `aurora/ChannelsHub.tsx` | card per channel: display name, Cast/Uncast chip, avatar, **active job count**. A second metric slot literally reads *"Runs & cost — coming soon"*. |
| Landing glance | `aurora/HubLanding.tsx` | active channel count, active run count, 30-day spend |
| Workspace → production | `ControlRoom.tsx:2778` | 4-item **readiness checklist**: guidelines set · character assigned · voice cast · visual identity locked |
| Workspace → character | `ControlRoom.tsx:2949` | character bench / casting surfaces |
| Workspace → guidelines | `ControlRoom.tsx:3130` | embeds `ChannelProfilesPanel` (1,115 lines) — the editable channel form |
| Workspace → cost | `ControlRoom.tsx:3184` | **deferred stub** — an icon and a "coming soon" panel |

`ChannelProfilesPanel` is a **read-write form**. Its write path,
`buildChannelProfileUpsert` (`channelProfiles.ts:327`), deliberately **omits
`sourcing` and `research_profile`** from the upsert so an on-conflict update
can never clobber pipeline-owned config — an explicit, correct, commented
guard. `editing` and `script` are likewise omitted (by not existing in the
types). **Confirmed: there is no data-loss path from the current form.**

---

## 2. The real data map

Live-inspected in Supabase project `tyeejhaknqkeftjykqog` on 2026-07-28, and
cross-checked against the pipeline resolvers in
`/home/user/reels-content-generation/src/pipeline/config.py` and
`channel_profiles.py`.

### 2.1 How the pipeline actually resolves a channel profile

This governs every "is it set or defaulted?" claim in the UI, so it must be
stated exactly. From `channel_profiles.py:73-115` (`load_channel_profile`):

1. One REST call fetches **both** the requested channel row and the `default`
   row: `?channel=in.(<requested>,default)`.
2. **Row selection is wholesale, not per-key.** If a row exists for the
   requested channel — *even if every jsonb column on it is null* — that entire
   row is used and **the `default` row is never consulted again**. The `default`
   row is used only when the requested channel has **no row at all**.
3. Below the row, each key resolves **against a code constant**, never against
   a sibling row.

> ### ⚠️ There is no inheritance
> `default` is **not** a parent profile. A UI that renders "inherited from
> default" would be **factually wrong**. An unset key on `weird_food` falls back
> to a constant in `config.py`, *not* to `default`'s value for that key.

Two further facts that a naive UI would get wrong:

- **The `default` row is not the strict builtin.** Its `engagement_posture` is
  explicitly `{arousal_ceiling:"standard", claim_discipline:"fact_first"}`,
  whereas the code floor is `conservative`/`fact_first`. A channel-less job
  today resolves `standard`, not the stricter value it would get if Supabase
  were unreachable.
- **~30 keys have an environment-variable layer that outranks the DB.** The
  resolution idiom is `env → Settings → jsonb → code default`. **The dashboard
  cannot see the worker's env** — this is the standing rule from the pipeline
  repo ("never state a worker-env value as fact"). §6.3 designs for this
  honestly rather than papering over it.

### 2.2 `channel_profiles` — columns

`channel` (PK, text) · `display_name` · `description` · `fact_anchor` ·
`treatment` · `character` (text) · `character_id` (uuid) · `voice_archetype` ·
`source_ladder` (jsonb) · `packaging` (jsonb) · `engagement_posture` (jsonb,
NOT NULL default `{conservative, fact_first}`) · `length_target` (jsonb) ·
`platforms` (jsonb) · **`sourcing` (jsonb, nullable)** · **`research_profile`
(jsonb, nullable)** · **`editing` (jsonb, nullable)** · **`script` (jsonb,
nullable)** · `created_at` · `updated_at`.

Indexes: PK on `channel`, plus `channel_profiles_character_id_idx`. Four rows.
Adequate — this table will never be large.

### 2.3 Per-channel set-vs-default status (live, 2026-07-28)

**Blob presence:**

| channel | display_name | character | `sourcing` | `research_profile` | `editing` | `script` | updated_at |
|---|---|---|---|---|---|---|---|
| `dark_history` | Mad Dog's Declassified History | Mad Dog McGrath | ✅ 13 keys | ✅ | ✅ | ✅ | 2026-07-27 |
| `weird_food` | Weird Food | Fine Print | ✅ 6 keys | ✅ | ❌ null | ❌ null | 2026-07-26 |
| `grandma` | Grandma Pearl | Grandma Pearl | ⚠️ 2 keys | ✅ | ❌ null | ❌ null | 2026-07-09 |
| `default` | Animal channel | — | ❌ null | ❌ null | ❌ null | ❌ null | 2026-07-09 |

**Key-level map — every key actually set on a live row.** "Code default" is the
value the pipeline uses when the key is absent, verified at the cited
`config.py` line.

| Key | `dark_history` | `weird_food` | `grandma` | Code default (file:line) | Env layer? |
|---|---|---|---|---|---|
| `sourcing.escalation_ladder` | `["archival","pixabay"]` | `["pixabay"]` | *default* | `["archival"]` `config.py:92` | yes |
| `sourcing.assembly_max_spend` | `6.5` | *default* | *default* | `4.5` `assembly.py:128` | yes (**profile wins over env — inverted**) |
| `sourcing.generation_budget_usd` | `4.0` | `2.5` | *default* | derived: `clips × ~$0.449` | yes |
| `sourcing.max_generated_clips` | `12` | `6` | *default* | `4` `config.py:79` | yes |
| `sourcing.on_topic_ratio_floor` | `0.55` | *default* | *default* | `None` (feature off) `config.py:401` | yes |
| `sourcing.stock_on_below_floor` | `"park"` | *default* | *default* | `"notice"` `config.py:93` | yes |
| `sourcing.stock_on_topic_action` | `"park"` | *default* | *default* | `"notice"` `config.py:402` | yes |
| `sourcing.stock_text_screen` | `"reject"` | *default* | *default* | `"off"` `config.py:403` | yes |
| `sourcing.stock_vision_gate` | `true` | `true` | `true` | `false` `config.py:395` | yes |
| `sourcing.archival_miss_fallback` | `"generated"` | *default* | *default* | `"stock"` `config.py:107` | **no — jsonb only** |
| `sourcing.artifact_types` | `["archival_doc","period_archival"]` | `["reg_text"]` | `["scripture_text"]` | `[]` `config.py:389` | yes |
| `sourcing.low_specificity_tokens` | 15 terms | 13 terms | *default* | `[]` `config.py:1280` | yes |
| `sourcing.query_vocabulary.topic_token_policy` | `"identifier"` | *default* | *default* | `"prefix"` `config.py:368` | **no — profile only** |
| `editing.cut_rhythm.hook_hold_s` | `1.2` | *default* | *default* | `1.1` `config.py:126` | yes |
| `editing.cut_rhythm.target_hold_s` | `2.8` | *default* | *default* | `2.75` `config.py:127` | yes |
| `editing.cut_rhythm.max_hold_s` | `5.0` | *default* | *default* | `5.0` `config.py:128` | yes |
| `editing.cut_rhythm.generated_max_hold_s` | `2.0` | *default* | *default* | `2.5` `config.py:130` | yes |
| `editing.foley.volume` | `0.12` | *default* | *default* | `0.45` (clamp `[0.05,0.8]`) `config.py:133` | **no** |
| `editing.grade.preset` | `"archival_neutral"` | *default* | *default* | `None` (no grade) `config.py:1502` | **no** |
| `script.bombast_max_outbursts` | `1` | *default* | *default* | `None` (uncapped) `config.py:427` | yes |
| `research_profile.anchor_type` | `declassified_primary_doc` | `fda_standard_of_identity` | `scripture` | whole blob → `None` | no |
| `research_profile.source_hierarchy` | 5 entries | 5 entries | 1 entry | `[]` | no |
| `research_profile.thesis` | set (long) | set (long) | set (long) | `None` | no |
| `engagement_posture.claim_discipline` | `fact_first` | `fact_first` | **`none`** | `fact_first` (fail-closed) | no |
| `engagement_posture.arousal_ceiling` | `standard` | `conservative` | **`aggressive`** | `conservative` (fail-closed) | no |
| `length_target.short_s` | `100` | `70` | `75` | `70.0` `channel_profiles.py:21` | no |
| `voice_archetype` | `drill_instructor` | `calm_explainer` | `warm_storyteller` | `"default"` contour | no |

**~40 further keys are resolvable by the pipeline but set on no live row** —
they run on pure code defaults today. Notably the entire `repair_*` family
(`repair_max_attempts_per_cut` 3, `repair_max_cuts_per_episode` 12,
`repair_max_paid_attempts_per_episode` 2, `repair_unshippable_park_ratio` 0.0,
`repair_degrade_mode` `keep_incumbent`), all of `editing.captions.*`,
`editing.foley.bed`, `editing.particle.suppression_fragment`,
`sourcing.archival_providers` (default
`["internet_archive","wikimedia_commons"]` — LOC excluded), `loc_call_budget`,
`max_asset_reuse`, `generation_model`/`_ladder`/`_tier`,
`generation_failure_*`, and the top-level (**not** under `sourcing`)
`min_relevance_overlap` and `archival_medium_denylist`.

> **Naming trap for the UI:** `min_relevance_overlap` and
> `archival_medium_denylist` are read from the **top level** of the profile row's
> raw dict, not from inside `sourcing`. And `sourcing.stock_on_below_floor`
> (default `"notice"`) and `sourcing.on_below_floor` (default `"park"`) are two
> different keys feeding two different configs. Do not merge them in the UI.

### 2.4 The nested spend model

Four ceilings, **each independently binding — the tightest wins.** This is the
single most incident-prone thing on the platform and the screen for it must show
all four together:

```
DAILY_SPEND_CAP  (worker env, ~$25/24h)     ← gates whether a job is CLAIMED at all
  └─ jobs.episode_cap  (DB col, default 5, CHECK 0<x≤50)   minus Budget.floor $0.10
       └─ sourcing.assembly_max_spend  (default 4.5)        Assembly's paid adapters
            └─ sourcing.generation_budget_usd               generation/artifact only
```

Raising `episode_cap` does nothing once `assembly_max_spend` binds; raising
that does nothing once `generation_budget_usd` binds. Live `dark_history`
(`assembly_max_spend 6.5`, `generation_budget_usd 4.0`,
`max_generated_clips 12` → ~$5.39 of clips theoretically) is a case where the
**generation sub-budget is the real binding constraint** and the 12-clip cap is
unreachable. A UI that shows `max_generated_clips: 12` without showing the $4
budget above it is actively misleading.

`DAILY_SPEND_CAP` and `episode_cap` are **not** channel config — the first is
worker env (invisible to us), the second is per-job. Both must still appear on
the channel spend screen as context, clearly labelled as out-of-scope-of-channel.

### 2.5 `characters` — and a schema trap

4 rows, `owner`-scoped RLS. `voice_id`, `voice_settings` (jsonb),
`voice_recipe` (jsonb), `bible` (jsonb), `reference_image_url`, `visual_style`.

**`voice_recipe` has no fixed schema.** Live:

- Fine Print → `{design_prompt, generation, voice_settings}`
- Mad Dog McGrath → `{cast_at, method, note, previous_settings,
  previous_voice_id, recorded_at, settings_note, source, status, target, winner}`

Two of four characters have no `voice_recipe` at all. **The "birth certificate"
drill-down must render generically** (recursive key/value with a JSON escape
hatch), not against a fixed field list — a fixed list would silently hide
Mad Dog's provenance. `bible` keys are more stable
(`angle?, beats, cadence, lines, offlimits, runtime, vocab, voice`) but `angle`
is present on only two of four, so treat the bible as semi-structured too.

`reference_image_url` and `visual_style` are **null on all four characters** —
the "Visual identity locked" readiness item on the production tab can never be
satisfied today.

### 2.6 Episodes / jobs — the channel-attribution gap

> ### ⚠️ `episodes` has no `channel` column.
> Channel attribution exists **only** on `jobs.channel`. "Recent episodes for
> this channel" requires `episodes ⋈ jobs ON episodes.episode_id = jobs.episode_id`.

| | count |
|---|---|
| `episodes` rows | 115 |
| … with `character_id` | 96 |
| … with `correlation_key` | 55 |
| `jobs` rows | 116 |
| … with `channel` set | **65 (56%)** |
| `receipts` rows | 943 |

**51 jobs (44%) have `channel = null`** — all created before 2026-07-05, i.e.
before migration 0018 added the column. That history is **permanently
unattributable to a channel** unless someone backfills it. Per-channel episode
lists will silently omit nearly half of all runs, and per-channel spend totals
will under-report. This must be surfaced as an explicit "N unattributed runs"
affordance, not hidden.

Live distribution: `weird_food` 39 jobs (25 parked), `dark_history` 24 (14
parked), `grandma` 2, unattributed 51.

**Indexes:** `jobs` has PK, `jobs_status_idx (status, created_at)`, and a
partial unique on `idempotency_key`. There is **no index on `jobs.channel` and
none on `jobs.episode_id`.** At 116 rows this is irrelevant; it becomes
relevant at ~10⁴. §9.3 recommends deferring, with a trigger condition.

Park vocabulary in live use — `status` × `park_kind`:
`ready_for_review`×{`spend` 20, `publish` 17, `fact` 5, null 6};
`error`×{null 30, `exhausted` 19, `blocked` 12}; `stale` 3, `no_op` 2,
**`done` 2**. Only two jobs in the system's history reached `done`.

### 2.7 `jobs.repair`

Shape `{fix_kind, cut_ids?, claim_id?, instruction?}` (migration
`0020_jobs_repair.sql`). Four live rows, all `{fix_kind:"regen_cut", cut_ids:[…]}`.
`fix_kind ∈ {regen_cut, drop_claim, rephrase}`; the latter two rewind to the
script writer but **do not yet consume `claim_id`/`instruction`**. Repairs never
set `fact_approved` — an operator-directed fix is not permission to bypass the
Gate. This is **per-job**, not channel config; it belongs on the episode
drill-down, not the channel config screen.

### 2.8 RLS

| table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `channel_profiles` | `true` | `true` | `true` | `true` |
| `characters` / `ideas` | `owner = auth.uid()` | owner | owner | owner |
| `episodes` / `receipts` | `true` | — | — | — |
| `jobs` | `true` | `jobs_enqueue` (input fields only) | — | — |

> ### ⚠️ `channel_profiles` is fully writable by any authenticated user.
> The v1 "read-only" ruling is therefore a **UI convention, not a security
> property**. See §9.4.

---

## 3. What is broken today (findings, not opinions)

### 3.1 The live configuration is invisible

~62 pipeline-read keys; 0 rendered. This is the operator's complaint, located.

### 3.2 The parsers for it are dead code

`parseSourcing` (`channelProfiles.ts:195`) and `parseResearchProfile` (`:174`)
are exported and unit-tested but imported by **no component** (verified by
grep across `src/`, excluding tests). Someone built the reading half and the
rendering half never landed.

### 3.3 `parseSourcing` knows 4 of ~45 sourcing keys

It handles `artifact_types`, `stock_vision_gate`, `max_generated_clips`,
`generation_budget_usd` — and drops everything else, including every key the
coordinator added this campaign (`escalation_ladder`, `assembly_max_spend`,
`low_specificity_tokens`, `query_vocabulary`, `on_topic_ratio_floor`, the
`stock_*` actions, `archival_miss_fallback`). **It cannot be reused as-is.**

### 3.4 The form edits five fields the pipeline never reads

`buildChannelProfileUpsert` writes thirteen fields. Sorted by who actually
consumes them:

| Field | Pipeline reads it? | Dashboard reads it? | Verdict |
|---|---|---|---|
| `channel` | ✅ (the lookup key) | ✅ | **Primary key / identity** |
| `engagement_posture`, `voice_archetype`, `length_target`, `character_id` | ✅ | ✅ | **Live config** |
| `display_name`, `description` | ❌ | ✅ | **Dashboard-owned display** — legitimate |
| `character` (text codename) | ❌ | ✅ **load-bearing** | **Legacy join key** — see below |
| **`fact_anchor`, `treatment`, `source_ladder`, `packaging`, `platforms`** | ❌ | ❌ | **Decoy — inert in both directions** |

The five decoys are **never read by any pipeline code path** (grep-verified
across `src/pipeline`) and never read by the dashboard either. They are DB
columns from the original 2026-06-30 `channel-profile-object.md` schema; the
read side later diverged onto the jsonb-group shape and the columns were never
dropped.

> **`character` (text) is a separate case and must not be lumped in with the
> decoys.** The pipeline resolves the narrator purely via `character_id` and
> never reads this column — but the **dashboard** reads it in six places:
> Cast/Uncast determination (`ControlRoom.tsx:1621`), avatar initials (`:1623`,
> `:2723`), and codename-matching fallback when `character_id` is null (`:815`,
> `:2679`, `ChannelProfilesPanel.tsx:131`). Demoting it to "not used" would
> break the Cast chip and the avatars. Correct treatment: label it *legacy
> link — the pipeline uses `character_id`; this text field only drives dashboard
> display*, and treat retiring it as a separate cleanup once every row has a
> `character_id`. *(The independent review flagged this field as a missed sixth
> decoy; verification against the code showed it is dashboard-load-bearing, so
> it is called out as its own category rather than demoted — see §12.)*

The operator has been editing `source_ladder` in a form while actual routing is
governed by `sourcing.escalation_ladder` — **a different key, with a different
value space** (`{archival, pixabay}` vs `{archival, still_motion, generated}`)
— which the UI does not show. Likewise `fact_anchor` (form) vs
`research_profile.anchor_type` (pipeline).

> This is worse than invisible configuration. It is **decoy configuration**:
> controls that look authoritative, accept input, persist it, and change
> nothing. Any honest channel page must fix this in the same release that adds
> the real values, or it will hand the operator two contradictory sources of
> truth on one screen.
>
> **This finding is the single highest-value item for the independent reviewer
> to re-verify against `src/pipeline` before any build.** See §11.

### 3.5 Generated types are stale

`database.types.ts` has `sourcing` and `research_profile` but **not `editing`
or `script`**. Regenerating types is a build prerequisite.

### 3.6 Cost tab is a stub; the Channels card says "coming soon"

Two placeholders the operator sees on the exact path this ask describes.

---

## 4. Design principle — provenance is the feature

Every configuration value gets a **provenance badge**. This is the mechanism
that addresses "several avoidable failures came from configuration nobody could
see", and it is what distinguishes this from a JSON dump.

| Badge | Meaning | Rendering |
|---|---|---|
| **Set** | Key present and valid on this channel's row | Value prominent; secondary line `Set on this channel · <updated_at>` |
| **Default** | Key absent → pipeline uses a code constant | Value shown **dimmed/italic**; `Pipeline default — not set on this channel` |
| **⚠ Invalid** | Key present but the resolver would reject it | Both values: `Set to X — pipeline will ignore this and use Y` |
| **⚠ Env may override** | Key has an env layer the dashboard cannot read | Appended to Set/Default: `Worker env can override this; the dashboard cannot verify.` |
| **Dead** | Column/key exists but no pipeline code reads it | Struck through, grouped separately under "Not used by the pipeline" |

Four rules:

1. **Never invent a value.** If the resolution cannot be known from the DB
   alone (env layer), say so. Do not silently print the code default as if it
   were live.
2. **Never say "inherited".** There is no inheritance (§2.1). The word for an
   absent key is *default*, and the default is a code constant.
3. **The invalid check is the highest-value item.** Silent coercions are real:
   `stock_vision_gate` accepts only literal boolean `true` — a JSON string
   `"true"` is silently ignored; `research_profile` collapses **entirely to
   `None`** if `anchor_type` is not in the enum, taking a valid `thesis` and
   `source_hierarchy` down with it; `cut_rhythm` values reset to defaults if the
   `min ≤ hook ≤ target ≤ max` ordering is violated. A dashboard that flags
   these prevents exactly the class of incident that motivated this work.
4. **Deep-link everything.** Every drill-down is a URL.

### 4.1 Where do the defaults and validation rules come from?

They live in `config.py` in the **other** repo. Hand-copying ~62 defaults into
the dashboard creates a drift copy that will go stale — this repo already
carries a self-documented instance of that failure
(`VOICE_ARCHETYPE_SUGGESTIONS`, `channelProfiles.ts:39-42`: *"can drift — the
durable fix is to generate it from the pipeline's shared vocabulary contract"*).

**Proposal — a generated catalog contract:**

- The pipeline emits `docs/contracts/channel-config-catalog.json`: per key —
  jsonb path, type, code default, valid values/range, env-layer boolean,
  one-line "what it controls", and a `group` for UI placement.
- The dashboard renders **entirely from the catalog**. Adding a pipeline key
  becomes a catalog regeneration, not a dashboard code change.
- The catalog carries `pipeline_commit` + `generated_at`; the dashboard shows
  a staleness banner past a threshold.

**This is a cross-repo dependency and therefore a coordinator decision, not
ours** — see Q4 in §10. **Interim for v1:** a hand-authored catalog in the
dashboard, in the same shape, with a visible `Verified against pipeline
<commit> on <date>` line and a CI check that fails if the file is older than N
days. Building v1 against the catalog *shape* means adopting the generated
version later is a file swap, not a rewrite.

---

## 5. Proposed IA

Additive to the existing scope model. **Nothing is removed.**

```
/ ?hub=channels                       Channels index          [EXISTS — extend cards]
  └─ ?channel=X&tab=production        Channel overview        [EXISTS — extend content]
     ├─ ?channel=X&tab=character      Identity & character    [EXISTS — extend content]
     ├─ ?channel=X&tab=guidelines     Guidelines & posture    [EXISTS — extend content]
     ├─ ?channel=X&tab=config         Production config       [NEW — the missing ~62 keys]
     │    &group=sourcing | editing | script | spend | research   [NEW third level]
     └─ ?channel=X&tab=cost           Episodes & cost         [EXISTS as a stub — fill in]
```

> **The existing `WorkspaceTab` string literals are NOT renamed.** An earlier
> draft proposed `production→overview` and `character→identity`. That is not an
> additive change: `WorkspaceTab` is a discriminated-union member consumed by
> `WORKSPACE_TAB_LABELS: Record<WorkspaceTab, string>` (`ControlRoom.tsx:154`),
> `workspaceTabRefs` (`:519`), `focusWorkspaceTab`/`activateWorkspaceTab`
> (`:917`, `:1000`), and six `scope.tab === "…"` render branches. Renaming the
> keys would force a refactor across a 3,224-line file **for zero user-visible
> gain** — the operator sees `WORKSPACE_TAB_LABELS`, not the key. *(Caught by
> the independent review as a P0; see §12.)*

**Change the labels, not the keys.** `WORKSPACE_TAB_LABELS` becomes
`{production: "Overview", character: "Identity", guidelines: "Guidelines",
config: "Production config", cost: "Episodes & cost"}`.

Route changes required in `src/lib/route.ts` — genuinely additive:

```ts
// add one member to the existing union; do not touch the other four
WorkspaceTab = "production" | "character" | "guidelines" | "config" | "cost"
type ConfigGroup = "sourcing" | "editing" | "script" | "spend" | "research";
type AppScope =
  | { kind: "hub"; hub: HubKey }
  | { kind: "workspace"; channel: string; tab: WorkspaceTab; group?: ConfigGroup };
```

`group` is **optional and only meaningful when `tab === "config"`**;
`parseScope` must drop it (and canonicalise) on any other tab, matching how it
already drops unknown params. No redirect/alias map is needed, because no
existing URL changes meaning.

Five tabs is the ceiling. **Do not add a sixth** — push depth into `&group=`.

---

## 6. Screen specs

### 6.1 Channels index (extend `ChannelsHub.tsx`)

Card gains, replacing the *"Runs & cost — coming soon"* slot:

- **Episodes (30d)** and **Spend (30d)** — from the `jobs⋈episodes` join
- **Config health**: `N of M settings set` + a ⚠ count of invalid values
- Retain: display name, Cast/Uncast, avatar, active jobs

Add an **"Unattributed runs (51)"** card or footer row (§2.6) so the missing 44%
is visible rather than silently absent.

*States:* loading (existing skeleton) · error+retry (existing) · empty
(existing) · **partial** (profile row present, all blobs null → "Running
entirely on pipeline defaults").

### 6.2 Channel overview (`tab=production`, labelled "Overview")

1. **Header** — display name, `channel` key (monospace — it is the join key the
   operator types into SQL), character chip, `updated_at`.
2. **Readiness checklist** — keep as-is. Note "Visual identity locked" is
   currently unsatisfiable (§2.5); either wire `reference_image_url` or mark the
   item Deferred rather than leaving a permanently red check.
3. **Configuration summary** — one row per group (Sourcing / Editing / Script /
   Spend / Research), each showing `n set · m default · k invalid`, linking to
   `tab=config&group=…`.
4. **Effective spend ceiling** — the §2.4 nested diagram with the **binding**
   constraint highlighted. Highest-value single widget in the spec.
5. **Recent episodes** — 5 most recent with park/render status → `tab=cost`.

### 6.3 Production config (`tab=config`) — the new core

Landing = five group cards with set/default/invalid counts. Selecting one sets
`&group=` and shows a **settings table**: Setting · Effective value · Provenance
badge · What it controls · (expander: code default, valid range, env-layer
note, resolver file:line).

Group contents (from the catalog):

- **`group=sourcing`** — escalation ladder, archival providers + `loc_call_budget`,
  artifact types, vision gates (`stock_vision_gate`, `archival_vision_gate`),
  text screen, on-topic floor + action, below-floor action, `archival_miss_fallback`,
  query vocabulary (`topic_token_policy`, `non_visual_markers`,
  `broadening_terms`, `terminal_rung_budget`), `low_specificity_tokens` + weights,
  reuse cap, the `repair_*` family, provider-retry caps. **Include the two
  top-level keys** `min_relevance_overlap` and `archival_medium_denylist`, badged
  `top-level, not under sourcing` (§2.3 trap).
- **`group=editing`** — cut rhythm (render the four hold values on a **shared
  timeline scale** with the `min ≤ hook ≤ target ≤ max` ordering constraint drawn
  in, since violating it silently resets all of them), foley bed + volume,
  captions (position, style, word/line colour **as swatches**, wrap), particle
  suppression fragment, grade preset.
- **`group=script`** — `bombast_max_outbursts`; room for future keys. Will look
  sparse; that is honest.
- **`group=spend`** — the §2.4 nested model, all four ceilings, binding one
  highlighted; `episode_cap` labelled *per-job, not channel config*;
  `DAILY_SPEND_CAP` labelled *worker env — value not visible to the dashboard*;
  the generation model ladder, tier, retries, and failure kill thresholds.
- **`group=research`** — `anchor_type` (with the ⚠ that an invalid value
  collapses the whole blob), `source_hierarchy` as an ordered list, `thesis` as
  prose. This is the channel's editorial thesis and is arguably the most
  human-meaningful config on the platform — give it prose treatment, not a table
  row.

Also on this tab: a **"Not used by the pipeline"** collapsed section listing the
five decoy fields (§3.4), with `display_name`/`description` marked
*dashboard-only* and `character` marked *legacy link — drives dashboard display
only*. This is how §3.4 gets fixed without deleting data and without breaking
the Cast chip.

*States:* all groups null → a single honest "This channel runs entirely on
pipeline defaults" panel with the defaults still listed.

### 6.4 Identity & character (`tab=character`, labelled "Identity")

Existing character surfaces, plus drill-downs:

- **Voice** — `voice_id`, `voice_settings` as labelled sliders/readouts
  (stability, similarity_boost, style, speed, use_speaker_boost).
- **Voice recipe / birth certificate** — **generic recursive renderer** (§2.5),
  with a raw-JSON toggle. Empty state for the two characters without one.
- **Bible** — the 7–8 known keys with graceful handling of unknown keys.
- **Visual identity** — `reference_image_url`, `visual_style`; both null today,
  so the empty state is the state that ships.
- `voice_archetype` lives on the **channel**, `voice_settings` on the
  **character**. Show both here, labelled with which table owns each.

### 6.5 Episodes & cost (`tab=cost`, labelled "Episodes & cost")

Replaces the deferred cost stub. Data: `jobs` filtered by `channel`, left-joined
to `episodes` on `episode_id`, ordered `created_at desc`.

Row: episode_id · food/topic · status + `park_kind` chip · spend · created_at ·
render link where present. Filters by park kind reusing the existing
`runsChannelFilter.ts` facet helpers. Channel spend rollup with an explicit
caveat that pre-2026-07-05 runs are excluded (§2.6).

Per-episode drill-down: **link to the existing Runs/receipt drill-down** rather
than rebuilding it. Show `jobs.repair` here when non-null (§2.7).

---

## 7. Read-only → editable: the upgrade delta

v1 renders from the catalog and writes nothing. Because the catalog already
carries type, valid values, and range per key, the editable delta is genuinely
small — **but it is not trivial, and pretending otherwise would be the failure
mode.**

**Small (already paid for by v1):**
1. Per-key input widgets driven by the catalog's `type`/`enum`/`range` — a
   `<ConfigField>` switch, not per-key forms.
2. Client validation *is* the catalog's validation metadata — same source that
   powers the ⚠ Invalid badge.
3. Provenance badges already distinguish set vs default, so "Reset to default"
   is expressible: delete the key from the blob.

**Not small — must be built when editing lands:**
4. **A merge-safe partial write path — and this is a database task, not a
   frontend one.** Today's guard is "never write these columns at all". Editing
   means read-modify-write on a jsonb blob, which races the coordinator's SQL
   edits. A client-side blob rebuild from a UI that only knows the catalog's
   keys would **delete every key the catalog doesn't know about** — the exact
   `parseSourcing` bug (§3.3) turned destructive.
   PostgREST's default `PATCH` replaces a jsonb column **wholesale**; it cannot
   do a key-level merge. So this requires **a new SQL migration defining a
   `SECURITY DEFINER` RPC** (e.g. `set_channel_config_key(channel, path[],
   value, expected_updated_at)`) that performs the `jsonb_set` server-side,
   plus its RLS/grant story. **Schedule the migration before, not alongside,
   the UI work** — a builder cannot ship editing without it. *(Undersold in the
   first draft; caught by the independent review — see §12.)*
5. **Optimistic-concurrency check** on `updated_at`, or the coordinator's SQL
   writes get silently clobbered.
6. **An RLS decision** (§9.4).
7. **Confirmation for money keys.** `assembly_max_spend`,
   `generation_budget_usd`, `max_generated_clips` are money paths and per
   governance need a real gate, not an inline input.

**Recommended sequencing:** editable arrives per-group, cheapest-risk first —
`editing` (aesthetic, cheap to get wrong, instantly visible in a render) →
`script`/`research` → `sourcing` → `spend` last and gated. **Do not ship an
"edit everything" release.**

---

## 8. Build prerequisites

1. Regenerate `database.types.ts` (`editing`, `script` missing — §3.5).
2. Author `docs/contracts/channel-config-catalog.json` + a typed loader
   (interim, per §4.1).
3. Extend `route.ts` with the single new `config` tab member and the optional
   `&group=` param (§5 — existing tab keys unchanged, so no redirects needed);
   extend `route.test.ts` for `group` parsing and for `group` being dropped on
   non-`config` tabs.
4. Decide the `parseSourcing` fate: **replace**, don't extend (§3.3). It should
   become a catalog-driven generic reader.
5. A `jobs⋈episodes` per-channel selector + its unattributed-count companion.
6. `ControlRoom.tsx` is 3,224 lines. This adds meaningfully to it. Extract the
   workspace into its own component **before** adding tabs, or the file becomes
   unreviewable.

---

## 9. Pushback — where this ask is wrong, or where reality resists it

### 9.1 The IA is not the problem; do not redraw it

D-6 ratified the channel-first spine on 2026-07-02 and it shipped: Channels
index, clickable cards, per-channel workspace, deep-linkable URLs. A session
that "designs a channel-centric IA" from scratch would rebuild working,
reviewed, ratified UI. **The deliverable that satisfies the operator's intent is
content and provenance inside the existing IA**, plus two new tabs. §5 is
deliberately additive for this reason.

### 9.2 Fix the decoy fields in the same release, or don't ship

§3.4. Adding a truthful "Production config" tab next to a form that still
presents `source_ladder` and `fact_anchor` as live controls leaves the operator
with two contradictory answers to "what sources does this channel use?" — and
the wrong one is the editable-looking one. **Recommendation: same release,
demote those five to a read-only "Not used by the pipeline" section.** Deleting
the columns is a shared-surface migration and a separate coordinator decision.

### 9.3 Per-channel episodes are structurally incomplete — say so in the UI

`episodes` has no `channel`; attribution is via `jobs.channel`, null on 44% of
history (§2.6). Options: (a) accept and label — recommended for v1;
(b) backfill `jobs.channel` from episode naming conventions — lossy, guessy,
writes a shared table, **not** ours to do; (c) ask the pipeline to add
`episodes.channel` — the clean fix, cross-repo, and the natural companion to the
already-queued `episodes.correlation_key` work. **Recommend (a) now, file (c).**
Indexes on `jobs.channel`/`jobs.episode_id` are **not** needed at 116 rows;
revisit past ~5,000 jobs. Adding them now would be a shared-surface migration
for no measurable gain.

### 9.4 "Read-only v1" is not enforced by anything

`channel_profiles` grants full CRUD to every authenticated user (§2.8), and the
existing `ChannelProfilesPanel` **already writes** to that table today. So v1
read-only means "we add no new write path" — the coordinator's stated intent —
and **not** "the UI cannot write config". Worth stating plainly so nobody
mistakes it for a safety property. If a real guarantee is wanted, that is an RLS
change and a migration — a shared surface, coordinator's call (Q5).

### 9.5 The job-centric view is genuinely better for the daily loop, and must stay primary

The operator's daily work is *"what needs my approval right now"* — inherently
**cross-channel**. The Action Center / Runs / Review hubs answer that in one
place. Filing approvals under channels would force N channel visits to find M
parked jobs. The coordinator's ruling (b) — episodes appear in both places,
additive — is correct, and I'd sharpen it: **the channel episode list is for
*understanding a channel's history*; the global queue remains the place work
gets done.** No approval action should be *exclusively* reachable via a channel.

### 9.6 Provenance can only be partly truthful, by construction

~30 keys have an env layer that outranks the DB and is invisible to us (§2.1).
The dashboard can honestly say *"not set in the database; the pipeline default
is X, unless the worker env overrides it"* — it cannot say *"the effective value
is X."* Anyone expecting a guaranteed-accurate effective-config view will be
disappointed, and the design must not imply one. **The durable fix is
pipeline-side: have the worker write the resolved config into the episode's
evidence receipt at run start.** Then the channel page shows *configured*
values, and the episode page shows *what actually ran* — which is strictly more
useful for the incident case that motivated this work. **Recommend filing this
cross-repo** (Q6); it is the highest-leverage item in this document and it is
not ours to build.

### 9.7 Two of 116 jobs have ever reached `done`

30 hard errors, 31 `error` with `exhausted`/`blocked`, 48 parked awaiting
approval (§2.6). A beautiful channel-configuration browser does not move that
number. This spec is worth building — the operator's premise that invisible
config causes failures is supported by §3.4 — but it should be sized as
*diagnostic tooling for a pipeline that mostly does not complete*, not as the
thing that makes it complete. **If the operator must choose, the render-quality
work outranks this.** That is a product-direction call and therefore the
operator's (Q7).

---

## 10. Open questions — routed by who can actually answer them

The operator is a solo, non-technical founder (`AGENTS.md` §Project).
Governance reserves for them: **irreversible/external actions, money, brand &
legal, and product direction.** Database migrations, RLS policy, and cross-repo
contract mechanics are **not** operator questions — routing them there is
abdication, not deference. *(The first draft routed three technical decisions to
the operator; corrected after the independent review — see §12.)* Split
accordingly:

### 10.1 Operator-only (product direction / priority) — genuinely blocked on a human

- **Q1 — Priority (§9.7).** Only 2 of 116 jobs have ever reached `done`. Does
  this diagnostic tooling outrank render-quality work? **The only question here
  that can stop the build.**
- **Q2 — Scope of v1 (§6.3 vs the rest).** Minimum honest version is
  `tab=config` + provenance badges on the existing IA. The `tab=cost` episode
  list, the index-card metrics, and the identity drill-downs are separable.
  Ship the minimum first, or the whole thing? *(Recommendation: minimum first
  — it is the part that answers the actual complaint.)*
- **Q3 — Confirm the two provisional rulings.** Read-only v1, and episodes in
  both places. Both adopted throughout; both look right. Note §9.4 — "read-only"
  is a convention, not a guarantee.

### 10.2 Coordinator decisions — technical, with a recommendation attached

Answerable without the operator. Each carries a default so the build is not
blocked on a reply:

- **Q4 — The five decoy fields (§3.4).** *Recommend:* demote to a read-only
  "Not used by the pipeline" section in the same release. Dropping the columns
  is a shared-surface migration and should be a separate, later change.
  **This is the one that changes what v1 must contain.**
- **Q5 — The config catalog (§4.1).** *Recommend:* hand-authored dashboard
  catalog for v1 in the generated shape, with `pipeline_commit` +
  `generated_at` and a CI staleness check; file the cross-repo ask for a
  pipeline-emitted contract in parallel. Building against the shape now makes
  adoption a file swap.
- **Q6 — RLS on `channel_profiles` (§9.4).** *Recommend:* leave open for v1.
  The existing `ChannelProfilesPanel` already writes to this table, so
  tightening RLS is a behaviour change to shipped code, not a no-op. Revisit
  when editing lands, alongside the RPC in §7.4.
- **Q7 — `episodes.channel` (§9.3).** *Recommend:* accept-and-label for v1;
  file the cross-repo ask for a real `episodes.channel` column as the natural
  companion to the already-queued `episodes.correlation_key` work. Do **not**
  backfill `jobs.channel` by guessing.
- **Q8 — Resolved-config receipts (§9.6).** *Recommend:* file the cross-repo
  ask regardless of whether this build proceeds. It is the highest-leverage
  item in this document and it is pipeline-side work.

Q5, Q7, and Q8 are asks on **another team's repo**, so they go to the
Coordinator to sequence — not because they are hard, but because they are not
ours to schedule.

---

## 11. Independent review

Per `AGENTS.md` L-4 / governance rule 4, this Claude-authored spec requires a
**different-vendor** review before it lands. Reviewer: **Gemini**
(`scripts/gemini.sh`, `gemini-3.1-pro-preview`). Verdict recorded below.

Reviewers are asked to weight two claims above the rest, because the rest of the
spec leans on them:

1. **§3.4 — that `fact_anchor`, `treatment`, `source_ladder`, `packaging`, and
   `platforms` are read by no pipeline code path.** Established by grep over
   `src/pipeline`. A false negative here (e.g. a dynamic `raw.get(...)` lookup or
   a name-constructed key) would invert the recommendation.
2. **§2.1 — that there is no per-key merge with the `default` row.** The whole
   provenance model depends on it.

---

### Review record

**Reviewer:** Gemini (`gemini-3.1-pro-preview`) via `scripts/gemini.sh` —
different vendor from the author (Claude). Reviewed 2026-07-28 against the full
spec text plus the inlined survey evidence.

**Pass 1 — first draft: NOT PASS** (1 × P0, 2 × P1, 1 × P2). All four findings
were **verified against the repo before being accepted** (governance: a
REQUEST-CHANGES is not self-proving). All four held; three were accepted as
written, one was accepted with a corrected remedy.

**Pass 2 — re-audit of the revision: PASS WITH FINDINGS.** F1–F4 graded actually
resolved; no remaining P0/P1; one new P2 (field-count mismatch), fixed.

§12 records every finding, the verification evidence, and its disposition.

---

## 12. Review findings and dispositions

Each finding was checked against the repo before being accepted — per
governance, a REQUEST-CHANGES is not self-proving. Verification evidence is
recorded so a later reader can re-run the check.

### F1 — [P0] The tab rename was a breaking refactor sold as "additive" · **ACCEPTED, FIXED**

*Finding:* §5 renamed the `WorkspaceTab` union members `production→overview` and
`character→identity` while claiming "additive / nothing removed". `WorkspaceTab`
is a discriminated-union member driving render branches in a 3,224-line file;
renaming it is a wide refactor, and "add an alias map" understated it.

*Verified:* `WORKSPACE_TAB_LABELS: Record<WorkspaceTab, string>` is keyed by the
literals (`ControlRoom.tsx:154-159`), plus `workspaceTabRefs` (`:519`) and six
`scope.tab === "…"` branches. Finding correct.

*Disposition:* **fixed by dropping the rename entirely.** The keys stay; only the
`WORKSPACE_TAB_LABELS` display strings change. `config` is the single new union
member; `cost` is filled in rather than replaced. This also removed the need for
legacy-redirect machinery — strictly simpler than the draft. §5, §6.2, §6.4,
§6.5, §8.3 updated.

### F2 — [P1] `character` (text) was missing from the decoy analysis · **ACCEPTED, FIXED — with a corrected classification**

*Finding:* §3.4 listed five never-read fields; `buildChannelProfileUpsert` also
writes `character` (text), which the pipeline never reads. The review proposed
treating it as a sixth decoy.

*Verified:* the omission is real. **The proposed remedy is not.** The dashboard
reads `channel_profiles.character` in six places — `ControlRoom.tsx` `:815`,
`:1621` (Cast/Uncast), `:1623`, `:2679`, `:2723` (avatar initials), and
`ChannelProfilesPanel.tsx:131`. Demoting it to "not used" would break the Cast
chip and the channel avatars.

*Disposition:* **finding accepted, remedy corrected.** §3.4 now classifies all
thirteen written fields in a table with three categories — live config,
dashboard-owned display, decoy — and gives `character` its own "legacy link"
treatment plus a retirement condition (every row has a `character_id`). §6.3
updated to match. Recorded because a reviewer's *finding* and a reviewer's
*proposed fix* must be graded separately.

### F3 — [P1] Technical decisions were routed to a non-technical operator · **ACCEPTED, FIXED**

*Finding:* §10 sent schema migrations, cross-repo contract generation, and RLS
policy to the operator, whom `AGENTS.md` defines as non-technical and whom
governance reserves for product direction, money, brand/legal, and irreversible
actions.

*Verified:* correct, and it contradicted this spec's own §9 framing. Routing a
technical decision upward is abdication dressed as deference.

*Disposition:* **§10 restructured** into 10.1 (operator-only: priority, v1 scope,
confirm the two rulings) and 10.2 (coordinator decisions, each with a
recommendation and a default so the build is not blocked on a reply).

### F4 — [P2] The editable upgrade path understated the DB work · **ACCEPTED, FIXED**

*Finding:* §7.4 named a `jsonb_set`-style RPC but not the migration that must
define it; PostgREST's default `PATCH` replaces a jsonb column wholesale, so a
frontend builder cannot do key-level merges unaided.

*Verified:* correct — standard PostgREST behaviour, and no such RPC exists in
`supabase/migrations/`.

*Disposition:* §7.4 rewritten to state the migration explicitly, name the
`SECURITY DEFINER` RPC and its optimistic-concurrency argument, and require it be
scheduled **before** the UI work.

### F5 — [P2, re-audit] `character_profiles` field count did not match the table · **ACCEPTED, FIXED**

*Finding (second pass):* §3.4 said `buildChannelProfileUpsert` writes "thirteen
fields" while the table listed twelve.

*Verified:* the prose count is right and the table was short a row —
`buildChannelProfileUpsert` (`channelProfiles.ts:327`) returns `channel`,
`description`, `display_name`, `fact_anchor`, `treatment`, `character_id`,
`character`, `source_ladder`, `voice_archetype`, `packaging`,
`engagement_posture`, `length_target`, `platforms` = 13. The omitted row was the
`channel` primary key.

*Disposition:* `channel` added to the table as **Primary key / identity**.

### Not accepted

None. All five findings held on verification.

### Re-audit (second cross-vendor pass) — **PASS WITH FINDINGS**

Governance requires that a fix prompted by review be re-audited, not
self-blessed. The revision was therefore sent back to the same independent
cross-vendor reviewer (Gemini, `gemini-3.1-pro-preview`) as a re-audit, with the
original findings and the author's verification evidence attached.

**Result:** F1–F4 all graded *actually resolved, not papered over*. **No
remaining P0 or P1.** One new P2 (F5 above), now fixed. The reviewer separately
confirmed the F2 reclassification was the factually correct engineering call
rather than a rationalisation — the point on which the author had overridden the
reviewer's proposed remedy.

**Standing:** two independent cross-vendor passes, second verdict PASS WITH
FINDINGS, all findings dispositioned. The only change made after that verdict is
F5's one-row table fix, which the reviewer itself specified. **This spec is
ready for the Coordinator to act on.** It remains a spec — no UI was built this
round, and §10.1 must be answered before a build starts.
