# Dashboard roadmap — scoped upcoming work

_Author: Architect (Claude). Last updated **2026-07-06**. The durable, maintained scope of
what's coming for the dashboard (the "Character Control Room"), so it isn't only living in HQ
threads. Pairs with `DIRECTION.md` (product ground truth: focused control tool, not a kanban)
and `docs/SESSION-HANDOFF.md` §4 (near-term "what's left"). Cross-contract items are the ones
that touch the shared Supabase seam the pipeline reads/writes; flag those early. Reviewed via
the Rule-9 cross-vendor gate (2026-07-01 architecture review — 4 gaps below folded in)._

## Operator directives — 2026-07-06 (queued; recorded per operator "this all needs recorded somewhere")

These are captured for durability, not yet specced/built. Each names its open questions + whether it needs research
and/or a pipeline dependency. **None are started.** Priority is the operator's to set; near-term build is still 5g.

1. **Render-quality tier selector — cheap / medium / high** _(NEEDS RESEARCH · cross-team — pipeline owns the quantifiers)._
   Operator wants a simple 3-way quality/cost toggle on a run. **The mechanic exists in embryo:** enqueue already carries
   `episode_cap` + a recipe (`provenRender` = `stub_upstream:true`/cap 2 vs `fullEpisode` = full/cap 5) — but "cheap/medium/
   high" is a NEW, richer axis. **Open questions the research must answer (mostly pipeline knowledge):** what worker knobs
   actually move cost×quality (model tier per stage — script LLM, voice model e.g. `eleven_ttv_v3` vs default, image/video
   gen tier, render resolution/fps, stub-vs-full, episode_cap, retry/escalation budget)? what are the concrete quantifier
   values for each of the 3 tiers? what does each tier COST (so the UI can show it) and what quality delta does the operator
   actually get? is this per-run, per-channel default, or both? does it map to existing `channel_profiles`/`jobs` fields or
   need a new one (shared-seam → coordinate)? **Purpose/UX still fuzzy — the operator flagged "I'm missing key details about
   how it functions and its purpose."** → Route as an HQ research ask to pipeline for the knob→cost→quality mapping, THEN
   spec the dashboard selector. Do NOT invent quantifiers dashboard-side.
   - **1a. Cost estimation + self-calibrating estimator (operator refinement 2026-07-06).** The selector should show an
     estimated **$ range per run** as a decision lever, keyed **per channel** (generation intensity is a channel property —
     `channel_profiles.source_ladder`/sourcing = stock vs generated → "all-gen / some-gen / no-gen" channels have different
     cost curves). **Telemetry already exists:** `receipts` logs, per run stage, the `model` · `provider` ·
     `effort_requested`/`effort_used` · `spend_so_far` (cumulative) · token counts — i.e. a running per-worker model log is
     already emitted (verified live 2026-07-06: `script_writer`/`researcher`/`fact_check` = `claude-sonnet-4-6`,
     `visual_router` = `claude-haiku-4-5`/`gemini-2.5-flash`, `assembly` = provider `assembly`/model `adapters`). Empirical
     baseline today: median ~$0.11/episode, avg ~$0.17, max ~$0.45; render (`assembly`) ~$0.19/item is the dominant lever,
     LLM script/voice ~$0.018 is near-noise. **The build (dashboard-side, on top of that telemetry) is a calibration loop:**
     (1) a per-(channel, tier) cost model = expected stages × model × unit cost; (2) **store the estimate at enqueue** (new —
     nothing records an estimate today); (3) reconcile estimate vs actual from `receipts` after the run; (4) a **periodic
     audit** (every N runs) recomputes each channel×tier coefficient from recent actuals so the range tightens as variance
     data accumulates. **Recommended-default rule:** now (no perf data) = cheapest tier whose historical quality-gate pass
     rate ≥ threshold ("cheapest that doesn't fail"); later = best **cost-per-retained-view** per channel (needs the deferred
     retention-metrics loop). Always show *why* a default is recommended; default is per-channel + overridable.
   - **1b. Two pipeline dependencies for accurate per-channel cost (HQ ask extended 2026-07-06):** (i) **channel
     attribution** — `receipts`→`episodes` carry no reliable channel (the standing `jobs.channel` mismatch: ~2/52 tagged, as
     `weird_food`); per-channel cost is untrustworthy until runs are consistently channel-tagged — this gates the whole
     channel-keyed estimator. (ii) **generation-cost granularity** — the expensive `assembly` stage logs a generic model
     `adapters`, not *which* generator (Higgsfield/Pixabay/stock) or per-clip unit cost; ask pipeline to break the adapter
     receipts out so gen spend is attributable. (iii) a **unit-cost/price list** per model/generator so a tier can be priced
     BEFORE it has run history (LLM $/token is partly derivable from receipt deltas + token counts; gen/render needs pipeline).
   - **1c. Empirical estimator — ✅ SHIPPED (2026-07-06, #TBD).** `RunCostEstimate` card in the Cost center: pure
     `estimateRunCost()` (`src/lib/costEstimate.ts`, 10 unit tests) over historical per-episode spend
     (`costStats.episodeCosts[].liveSpend`) → a $ range per run (median..p90 × episodes-per-run), reactive cap input. Live
     ratify: $0.54–$2.15 (typical $0.82) for a 5-episode run. Shipped ahead of the full tier selector as the early decision
     lever. Follow-ups: filter by recipe/character/channel (channel once tagging lands); an inline hint in the enqueue flow.
2. **Per-channel video-idea generator panel — keep / discard / edit** _(NEEDS WORKSHOP + RESEARCH · dashboard surface with a
   generation-path dependency)._ A panel, scoped per channel, that generates candidate video ideas the operator triages
   (keep → seeds an `ideas` row / discard / edit-then-keep). **Ties directly to sub-lane 5b's Ideas hub** (kept ideas land
   in the same `ideas` table + enqueue path). **Open questions:** what seeds generation (channel concept + character +
   the content-retention craft research + past performance)? how many candidates per batch? **Depends on the still-open
   "sanctioned dashboard generation path" decision** (edge-proxy vs pipeline endpoint — same family as bible-autogen / E2
   guideline-fill / 2b visual-gen; see the Ledger + `slice-bible-autogen.md`). → Workshop the UX + decide the generation
   path (one decision unblocks the whole autogen family), then spec.
   - **2a. Generation-path direction — operator scoping (2026-07-06, from the pipeline session).** The "sanctioned dashboard
     generation path" is being answered as **isolated pipeline leaf-capabilities the dashboard can invoke**, NOT a from-scratch
     dashboard generator. Operator ruling + pipeline agreement: **voice is already isolated** (the dashboard Character Studio
     casts it), so the dashboard sandbox is just **two** capabilities — **script** (generate/lock a script for an idea) and
     **generation** (produce test clips). The rest of the pipeline spine has heavy upstream deps and is **not** worth isolating
     ("not every worker"). **Pipeline will spec those two isolated capabilities** when it gets there. Impact on the dashboard:
     item 2's idea-generator gets its generation dependency resolved (call the isolated `script` capability to draft/lock an
     idea's script; call `generation` for a preview clip), and the render-quality tier selector (item 1) gets a natural
     **"test clip" preview** mechanism via the isolated `generation` capability. Blocked only on pipeline delivering the two
     sandboxed endpoints/contract; watch HQ.
3. **Niche channel idea workflow** _(NEEDS WORKSHOP + RESEARCH)._ A guided flow for taking a niche/sub-niche and working it
   into a viable channel (concept → character → guidelines → first ideas). Overlaps the deferred **channel-onboarding E2**
   (guideline auto-fill) + the operator-invoked **channel-researcher** (item 5 below) + item 2's idea generator. → Workshop
   how these compose into one coherent "start a channel from a niche" journey before specc­ing; likely research per
   sub-niche + archetype (per the frozen onboarding decision — research narrow, not broad genre).
4. **Deferred future suite — analytics · monetization · social posting · performance ranking + A/B** _(DEFERRED per operator)._
   The envisioned end-state: per-channel **analytics** + **monetization** panels; **social-media posting integrations**;
   channels **ranked on performance** with **insights on how to improve poor performers**, plus **A/B testing**. All deferred
   for now. **Hard dependency (already an open HQ ask):** every performance/analytics/ranking/A-B feature is blocked on the
   **pipeline surfacing per-episode retention/performance metrics** (views, avg view duration, completion, retention curve) —
   this is the "retention feedback loop" already tracked (`docs/research/content-retention-and-competitors-2026-07-05.md`,
   HQ tracker). Posting integrations = OAuth sync, which the roadmap deliberately keeps OUT of the app until data exists
   (low-ops stopgap = no-code dump to a sheet — see "Tier-3 ROI table" below). Record only; no build.
   - **4a. Per-worker reliability + failure attribution (operator-confirmed 2026-07-06) — BUILDABLE NOW, no pipeline dependency.**
     The pipeline already records rich error telemetry the dashboard reads: **`jobs.status`** (live: 42 `error`, 12
     `ready_for_review`, 2 `stale`, 2 `done`) + a **`jobs.error`** text column + **`jobs.park_kind`**; and per worker,
     **`receipts.verdict`** (`pass` 336 · `retry` 86 · `approval_required` 13 · `blocked` 9) + a **`receipts.reason`** that
     names the stage and cause. Real failure buckets (live 2026-07-06): **credential/config** — `voice_direction`/`assembly`
     → ElevenLabs `401 Unauthorized`, `assembly` → Higgsfield `KEY_ID:KEY_SECRET` malformed / `521` (the worker-config issues
     pipeline flagged as blocking a proven render — env fixes, not model failures); **quality-gate retries (by design)** —
     `script_writer` word_count out of range / "YELLOW claim used without its on-screen receipt" / "new claims introduced";
     **provider schema** — `visual_router`/`script_writer` Gemini output failed ShotList/Script schema; **approval parks (not
     failures)** — `fact_check` YELLOW sign-off, `distribution` publish approval, `assembly` cost-guard pre-spend. → **Two
     buildable-now surfaces on this existing telemetry** (like the empirical cost estimator, no pipeline dependency): (i) a
     **"why did it fail / which worker" drill-down** — ✅ **SHIPPED (2026-07-06, #TBD)** as the **Runs hub** (`?hub=runs`,
     `RunsHub.tsx`): lists runs, each errored/stale/parked one shows `jobs.error` + expands to a lazily-loaded per-worker
     breakdown from `receipts` (stage · verdict · reason · model). Live ratify loaded a 9-stage per-worker log for an errored
     run. (ii) **per-worker/model/tier reliability** in the analytics layer — retry rate, block rate, and **retry-cost** per
     stage/model (a "cheap" model that retries 3× isn't cheap → feeds the cost-vs-quality estimator, item 1) — NOT yet built;
     the aggregate/rollup view is the next increment on the same telemetry.

### Roster correction (2026-07-06) — affects the channel_profiles roster ask
- **Grandma Pearl is NOT a dark-history channel.** Operator's definition: **a grandmother who reads daily Bible verses and
  gives insight / asks reflective questions about them.** This corrects the earlier HQ roster-ask framing (which lumped her
  with Mad Dog's dark-history posture). Her `engagement_posture` dials are therefore wholesome/`fact_first`-leaning, NOT the
  dark-history posture — but the exact GREEN/YELLOW/RED posture is still an **operator brand/legal call** (rule 20). Relayed
  to pipeline in HQ so the drafted roster values for Grandma Pearl reflect the correct concept. (Mad Dog dark-history stands.)
- **Roster INCOMING (2026-07-06, from the pipeline session).** Pipeline is executing the "deliver the full corrected roster"
  option — expanding its roster doc to **all six §5 channels with the Grandma correction**. So the `channel_profiles`
  row-creation blocker is about to lift: when pipeline hands over the final per-channel values (the three non-`fact_first`
  posture dials still need the operator's GREEN/YELLOW/RED sign-off, either confirmed up front or flagged "pending operator"),
  **the dashboard creates the rows via Supabase MCP** (WE insert; pipeline reads). Next dashboard session: check HQ for the
  delivered roster and create the rows once the posture dials are signed off.

## Cross-contract items (touch the shared seam — coordinate before building)

1. **Casting phase-2 — visual identity** — ✅ **2a SHIPPED** (2026-07-01, PR #38;
   `dash_0003` live + VALIDATED; upload→lock in production; signed-URL render).
   **2b RULED (operator, 2026-07-02, after a neutral 3-option steelman): in-dashboard
   candidate generation (capped proxy, bible-driven prompts, no-real-person/copyright
   guardrails) is the chosen shape — DEFERRED** until a parallel build lane can absorb
   it or a concrete useful moment appears (also reopened by roster scale or external
   designer batches). 2c image-to-video stays pipeline-owned. Original scope:
   - `dash_*` migration: `reference_image_url` + `visual_style` columns on `characters`.
   - Private, owner-scoped `character-refs` storage bucket; worker reads via service role;
     Assembly consumes the locked image as `locked_character`.
   - **Provider decision is likely moot** — the strongest reviewed option is a "dumb
     receiver": operator generates the image anywhere (Midjourney/Gemini/Higgsfield in a
     browser) and the dashboard just **uploads → locks the URL**. No in-dashboard gen API.
   - ⚠️ **Gap (review 2026-07-01):** a private bucket means the frontend must render via a
     **signed URL** (Supabase client), not a public `<img src>`.
2. **Casting — `voice_templates`** _(IN BUILD 2026-07-01 —
   `docs/slices/slice-casting-voice-templates.md`; EL key-scope gap resolved: two-key
   split verified viable on ONE workspace, HQ)_
   - NEW dashboard-owned `dash_*` config table (like `channel_profiles`), **not** rows in
     `characters`. On lock, copy the recipe into the character record (immutable provenance).
   - Two-ElevenLabs-key split: dashboard = full Casting key (design+create, operator-gated);
     worker = TTS-only key. Seed the library from real designed voices only (browsing burns
     Voice Design credits otherwise).
   - ⚠️ **Gap (review 2026-07-01):** cloned/custom voices are **account/key-scoped** — a
     worker TTS-only key on a *different* account can't synthesize a voice the Casting key
     created (`voice_id not found`/401). **Verify EL key scopes / shared workspace before
     building the split.**
3. **channel_profiles — ADR-005 dial enforcement badge-flip** — ✅ **DONE**
   (2026-07-01, PR #40): pipeline shipped enforcement (their PR #38); badge now reads
   "Active — enforced pipeline-side." Note: `jobs.channel` (their `0018`) is
   file-only, NOT applied — our enqueue must keep omitting `channel` until the
   operator applies it.
4. **Per-character cost (Tier-2) + episode↔character drill-down** _(pipeline-gated data)_
   - Reads `episodes.character_id` (schema live; 0 rows until the pipeline runs a
     character-linked episode — Mad Dog → Acoustic Kitty). Fills in for free at that run.
5. **Channel-onboarding auto-fill** — **hold LIFTED 2026-07-02** (voice-work precondition
   met). Decomposed + specced in `docs/slices/slice-channel-onboarding.md`. Status:
   **E1 (on-creation persona auto-suggest) ✅ SHIPPED** (PR #58 — curated pure mapping →
   advisory hint, 10/10 gates); **E2 (guideline auto-fill editor) DEFERRED** (blocked on
   the unbuilt channel-researcher + undecided cast-brief storage). The operator has more
   channel ideas queued. Original scope: _(future surface; DIRECTION being corrected)_
   - Per-channel **GUIDELINE** selection fields only (archetype/audience/hook-mix/vocab).
     Craft **MUST-DOs** are enforced by pipeline graders/sentinels — **never editable
     dashboard fields** (or a user drifts away from the law). Research per **sub-niche +
     archetype**, not broad genre; add staleness triggers.
   - The **channel-researcher is operator-invoked** (dashboard-side), outputs a cast brief
     into the Casting Studio, and **never writes `characters`**.
   - **Auto-suggest a Casting-Card persona on channel creation** — **✅ SHIPPED as E1**
     (PR #58; curated-only was chosen per the frozen §3 decision — no LLM/spend). Curated
     pure mapping `src/lib/suggestPersona.ts` (channel fields → `PERSONA_BANK` chip) →
     advisory hint in `ChannelProfilesPanel`; mapping table is operator-redlinable data.
     The LLM-generated ("AI-expand / punch-up") variant stays **phase-2 deferred**
     (`slice-casting-voice-upgrade.md` §3); **E1.b** (seed the chip into the Casting Studio
     for a channel-linked character) deferred — the character↔channel link is loose today.
   - ⚠️ **Gap (review 2026-07-01):** the cast brief's **storage destination is undecided** —
     if it lands in a `channel_profiles` jsonb column the worker reads, that's a seam +
     migration item. Decide when scoping onboarding.
6. **Thumbnail / packaging** _(future surface; pipeline sends a proposal first)_
   - Packaging-first (title + thumbnail decided *with* the script).
   - ⚠️ **Gap (review 2026-07-01):** needs a **`status` gate** (e.g. `pending_operator_
     approval` → `locked`) so the worker pauses for approval — mirrors the `jobs` approval
     pattern; likely pipeline-owned, flagged so it isn't missed.

## Dashboard-only items (no shared seam)

- **ControlRoom decomposition** → feature hooks — ✅ **DONE** (PRs #26/#29/#30).
- **#37 live Runs/queue** — ✅ **SHIPPED** (2026-07-01, PR #38): 5s poll **only while
  the operator is actively viewing** Queue/Runs (pauses on hidden tab / other views /
  open overlays) — the idle-query concern this item flagged is addressed by gating,
  not by a slower interval (≈0 idle queries; ratified with bridge-counted requests).
- **Tier-3 ROI table** — furthest out; needs videos published live **and** a per-platform
  analytics-ingestion service (OAuth + sync). Deferred (keep OAuth integrations out of the
  app; a no-code dump to a sheet is the low-ops stopgap when data exists).

## Shared-seam hardening (from the 2026-07-01 architecture review)

The team's #1 integration failure is **jsonb key-shape mismatch** across the two-repo seam.
Cheapest high-value fix, **repo-structure-agnostic**: add **`pg_jsonschema`** (Supabase-
supported) `CHECK (json_matches_schema(...))` constraints on shared jsonb columns so Postgres
rejects a bad shape whoever writes it. Plus share generated Supabase types. This captures most
of a monorepo's benefit without the migration cost or the loss of per-repo agent
context-scoping — see the HQ "Q1/Q2 reads" page.

**OPERATOR DECISION (2026-07-01): GO.** Keep two repos + `pg_jsonschema` DB-CHECK + shared
generated types; **defer** a cross-repo coordinator. Fold `pg_jsonschema` into the **first
Casting migration** (Casting 2a) — the DB becomes the enforced contract.
⚠️ **Deployment-sequencing safeguard (both-vendor review caught this; now required):**
`pg_jsonschema` protects the DB but a mis-ordered deploy makes the lagging repo throw 500s
once the CHECK lands. Pair every shared-seam migration with **expand/contract choreography** —
**add-nullable → backfill → enforce** (never a breaking change in one step), **additive-first
deploy order** so old readers/writers keep working, **negative contract tests**, and
**versioned rollout notes**. Critical during the Casting burst (~4 new shared surfaces).
EL two-key split is **verified viable** on ONE workspace (failure mode is different-account
only — keep both keys same workspace).

## Sequencing read (not a commitment — operator sets priority)

Lowest-effort / highest-alignment first: **Casting 2a (dumb upload-lock)** → the pipeline
closing the loop with a real **character-linked run** (unblocks Tier-2 data) → **#37 light
polling** → later: `voice_templates`, onboarding, packaging. `pg_jsonschema` hardening can
ride alongside the next `dash_*` migration (Casting 2a).
