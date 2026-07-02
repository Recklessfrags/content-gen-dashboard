# Dashboard roadmap — scoped upcoming work

_Author: Architect (Claude). Last updated **2026-07-01**. The durable, maintained scope of
what's coming for the dashboard (the "Character Control Room"), so it isn't only living in HQ
threads. Pairs with `DIRECTION.md` (product ground truth: focused control tool, not a kanban)
and `docs/SESSION-HANDOFF.md` §4 (near-term "what's left"). Cross-contract items are the ones
that touch the shared Supabase seam the pipeline reads/writes; flag those early. Reviewed via
the Rule-9 cross-vendor gate (2026-07-01 architecture review — 4 gaps below folded in)._

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
5. **Channel-onboarding auto-fill** _(future surface; DIRECTION being corrected)_
   - Per-channel **GUIDELINE** selection fields only (archetype/audience/hook-mix/vocab).
     Craft **MUST-DOs** are enforced by pipeline graders/sentinels — **never editable
     dashboard fields** (or a user drifts away from the law). Research per **sub-niche +
     archetype**, not broad genre; add staleness triggers.
   - The **channel-researcher is operator-invoked** (dashboard-side), outputs a cast brief
     into the Casting Studio, and **never writes `characters`**.
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
