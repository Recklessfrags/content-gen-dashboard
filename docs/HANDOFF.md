# HANDOFF — repo memory

> Per `AGENTS.md` rule 1: **the repo is the memory.** Not written here = didn't
> happen. This file is the running state of the project.

_Last updated: 2026-06-28 — Architect (Claude). Slices 1–4 shipped + ratified
(drill-down, version history, Overview, Cost Box) + red-diagonal hotfix, then
**promoted to production** (merge `00d5fcc` → default branch `claude/new-session-3l99vs`;
production deploy READY at `content-gen-dashboard.vercel.app`)._

> **New chat picking this up? Start with [`docs/SESSION-HANDOFF.md`](SESSION-HANDOFF.md)**
> — current state, operational gotchas, and exactly what's left to finish. This file is
> the full running history.

## Provenance caveat (read first)

The foundation in this repo was **built directly by a Claude Code session acting
as a solo builder**, not through the Architect→Designer→Builder loop in
`AGENTS.md`. This violates the separation of powers (Claude is Architect-only;
Codex builds and commits) and was not surfaced as a disagreement before building
(rule 3 miss). It is recorded here so the loop can decide how to treat it.

Consequence for the gates: the same actor **built and verified** the foundation,
which trips "no one grades their own work" (rule 2). The verification below is
real (live-DB checks genuinely pass) but is **not independent**. Slice 1 exists to
get that independent ratification.

From this point the Claude session operates **Architect-only**: judgment and
artifacts (specs, gates, contracts, briefs), no app code, no app-code commits.
(Docs/markdown are committed by the Architect as a deliberate, human-approved
exception so they survive the ephemeral container.)

## What exists in the repo

- Next.js (App Router, TS) port of the `character-control-room` prototype:
  `src/app`, `src/components/ControlRoom.tsx`, `src/app/globals.css` (design tokens
  ported verbatim).
- Supabase auth via `@supabase/ssr`: `src/lib/supabase/{client,server,middleware}.ts`,
  root `middleware.ts` (route gating), `src/app/login` (email/password).
- Data layer: characters CRUD, ideas quick-capture + tag + status cycle, Runs
  reads `episodes`.
- `supabase/migrations/0001_init.sql` — schema + RLS (see data contract).
- Stack verified: **Next.js 15.5.19, React 19, @supabase/ssr 0.5.x, supabase-js 2.x.**

## What exists in the live DB (`reels-content` / `tyeejhaknqkeftjykqog`)

- Dashboard tables `characters`, `ideas` created with owner-scoped RLS.
- Pipeline tables `episodes`, `receipts` were **already present** (pipeline-owned);
  read-only policies added. **Not altered.**
- Seed: 2 characters (Mad Dog McGrath = active, Grandma Pearl = draft), 4 ideas,
  1 **demo** episode (`episode_id = demo-cottage-cheese`, safe to delete) + 1 receipt.
- Auth user `cameronnicodemus@gmail.com`. **The QA password is NOT stored in the repo**
  (was reset 2026-07-01; the old hardcoded value here is dead). A fresh session gets it from
  the environment, not a tracked file: set `RATIFY_EMAIL` / `RATIFY_PASSWORD` (the ratify
  harness reads them) or a gitignored `.env.local`, or have the operator paste it at session
  start. Login verified via GoTrue password grant. See `docs/SESSION-HANDOFF.md` §2/§3.

## Verification performed (NOT independent — see caveat)

- `npm run build` clean; production server smoke test: unauth `/` → 307 `/login`,
  `/login` renders.
- Live RLS checks: authenticated user reads exactly 2 characters / 4 ideas / 1
  episode; **anon reads `[]`** on `characters` and `episodes`.

## Slice 1 — results (2026-06-28)

The loop ran end-to-end through real tooling (Codex CLI + Gemini CLI, API-key auth):

- **Designer (Gemini 2.5-pro):** produced `docs/design/slice-1-audit.md` — flagged a
  contrast failure on `--paper-faint`, sub-24px target sizes on `.statusbtn`/
  `.tag-select`, and an `outline:none` focus inconsistency on form inputs.
- **Builder (Codex):** implemented the fixes + the D-1 Runs "operation-wide" note.
  Codex **could not commit** (`.git` is read-only inside its sandbox — the intended
  builder protection); it produced reviewed edits only.
- **Architect:** reviewed the diff, ran `npm run build` (passes), APPROVED, and
  merged as the Codex-authored commit `afa3ac5`.

Changes: `--paper-faint #6E6A5F→#8A8475`; `.statusbtn`/`.tag-select` min 24px target;
restored `:focus-visible` on inputs; Runs operation-wide note.

**Limit (honest):** the loop could **not** run the *in-browser* gate checks
(gates 2–4 data interaction; gate 7 visual). Headless Chromium cannot egress
through the agent proxy (`ERR_CONNECTION_CLOSED`), so those still need a human or a
browser environment with real network. Gemini's audit is a code-level independent
review, not a rendered-pixel check.

## Slice 1 — INDEPENDENT RATIFICATION (2026-06-28, Architect session)

A **separate Claude session, Architect-only** (not the foundation's solo-builder,
not Codex) ran the previously-missing in-browser gate checks against the **live
`reels-content` DB**, closing the independence gap from the provenance caveat.

- **All seven gates now PASS or ratified** (G5 = human-ratified exception). Full
  evidence + method in `GATES.md`. Headlines:
  - **G1** independently re-confirmed at the REST layer: anon reads `[]`; anon
    insert → 401 RLS violation; anon update hit 0 rows (data unchanged); authed
    reads 2 chars / 4 ideas / 2 episodes.
  - **G2** bible jsonb round-trip is **byte-identical** across a hard reload, even
    with escapes/braces/emoji/newlines in the values.
  - **G3** no field bleed across character switches (per-id local state correct).
  - **G4** idea capture + tag + channel + status-cycle all persist across reload.
  - **G7** 320px no overflow; 2px brass `:focus-visible` outline on every control;
    reduced-motion zeroes transitions; small controls ≥ 24px.
- **Method caveat (honest):** headless Chromium still can't TLS-egress through the
  sandbox proxy (CONNECT opens; MITM-CA handshake aborts). The app ran as a real
  `next build`/`next start`; browser→Supabase calls were **bridged through Node's
  proxy-aware fetch** (`page.route`) so the real `ControlRoom.tsx` client code ran
  unmodified — only the transport hop was forwarded (carrying the real JWT, so RLS
  applied). This is independent of the original builder; the **human still owns the
  final ratification sign-off**.
- **Seed left clean:** test edits restored; test idea deleted; verified 2 chars
  (Mad Dog active / Pearl draft) + 4 ideas remain.
- **Residual (non-blocking → Slice 2 polish):** `.login-card input:focus` still
  uses `outline:none`; login inputs show focus only via border-color change.

## Pending / not done

- **P-1 Vercel deploy — DONE (with caveats).** Human imported the repo; Vercel
  Git integration auto-deploys `claude/new-session-3l99vs` (GitHub default branch),
  both commits **READY** in production (project `content-gen-dashboard`, team
  `canicode`/`team_ZdMtQu9H5HYrMPFTf4TL0fC1`). Verified: root→307 `/login`,
  `/login` 200 → **server env present**. NOT verified independently: the in-browser
  client data-load (sandbox blocks Chromium through the agent proxy —
  `ERR_CONNECTION_CLOSED`); confidence is high because middleware uses the same two
  `NEXT_PUBLIC_*` vars at runtime and works. **Two human follow-ups:** (a) the site
  sits behind **Vercel Deployment Protection** (Settings → Deployment Protection) —
  turn it off to make the app publicly reachable (the app has its own auth);
  (b) log in once to confirm the Roster loads Mad Dog/Pearl and Runs shows the demo
  episode. If the Roster spins on "Loading…" forever, the `NEXT_PUBLIC_*` vars were
  not applied to the build → confirm both are set for Production and redeploy.
- **P-2 Independent review** of gates 2,3,4,7 in a real browser (Slice 1) —
  **DONE** by the Architect session via the Node-fetch bridge (see ratification
  section above). Only the **human final sign-off** remains.
- **P-1 G6 public-URL check — DONE (2026-06-28).** Human lifted Vercel Deployment
  Protection; Architect verified the **live public URL** end-to-end:
  `content-gen-dashboard.vercel.app` → real login → Roster loads Mad Dog + Pearl,
  Runs shows real episodes, browser hit live `characters`/`ideas`/`episodes`
  endpoints (proves the `NEXT_PUBLIC_*` env vars are applied to the prod build).
  Same Node-fetch bridge method (Chromium still can't TLS-egress the sandbox proxy);
  the deployed app + its server-action login ran for real.
- **Slice 2 — IN PROGRESS.** Spec + Designer brief + Builder block in
  `docs/slices/slice-2-deferred-features.md`. Multi-user teams, analytics, and
  publishing remain deferred beyond Slice 2.
  - **W-A run/receipt drill-down — DONE + RATIFIED (2026-06-28).** Ran the real
    loop: Designer (Gemini) → `docs/design/slice-2-drilldown.md`; Builder (Codex)
    → read-only slide-over drill-down (commit by Codex, Architect-reviewed +
    build-verified); Architect ratified in-browser against the live DB. Evidence:
    3 run cards (buttons), drill-down `role=dialog` shows receipts in seq order
    (researcher→fact_check→gate→script_writer) with verdict coding, effort/clamped,
    accumulated spend, reason, and expandable evidence/result JSON; Esc closes +
    focus returns; **zero mutations to pipeline tables** (read-only confirmed);
    320px ~no overflow (1px rounding). S2-1, S2-2 PASS; S2-6 (login-focus fix +
    contrast) and S2-7 (build clean, no migration) PASS for W-A.
  - **W-B bible version history — DONE + RATIFIED (2026-06-28).** Human ruling **D-4**
    approved the data-contract amendment adding dashboard-owned `character_bible_revisions`
    (migration 0002; owner-scoped RLS; insert+select only / immutable; no pipeline
    tables). Ran the real loop: Gemini designed (`docs/design/slice-2-version-history.md`),
    Codex built (migration + revision-on-save + history drawer/preview/restore;
    Architect-reviewed + build-verified), migration applied to live DB. Independent
    reviewer agent: APPROVE WITH NITS; its one MAJOR finding (dual focus-trap on
    restore-from-drawer) was fixed (commit `9801462`) and re-verified. Architect
    ratified in-browser: empty→2 revisions newest-first; preview read-only; restore→
    unsaved draft→save → 3 revisions persist; **zero pipeline-table writes**; anon
    blocked on the new table (read `[]`, insert 401). Test data cleaned; seed restored.
  - **Slice 2 is CLOSED.** All S2 gates PASS (`GATES.md`). Human authorized autonomous
    execution with independent-agent review standing in for immediate grading; human
    does the final sign-off on return.
- **Slice 3 — DONE + RATIFIED, CLOSED (2026-06-28).** Read-only **Overview** view
  (`docs/slices/slice-3-overview.md`). Full loop: Gemini designed
  (`docs/design/slice-3-overview.md`), Codex built the `OverviewDashboard`
  (aggregates from already-loaded state; commits `7019c3e` + fix `b46f27e`),
  Architect reviewed/build-verified/merged. Independent reviewer agent: APPROVE
  WITH NITS (all 6 S3 gates PASS); its 2 LOW findings (unguarded `sentinels`,
  case-sensitive status grouping) fixed + verified. Architect ratified in-browser:
  every aggregate matched the live DB (chars/ideas/episodes counts, spend $0.14,
  avg $0.05, pass-rate 67%), with **zero writes and zero new reads**. Chosen as the
  one next step inside the ratified framing needing no direction call.
- **Slice 4 — DONE + RATIFIED, CLOSED (2026-06-28).** Read-only **Cost Box** (Tier 1
  spend governance) from the human's brief. Full loop: Gemini designed, Codex built
  (commit `16c7518`), Architect reviewed/build-verified/merged, independent agent
  APPROVE WITH NITS (9/9 S4 gates PASS), Architect ratified in-browser vs SQL:
  running total **$0.1656** (== UI $0.17), by-provider anthropic 100% / google 0% /
  deterministic 0% (delta-sum, not cumulative), per-episode incl. an IN-FLIGHT running
  job, **zero writes**, and S4-9 Overview total now equals the Cost total (shared
  `max(spend_so_far)` source). Asset spend NOT logged by pipeline yet → shipped
  LLM-USD-only with a disclosure note (flagged pipeline gap); cap parked (no readable
  config). **by-API built; by-character DEFERRED** to D-1 (no `character_id`) as a
  disabled seam. Cosmetic nits accepted (provider % rounding; a money-format label).
- **Cost tiers remaining:** Tier 2 (per-character cost) unblocks at the Acoustic Kitty
  / D-1 `character_id` landing; Tier 3 (ROI) waits on publishing + analytics ingestion
  (per the Notion 'ROI table — SCOPE CORRECTION': analytics deferred, not killed).
- **Next slices need a human direction call (D-2 / `DIRECTION.md`).** Multi-user
  teams, publishing, external/SEO analytics, and idea→pipeline linkage (the last
  also needs a cross-repo write to the pipeline-owned `jobs` table) are deferred
  pending that ruling — see `docs/slices/slice-3-overview.md` → "Deferred".
  - Loop tooling note: this session's injected `GEMINI_API_KEY`/`OPENAI_API_KEY`
    are wrapped in literal `<>` brackets (invalid); valid keys supplied at runtime.
    Codex also needs `codex login --with-api-key` (it ignores the env var).

## Contract hygiene — jobs write-contract frozen + runtime label (2026-06-29, Architect)

Audit risk #9 (stale in-repo `jobs` contract) + #10 (`runtime` editable-vs-measured)
addressed in the docs lane:

- **`docs/contracts/data-contract.md`** now has a full **`jobs`** section: a new
  ownership class **"Pipeline-owned, dashboard-enqueue"**, the dashboard-settable INPUT
  fields vs. worker-owned lifecycle columns, the enqueue-only RLS (`jobs_read` +
  `jobs_enqueue`, WITH CHECK), the spend/publish approval flow (fresh row, omit
  `idempotency_key`, both-true for publish "approve & go"), the live-re-render caveat,
  and the **migration namespacing** rule (dashboard `dash_NNNN_*`; pipeline bare
  `NNNN_*` — `jobs` policies are pipeline-owned in `0013`/`0014`/`0015`, NOT in this
  repo). Source of record stays the pipeline repo + the HQ contract thread (2026-06-29);
  this is a mirrored frozen reference.
- **`DIRECTION.md`** corrected: `jobs` is no longer described as "read-only" (it is
  read + enqueue-only); the old "soft no" on idea→pipeline linkage is marked **SHIPPED**
  (via the sanctioned `jobs_enqueue` path, not an `episodes` write); current-scope
  updated to list the shipped Jobs + Casting Studio + Cost Box.
- **`runtime` label — RULED 2026-06-29 (pipeline, HQ): OPERATOR-OWNED, keep editable.**
  §1a resolved with **no ownership conflict** — `runtime` is the operator's content-length
  lever (the script-writer parses the word-window target from it); the pipeline **reads**
  it, never writes. The earlier "advisory / pipeline-measured" framing was wrong and has
  been **reverted** in `data-contract.md`. The planned display-only ControlRoom change is
  **cancelled** — the field stays operator-editable (no UI change needed). *Optional future
  polish:* show the last measured render length beside it (read-only, from `receipts`) as
  advisory; no write-back. The "instability" this week was the pipeline owner hand-tuning
  the value as operator during calibration (now `70–145s · 150–240 words` for Mad Dog).

## Open decisions (human)

- **D-1 Runs ↔ character linkage** — RESOLVED (human ruling, 2026-06-28). **Accept
  global Runs as-is**: Runs stays read-only, operation-wide pipeline output; we do
  **not** add a character link or build a production board now. Runs is the *seed*
  of a future board, to be promoted only on demonstrated need (watching many
  episodes mid-flight and wanting to nudge them). Follow-on for the Builder: add a
  one-line in-app note clarifying Runs is operation-wide (the "accept global Runs"
  branch in the Slice 1 builder block). Build-brief acceptance #5 is therefore a
  ratified exception, not a defect.
- **D-2 Product framing** — RESOLVED (human ruling, 2026-06-28). The product **is
  the Character Control Room** (focused tool). The broad kanban/pipeline-board
  vision from the `DIRECTION.md` draft is **deferred, not killed.** Division of
  labor: **dashboard owns inputs** (characters, ideas) and **surfaces outputs**
  (Runs); **the pipeline owns the middle** (production stages). **`DIRECTION.md` is
  now authored** (2026-06-28) capturing this ruling — D-2 fully closed; it is the
  read-only direction source for Builders/Designer.
- **D-3 Auth model** — RESOLVED: "me now, scoped others later" (owner column from
  day one, owner-scoped RLS).
- **D-5 Storage (buckets)** — RESOLVED (human, 2026-06-28). Two asset classes have
  contradictory read rules, so they **cannot share one bucket** (same split as the
  tables: pipeline service-role data vs. dashboard owner-scoped rows; plus a
  blast-radius argument — a misconfig on one can't expose the other):
  - **`render-assets`** — pipeline render outputs (VO/music/clips). **Public read,
    service-role write, no per-user scoping.** JSON2Video/Buffer must fetch by URL;
    a private bucket would make a job spend on VO/music/generation then die at
    render. **Pipeline-repo-owned** (`reels-content-generation`, out of this repo's
    GitHub scope) — provisioned + recorded there, NOT here. Recipe handed off.
  - **User-uploads** (e.g., a character reference image) — **private, owner-scoped
    (`auth.uid()`), RLS-enforced.** **Dashboard-repo-owned.** **DESIGNED, NOT BUILT**
    — no dashboard feature uploads a file yet (bibles are jsonb text). Stand up a
    private owner-scoped `character-assets` bucket (spelled correctly) only when an
    upload feature exists; capture it in a migration at that time.
  - Cleanup done: a premature `character-assets` bucket + a typo'd `character-assests`
    bucket (both empty) were removed; storage is currently **0 buckets / 0 policies**.
    Note: Supabase's `protect_delete` trigger blocks bucket deletion via SQL — bucket
    deletes must go through the dashboard/Storage API.

## Pre-ratification audit (2026-06-28) — PASS, no blockers

Consolidated audit before the human ratification sign-off (cross-slice code review + static
& live security/RLS + tractable gate re-confirmation). Verified against the live project.

- **Code (cross-slice):** the `.stamp` regression class is fixed (`.casting-stamp`); cost
  math correct (per-episode `max(spend_so_far)`, deltas clamped ≥0, total = sum of maxes;
  Overview shares the same memoized `costStats`); read-only + per-id state-bleed clean.
  Build clean (Next 15.5.19). One builder-lane seam: Overview vs Cost Box use different
  status vocabularies (`"complete"` = Cleared in Overview but IN-FLIGHT in Cost Box).
- **Security (live + static):** every dashboard table owner-scoped to `auth.uid()`,
  `authenticated`-only; **anon simulation = 0 rows everywhere** (fail-closed); revisions
  immutable (insert+select); `episodes`/`receipts` read-only. No committed secret, **no
  service-role key anywhere** — the dashboard reads exclusively via the browser anon key.
  Advisor WARNs: leaked-password protection off; `set_updated_at` mutable search_path.
- **Public-app decisions (Supabase console, not code):** disable open sign-ups (`signUp` is
  ungated and any registrant can read all `episodes`/`receipts`); enable leaked-password
  protection.
- **Functional gap checked:** `jobs`/`published_posts`/`asset_ledger` have RLS on with **zero
  policies** → invisible to the anon-key dashboard. Not read today (no breakage), but any
  future feature surfacing them needs `authenticated` read policies first.
- **Live-vs-docs drift (benign):** 9 live migrations; this repo tracks 2 (its own). The
  rest are pipeline-domain — pipeline repo owns committing them; not absorbed here.
  `render-assets` bucket exists (public/500MB); `episodes.character_id` column landed but
  unpopulated (D-1 schema in, run pending).
- **Not re-run:** in-browser visual gates (sandbox can't TLS-egress; need the Node-fetch
  bridge or a human).

## Session 2026-07-01 (later) — #37 polling + Casting 2a shipped (Architect session)

Operator GO'd three items at session start (QA baseline · #37 · Casting 2a). Branch:
`claude/session-handoff-review-devqkm`, cut clean from production `ad27d5f`.

- **QA baseline** — full ratify green from a fresh container before any build (and again
  on each slice's build). QA creds now live only in gitignored `.env.local`
  (`RATIFY_EMAIL`/`RATIFY_PASSWORD`); nothing tracked. Operator still owns rotating the
  password to their own (open security follow-up from the morning session).
- **Task #37 — polling** (`docs/slices/slice-37-polling.md`, frozen v3). Full loop:
  Gemini spec review (2 findings folded: loading-race rule, queue-view episode polling)
  → Codex build → Architect diff review caught a render-path blanking bug (poll error +
  `error ? banner : list` branch) → fix → Gemini APPROVE on the aggregate diff →
  ratified on the prod build: **9/9 P-gates** with bridge-counted request evidence.
- **Casting 2a — visual identity** (`docs/slices/slice-casting-2a-visual-identity.md`
  frozen v2 + `docs/design/casting-2a-visual-identity.md`). Gemini spec review verified
  3 findings (headline: supabase-js upload paths are bucket-relative — the RLS
  `foldername[1]` check would have rejected every upload). **`dash_0003_visual_identity`
  applied to live** with the ratified choreography: HQ heads-up posted FIRST → apply →
  structure verify → negative contract tests (numeric `runtime` rejected, additive key
  accepted, probe cleaned) → `VALIDATE CONSTRAINT` as its own step (now `convalidated`).
  `pg_jsonschema` installed; private `character-refs` bucket live with 5MB/MIME limits.
  Types regenerated and matched the hand-edit exactly.
- **ARCHITECT RULING (contract change, rule 4):** `docs/contracts/data-contract.md`
  updated for 2a — `characters.reference_image_url`/`visual_style` columns (column
  stores the **bucket-relative object path, never a URL** — bucket-2 receipt posted to
  HQ, operator-ack pending), the `character-refs` bucket section, and the
  `characters_bible_shape` CHECK note. Ruling logged here per the frozen-contract rule.
- **ARCHITECT RULING (review finding declined):** Gemini's 2a diff review asked to drop
  the `character_refs_delete` storage policy ("append-only at the DB level"). Declined:
  the frozen spec §Migration mandates all four owner-scoped verbs; the no-delete
  arbitration governs **app code** (which contains no delete calls), not owner-scoped DB
  capability. The other three findings were verified real and fixed (side-car state →
  FlatChar integration; Replace-cancel skeleton trap; Esc bypassing the unsaved guard).
- **HQ:** tracker rows updated (Casting → GO/in-build; polling → shipped), dated page
  posted (GO recap + `dash_0003` heads-up + path-format receipt), and two lessons
  appended to the Process Learnings Ledger.

## Session 2026-07-01/02 (cont.) — voice_templates + the "suerta" reviewer

- **`voice_templates` slice** (spec `docs/slices/slice-casting-voice-templates.md` v2,
  design `docs/design/casting-voice-templates.md`): recipe library in the Casting
  Studio (save/apply/delete, hard no-audio-in-library credit guard) +
  `characters.voice_recipe` cast-time provenance. **`dash_0004` applied + VALIDATED
  live** (HQ-posted first; 3/3 negative contract tests; separate enforce step).
- **Review provenance (operator-directed escalation):** Gemini aggregate review +
  fresh-Codex adversarial triage on the migration/money path + Gemini re-audit +
  **"suerta"** — an independent Fable-5 agent acting Architect-only (the orchestrating
  Architect wrote the spec, so per rule 2 it should not be the final Architect-side
  reviewer on important slices). Suerta caught a **BLOCKER all three prior passes
  missed**: the retry-guard cache (`createdVoiceIdsRef`) served **deleted** EL voice
  ids on re-lock after a re-cast (lock A → lock B deletes voice_A → re-lock A stamps
  dead voice_A). Fixed (purge cache entries matching the deleted `previousVoiceId`)
  plus three minors (overlays anchored to scroll-origin; drawer+dialog double-trap;
  sub-surface focus restore defeated by the main trap).
- **ARCHITECT RULINGS:** (a) `onCharacterPatched` deliberately omits `voice_recipe`
  (FlatChar carries render-relevant fields only; nothing reads it client-side —
  suerta independently confirmed the ruling sound). (b) APPLY staging the template's
  synthesis settings into the live "Save settings" section is intentional (they must
  reach the eventual lock; nothing persists without the explicit save/lock click) —
  the applied-notice copy now says so. (c) `template_name` stays sticky for the panel
  session (provenance "seeded from", noisy-not-wrong; revisit if consumed
  programmatically).
- **Money-path hardening** (from the review chain): `saveVoiceWinner` reverted to
  EL-create-only; new `writeCastToCharacter` does the single characters update with a
  `.select("id").single()` zero-row guard; retries after a DB-write failure skip the
  EL create (preview ids are consumed by creation — a blind retry double-spends or
  strands the flow).
- **Contract updated** (this file logs the rule-4 ruling): `voice_templates` section +
  `characters.voice_recipe` row in `docs/contracts/data-contract.md`.
- **Suerta re-audit: APPROVE WITH NITS.** Residual #1 (BROWSE-while-dialog double-trap)
  fixed (mutual-exclusion opener). **Residual #2 accepted by ruling:** closing the whole
  panel via backdrop while a sub-surface is open drops focus to `<body>` — pointer-only
  path (keyboard users Escape the sub-surface first), low impact; an unmount-time
  restore touches shared focus semantics and is deferred as a known-minor.

## Session 2026-07-02 — jobs.channel enqueue (pipeline 0018 unblock)

- **Slice** (`docs/slices/slice-jobs-channel-enqueue.md`, frozen v2): enqueue +
  approval re-enqueues carry `jobs.channel` (select from live `channel_profiles`);
  queue chip for non-null channels; `package-lock.json` sync rides along (**CI's
  `npm ci` had been red since PR #33** — missing optional `fsevents`).
- **V2 RULINGS (consolidated Gemini+suerta round):** (1) the seeded `default` profile
  row is EXCLUDED from the select — offering it alongside the null option creates two
  hash-distinct representations of one logical job; the partial unique index can't
  dedupe across them → double-spend (suerta, MEDIUM; the headline catch of this
  slice). Filter is case-insensitive. (2) `jobInputFromRow` moved to `src/lib/jobs.ts`
  (layering). (3) The selection re-sync `useEffect` removed — the panel remounts per
  open; kills the PR-#27 clobber shape. (4) DECLINED: null-guarding `idea.channel`
  (column is `NOT NULL default 'Food'`, typed string — unreachable).
- **Evidence:** legacy idempotency keys proven byte-stable (pin `d844ecdb`
  re-derived independently from the pre-slice implementation); **C-8 probe** — a
  guaranteed-rejected INSERT (`episode_cap:0`) carrying `channel` returned `42501`
  (not `PGRST204`), zero rows persisted, queue unchanged at 34 → PostgREST accepts
  the column, no queue side effects (suerta's design, retired the spec's residual).
  5/5 ratification walk gates (intercept-and-abort; no live queue writes).
- **Live-DB drift found:** `jobs.fact_approved boolean NOT NULL default false` exists
  in prod but in no HQ migration notice we've absorbed — types + fixture updated;
  **question posted to HQ** (which migration? does the dashboard need a `fact`
  park-kind approval path?). Treated worker-owned until answered.
- **Gemini quota note:** `gemini-3.1-pro` daily cap (250) exhausted mid-slice; the
  wrapper's `gemini-3.5-flash` fallback carried the remaining reviews as designed.

## Session 2026-07-02 (cont.) — canonical governance.md ADOPTED

Cross-team ask executed: the merged canonical `governance.md` (29 rules; dashboard's
distillation as base + pipeline's steelman-every-option and real-fork upgrades;
Gemini-reviewed pipeline-side, shipped to their `main` PR #40) is now at THIS repo
root, adopted **verbatim from the HQ mirror page** (dashboard sessions can't read the
pipeline repo; the mirror page records that the pipeline repo file wins on
disagreement and re-mirrors on change). Continuous 1–29 numbering restored from
Notion's flattened lists — verified by the merge notes' cross-references (11 =
real-artifact, 17 = anti-bias, 20 = human-only). **`AGENTS.md` restructured** to the
project-specific layer: bindings for governance's placeholders + dashboard-local
ADDITIVE rules **L-1** (fresh HQ fetch before any "nothing buildable" claim), **L-2**
(suerta reviewer), **L-3** (terse operator updates), **L-4** (vendor split). Gemini
adoption review: PASS — fidelity confirmed, all old rules 1–10 mapped (none lost),
internal references (17→5, 25→14) intact.

## Session 2026-07-02 (cont.) — fact approval + park_kind adoption

- **Slice** (`docs/slices/slice-fact-approval-parkkind.md`, frozen v2): column-first
  park resolution (`resolveParkKind`; `detectParkKind` kept only as null-fallback for
  legacy rows), the `fact` approval action (fresh re-enqueue with `fact_approved=true`,
  0017 regulated-YELLOW sign-off), conditional dialog copy that **warns** when the job
  is already spend-approved (a fact approval then starts a run with no further spend
  park). `fact_approved` joins the idempotency hash **only when true** via
  destructure-then-conditional-include (explicit `false` hashes identically to
  omitted; pin `d844ecdb` re-verified independently — suerta re-derived it with its
  own from-scratch canonicalizer).
- **RULING (fact ≠ approve-and-go):** unlike publish, a fact approval does NOT
  auto-set `spend_approved` — a claims sign-off is not a spend decision; the correct
  friction is a second park at the spend gate (governance rule 20 posture). Steelmanned
  both ways in the spec review; the carried-flag warning covers the already-approved
  case.
- **Review chain:** Gemini spec review (2 findings folded: conditional dialog copy,
  destructure hash rule) → Codex build → Gemini aggregate (a11y nested-alert +
  redundant-fallback) + suerta (MAJOR: contract-doc drift landing in the same
  aggregate; MEDIUM money path: the park cache never re-resolved, so a
  status-before-park_kind write race or transient receipts error could permanently
  mislabel a fact park under a spend-approval button; plus unresolved-panel copy,
  publish dead-end dialog, hard-park fall-through, describedby) → consolidated fix
  round → re-audits.
- **Contract updated** (rule-13 ruling logged here): `park_kind` merged vocabulary +
  0016 supersession, `fact_approved` row rewritten (explicit-false emit, hash rule,
  no-auto-spend), approval-flow section covers all three kinds + column-first
  resolution semantics.

## Git state

- **Default branch (production):** `claude/new-session-3l99vs`. `main` does not exist.
- Slices 1–4 (foundation + drill-down + version history + Overview + Cost Box + the
  red-diagonal hotfix) plus all docs were built on `claude/dashboard-slice-count-pof88m`,
  then **merged into the default branch** via merge commit `00d5fcc` ("Merge dashboard
  Slices 2-4 to production (promote)"). That feature branch is now deleted.
- Production tracks the default branch; the Vercel deploy from `00d5fcc` is
  `target: production`, state READY.
- App-code commits are Codex-authored with committer `Claude <noreply@anthropic.com>`
  (GitHub-verified); docs commits are plain Architect commits.
