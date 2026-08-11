# SESSION-HANDOFF archive — 2026 H1 (rotated session snapshots)

_Rotated out of `docs/SESSION-HANDOFF.md` on 2026-07-07 to keep the live handoff a fast-path snapshot (rule 41). The per-session entries below are **verbatim — nothing summarized or deleted** (rule 34). Newest first: 2026-07-13 evening (slice 5g, rotated 2026-07-23) back to 2026-07-02 (channel-first redefinition, D-6). The live handoff keeps the current snapshot + the evergreen reference manual (§0–§6); full running history also lives in `docs/HANDOFF.md`._

---

## ⚡ EARLIER (2026-07-13 evening) — SLICE 5g SHIPPED: the legacy `.cr` shell is GONE (PR #152 `1a776eb`).

**Prod tip = `1a776eb`.** The dual-shell era is over — the D-6 migration payoff queued since 07-05 landed.
Net **−1,435 lines**; `ControlRoom.tsx` 4,207 → ~3,040. Cut fresh off `8b40ed9`, rebased over Phase 2 (#151,
see next entry — the "awaiting GO" blocker there is RESOLVED: its sibling session got the GO, applied
`dash_0011`, and merged while 5g was in flight; `reveal_approvals` + migration `20260713202509` **verified
live** by this session post-merge).

### What shipped (#152)
- **Legacy `.cr` shell DELETED**: the whole legacy render branch, `?view=` state/popstate plumbing (route.ts
  canonicalize + tests KEPT — old bookmarks redirect to Aurora), `openLegacyConsole` + the HubLanding
  "Legacy console" button, dead `channelsAutoNew`, `DrillDownPanel.tsx`, legacy-only CSS (every deletion
  grep-proven; every keep grep-proven live). `QueueActionDialog.tsx` KEPT (`FactClaimsReviewSection` feeds
  ActionCenter/RevealHub).
- **Aurora sign-out (gap fix)** — the sweep found the legacy rail's Exit form was the app's ONLY logout.
  ControlRoom authors the `/auth/signout` POST form (dirty-guard → DiscardChangesDialog preserved) and
  passes it as `signOutSlot` to all 10 shell branches + HubLanding. Owner runtime-verified on the preview.
- **Ruled drop (rule-19 receipt, spec §Reachability):** the queue-side "Open Run Detail" receipts modal —
  superseded by the Runs hub per-worker diagnostics. Operator may flag.
- Spec + full reachability table: `docs/slices/slice-5g-delete-legacy-shell.md`.

### Loop trail
Read-only sweep (Explore agent) → spec (Gemini spec-review folded; its CSRF premise refuted by reading the
signout route) → Codex build → gates (tsc · vitest · next build · grep gates · unauth smoke 307→/login) →
**Gemini cross-vendor** (its demanded CSS deletions REFUTED — 7 selectors it called dead are live in
surviving panels, e.g. `.pcard` via composed className; real dead residue removed) + **suerta APPROVE** →
**problem-solver nod ON THE PR** (conditions: rebase over #151 ✓ with no-clobber evidence; owner
authenticated eyeball ✓) → owner ruled "merge now, file follow-up" → squash-merge `1a776eb`.

### New follow-up + lesson
- **Issue #153** (owner-found during the eyeball): the unsaved-changes guard only covers the character
  dossier — guidelines/other forms lose edits on sign-out (pre-existing in BOTH shells, not a 5g
  regression; no `beforeunload` anywhere). Filed for problem-solver triage; not started (freeze).
- **Portable lesson:** a sweep's "legacy-only" list is a hypothesis, not a delete manifest — the grep AT
  delete time is the gate (it saved 7 live selectors here, twice: builder + Architect verification of a
  reviewer demand). Belongs in the Process Learnings Ledger when HQ is reachable again (see below).

### Coordination reality this session (READ THIS, next session)
- **Notion/HQ was UNREACHABLE** (connector present but unauthorized; OAuth impossible non-interactively —
  the operator was asked to authorize it in claude.ai connector settings). **Coordination ran via GitHub
  on THIS repo instead and it worked**: the problem-solver rules on issues/PRs (see #137 freeze reframe,
  #139 brief), gave the 5g nod on PR #152, and now **subscribes to PRs** — it asked that nod requests land
  where it's watching. **Operator directive (2026-07-13): check in with the problem-solver FREQUENTLY.**
- **Problem-solver freeze (#137, 07-09) stands:** new dashboard machinery is near-frozen; sanctioned work =
  the quality loop (casting #136, render scoring #139, enqueue). 5g passed as debt-deletion, explicitly
  ruled. Propose-before-build via issue, like #137/#153.
- L-6 HQ outcome: no tracker row owed (5g is dashboard-internal; no shared surface changed). The #153
  finding + the sweep lesson are queued for the Ledger once Notion is authorized.

### In flight / next (unchanged unless noted)
1. **#3 scoring hub → REAL** — awaiting owner go (first `render_reviews` write).
2. **MULTI-USER** — design doc merged in #151; awaiting owner spend-model decision + OAuth config.
3. **Reveal write-back activation** — `dash_0011`/`reveal_approvals` LIVE; `jobs.reveal_*` resume still
   guarded OFF (`NEXT_PUBLIC_REVEAL_WRITE_ENABLED` + missing-column backstop) until the pipeline lands the
   `reveal_*` cols.
4. **#153 guidelines dirty-guard** — new, awaiting problem-solver triage.

---

## ⚡ EARLIER (2026-07-13) — Reveal Phase 2 BUILT + reviewed + pushed; awaiting GO to merge. [RESOLVED: GO received; merged as #151 — see the entry above.]

Prod tip = `8b40ed9`. Ten dashboard slices are shipped to prod (#1a park view, schema reconcile,
#2-display, #3 scoring UI (mock), UX declutter, #4 channel filter, #5 design-system pass, #6
group-by-state, #7 persona "Use in casting", #8 reveal-approval preview phase-1 (mock `?hub=reveal`)).
The Sol design audit is fully shipped. Each shipped via: Codex build → tsc/vitest/next-build gates →
review → squash-merge to `claude/new-session-3l99vs`.

**★ #8 reveal-approval — PHASE 2 (write-back): BUILT, TWO-LENS REVIEWED, PUSHED — NOT YET MERGED.**
Branch `claude/wire-aurora-home-5b-lleyyg` is **3 commits ahead of prod**: `f0b1359` (multi-user
design doc), `54b12ff` (phase-2 spec `docs/slices/slice-8-phase-2-reveal-approval-writeback.md`),
`fbadf16` (the phase-2 build). Phase 2 makes the reveal hub real:
- **`reveal_approvals`** — dashboard-owned, owner-scoped, **append-only** audit table. Migration
  **`supabase/migrations/dash_0011_reveal_approvals.sql`** (SELECT+INSERT only, no UPDATE/DELETE;
  `owner default auth.uid()`). **NOT yet applied to the live DB** — gated on GO.
- **Real read path** — `?hub=reveal` reads live parked reveals (`ready_for_review` + `park_kind='reveal'`
  → max-seq `reveal_auditor` receipt → `parseRevealAuditorResult`). 0 parked live today → correct empty
  state. Mock banner removed from the live surface. Read set keyed off `jobParkById` resolution so it
  matches the ActionCenter "Review reveals" route (no dead-end).
- **Guarded write path** — decisions record to `reveal_approvals` immediately; the `jobs.reveal_*` resume
  write is **guarded OFF** behind env flag **`NEXT_PUBLIC_REVEAL_WRITE_ENABLED`** + a missing-column
  backstop (VERIFIED live: `jobs` has NO `reveal_*` cols yet). Activates the instant the PIPELINE lands
  `reveal_approved`/`reveal_override`/`reveal_rejected` + you flip the flag. Never touches lifecycle
  columns; scoped `.eq('park_kind','reveal')` with a multi-row guard.
- **Pure builders** `buildRevealApprovalRow`/`buildJobsRevealPatch` (unit-tested); reveal park-kind
  classification added to `jobs.ts`/`parkReason.ts`/`ActionCenter.tsx`.
- **Two-lens review (Gemini + suerta/Opus): SHIP-WITH-FIXES** — RLS, guarded write, idempotency confirmed
  sound; 4 real fixes applied (Promise.allSettled so one bad receipt doesn't collapse the hub; read↔route
  consistency; stable re-query gating; multi-row UPDATE guard); 1 Gemini false-positive rejected (rule 10).
- **Gates:** `tsc` ✓ · 237 tests ✓ · `next build` ✓.

**⛳ CURRENT BLOCKER — awaiting merge GO.** Owner (2026-07-13) **delegated the merge ratification to the
problem-solver** ("problem solver provides the go"). No GO existed on HQ yet, so I **posted a ready-for-GO
request to HQ #88** (comment `4962266383`, signed Dashboard architect). **On the problem-solver's (or
owner's) GO:** apply `dash_0011` to the live DB (Supabase `tyeejhaknqkeftjykqog`), squash-merge to prod,
then reset the branch fresh off the new prod tip. The 10-min poll cron carries this instruction. **Do NOT
merge or apply the migration without that GO.** Last-seen HQ id = `4962266383`.

1–7 (shipped, condensed): #1a park view + `channel_profiles` reconcile (`parkReason.ts`); #2-display
(`factClaims.ts`, `isSafeHttpUrl` XSS allowlist); #3 scoring UI (`?hub=review`, `renderReview.ts`, MOCK);
#4 RunsHub channel filter (`runsChannelFilter.ts`); #5 design-system pass (mobile nav bar, button-color);
#6 group-by-state (`runsGrouping.ts`); #7 persona "Use in casting" (in-memory pre-fill, no spend).

**In flight (besides the Phase-2 merge GO above):**
1. **#3 scoring hub → REAL — ⚠️ HELD, and the old trigger is REVOKED (2026-07-14).** The
   `cottage-cheese-20260712-034826-4cadec` render this item previously cited as "first
   gate-passing" was a **FALSE PASS** — its `on_topic_ratio=1.0` came from the old
   caption-not-subject judge bug (HQ reels#88 `4951405330`, backlog `4964858225` item 4;
   acked by this session `4964959636`). **Do NOT calibrate any scoring surface against that
   episode and do NOT flip `?hub=review` mock→real** until a validated relevance judge
   exists (pipeline-side) + owner ratify of the first `render_reviews` write.
2. **MULTI-USER** (design doc `f0b1359` = `docs/proposals/multi-user-design.md`) — owner wants a select
   few users; owner pays spend; others create+test; **channels PRIVATE (owner ruled)**. `characters`/
   `ideas`/`bibles` ALREADY owner-scoped RLS + `casting_usage` per-user; GAPS = `channel_profiles` shared
   (no owner col) and `jobs` has no owner (spend not per-user). Three pieces: (A) Google login + email
   allowlist [mine; needs owner's Supabase/Google OAuth config]; (B) channel `owner` col + RLS + backfill
   [mine; coordinate with @pipeline's Channel-DNA §3 which also extends `channel_profiles`]; (C)
   `jobs.owner` spend-attribution = **cross-team (pipeline owns jobs)**. **Awaiting owner: spend-model
   decision (A) approve-every-run [my rec] vs (B) per-user cap + design sign-off + the OAuth config.**

**Parked / gated:** domain name (owner: ship first, name later); **#1b repair-trigger** (money-path)
HELD — the repair *machinery* is proven (pipeline PR #96, repair_attempt now unbounded) but a
repair-to-complete-MP4 still awaits the sourcing arc, AND #1b needs owner priority to start. Deferred
UI (no auto-build, rule 15): Advanced-mode progressive-disclosure regroup, mobile "More" menu.
**Content-spine/gate-rebuild** (reels `spec-channel-dna-and-reveal-spine.md`) is being built by the
pipeline; the dashboard's only piece is the reveal-approval preview (#8). The **Channel DNA object**
(§3) will extend `channel_profiles` → a future cross-team handshake when it's built.

> **Maintenance note:** when adding the next ⚡ entry, rotate entries older than the two most recent
> into `docs/handoff-archive/` verbatim (per the maintenance rule — the 07-06 Runs-hub entry was rotated
> there on 2026-07-13).

---

## ⚡ EARLIER (2026-07-06) — RUNS HUB (per-worker failure attribution) + EMPIRICAL RUN-COST ESTIMATE shipped.

**Two operator-requested buildable-now read surfaces shipped** (both read-only over existing `jobs`/`receipts` telemetry —
no writes, no pipeline dependency), built in parallel in one branch on top of sub-lane 5b (#127). Branch for new work:
**start fresh off production** (keep your harness-designated branch name).

### What shipped
- **Runs hub (`?hub=runs`, `src/components/aurora/RunsHub.tsx`)** — lists runs (from the already-fetched `jobs`), newest-first,
  with an "All / Needs attention" filter. Each errored/stale/parked run shows its `jobs.error` at a glance and expands to a
  **lazily-loaded per-worker breakdown from `receipts`** (stage · verdict · reason · model/provider) — the "why did it fail /
  which worker" view. New `"runs"` hub key (`route.ts` + test), **"Runs →"** entry on the Channels hub, scoped `.runs-hub` CSS.
  Diagnostics loader = a read-only `receipts` select wrapped in `loadRunDiagnostics` (ControlRoom).
- **Run-cost estimate (`RunCostEstimate.tsx` in the Cost center)** — pure **`estimateRunCost()`** (`src/lib/costEstimate.ts`,
  **10 unit tests**) over historical per-episode spend (`costStats.episodeCosts[].liveSpend`) → a **$ range per run**
  (median..p90 × episodes-per-run), with a reactive episodes-per-run input. Live: **$0.54–$2.15 (typical $0.82)** for a
  5-episode run. The early **decision lever** ahead of the render-quality tier selector. Reached via the workspace Cost tab →
  "View global cost center →".
- **Both recorded in `docs/roadmap-dashboard.md`** (items 1c + 4a marked ✅ SHIPPED).

### Gates + review + ratify
- **`tsc` + 158 tests (+10 costEstimate) + `next build` clean.**
- **Cross-vendor (Gemini) review APPROVE** — read-only surfaces (rule 4 single-lens; no money path → no suerta). Folded its
  one blocker (raw-string cap input so backspace doesn't force "1") + nits (hoisted run error above the disclosure,
  `aria-controls`, double-fire ref guard, tiny-USD 3-dp precision).
- **Live ratify `scripts/ratify-runs-cost.mjs` 10/10, ZERO live writes** (every `/rest/v1` write intercept-and-aborted; reads
  forwarded): `?hub=runs` renders in AuroraShell with 60 run cards; an errored run shows its error + expands to a 9-stage
  per-worker log with verdict badges; the estimate renders a $ range and reacts to the input; zero writes, no console errors.

### Also shipped this session (follow-on increments, same telemetry)
- **Worker reliability rollup** — a collapsible "Worker reliability" table in the Runs hub: `computeWorkerReliability()`
  (`src/lib/workerReliability.ts`, 6 tests) rolls up `receipts` by stage → attempts, pass/retry/blocked, retry rate, and
  **retry-cost** (wasted spend on retried attempts). Query bounded (30-day window + 5000-row cap — Gemini blocker folded).
  Live ratify: 10 stages, 458 attempts, ~$3.59 retry-cost. **Cost estimate now filters by character.** Ratify 13/13, zero writes.

### NEXT / still queued (see `docs/roadmap-dashboard.md`)
- **Buildable-now follow-ups:** a per-MODEL (not just per-stage) reliability cut; join retry-cost into the estimate; an
  inline cost hint in the enqueue flow; channel filter on the estimate (waits on the `jobs.channel` tagging gap).
- **⭐ Sub-lane 5g** (delete the legacy `.cr` shell) is still the migration payoff. **Roster INCOMING** — pipeline is
  delivering the corrected 6-channel roster (Grandma = Bible-verse grandmother); create the `channel_profiles` rows via
  Supabase MCP once values + the operator's posture-dial sign-off land. **Render-quality tier selector** + **video-idea
  generator** + **niche workflow** + the **deferred analytics/monetization/social/ranking/A-B suite** remain queued (the
  generation path = isolated `script` + `generation` capabilities per the operator; analytics gated on per-episode metrics).

### HQ / cross-team (rule L-6)
- **No tracker row owed** — both surfaces are dashboard-internal reads of existing shared tables (no schema/contract/behavior
  change, no new write). No portable lesson this increment. (HQ was updated earlier this session for the render-quality
  research ask + Grandma correction + cost-estimation dependencies.)

---

## ⚡ EARLIER (2026-07-06) — SUB-LANE 5b SHIPPED (#127 `b5c24c3`): The Wire → Aurora-native "Ideas" home + the enqueue money path wired into the Aurora path.

**Production/default = `claude/new-session-3l99vs` @ `b5c24c3` (#127).** Ideas now have an Aurora-native home at `?hub=ideas`
(no `.cr` shell), and "Queue as run" fires the enqueue-idea-as-run money path from the Aurora surface. This was the
**last buildable reachability gap** before the legacy `.cr` shell can be deleted (5g). Branch for new work: **start fresh
off production** (keep your harness-designated branch name).

### What shipped (#127, squash `b5c24c3`)
- **New `src/components/aurora/IdeasHub.tsx`** (mirrors `CharactersHub`) — idea capture form (title / note / character /
  channel + submit) + idea list (per-card: status segmented control, "Queue as run" hidden when `used`, character/channel
  tag selects, failed-write retry/dismiss) + loading/error/empty states. Presentational; all handlers injected as props
  (`ideasHubProps` memo in `ControlRoom`). Statuses use canonical `STATUS_LABEL` (Backlog / In progress / Used). Copy is
  **audit-clean** (sentence case, no spy/terminal theming).
- **Route:** new `"ideas"` hub key (`src/lib/route.ts` + `route.test.ts`). URL = `?hub=ideas`.
- **ControlRoom:** `ideasHubProps` + `ideasHubCharacters` memos; `?hub=ideas` dispatch branch (models the `characters`
  branch); re-pointed **"Log an idea →"** (dossier editor) to `guardDirtyAction(() => navigate({hub:"ideas"}))` (dirty-guard
  preserved — the old `openLegacyConsole("wire")` had none); added an **"Ideas →"** entry on the Channels hub header.
- **⚠ THE #1 TRAP — fixed:** `EnqueueIdeaPanel` was legacy-`.cr`-only. Relocated it into **`globalOverlays`** (which every
  Aurora branch AND the legacy shell render), removed the old legacy-only mount → single mount, no double-render, and
  "Queue as run" now opens the panel from BOTH the Aurora Ideas hub and the legacy wire board.
- **`EnqueueIdeaPanel.tsx`:** visible-text copy edits only — `TRANSMIT ENQUEUE SIGNAL`→**Queue as run**, `TOPIC / FOOD`→
  **Topic**, `Read-only from The Wire`→**Read-only from the idea**, plain error + de-jargoned Mad Dog brand note. No DB
  columns / `CHANNELS` enum / `status` enum / contract fields touched.
- **`aurora.css`:** scoped `.ideas-hub` block (form + list + segmented control; AA active-segment mirrors the mode-toggle
  precedent; light-theme + reduced-motion). Bespoke `scripts/ratify-5b-wire.mjs`.
- **The money path is REUSED VERBATIM** — `enqueueJob` (jobs insert) / `writeIdeaJobMap` (idea_job_map insert) /
  `buildJobInsert` / `idempotencyKeyFor` (`src/lib/jobs.ts`) / the `useIdeas` hook (ideas writes) are all unchanged.
  Casting gate stays warn-only (`ENFORCE_CASTING=false`). Duplicate handling (`23505`→"Already queued") intact.

### Gates + review + ratify
- **`tsc` + 148 tests + `next build` clean.**
- **Two-lens review (money path, L-2/L-4): Gemini (cross-vendor) + suerta (Opus) both APPROVE, no blockers.** suerta's
  3 nits are non-blocking/out-of-scope: (1) `ideasHubProps` memo depends on the non-memoized `openEnqueuePanel` so it
  recomputes each render (harmless — a `useCallback` on `openEnqueuePanel` would fix it); (2) capture-form character
  select uses a flat list while the per-card select uses optgroups (cosmetic); (3) focus-restore drops to body if an idea
  flips to `used` and its trigger unmounts (matches legacy).
- **Live ratify `scripts/ratify-5b-wire.mjs` 19/19, ZERO live writes forwarded** — intercept-and-abort on `jobs` +
  `idea_job_map` + `ideas`: exactly one `ideas` insert per log (payload = typed title/note/character/channel, status
  `backlog`); one `jobs` + one `idea_job_map` per queue sharing the idempotency_key; duplicate → "Already queued" (no
  second map row); EnqueueIdeaPanel confirmed rendering in the Aurora path; "Log an idea →" navigates to `?hub=ideas`.
  (The script rebuilds with `.env.local` present first — NEXT_PUBLIC_* inline-at-build trap; `RATIFY_SKIP_BUILD=1` to reuse.)

### IN FLIGHT / NEXT UP
- **⭐ Sub-lane 5g — DELETE the legacy `.cr` shell.** 5b was the last buildable reachability gap; with it landed, the
  remaining blockers are: **5a channel DELETE** (small; only ratifiable once a 2nd deletable channel exists) and
  **5c Runs / 5f full-queue browse** (data-blocked on the `jobs.channel` mismatch — may be ruled acceptable-to-drop for
  the delete). Do the **reachability sweep** first (confirm every legacy-`.cr`-only action now has an Aurora home), then
  delete the `.cr` return + `openLegacyConsole` + `legacyShellOpen` + dead `channelsAutoNew` + `?view=` handling.
  **CONSENSUS review (Gemini + suerta)** on the delete step — it's reachability-critical. Fold in the `DiscardChangesDialog`
  `globalOverlays` relocation. Also re-skin `EnqueueIdeaPanel` chrome to Aurora at this point (it renders legacy-dark over
  the Aurora shell today via globalOverlays — same known cosmetic gap as `DiscardChangesDialog`; functional, not a blocker).
- **Channels for missing characters — STILL BLOCKED (pipeline replied PARTIAL 2026-07-05d).** Pipeline will draft the
  *mechanical* roster values (source_ladder / voice_archetype / packaging / length / platforms) but the `engagement_posture`
  dials (`claim_discipline` / `arousal_ceiling`) are an operator brand/legal call (governance rule 20 — GREEN/YELLOW/RED
  posture, human-only), NOT pipeline-derivable, for each non-`fact_first` channel. **Sequence:** pipeline produces a draft
  roster → **operator signs off on the posture dials** → pipeline hands final values → **THEN dashboard creates the
  `channel_profiles` rows via Supabase MCP.** Also still pending: which character `weird_food` (5 tagged jobs, no row) links
  to. Tracker row `Channel-row configs NEEDED …` stays 🟡 OPEN. **Roster correction (2026-07-06, operator):** Grandma Pearl
  is a **daily-Bible-verse grandmother** (reads a verse + gives insight / asks reflective questions) — NOT dark history; her
  posture is wholesome/`fact_first`-leaning. Mad Dog dark-history stands. Relayed to pipeline in HQ. **UNBLOCK IMMINENT
  (2026-07-06, pipeline session):** pipeline is delivering the **full corrected roster for all six §5 channels** (with the
  Grandma correction). When it hands over final per-channel values (three non-`fact_first` posture dials still need the
  operator's GREEN/YELLOW/RED sign-off — confirmed up front or flagged "pending operator"), **the dashboard creates the
  `channel_profiles` rows via Supabase MCP.** Next session: check HQ for the delivered roster and create the rows.
- **NEW operator directives (2026-07-06) — recorded in `docs/roadmap-dashboard.md` "Operator directives — 2026-07-06".**
  Queued, none started: (1) **render-quality tier selector** cheap/medium/high (needs research; pipeline owns the knob→cost→
  quality quantifiers — routed to HQ); (2) **per-channel video-idea generator** panel with keep/discard/edit (needs
  workshop+research; depends on the open "sanctioned dashboard generation path" decision; feeds sub-lane 5b's `ideas`);
  (3) **niche channel idea workflow** (needs workshop+research; overlaps onboarding E2 + channel-researcher); (4) **deferred
  future suite** — analytics + monetization panels, social-posting integrations, performance ranking + improvement insights +
  A/B testing (all blocked on the pipeline surfacing per-episode retention/performance metrics — the retention feedback loop).
  **Refinements this session (all in the roadmap doc):** (1a) **cost-estimation + self-calibrating estimator** — per-channel
  $ range as a decision lever on `receipts` telemetry (already logs per-worker model/spend); estimate→actual→audit→tighten;
  **empirical estimator is buildable-now** (no pipeline dep). (2a) **generation-path direction (operator, from the pipeline
  session):** the sanctioned dashboard generation path = **isolated pipeline leaf-capabilities** — voice already isolated
  (Character Studio), so the sandbox is just **script** (generate/lock a script for an idea) + **generation** (test clips);
  pipeline will spec those two. Resolves item 2's generation dep + gives item 1 a "test clip" preview. (4a) **per-worker
  reliability + failure attribution — BUILDABLE NOW:** `receipts` logs `verdict`/`reason` per stage + `jobs.error`/`status`
  (42 errored; failures are mostly credential/config — ElevenLabs 401 / Higgsfield key format — plus by-design quality-gate
  retries). Two buildable-now surfaces: a "why did it fail / which worker" drill-down + per-worker/model retry-cost (feeds 1a).
  **Buildable-now candidates that need NO pipeline dep (good next slices):** the empirical cost estimator, the failure-attribution
  drill-down.
- **THEN: Basic/Advanced polish** (app-wide reach: hide Production/Cost tabs in Basic, trim Overview; mode-gate savebar
  actions) and the **retention feedback loop** spec (deferred — blocked on the pipeline surfacing per-episode retention
  metrics; content-retention research at `docs/research/content-retention-and-competitors-2026-07-05.md` is 🟢 being
  consumed by pipeline for the visual-relevance fix).

### HQ / cross-team (rule L-6 — HQ THEN handoff)
- **Coordination-Log tracker: NO cross-team update owed.** 5b is **dashboard-internal** — the enqueue money path was
  reused VERBATIM (no schema / contract / behavior change through a shared surface; `jobs` / `idea_job_map` / `ideas` writes
  are byte-identical to before). No new capability crossed a shared surface. No tracker row.
- **Process Learnings Ledger: appended 1 portable lesson (2026-07-06)** — a live-ratify "no console errors" gate must
  exclude the error responses the harness INTENTIONALLY induces to exercise a branch (the 5b ratify's simulated `409`/`23505`
  duplicate-key tripped the gate on its own test); filter induced statuses alongside env/proxy noise.
- **Checked the two open pipeline replies:** (a) channel-roster = PARTIAL (blocked on operator posture ruling, above);
  (b) content-retention research = 🟢 pipeline consuming. Neither actionable by the dashboard this session.

### Copy-paste KICKOFF for the next session (rule 41 — paste this to start)
```
You are the Architect for the Reels Content Control Room dashboard (Next.js 15 / React 19 / Supabase, plain-CSS
"Aurora" design system; channel-first per D-6). You own judgment/specs/reviews/commits/merges.
FIRST: read docs/SESSION-HANDOFF.md top-to-bottom, then governance.md + AGENTS.md, then do a FRESH HQ fetch
(Notion 📮 Coordination Log, page 38fd346e-22d2-8133-bd2e-e5b7f97f7c2e — Open Cross-Team Items + Process Learnings
Ledger) before planning/claiming anything blocked (rule L-1). NOTE the channel-roster item may have a fuller pipeline
reply by now (it was PARTIAL, blocked on an operator posture ruling for the non-fact_first channel dials; note the
2026-07-06 correction that Grandma Pearl is a Bible-verse grandmother, not dark history).
BRANCH: start fresh off production `claude/new-session-3l99vs` @ b5c24c3 (#127) (git fetch origin claude/new-session-3l99vs
&& git checkout -B <your-working-branch> origin/claude/new-session-3l99vs); keep the harness-designated branch name.
NOTE: cold container has NO node_modules — run `npm ci` first. QA creds (.env.local) are ephemeral per container —
re-request from the operator (or pull NEXT_PUBLIC_SUPABASE_URL/ANON_KEY via the Supabase MCP; RATIFY_EMAIL/PASSWORD
from the operator). Ratify trap: `next build` inlines NEXT_PUBLIC_* at BUILD time — write .env.local BEFORE build.
Run ratify: `set -a; . ./.env.local; set +a; node scripts/ratify-*.mjs` (password has !).
TASK — SUB-LANE 5g: delete the legacy `.cr` shell (the payoff — 5b landed, so the last buildable reachability gap is
closed). Do the reachability sweep FIRST (confirm every legacy-`.cr`-only action has an Aurora home), decide whether the
data-blocked 5c Runs / 5f full-queue gaps are acceptable-to-drop for the delete, then delete the `.cr` return +
openLegacyConsole + legacyShellOpen + dead channelsAutoNew + `?view=` handling; fold in the DiscardChangesDialog
globalOverlays relocation + re-skin EnqueueIdeaPanel chrome to Aurora. CONSENSUS review (Gemini + suerta) on the delete —
it's reachability-critical. Live-ratify no-capability-lost. Squash-merge via GitHub MCP (owner recklessfrags, repo
content-gen-dashboard) into claude/new-session-3l99vs. Keep chat terse (L-3 — the operator asked for reduced narration).
```

---

## ⚡ EARLIER (2026-07-05) — BASIC/ADVANCED MODE TOGGLE SHIPPED (#122 `8d73a5d`), on top of the COPY AUDIT P1 SWEEP + DIAL RENAMES (#118/#120).

**Production/default = `claude/new-session-3l99vs` @ `8d73a5d` (#122).** Two operator-directed pieces of work shipped
this session: **(1) the copy-audit P1 sweep + dial renames** (below), and **(2) a Basic/Advanced detail-level view
toggle** — a consumer-friendly default-Basic mode that shows only the high-leverage fields the USER seeds and tucks the
auto-drafted detail behind "Show advanced settings". Branch for new work: **start fresh off production** (keep your
harness-designated branch name).

### Basic/Advanced toggle (#122, squash `8d73a5d`)
- **What + why:** operator asked for a consumer-friendly Basic/Advanced toggle, Basic = default, "holds the few things
  that make the biggest impact." **Key operator ruling — the split must be called by TRUTH, not a judgement call:**
  impact = *what the USER fills in that shapes the output* (the auto-gen drafts the rest), and **do NOT tier by what's
  currently wired** (product in active development). The truth-derived split is documented + cited in
  **`docs/design/basic-mode-field-impact-2026-07-05.md`** (user-seed vs auto-drafted). _An earlier wiring-based split
  ("channel_profiles is inert today → Advanced") was WRONG and the operator corrected it — see the doc + the Ledger._
- **Split:** Character dossier Basic = Name · One-line concept · Voice & identity · Gold-standard lines (Advanced adds
  Cadence, Vocabulary, Off-limits, Beat template, Runtime). Channel form Basic = Channel · Display name · Concept ·
  Character (Advanced adds Voice archetype + the Content-settings & Footage-&-presentation sections).
- **Mechanism (mirrors the theme toggle):** `src/lib/uiMode.ts` (localStorage, default `basic`); `UiModeProvider`/
  `useUiMode` (`src/components/aurora/UiModeContext.tsx`) mounted at `page.tsx` **above** `ControlRoom` so both
  `ControlRoom` + `AuroraShell` read it; **fails open (advanced) outside the provider → legacy `.cr` shell unaffected**;
  segmented control in the `AuroraShell` header. Gating: `showAdvancedFields = uiAdvanced || legacyShellOpen`; only the
  two AURORA `ChannelProfilesPanel` instances get the new `basicMode`/`onShowAdvanced` props (legacy defaults `false` =
  show all). **Fields are HIDDEN, never destroyed** — state preserved, every field still saves.
- **Gates:** tsc + 148 tests + build clean. **Live ratify `scripts/ratify-basic-advanced-mode.mjs` 12/12, ZERO live
  writes** (default Basic; both forms hide/reveal; persists across reload; legacy fail-open). **Gemini APPROVE**
  (context placement, fail-open, hidden-not-destroyed, JSX, no dead button, a11y, spec match). UI feature → single
  cross-vendor pass (no suerta).
- **Follow-ups (deferred, non-blocking):** app-wide reach — Basic could also hide the advanced workspace tabs
  (Production/Cost) / trim Overview; not done in v1 (operator lean was "just the forms"). Savebar actions (Visual cast,
  Export) aren't mode-gated yet. Re-tier any field: it's a one-line move in the two gated files + the rubric doc.

### IN FLIGHT / NEXT UP (end of this session)
- **⭐ Sub-lane 5b (The Wire → Aurora home) — OPERATOR-GREENLIT + BUILD-READY SPEC written.** The write/money-path
  go-ahead is given. Complete spec: **`docs/slices/slice-5b-wire-aurora-home.md`** (exact files/lines, the money-path
  writes to REUSE verbatim, the #1 wiring trap = render `EnqueueIdeaPanel` in the Aurora path, the copy fixes, the
  3-table ratify intercept list `jobs`+`idea_job_map`+`ideas`, two-lens review requirement, and a copy-paste kickoff).
  **Deliberately NOT built this session** — money path + heavy context (rule 30); run it FRESH using the spec's kickoff.
  This is THE next build.
- **Channels for missing characters — ASKED PIPELINE (in flight).** Operator lifted the channel-creation hold and wants
  the FULL intended channel roster created. `channel_profiles` is dashboard-owned (WE insert; pipeline reads) → posted an
  HQ ask + tracker row for the pipeline's roster values (Mad Dog id `8cf09da8…`, Grandma Pearl id `76eaeea4…`, the whole
  roster, + which character `weird_food` [5 tagged jobs, no row] links to; flag any character not yet created). **Create
  the rows via Supabase MCP once the pipeline replies** (HQ child page `🆕 channel-row configs NEEDED … (2026-07-05)`).
- **THEN: Basic/Advanced polish** (operator sequenced it after 5b + channels): app-wide reach (hide Production/Cost tabs
  in Basic, trim Overview) + mode-gate savebar actions.

### Also this session — content-retention + competitor RESEARCH (#124 `1475afa`), and a strategy Q
- **Research shipped (#124):** `docs/research/content-retention-and-competitors-2026-07-05.md` — operator-commissioned,
  produced via the deep-research harness (107 agents, adversarial verification). **Part A** (what makes AI short-form
  HOLD attention, pipeline-facing) + **Part B** (competitor teardown → Control Room feature ideas). Every claim
  confidence-tagged (VERIFIED / SOURCE-ATTESTED-UNVERIFIED / refuted-do-not-cite). **Mirrored to HQ** (Coordination Log
  child page `🎬 content-retention CRAFT research (2026-07-05)` + a tracker row) so the pipeline team can build on Part A
  (rule 40). Key verified levers: ElevenLabs v3 prosody (kill flat TTS); optimize completion + retention-curve not AVD;
  an "added-value" gate vs YouTube's "inauthentic content" demonetization; AI-disclosure (own-voice clone EXEMPT). The
  generation-failure-mode fixes (shorter clips / one focal subject / composite in post) are TEST-don't-cite (unverified).
- **DEFERRED next build (operator-directed):** a **retention feedback loop** — pull per-video performance (views, avg
  view duration, completion, retention curve) onto the existing cost + `correlation_key` (idea→job→episode) thread,
  attributed to character/channel/hook/format → "cost per retained-view." No competitor closes this loop; it's the
  strongest own-the-stack feature and turns Part A's levers into measured signal. **Blocked on the pipeline surfacing
  per-episode retention/performance metrics** (asked in the HQ tracker row above). Operator said defer the spec — pick
  it up when the pipeline dependency is ready or the operator greenlights.
- **Build-vs-buy read (for context):** the individual capabilities (faceless generators, AI-actor/UGC tools, voice,
  schedulers) are commoditized — even reusable "AI influencer as a durable asset" (The Influencer AI). The Control Room's
  real edge is the governance + owned-pipeline + per-run economics layer, not any single capability.

### Copy audit P1 sweep + dial renames (#118 `c096531`, handoff #119, dials #120 `073409e`)
Applied the audit's **S2 rename map to user-visible display text only** (DB columns / enums / props / CSS classes /
pipeline-contract fields untouched — the operator's HARD rule) across every Aurora-surviving surface, sentence-cased
throughout, stripped implementation leaks, added the P1 empty-state CTA. Then the operator **confirmed the 5
content-production dial labels are jargon**, so the deferred dial renames landed too (#120). **Copy audit P0+P1 is now
fully CLOSED.** Full per-surface detail in "What shipped this session" below.

### Copy-paste KICKOFF for the next session (rule 41 — paste this to start)
```
You are the Architect for the Reels Content Control Room dashboard (Next.js 15 / React 19 / Supabase, plain-CSS
"Aurora" design system; channel-first per D-6). You own judgment/specs/reviews/commits/merges.
FIRST: read docs/SESSION-HANDOFF.md top-to-bottom, then governance.md + AGENTS.md, then do a FRESH HQ fetch
(Notion 📮 Coordination Log, page 38fd346e-22d2-8133-bd2e-e5b7f97f7c2e — Open Cross-Team Items + Process Learnings
Ledger) before planning/claiming anything blocked (rule L-1).
BRANCH: start fresh off production `claude/new-session-3l99vs` (git fetch origin claude/new-session-3l99vs &&
git checkout -B <your-working-branch> origin/claude/new-session-3l99vs); keep the harness-designated branch name.
NOTE: cold container has NO node_modules — run `npm ci` first. QA creds (.env.local) are ephemeral per container —
re-request from the operator. IMPORTANT ratify trap (this session): `next build` inlines NEXT_PUBLIC_* at BUILD time
— write .env.local BEFORE `next build`, or the client Supabase client fails to init and the app renders a blank
shell (text-absence then false-passes copy checks). Run ratify `set -a; . ./.env.local; set +a; node scripts/ratify-*.mjs`.
TASK — pick one, per value (the copy audit P0+P1 is now fully SHIPPED incl. the operator-confirmed dial renames):
  (b) SUB-LANE 5b — The Wire (ideas) Aurora home + EnqueueIdeaPanel: last buildable reachability gap before the
      legacy `.cr` shell can be deleted (5g). WRITE/MONEY path (enqueue-idea-as-run) → get operator go-ahead first.
      Its rewrite is also copy-audit-spec'd → closes a structural blocker AND lands audit-clean copy in one pass.  ← RECOMMENDED.
  (c) SUB-LANE 5g — delete the legacy `.cr` shell. Blocked on 5b landing (5c/5f data-blocked). Consensus review.
Drive build→review (Gemini cross-vendor; +suerta on money/contract/migration)→ratify→squash-merge via GitHub MCP
(owner recklessfrags, repo content-gen-dashboard) into claude/new-session-3l99vs. Keep chat terse (L-3).
```

### What shipped this session (merged to production, #118 + #120)
- **Copy audit P1 sweep (#118, squash `c096531`)** — applied the S2 rename map to **visible display text only** across
  every Aurora-surviving surface. 8 component files, copy-only (+ 2 audit-specified structural items):
  - **CharactersHub** — subtitle de-themed (`Channel personas & field manuals` → `Recurring characters for your
    channels`); screen-reader `dossier` → `character profile`; **P1 empty-state CTA** ("Create your first character",
    reuses the header create handler).
  - **OverviewDashboard** — `Roster Dossier`→Characters, `The Wire Queue`→Ideas, `Sentinel Pass Rate`→Fact-check pass
    rate; all Title-case metric labels → sentence case.
  - **Shared dossier editor** (renderDossierEditor/renderMobileRoster — renders in BOTH shells) — `SELECT DOSSIER` /
    `FIELD MANUALS` / `Save dossier` / `Codename` / `EXPORT MANUAL` / `FILE ·` / `UNPERSISTED CHANGES IN BUFFER` → plain
    (`Select character` / `Save character` / `Name` / `ID ·` / `Unsaved changes`).
  - **Aurora workspace** (ControlRoom) — `Character Dossier (Bible)`→Character profile; `E1 Persona Advisory` /
    `Persona engine`→Character guidelines; `Comms down`→plain error + raw string demoted into `<details>`; cost-deferral
    + global-cost-center copy plain-languaged (dropped `channel scope column` / `Phase 3` / `// GLOBAL COST CENTER`).
  - **ChannelsHub** — `Root Objects & Production Lines` + `Runs & cost - Phase 3` leaks removed.
  - **ChannelProfilesPanel** — `ADR-005` / `Tier-1` / `Tier-2` / `fact_first` / `Primary key` implementation leaks
    stripped (the enforcement hint rewritten to the style-guide §4 plain pattern).
  - **Compare / History / Visual overlays** — dossier/bible/manual → character profile; `Codename`→Name; de-alarmed the
    Visual chip (`CORRUPTED`→`Missing`).
- **Dial renames (#120, squash `073409e`)** — operator confirmed the 5 content-production dials are jargon → renamed the
  **visible labels only** in `ChannelProfilesPanel.tsx` (field eyebrows + AI-autogen diff labels): Treatment→**Style**,
  Claim discipline→**Fact-check strictness**, Arousal ceiling→**Intensity limit**, Source ladder→**Footage sources**,
  section `Sources & packaging`→**Footage & presentation** (`Title style`/`Thumbnail style` fields kept — already plain).
  `mk()`/`updateForm()` keys, `htmlFor`/`id`, and the `treatment`/`engagement_posture.*`/`source_ladder`/`packaging.*` DB
  fields all unchanged.
- **Gates:** `tsc` + **148 tests** + `next build` clean. **Live ratify `scripts/ratify-copy-p1.mjs` 13/13, ZERO live
  writes** (every write table intercept-and-aborted; new copy renders, old jargon gone on all 7 surface groups incl. the
  dial form). **Cross-vendor (Gemini) review APPROVE** on both #118 and #120 (no identifier/semantic breakage; apostrophes
  escaped). Display-copy only (low-stakes rule 5) → single cross-vendor pass; no suerta needed.

### NEXT
- **Copy audit P0 + P1 are now fully SHIPPED** (incl. the operator-confirmed dial renames). Casting **"persona"** (a
  voice concept, not the character) was intentionally kept. **P2 theming** — mostly absorbed by the 5g `.cr` deletion; the
  surviving-into-Aurora dossier-editor/ActionCenter copy is done. **P3 nits** — placeholder-examples, `eps`→episodes,
  remaining literal Title-case buttons — low value, defer.
- **(b) 5b The Wire** (RECOMMENDED, needs operator go-ahead — write/money path) and **(c) 5g delete `.cr`** (blocked on 5b
  landing; 5c/5f data-blocked) — the migration's remaining lanes. See the sections below for detail.

### HQ / cross-team (per rule L-6 — wrap-up is HQ THEN handoff, #117)
- **Coordination-Log tracker: NO cross-team update owed.** This session was **dashboard-internal** — display-copy renames
  + a client-only UI view toggle (`localStorage`); no schema/contract/shared-surface data or behavior change (DB
  columns/enums/pipeline-contract fields were the HARD-RULE exclusion; money-path gate logic untouched). No tracker row.
- **Process Learnings Ledger: appended 2 portable lessons (2026-07-05)** — (1) a live Next.js ratify must `next build`
  with `.env.local` present (NEXT_PUBLIC_* inline at build time, not `next start`), and a content-assertion gate must
  confirm the app hydrated (wait for `.aurora-app`) or "text absent" false-passes as "jargon removed"; (2) a "which
  fields matter most / defaults / what to surface" curation split must be called by **truth** (what the system consumes
  + craft docs + the user's role as author of seeds), written down + cited — **not** the orchestrator's taste, and
  **not** tiered by what's currently wired for an in-development product (operator corrected a wiring-based split).

---

## ⚡ EARLIER (2026-07-05) — DESIGN/COPY-QUALITY PASS: 5a channel-delete (#105) + a site-wide COPY AUDIT (#106-110) + the S1 typography root-cause fix (#111) + the FULL P0 copy remediation lane (#112-114). ALL P0 copy blockers CLOSED.

**Production/default = `claude/new-session-3l99vs` @ `438ca43` (#114).** This session **pivoted** from the migration
lane to a **design/copy-quality pass**: an unbiased external (Gemini) review of the New-Channel form flagged
half-migrated **monospace/terminal typography** + **jargon-heavy copy** app-wide. The operator's directive:
research copy standards → write guidelines → audit the whole site for copy + uniformity → fix. That produced a
reusable **Content style guide + scorable audit rubric**, a **site-wide copy audit** and **typography-uniformity
sweep**, the **S1 root-cause CSS fix**, and the **entire P0 (blocker-tier) copy remediation** — now complete.
Branch for new work: **start fresh off production** (keep your harness-designated working-branch name).

### Copy-paste KICKOFF for the next session (rule 41 — paste this to start)
```
You are the Architect for the Reels Content Control Room dashboard (Next.js 15 / React 19 / Supabase, plain-CSS
"Aurora" design system; channel-first per D-6). You own judgment/specs/reviews/commits/merges.
FIRST: read docs/SESSION-HANDOFF.md top-to-bottom, then governance.md + AGENTS.md, then do a FRESH HQ fetch
(Notion 📮 Coordination Log, page 38fd346e-22d2-8133-bd2e-e5b7f97f7c2e) before planning/claiming anything blocked (L-1).
BRANCH: start fresh off production `claude/new-session-3l99vs` (git fetch origin claude/new-session-3l99vs &&
git checkout -B <your-working-branch> origin/claude/new-session-3l99vs); keep the harness-designated branch name.
NOTE: a fresh container has NO node_modules — run `npm ci` first. QA creds (.env.local) are ephemeral per
container — re-request; run ratify as `set -a; . ./.env.local; set +a; node scripts/ratify-*.mjs` (password has !).
CONTEXT: the site copy/typography audit is in docs/design/ — content-style-guide.md (the rubric + guidelines),
copy-audit-2026-07-05.md (per-surface A–D grades + S1/S2 systemic fixes + P0/P1/P2/P3 tiers), and
uniformity-sweep-2026-07-05.md (the two-type-system finding). ALL P0 blockers are SHIPPED (#111-114).
TASK — pick one, per value:
  (a) COPY AUDIT P1 tier — apply the jargon→plain-English rename map to the REST of the display copy site-wide
      (VISIBLE TEXT ONLY — never DB columns/enums/pipeline-contract fields), per copy-audit-2026-07-05.md §S2.
  (b) SUB-LANE 5b — The Wire (ideas) Aurora home + EnqueueIdeaPanel: the LAST buildable reachability gap before
      the legacy `.cr` shell can be deleted (5g). Write/money path — get operator go-ahead first. Its rewrite is
      now ALSO spec'd by the copy audit, so it closes a structural blocker AND lands audit-clean copy in one pass.
  (c) SUB-LANE 5g — delete the legacy `.cr` shell (5b must land first; 5c/5f data-blocked). Consensus review.
RECOMMENDED: 5b — it unblocks the migration's north star (retire the dual shell) and is audit-spec'd.
Drive build→review→ratify→squash-merge. Ratify = bespoke scripts/ratify-*.mjs (prod build + Chromium + Supabase
bridge, intercept-and-abort = zero live writes). Keep chat terse (L-3).
```

### What shipped this session (all merged to production, #105 → #114)
- **5a Channel DELETE (#105, `5835337`)** — channel delete re-homed into the Aurora workspace (was legacy-console
  only). Closes the one write-path reachability gap that was buildable-and-ratifiable. (5b remains; 5c/5f data-blocked.)
- **Content style guide + audit rubric (#106 `2755860`, template #107 `efc63be`, renamed #108 `7dc27b0`)** —
  `docs/design/content-style-guide.md`: an evidence-based copy style guide + a **scorable 3-dimension / 9-category
  (I.1–III.3) 1–4→A–D audit rubric** (cites NN/g, Microsoft, Mailchimp, Polaris, GOV.UK, WCAG, plainlanguage.gov).
  `docs/design/content-style-guide-template.md`: a reusable **blank-canvas** version (`<PLACEHOLDER>` fill-ins) for
  other projects.
- **Site-wide COPY AUDIT (#109, `c5a6a2d`)** — `docs/design/copy-audit-2026-07-05.md`: per-surface **A–D grades**
  (all landed C/low-B), the two **systemic root-cause fixes** (S1 = CSS-forced uppercase/mono; S2 = jargon→plain
  rename map), and the **P0/P1/P2/P3 backlog** with before→after strings.
- **UNIFORMITY SWEEP (#110, `0a775dc`)** — `docs/design/uniformity-sweep-2026-07-05.md`: the **two-type-system**
  finding — legacy `globals.css` (Oswald/JetBrains-Mono, UPPERCASE labels) vs Aurora `aurora.css` (system
  sans/mono, sentence case) — and where legacy label classes leak into re-homed Aurora surfaces.
- **S1 typography root-cause fix (#111, `16b6fe7`)** — the single highest-leverage fix: reset the legacy label
  classes (`.eyebrow`/`.filecode`/`.metric-eyebrow`/`.count`/`.col-head h2`/`*-label`/`.field label`) off
  monospace+UPPERCASE+tracking, **scoped to `.aurora-app` only** so the legacy `.cr` shell keeps its terminal look
  until 5g deletes it. Native Aurora `.text-mono` unaffected. Ratify 10/10, zero live writes.
- **P0 money-path copy (#112, `f8a0646`)** — `QueueActionDialog` + `ActionCenter` fact/spend/publish confirmation
  strings plain-languaged (dropped `fact_approved=true`/`spend_approved=true`/"regulated-YELLOW"/"byte-identical"/
  "TRANSMITTING"; sentence-cased titles/buttons). **Copy only — the confirm/gate/`voice_recipe` logic is untouched.**
- **P0 restore/discard/cost/hub (#113, `44aeec8`)** — RestoreDialog + DiscardChangesDialog + `CostBoxDashboard`
  (~13 strings; `[LIMIT EXCEEDED]`→"Over target", raw error demoted into a `<details>`) + Channels/CharactersHub
  error states (plain + retry + raw error in `<details>`).
- **P0 casting-lock consequence (#114, `438ca43`)** — the last P0 blocker. Lock dialog: "CONFIRM AUDITIONED
  WINNER"→"Cast this voice?", jargon eyebrows→sentence case, "[ CONFIRM LOCK ]"→"Cast & lock voice"; **added an
  explicit consequence line** (locking permanently deletes the current voice); `generationSummary` no longer leaks
  raw `model_id`/`guidance_scale`/`seed` to the UI (still written to `voice_recipe` unchanged). Ratify 6/6.

### NEXT — P0 done; three tracks remain (all now audit-spec'd)
- **(a) Copy audit P1/P2/P3 tiers** — apply the S2 jargon→plain rename map across the REST of the display copy,
  plus theming cleanup + sentence-casing. **Rule (operator-set): rename VISIBLE TEXT ONLY — never DB
  columns/enums/pipeline-contract fields.** Broad but non-blocking; best as a sweep once there's one type system.
- **(b) Sub-lane 5b — The Wire (ideas) Aurora home + `EnqueueIdeaPanel`** — the **last buildable reachability gap**
  before the legacy `.cr` shell can be deleted. **Write/money path → needs operator go-ahead** (not autonomous).
  Its rewrite is now spec'd by the copy audit → closes a structural blocker AND lands clean copy in one pass.
  **← RECOMMENDED next.**
- **(c) Sub-lane 5g — delete the legacy `.cr` shell** — blocked on 5b (5c Runs / 5f full-queue are data-blocked on
  the `jobs.channel` mismatch). Consensus review + live-ratify no-capability-lost. `DiscardChangesDialog`'s
  out-of-scope `globalOverlays` mount folds in here.
- **By-design residual (NOT a bug):** the legacy modal casting path (`.drilldown-panel.casting-panel`, rendered
  OUTSIDE `.aurora-app`) still shows the terminal uppercase lock heading — S1 deliberately left the legacy `.cr`
  shell untouched until 5g. The Aurora inline mount (`.casting-inline`) gets the sentence-case override. The P0
  **copy substance** (consequence line, no raw tokens) lands in both paths.

### Process notes (this session)
- **Unbiased external review as a lens.** A Gemini vision review of one screenshot surfaced the app-wide
  typography/copy debt that internal iteration had normalised. (Vision via direct REST to `gemini-3.1-pro-preview`
  — `gemini.sh` is text-only; pass base64 via `jq --rawfile` from a file, NOT `--arg`: "Argument list too long".)
- **Research-before-audit paid off.** Writing the evidence-based rubric FIRST gave the audit falsifiable A–D
  criteria instead of taste, and produced a reusable artifact (the template) for other projects.
- **S1 was the highest-leverage single fix** — one scoped CSS block cleared the biggest casing cluster app-wide
  without touching a single component or the legacy shell. Find the CSS root cause before rewriting copy per-surface.
- **Ratify a money-gated surface at the BUILD-BUNDLE level when opening it live would cost money.** The casting
  lock dialog only opens after paid voice generation, so #114's ratify asserts the new copy ships / old jargon is
  gone by grepping `.next/static/chunks`, plus a read-only runtime check (panel renders, zero writes).
- **Intercept EVERY table an action writes, not just the obvious one.** The #112 money-copy ratify first leaked one
  real `idea_job_map` provenance row live because the Supabase bridge intercepted `jobs` but not `idea_job_map` —
  deleted it via MCP + tightened the intercept regex to `/rest/v1/(jobs|idea_job_map)/`. Zero-live-writes is only
  as true as the intercept list is complete.
- **5a needed a deletable channel to ratify** (only `default` exists, undeletable) → seeded a throwaway
  `dash_ratify_del` via Supabase MCP, intercept-aborted the DELETE, cleaned up after.
- **Fresh-container gotcha (re-confirmed):** `node_modules` absent on cold start → `npm ci` before any check.
- **Commit-identity gotcha:** set `git config user.email noreply@anthropic.com && user.name Claude` before
  committing. The stop-hook also flags GitHub's own squash-merge commit (committer `noreply@github.com`) — that's
  the merge artifact on production, NOT a local commit to rewrite; do not `--reset-author` a merged commit (it
  forks your branch from canonical history). Every prior `#1xx` merge carries the same committer.

### HQ / cross-team (per new rule L-6 — wrap-up is HQ THEN handoff)
- **Coordination-Log tracker: NO cross-team update owed.** Everything this session was **dashboard-internal** — 5a
  re-homed an existing affordance (no new data/behavior to the worker), and the copy/typography work is
  display-copy + CSS only (money-path gate logic byte-identical, no schema/contract/shared-surface change). No
  tracker row, no heads-up.
- **Process Learnings Ledger: appended 2 portable lessons (2026-07-05)** — (1) a "zero live writes" ratify is only
  as true as its intercept list is complete (a real `idea_job_map` row leaked to prod when the bridge intercepted
  `jobs` but not `idea_job_map`; audit the recorded write-log, don't trust the green); (2) ratify a money-gated
  surface at the build-artifact level when opening it live would spend (the #114 casting-lock bundle-grep pattern).
- **New rules added this session:** `AGENTS.md` **L-6** (this wrap-up ritual). `governance.md` was intentionally
  NOT edited — it's the verbatim cross-team canonical mirror (rules 1–41); a portable version of L-6 would need the
  propose→pipeline-encode→re-mirror loop, not a unilateral dashboard fork.

---

## ⚡ EARLIER (2026-07-05) — SUB-LANES 5e + 5d SHIPPED (#102 `f192f5c` / #103 `6b2f7b7`): Aurora System Overview + Global Cost Center re-skins. Earlier that session: sub-lanes 3 (#96) + 4 (#99) + ratify/polish (#98) + the sub-lane-5 sweep (#101). Legacy `.cr` deletion still BLOCKED — 2 of 6 gaps closed; only 5b (The Wire, write-path, needs go-ahead) remains buildable before 5g delete.

**Production/default = `claude/new-session-3l99vs` @ `f57a75b` (#99).** The hub "+ New Channel" CTA now opens an
Aurora-native create surface (no legacy console). Sub-lanes 1-4 of the character-bench lane are DONE; only the
legacy-shell deletion (sub-lane 5) remains. Branch for new work: **start fresh off production** (keep your
harness-designated working-branch name).

### Copy-paste KICKOFF for the next session (rule 41 — paste this to start)
```
You are the Architect for the Reels Content Control Room dashboard (Next.js 15 / React 19 / Supabase, plain-CSS
"Aurora" design system; channel-first per D-6). You own judgment/specs/reviews/commits/merges; you never write
app code yourself — Codex builds, Fable-5 (cross-vendor) + suerta (same-vendor Opus, L-2) review, you squash-merge
via the GitHub MCP (owner recklessfrags, repo content-gen-dashboard).
FIRST: read docs/SESSION-HANDOFF.md top-to-bottom, then governance.md + AGENTS.md, then do a FRESH HQ fetch
(Notion 📮 Coordination Log, page 38fd346e-22d2-8133-bd2e-e5b7f97f7c2e — read the Open Cross-Team Items tracker +
Process Learnings Ledger) before planning or claiming anything blocked (rule L-1).
BRANCH: start fresh off production `claude/new-session-3l99vs` (git fetch origin claude/new-session-3l99vs &&
git checkout -B <your-working-branch> origin/claude/new-session-3l99vs); keep the harness-designated branch name.
NOTE: a fresh container has NO node_modules — run `npm ci` first. QA creds (.env.local) are ephemeral per
container — re-request; run ratify as `set -a; . ./.env.local; set +a; node scripts/ratify-*.mjs`.
TASK: sub-lane 5 of docs/slices/slice-character-bench-retire-legacy.md — the PAYOFF. Sub-lanes 1-4 SHIPPED
(#92/#94/#96/#99). Do the REACHABILITY SWEEP first (§3/Q2): enumerate EVERY legacy-`.cr`-only reachable action
(roster character CRUD/bible/history/restore/casting, channel edit+DELETE, ideas/wire capture, queue drill-down,
runs, global cost, export) and confirm each has an Aurora home BEFORE deleting anything. Known gaps to resolve or
sub-lane: ideas/wire is still legacy (the Aurora editor's "Log an idea →" opens the legacy wire board); channel
DELETE currently only in the legacy channels console (workspace Guidelines tab hides delete). Then delete the `.cr`
return + openLegacyConsole + the legacyShellOpen interim + the dead channelsAutoNew state, and drop the `?view=`
handling. CONSENSUS review (Fable+suerta) on the delete step — it's reachability-critical. Live-ratify no capability
lost. Keep chat terse (L-3).
```

### What shipped this session (all merged to production)
- **Sub-lane 4 (#99, squash `f57a75b`) — Aurora New-channel create form.** Hub "+ New Channel" now opens an
  Aurora surface instead of `openLegacyConsole("channels")` (killed the overwrite-`default` footgun + the paradigm
  switch — `slice-newcomer-journey-fixes.md` #1 durable tier). Reuses `ChannelProfilesPanel` in a new **`createOnly`**
  mode (blank form via `creating=true`+`startNew`; hides master list/mobile picker/delete via
  `isScopedLayout = scopedChannel || createOnly`; reuses the Lane-3a `.channel-profiles.scoped` re-skin + the
  `upsert`/validation/persona wiring VERBATIM; `onCreated` closes+toasts). ControlRoom: `newChannelOpen` state +
  a `[scope]` effect that closes it on leaving the hub. **Review: no blockers.** **Ratify
  `scripts/ratify-newchannel-aurora.mjs` 20/20, ZERO live writes** (blank/editable codename, NEW ROW, no master
  list, defer-to-save, exactly one write carrying the NEW codename & never `default`, abandon writes nothing).
- **Sub-lane 3 ratify + polish (#98, squash `2685cfb`).** Closed #96's deferred live-ratify —
  `scripts/ratify-character-bench-sublane3.mjs` **24/24, zero live writes** (Aurora skin confirmed on the real
  build: frosted `blur(8px)` backdrops, translucent surfaces, de-militarised headings; AA latest badge 8.01 dark /
  5.55 light, body 8.07 / 5.65; reduced-motion; scoping). Polish: light-theme accent-glow re-tint (cyan→#0066FF
  under `[data-theme="light"]`) + trimmed the dead ≤880px bench-savebar `padding-bottom`.

### Process notes (this session)
- **QA creds were provided → the ratify harness is WARM this container** (`.env.local` = Supabase URL + anon +
  `RATIFY_EMAIL`/`PASSWORD`). Both sub-lane-3 and sub-lane-4 ratified green. Creds are ephemeral — re-request next
  container. Run pattern: `set -a; . ./.env.local; set +a; node scripts/ratify-*.mjs`.
- **Fresh-container gotcha (re-confirmed):** `node_modules` absent on cold start → `npm ci` (~15s) before any
  tsc/vitest/next-build, else every check false-fails "Cannot find module".
- **createOnly reuse pattern worked cleanly** — a big legacy panel re-homed to an Aurora surface with a single
  boolean prop + a derived layout flag, zero write-path change. The `isScopedLayout` seam (scopedChannel ‖
  createOnly) generalised Lane-3a's scoped-workspace path to the create surface.

### NEXT — sub-lane 5: sweep BLOCKED the delete; 2 of 6 gaps now closed (5d + 5e SHIPPED)
- **The reachability sweep (2026-07-05) BLOCKS the delete** — six capabilities had no Aurora home. Progress:
  - **5d Global Cost Box** — ✅ **SHIPPED (#103, `6b2f7b7`)** — `CostBoxDashboard` → in-Aurora `.cost-center.scoped`
    surface (from the workspace Cost tab CTA). Ratify 21/21, zero writes.
  - **5e System Overview** — ✅ **SHIPPED (#102, `f192f5c`)** — `OverviewDashboard` → `?hub=overview`
    `.overview-hub.scoped` (was a stub). Ratify 21/21, zero writes.
  - **5a Channel DELETE** — small, but **not ratifiable today** (only `default` exists, undeletable; ratify
    intercepts writes so nothing is deletable). Hold until a 2nd channel exists.
  - **5b The Wire (ideas)** — capture + tagging + **enqueue-idea-as-run** (`EnqueueIdeaPanel`); big **write/money
    path**. **Needs operator go-ahead before building** (not an autonomous pick).
  - **5c Runs** / **5f Full queue browse + run-detail** — **data-blocked** (jobs.channel mismatch) — defer.
  - **then 5g DELETE** the `.cr` return + `openLegacyConsole` + `legacyShellOpen` + dead `channelsAutoNew` +
    `?view=` handling. **Consensus review (Fable+suerta)** + live-ratify no-capability-lost.
- **Remaining buildable before 5g: only 5b (The Wire) — and it's a write-path lane awaiting go-ahead.** 5a is
  untestable now; 5c/5f are data-blocked. So the shell can't be deleted until 5b lands (and 5c/5f un-block or are
  ruled acceptable-to-drop). The two low-risk read-dashboard re-skins (5d/5e) are done.
- **`DiscardChangesDialog`** relocation folds into 5g (its `globalOverlays` mount is outside the themed shell; the
  delete forces the fix).

### Live data reality (re-checked live 2026-07-05, `execute_sql`)
`channel_profiles` = **1** (`default` → Fine Print, `character_id` set). `characters` = **3** (Fine Print has 1
`character_bible_revisions` row; the others 0). `jobs` = **52 total, 2 now carry a `channel`** (was 0/50) — but
tagged **`weird_food`**, which matches NO `channel_profiles` codename (`default`); `ideas.channel` ∈ {Food, Dark
history} (free-text). So the three channel identifiers still don't reconcile → **Lane 3b (Production tab) stays
data-blocked** (for `default` there are 0 tagged jobs/ideas to drive the money-path live-ratify). `episodes` = **55,
36 with `character_id`** (per-character cost already live — nothing to build) **, 12 with `correlation_key`**.
**Phase-3 Lanes 2-3 stay data-blocked** (no channel-consistent thread). **HQ current (2026-07-05 fetch):** no new
inbound asks; knob-contract = A (grouped jsonb), held on pipeline Gate-2 + hold-lift; per-character-cost row
low-urgency (already satisfied by the 36 linked episodes).

---

## ⚡ EARLIER (2026-07-05) — CHARACTER BENCH SUB-LANE 3 SHIPPED (#96, squash `5cdcfb9`): Aurora re-skin of History/Compare/Restore.

**Production/default = `claude/new-session-3l99vs` @ `5cdcfb9` (#96).** The version-history overlays (HistoryDrawer,
CompareDialog, RestoreDialog confirm) now render in Aurora when opened from the `?hub=characters` editor. Branch for
new work: **start fresh off production** (keep your harness-designated working-branch name).

### Copy-paste KICKOFF for the next session (rule 41 — paste this to start)
```
You are the Architect for the Reels Content Control Room dashboard (Next.js 15 / React 19 / Supabase, plain-CSS
"Aurora" design system; channel-first per D-6). You own judgment/specs/reviews/commits/merges; you never write
app code yourself — Codex builds, Fable-5 (cross-vendor) + suerta (same-vendor Opus, L-2) review, you squash-merge
via the GitHub MCP (owner recklessfrags, repo content-gen-dashboard).
FIRST: read docs/SESSION-HANDOFF.md top-to-bottom, then governance.md + AGENTS.md, then do a FRESH HQ fetch
(Notion 📮 Coordination Log, page 38fd346e-22d2-8133-bd2e-e5b7f97f7c2e — read the Open Cross-Team Items tracker +
Process Learnings Ledger) before planning or claiming anything blocked (rule L-1).
BRANCH: start fresh off production `claude/new-session-3l99vs` (git fetch origin claude/new-session-3l99vs &&
git checkout -B <your-working-branch> origin/claude/new-session-3l99vs); keep the harness-designated branch name.
NOTE: a fresh container has NO node_modules — run `npm ci` before tsc/tests/build. QA creds (.env.local) are
ephemeral per container — re-request from the operator before any live-artifact ratify.
TASK: continue the Aurora character bench — docs/slices/slice-character-bench-retire-legacy.md. Sub-lanes 1 (read
bench, #92) + 2 (dossier editor re-home, #94) + 3 (history/compare/restore re-skin, #96) SHIPPED. NEXT = sub-lane 4:
the durable Aurora NEW-CHANNEL form (slice-newcomer-journey-fixes.md #1) so the hub "+ New Channel" no longer routes
through the legacy console. Then sub-lane 5 (reachability sweep + delete the legacy `.cr` shell — consensus review;
the payoff). Drive build→Fable+suerta→ratify→squash-merge. Ratify harness = scripts/ratify-*.mjs (prod build +
Chromium + Supabase bridge, intercept-and-abort); run it `set -a; . ./.env.local; set +a; node scripts/ratify-*.mjs`
(creds are process.env-scoped; password contains !). Keep chat terse (L-3).
```

### What shipped this session (merged to production)
- **Sub-lane 3 (#96, squash `5cdcfb9`) — Aurora re-skin of History / Compare / Restore. CHROME ONLY.** The three
  overlays (`HistoryDrawer`, `CompareDialog`, and the inline `RestoreDialog` confirm) are re-skinned to Aurora via a
  single scoped block (+290 lines) in `src/app/aurora.css` — **components + handlers + refs + JSX reused VERBATIM**,
  zero `.tsx` change. Frosted `blur(8px)` backdrops (legacy z-index 60/90/100 + click-to-close preserved);
  `--surface-1` glass surfaces; sans headings (no terminal uppercase); revision cards on `--surface-1` with an accent
  preview marker; semantic badges (latest → `--success`, archive → neutral); diff spans (`--text-main` over
  success/danger tint + underline/strike); dialog buttons → accent primary + bordered ghost (sub-lane-2 savebar
  treatment); `prefers-reduced-motion` zeroes the drawer animation + card transition; focus rings inherit the global
  `.aurora-app :focus-visible`.
  - **Strategy (sub-lane-2 precedent):** the dialogs render inside `.characters-bench.scoped .dossier` in the Aurora
    editor, so every override is prefixed `.aurora-app .characters-bench.scoped …` → re-skins exactly the Aurora
    instances. The SAME components mounted in the legacy `.cr` roster (also via `renderDossierEditor`) have neither
    ancestor class, so their `globals.css` styling is **untouched** (sub-lane 5 deletes it). `DiscardChangesDialog`
    shares `.restore-*` but mounts in `globalOverlays` (outside the scope) — **deferred, not re-skinned** (a visible
    consistency gap: the dirty-guard confirm stays legacy-dark over the Aurora shell; fold into sub-lane 4/5 or a
    polish pass).
  - **Review (independent AA/scoping lens — no blockers):** scoping double-gated (legacy `.cr` + the out-of-scope
    `DiscardChangesDialog` both provably unreachable by the new rules); AA both themes — latest badge **8.5:1 dark /
    5.8:1 light**, diff spans ~14–15:1, dialog body text 8.3/5.7, accent `.btn` 13.2 dark / 4.59 light (token floor,
    not introduced here); no behaviour/z-index/pointer-events change.
  - **Gates:** `tsc` + **148 tests** + `next build` clean. **Live-artifact ratify DEFERRED** — the `scripts/ratify-*`
    harness needs the ephemeral QA creds (`.env.local`), absent this container. It's a no-write CSS change (money-path
    risk nil), but the Aurora render + on-artifact AA sample are unverified on the live build; re-request creds and run
    `scripts/ratify-character-bench-sublane3.mjs` (to author) to close the gate.

### Process notes (this session)
- **A CSS-only, tightly-scoped sub-lane is genuinely low-risk** and closed in one build/verify/review pass — the
  opposite of sub-lane 2's monolith thrash. The scoping discipline (`.characters-bench.scoped` ancestor gate) is what
  makes "re-skin the Aurora instance, leave legacy intact" a one-file change instead of a fork.
- **Fresh-container gotcha:** `node_modules` is absent on a cold container — `npm ci` (fast, ~15s) before any
  tsc/vitest/next-build, or every check false-fails with "Cannot find module". Logged so the next session doesn't
  misread it as a code break.

### NEXT (remaining character-bench sub-lanes — §4 of the slice)
4. **New-channel Aurora form** — the durable Aurora tier of `slice-newcomer-journey-fixes.md` #1: an Aurora surface for
   creating a channel so the hub "+ New Channel" stops routing through the legacy console. **This is the next lane.**
5. **Reachability sweep + delete the legacy `.cr` shell** — only after 4 + confirming ideas/queue/runs/cost each have
   an Aurora home (ideas/wire is still legacy — the Aurora editor's "Log an idea →" opens the legacy wire board until
   this lane). **Consensus review (Fable+suerta) on the delete step.** The payoff.
- **Deferred cosmetic/consistency nits (non-blocking):** `DiscardChangesDialog` still legacy-dark over the Aurora
  shell (sub-lane 3 scope excluded it); off-token cyan `rgba(0,229,255,…)` glows in light theme (aurora.css
  ~1256/1478/1580); ≤880px `.dossier{padding-bottom:240px}` whitespace on the now-static bench savebar. Fold into
  sub-lane 4 or a polish pass.
- **Data-blocked (skip until `jobs.channel` populates):** Lane 3b Production runs, Phase-3 Lanes 2-3.
- **HQ open ask (answered, awaiting pipeline):** `channel_profiles` per-channel knob contract = **A (grouped jsonb)**;
  no build now (gated on pipeline Gate-2 + hold-lift).

---

## ⚡ EARLIER (2026-07-04) — CHARACTER BENCH SUB-LANE 2 SHIPPED (#94, squash `b392a10`): Aurora dossier editor re-home. NEXT = sub-lane 3 (history/restore re-skin).

**Production/default = `claude/new-session-3l99vs` @ `b392a10` (#94).** The dossier editor now lives in the Aurora
`?hub=characters` surface (grid|editor). Branch for new work: **start fresh off production** (keep your
harness-designated working-branch name).

### Copy-paste KICKOFF for the next session (rule 41 — paste this to start)
```
You are the Architect for the Reels Content Control Room dashboard (Next.js 15 / React 19 / Supabase, plain-CSS
"Aurora" design system; channel-first per D-6). You own judgment/specs/reviews/commits/merges; you never write
app code yourself — Codex builds, Fable-5 (cross-vendor) + suerta (same-vendor Opus, L-2) review, you squash-merge
via the GitHub MCP (owner recklessfrags, repo content-gen-dashboard).
FIRST: read docs/SESSION-HANDOFF.md top-to-bottom, then governance.md + AGENTS.md, then do a FRESH HQ fetch
(Notion 📮 Coordination Log, page 38fd346e-22d2-8133-bd2e-e5b7f97f7c2e — read the Open Cross-Team Items tracker +
Process Learnings Ledger) before planning or claiming anything blocked (rule L-1).
BRANCH: start fresh off production `claude/new-session-3l99vs` (git fetch origin claude/new-session-3l99vs &&
git checkout -B <your-working-branch> origin/claude/new-session-3l99vs); keep the harness-designated branch name.
TASK: continue the Aurora character bench — docs/slices/slice-character-bench-retire-legacy.md. Sub-lanes 1 (read
bench, #92) + 2 (dossier editor re-home, #94) SHIPPED. NEXT = sub-lane 3: re-skin HistoryDrawer / CompareDialog /
RestoreDialog to Aurora (they're already reachable + wired from the Aurora editor via renderDossierEditor — this
lane only re-skins the chrome, reuse the handlers/state verbatim). Then sub-lane 4 (new-channel Aurora form) and
sub-lane 5 (reachability sweep + delete the legacy .cr shell — consensus review). Drive build→Fable+suerta→ratify→
squash-merge. Ratify harness = scripts/ratify-*.mjs (prod build + Chromium + Supabase bridge, intercept-and-abort);
QA creds live only in gitignored .env.local (RATIFY_EMAIL/RATIFY_PASSWORD — password contains !, run the ratify as
`set -a; . ./.env.local; set +a; node scripts/ratify-*.mjs`; ephemeral per container — re-request). Keep chat terse (L-3).
```

### What shipped this session (both merged to production)
- **Sub-lane 1 (#92, squash `a845d5f`)** — read-only `?hub=characters` bench (cards + voice/visual cast chips +
  concept + draft badge; loading/error/empty; keyboard-activatable cards; additive "Characters →" entry). See the
  EARLIER section below.
- **Sub-lane 2 (#94, squash `b392a10`) — Aurora dossier editor re-home.** The dossier editor now renders inside
  the `?hub=characters` surface (`.characters-bench.scoped`, grid↔editor via `charactersBenchMode` + the existing
  `activeId`). **Strategy: reuse the legacy dossier JSX + `save()`/`character_bible_revisions`/dirty-guard/
  draft-create wiring VERBATIM under a scoped wrapper + an `aurora.css` restyle** (ChannelProfilesPanel precedent) —
  no new write path, no migration, no shared seam, `casting-proxy` untouched. Casting Studio + Visual Cast +
  History/Compare/Restore all reachable on the Aurora editor (panels moved into `globalOverlays`). Re-pointed to
  the Aurora editor: bench cards, bench "+ New character", workspace "Manage all characters →", uncast "Create New".
  **The legacy `.cr` roster path is left INTACT** (sub-lane 5 deletes it).
  - **Review (both REQUEST-CHANGES → APPROVE):** the hard parts (verbatim write-path, single-fire dirty-guard on
    all nav paths, JSX verbatim, legacy intact) were clean from pass 1. Folded 4 BLOCKERs across 2 rounds: **B1**
    casting/visual dead on the Aurora editor (panels mounted only in the legacy subtree → moved to `globalOverlays`
    + reset on editor exit); **B2** "Log an idea →" no-op/URL-desync → `openLegacyConsole("wire")`; **B3** unscoped
    legacy `.savebar` (`fixed;left:84px`;transparent) broke @412 → scoped opaque `--surface-1` + `position:static`
    + ≤880px override; **B4** (introduced by the B1 fold) the exit-reset effects ran in the legacy shell too and
    wiped legacy "+ New character" drafts → gated the draft-discard/casting-reset on `!legacyShellOpen`.
  - **Ratify:** `scripts/ratify-character-bench-sublane2.mjs` **26/26, ZERO live writes** (all character writes
    intercept-and-aborted): editor renders in AuroraShell; **Save intercepts exactly one `characters` PATCH + one
    `character_bible_revisions` INSERT** with the edited payload, zero leaked; draft-create writes nothing before
    save; dirty-guard fires once; Casting/Visual open on the Aurora editor; "Log an idea →" opens the wire board;
    Manage→bench; savebar `position:static`+non-transparent+no-overflow @412; **legacy "+ New" draft survives**
    (B4 proof). `tsc` + 148 tests + `next build` clean.

### Process notes (this session — worth heeding)
- **Codex thrashed hard on the big restructure** (stopped to ask twice, broke the JSX, once hallucinated a fix
  against a wrong path). Rule-16 signal on large monolith restructures. Mitigations that worked: precise,
  line-cited fold prompts; "proceed autonomously, don't stop to ask"; the Architect verifying tsc/test/build every
  round (Codex's self-reported "all green" was once false). For a big lane, expect several fix passes — reserve
  budget (rule 30). Consider smaller sub-lanes.
- **Reviewer convergence caught two rounds of real bugs** the green floor + tests were blind to (dead affordances,
  the legacy-draft-wipe regression the B1 fold introduced). Two independent lenses earned their keep on a
  write-path lane. A fold can introduce a new BLOCKER — always re-review the delta (rule 7).
- **Ratify traps (still current):** run the ratify with `set -a; . ./.env.local; set +a` (creds are `process.env`,
  not just NEXT_PUBLIC); flip `data-theme` on the `.aurora-app [data-aurora-shell]` div (not `<html>`); composite
  the full translucent stack over the first OPAQUE ancestor for AA; exclude env-only console noise
  (fonts CDN / ERR_CONNECTION_RESET / **ERR_CERT_AUTHORITY_INVALID** from the agent proxy).

### NEXT (remaining character-bench sub-lanes — §4 of the slice)
3. **History/restore re-skin** — Aurora `HistoryDrawer` / `CompareDialog` / `RestoreDialog`. They're already
   reachable + wired from the Aurora editor (`renderDossierEditor`); this lane re-skins the chrome only (reuse the
   handlers/state verbatim). **This is the next lane** — smaller/safer than sub-lane 2.
4. **New-channel Aurora form** — durable tier of `slice-newcomer-journey-fixes.md` #1.
5. **Reachability sweep + delete the legacy `.cr` shell** — only after 1–4 + confirming ideas/queue/runs/cost each
   have an Aurora home (ideas/wire is still legacy — the Aurora editor's "Log an idea →" deliberately opens the
   legacy wire board until this lane). **Consensus review (Fable+suerta) on the delete step.** The payoff.
- **Deferred cosmetic nits (from #94 review, non-blocking):** off-token cyan `rgba(0,229,255,…)` glows in light
  theme (aurora.css ~1256/1478/1580); ≤880px `.dossier{padding-bottom:240px}` whitespace on the now-static bench
  savebar. Fold into sub-lane 3 or a polish pass.
- **Data-blocked (skip until `jobs.channel` populates):** Lane 3b Production runs, Phase-3 Lanes 2-3.
- **HQ open ask (answered, awaiting pipeline):** `channel_profiles` per-channel knob contract = **A (grouped
  jsonb)**; no build now (gated on pipeline Gate-2 + hold-lift).

---

## ⚡ EARLIER (2026-07-04) — CHARACTER BENCH SUB-LANE 1 SHIPPED (#92, squash `a845d5f`): Aurora `?hub=characters` read surface.

**Production/default = `claude/new-session-3l99vs` @ `a845d5f` (#92).** First sub-lane of the character-bench lane
(`slice-character-bench-retire-legacy.md`) is live: a **read-only** Aurora "Characters" bench. Branch for new
work: **start fresh off production** (keep your harness-designated working-branch name).

### Copy-paste KICKOFF for the next session (rule 41 — paste this to start)
```
You are the Architect for the Reels Content Control Room dashboard (Next.js 15 / React 19 / Supabase, plain-CSS
"Aurora" design system; channel-first per D-6). You own judgment/specs/reviews/commits/merges; you never write
app code yourself — Codex builds, Fable-5 (cross-vendor) + suerta (same-vendor Opus, L-2) review, you squash-merge
via the GitHub MCP (owner recklessfrags, repo content-gen-dashboard).
FIRST: read docs/SESSION-HANDOFF.md top-to-bottom, then governance.md + AGENTS.md, then do a FRESH HQ fetch
(Notion 📮 Coordination Log, page 38fd346e-22d2-8133-bd2e-e5b7f97f7c2e — read the Open Cross-Team Items tracker +
Process Learnings Ledger) before planning or claiming anything blocked (rule L-1).
BRANCH: start fresh off production `claude/new-session-3l99vs` (git fetch origin claude/new-session-3l99vs &&
git checkout -B <your-working-branch> origin/claude/new-session-3l99vs); keep the harness-designated branch name.
TASK: continue the Aurora character bench — docs/slices/slice-character-bench-retire-legacy.md. Sub-lane 1
(Aurora Characters read surface) SHIPPED (#92). NEXT = sub-lane 2: re-home the DOSSIER EDITOR into Aurora (the
bible fields + save() + character_bible_revisions snapshot + dirty-guard + in-memory draft-create, dash #88),
and re-point the bench cards + workspace "Manage all characters →" + uncast "Create New" to the Aurora editor
instead of the legacy roster. Drive build→Fable+suerta→ratify→squash-merge.
Ratify harness = scripts/ratify-*.mjs (prod build + Chromium + Supabase bridge, intercept-and-abort = zero live
writes); QA creds live only in gitignored .env.local (RATIFY_EMAIL/RATIFY_PASSWORD — password contains !, quote
it; ephemeral per container — re-request). Keep chat terse (rule L-3).
```

### What shipped this session (merged to production)
- **Character bench SUB-LANE 1 (#92, squash `a845d5f`) — ✅ SHIPPED.** New Aurora **read-only** `?hub=characters`
  surface: `src/components/aurora/CharactersHub.tsx` (card grid — one card per character: cast/uncast avatar,
  codename, concept, **Draft** badge, and two status chips **Voice** (`isCast`) + **Visual** (`isVisuallyCast`),
  reused verbatim; loading / error-with-Retry / empty states). Route: `characters` added to `HubKey`/`HUB_KEYS`
  (`route.ts` + test); dispatch branch in `ControlRoom` renders the bench in `AuroraShell`. Additive
  **"Characters →"** entry button in the Channels hub header (via an optional `onOpenCharacters` prop that flows
  through the `HubLanding`→`ChannelsHub` spread — no `HubLanding` edit needed); **Back to Channels** on the bench.
  Card activation (click / Enter / Space) opens that character in the **existing legacy roster editor**,
  pre-selected. **Read-only** — no migration, no shared seam, `casting-proxy` untouched, no new write path; the
  workspace "Manage all characters →"/"Create New" paths are UNCHANGED (sub-lane 2's job).
- **Review (both REQUEST-CHANGES → APPROVE):** Fable-5 (cross-vendor) + suerta (L-2) independently converged on
  the SAME two BLOCKERs: (1) card-activation **triple-wrapped the dirty-guard** (`guardDirtyAction` +
  `guardedSetActiveId` + `openLegacyConsole` each guard) → on the dirty/confirm path the inner guards re-defer,
  **double-prompting** and opening the roster on the WRONG character. Folded by extracting
  **`openLegacyConsoleUnguarded`** (the former guarded body) so `openLegacyConsole` wraps it in ONE guard
  (byte-identical for existing callers) and `handleOpenCharacter` runs `setActiveId(id)`+unguarded-open under a
  single guard. (2) error **Retry passed the click event as `refetch`'s `onLoaded` callback** → TypeError on a
  successful retry; fixed to `() => void refetchCharacters()`. Plus a Fable nit (folded): filter the synthetic
  `__draft__` row out of the bench VM so no phantom "Untitled Character" card (gate B2).
- **Ratify:** `scripts/ratify-character-bench-sublane1.mjs` **22/22, ZERO live writes** (prod build + Chromium +
  Supabase bridge): bench renders in AuroraShell; card count == live rows (3) + codenames + no phantom draft;
  Voice/Visual chips == `isCast`/`isVisuallyCast` truth; entry button + Back; click/Enter open the clicked
  character in the roster; focus-visible; status-chip AA **8.46:1 dark / 5.76:1 light**; no h-overflow @412; no
  app console errors. `tsc` + 148 tests + `next build` clean.
- **Ratify traps re-logged:** (a) `.env.local` creds are `process.env`-scoped — the ratify script reads
  `RATIFY_EMAIL/PASSWORD` from the env, so run it as `set -a; . ./.env.local; set +a; node scripts/ratify-*.mjs`
  (loadDotEnvLocal only injects the NEXT_PUBLIC vars into `next start`). (b) A chip-contrast sampler must
  composite the **full translucent stack over the first OPAQUE ancestor** (grabbing the chip's own 15%-tint bg
  gives a bogus ~1.00 — the known translucent false-report). (c) The theme lives on the **`.aurora-app`
  `[data-aurora-shell]` div**, not `<html>` — flip `data-theme` there (it sits nearer the chip and wins) to
  actually sample the light theme.

### Live data reality (re-verify with `execute_sql`, don't trust this cached view)
`characters` = **3** — Fine Print (draft, voice-cast, not visually-cast), Grandma Pearl (draft), Mad Dog McGrath
(active); **all 3 have a `voice_id` → `isCast`=true; NONE have a `reference_image_url` → `isVisuallyCast`=false;
no persisted draft rows.** `channel_profiles` = **1** (`default` → Fine Print via `character_id`). `jobs.channel`
still **0/50** → Lane 3b + Phase-3 Lanes 2-3 stay **data-blocked** (skip).

### NEXT (the remaining character-bench sub-lanes, in order — §4 of the slice)
2. **Dossier editor re-home** — bible editor + `save()` + `character_bible_revisions` snapshot + dirty-guard +
   in-memory draft-create (dash #88) into Aurora `form-*` primitives; re-point the bench cards **and** the
   workspace "Manage all characters →" (`ControlRoom.tsx` ~2077/2128) + uncast "Create New" (~2218) to the Aurora
   editor. **This is the next lane.** Live-ratify the create/save path (intercept-and-abort, zero live writes).
3. **History/restore re-skin** — Aurora `HistoryDrawer`/`Compare`/`Restore`.
4. **New-channel Aurora form** — durable tier of `slice-newcomer-journey-fixes.md` #1.
5. **Reachability sweep + delete the legacy shell** — only after 1–4 + confirming ideas/queue/runs/cost each have
   an Aurora home. **Consensus review (Fable+suerta) on the delete step** (reachability-critical). This is the payoff.
- **Data-blocked (skip until `jobs.channel` populates):** Lane 3b Production runs, Phase-3 Lanes 2-3.
- **HQ open ask (answered, awaiting pipeline):** `channel_profiles` per-channel knob contract = **A (grouped
  jsonb)**; no build now (gated on pipeline Gate-2 + hold-lift).

### Process notes (this session)
- **Reviewer convergence as a quality signal.** Both lenses independently found the identical two BLOCKERs
  (guard triple-wrap; event-as-callback) — a well-scoped read-only lane still hid a real dirty-path interaction
  bug that `tsc`+tests are blind to. The composition smell ("wrap already-guarded helpers in another guard") is
  the tell; keep the dirty-guard **exactly once** on any new nav path.
- **Scope discipline paid off.** Keeping sub-lane 1 read-only (cards link into the *existing* editor; no re-point
  of "Manage all characters →") kept it a genuinely small, safe, independently-valuable ship — the re-point rides
  sub-lane 2 with the actual Aurora editor behind it.

---

## ⚡ EARLIER (2026-07-04) — LANE 2 SHIPPED + UI/UX AUDITED + FOLLOW-UPS #87–#90 LANDED. Character-bench lane specced.

**Production/default = `claude/new-session-3l99vs` @ `bf1c690` (#90).** Since Lane 2 (#84) this session ran two
**non-destructive** UI/UX audits and shipped every actionable follow-up. Branch for new work: **start fresh off
production** (keep your harness-designated working-branch name).

### Copy-paste KICKOFF for the next session (rule 41 — paste this to start)
```
You are the Architect for the Reels Content Control Room dashboard (Next.js 15 / React 19 / Supabase, plain-CSS
"Aurora" design system; channel-first per D-6). You own judgment/specs/reviews/commits/merges; you never write
app code yourself — Codex builds, Fable-5 (cross-vendor) + suerta (same-vendor Opus, L-2) review, you squash-merge
via the GitHub MCP (owner recklessfrags, repo content-gen-dashboard).
FIRST: read docs/SESSION-HANDOFF.md top-to-bottom, then governance.md + AGENTS.md, then do a FRESH HQ fetch
(Notion 📮 Coordination Log, page 38fd346e-22d2-8133-bd2e-e5b7f97f7c2e — read the Open Cross-Team Items tracker +
Process Learnings Ledger) before planning or claiming anything blocked (rule L-1).
BRANCH: start fresh off production `claude/new-session-3l99vs` (git fetch origin claude/new-session-3l99vs &&
git checkout -B <your-working-branch> origin/claude/new-session-3l99vs); keep the harness-designated branch name.
TASK: the next substantial lane = the Aurora character bench that retires the legacy roster shell —
docs/slices/slice-character-bench-retire-legacy.md. Start with sub-lane 1 (Aurora "Characters" read surface:
cards + cast/visual status + links), the small safe foothold. Drive build→Fable+suerta→ratify→squash-merge.
Ratify harness = scripts/ratify-*.mjs (prod build + Chromium + Supabase bridge, intercept-and-abort = zero live
writes); QA creds live only in gitignored .env.local (RATIFY_EMAIL/RATIFY_PASSWORD — password contains !, quote
it; ephemeral per container — re-request). Keep chat terse (rule L-3).
```

### What shipped this session (all merged to production)
- **Phase-2 Lane 2 — casting de-modaled + E1.b (#84, squash `8186ae15`)** — see the EARLIER section below; ratified 15/15.
- **UI/UX audits (non-destructive, no product change).** (a) A route-crawler (`scripts/audit-ui.mjs`, #86) — every
  Aurora + legacy surface × desktop/mobile, screenshots + programmatic checks (overflow/tap-targets/contrast/console);
  0 writes persisted, 0 overflow bugs, 0 console errors. (b) An **agentic newcomer journey** (a Claude subagent drove
  "create a new niche channel start-to-finish" against prod with casting intercepted + established rows write-protected,
  then torn down). Report published as an Artifact; findings drove the fixes below. **Key method lesson (in the HQ
  ledger):** trust the crawler's geometry/overflow, treat its auto-contrast as a lead to pixel-verify (it false-reports
  ~1:1 on translucent/gradient surfaces); a route crawl can't find journey friction — an agentic walkthrough can.
- **Follow-ups (#87–#90):** quick-wins (chip 44px tap floor, neutral "currently cast" notice, de-duped hub pill, honest
  Production copy) `#87`; **persona-from-concept** (suggestPersona now reads `description` as the primary topic signal,
  concept beats incidental treatment/fact_anchor) + **no-stub character** (in-memory draft, `DRAFT_CHARACTER_ID`, first
  save persists — no DB litter) `#88`; **casting Aurora re-theme** (inline casting/visual now a fixed dark Aurora
  console; Fable caught real AA blockers on error/confirm/winner STATES — folded with fixed on-dark colors #FF6B81/
  #34D399, NOT theme-flipping tokens; re-ratified 15/15) + **New-Channel decoy fix** (hub "+ New Channel" now lands on a
  blank create form, never the existing channel in edit mode) `#89`; **production-readiness checklist** (Production tab:
  Guidelines/Character/Voice/Visual ✓/○, read-derived) `#90`.

### Live data reality (re-verify with `execute_sql`, don't trust this cached view)
`channel_profiles` = **1** (`default` → **Fine Print** via `character_id`; Fine Print is **voice-cast, NOT
visually-cast**) → the workspace Character tab renders the CAST branch + readiness shows 3/4. `characters` = **3**
(Fine Print, Grandma Pearl, Mad Dog). `jobs.channel` still **0/50** → Lane 3b (Production runs) + Phase-3 Lanes 2-3
(per-channel Runs/Cost) stay **data-blocked** (skip). Phase-3 threading is unblocked (`episodes.correlation_key` shipped).

### NEXT (pick per value; character bench is the recommended big lane)
- **Aurora character bench → retire the legacy roster shell** (`slice-character-bench-retire-legacy.md`) — the recurring
  root cause of the audit findings (#2 paradigm switch on every create path, #6 duplicate casting/visual entry points)
  and the last piece of the channel-first migration (finishes Lane 5's dual-shell retirement). 5 incremental sub-lanes;
  **start with sub-lane 1 (bench read)**. De-risked by prior work (FK, inline casting, draft-create, Aurora primitives).
- **Open journey items** not yet built: `slice-newcomer-journey-fixes.md` #1 durable tier (Aurora new-channel form) +
  #2/#6 (fold into the bench). **Casting re-theme mobile disclosure** (optional half of `slice-casting-aurora-retheme.md`).
- **HQ open ask (answered, awaiting pipeline):** the `channel_profiles` per-channel knob contract A/B/C storage fork —
  dashboard replied **A (grouped jsonb)** + acked the two notes (platforms define full specs; non-food fact_anchor
  fail-closed lexicon). No build now (gated on pipeline Gate-2 + hold-lift); lands additively as a `dash_*` migration
  when it un-holds.
- **Data-blocked (skip until `jobs.channel` populates):** Lane 3b Production runs, Phase-3 Lanes 2-3.

### Process notes (this session)
- **Verification is a MEASURED gate.** The re-theme's happy-path AA sample missed error-state contrast — Fable caught
  it. Sample the STATES (error/confirm/winner), not just defaults; composite translucent layers when measuring.
- **Non-destructive audit pattern** (reusable): intercept-and-abort the money/edge/storage calls, write-protect
  established rows, create-then-teardown throwaways — no product "revert" needed to test safely.

---

## ⚡ EARLIER (2026-07-04) — PHASE-2 LANE 2 "CASTING DE-MODALED" + E1.b SHIPPED (#84, squash `8186ae15`).

Branch **`claude/casting-de-modaled-phase2-skinrd`** off production **`8186ae15`**. The Casting Studio (voice) +
Visual Identity panels are now an **inline split-screen region of the workspace Character tab** instead of modal
overlays. Pure UI re-home — **no migration, no shared-seam change** (worker doesn't read `channel_profiles.character`;
`casting-proxy` untouched); HQ announce-only note posted.

- **What landed:** a `variant: "modal" | "inline"` prop on `CastingStudioPanel` + `VisualIdentityPanel`. Inline drops
  the fixed overlay / body scroll-lock / outer focus-trap while **reusing every handler verbatim** and keeping the
  inner sub-dialogs (save-template, browse-records drawer, audition lock-confirm) focus-trapped. Inline preserves the
  panels' exact internal (parchment) surfaces so measured AA carries over — only the chrome changed. The **legacy roster
  savebar keeps the modal path** (default variant) → no capability lost. Workspace Character tab cast state renders the
  panels inline (dossier + Visual side-by-side, Casting Studio full-width below; stacks ≤720px, Q2). **E1.b** folded:
  `suggestPersonaForChannel(channelProfile)` pre-selects the Casting persona chip only when the character has no saved
  `voice_recipe` — operator-overridable, non-binding, **seed-once** (via a ref, out of the reset-effect deps so a late
  channel suggestion can't clobber in-progress edits); inline panels keyed on `castChar.id` for clean per-character remount.
- **Invariants preserved (behavior-identical):** cancel = no-write/no-spend · `voice_recipe` birth-certificate write
  stays behind the audition lock-confirm ack gate · daily cap · modal path untouched.
- **Review:** Fable-5 (cross-vendor) round-1 **BLOCKER** — inline panels render under `.aurora-app` not `.cr`, losing
  the `.cr`-scoped base rules so casting textareas typed near-black on the dark surface (`globals.css:21` is the only
  rule coloring `.field` inputs). Folded: re-established those rules scoped to `.casting-inline`/`.visual-inline`
  (faithful to the shipped modal) + fixed backdrop/viewport positioning for inline sub-dialogs (the lock-confirm money
  gate is now a true modal) + inline loading-dim selector. suerta (same-vendor L-2) — no BLOCKER (no-spend-on-mount,
  birth-certificate write, ref-image degrade, tokens all verified). Both flagged the persona clobber → seed-once + key.
- **Ratify:** `scripts/ratify-phase2-lane2.mjs` **15/15, ZERO live writes / ZERO live spend** (intercept-and-abort the
  `casting-proxy` calls + any `characters` write): inline render / no overlay, redirect removed, cast + empty states,
  no-spend-on-mount, generate wired-and-aborted, **CONFIRM LOCK birth-certificate write gated + intercepted**, 412px
  stack, **E1.b pre-select (`HUSHED NATURALIST` for the Animal channel) + safety (recipe wins) + overridable**,
  **textarea legibility 12.67:1 (BLOCKER-fix proof)**, no console errors. Live DB unchanged (Fine Print `voice_id`
  is the real EL id, not the harness fake). `tsc` + `build` clean.
- **Data reality (live, 2026-07-04):** `default` → `character_id` = Fine Print (voice-cast, **not** visually-cast) →
  the Character-tab cast branch renders live; Casting Studio = cast state, Visual Identity = empty/upload state.
- **Deferred residuals** (documented `slice-channel-first-phase2.md` §7): inline Visual-Identity staged-work is dropped
  on a *deliberate* tab-away (no write/spend lost; dossier dirty-guard untouched) — a workspace-nav dirty check is the
  clean fix; inline panels fan out 2 reads + 1 storage-sign per Character-tab visit (reads only) — lazy-load deferred.
- **NEXT:** Phase-2's remaining §4.1 refinements if wanted (mirror-sync-on-rename Q3, linked-but-unreadable defensive
  state — both single-operator-latent today), then **retire the legacy roster shell** (Lane 5 finished deep links; the
  full retire needs a global character bench that re-homes roster CRUD). Lane 3b + Phase-3 Lanes 2-3 stay **data-blocked**
  (`jobs.channel` still 0/50 — re-verify live). Phase-3 threading is unblocked (`episodes.correlation_key` shipped).

## ⚡ EARLIER (2026-07-04, continuation `…-cont-x8y66i`) — CHANNEL AUTO-GEN SHIPPED (#80, squash `d00a91b`): operator-invoked two-stage LLM guideline generation + cast brief + accept/reject review panel + keep-rate telemetry.

Branch **`claude/channel-first-phase1-cont-x8y66i`** (now off production **`bc27496`**, tip = #82). Since the
Phase-3 Lane 1 entry below, five PRs shipped: **#78** (Phase-2 Lane 1 — `channel_profiles.character_id` FK +
read-authority + picker), **#79** (channel `description` field + section-grouped Guidelines editor, `dash_0008`),
**#80** (the channel auto-gen feature), **#81** (GATES/handoff durable record), and **#82** (suerta fix-forward:
server error surfacing + client max-length guard). The operator explicitly drove #80 "start to merge" and chose
**all four grandiose layers**. The auto-gen feature is fully closed out — shipped, ratified, both review lenses
(Fable cross-vendor + suerta same-vendor) passed, and HQ updated.

- **Channel auto-gen (#80, squash `d00a91b`) — ✅ SHIPPED.** Operator writes a plain-language channel
  `description` → **Generate from concept** → an LLM proposes guideline fields the operator reviews (accept/
  reject) and Saves. Built on the `casting-proxy` pattern (Anthropic key server-side only; per-user daily cap;
  server-side enum clamp). Four layers:
  - **Two-stage generation** — edge function `channel-guideline-proxy` makes TWO Anthropic calls (stage 1 =
    prose editorial brief; stage 2 = forced-tool JSON mapping brief → guideline fields + assumptions +
    `cast_brief`). **ONE cap unit gates both calls** (10/day, `channel_guideline_bump_usage` atomic RPC).
    Model `claude-opus-4-8`, **no sampling params** (Opus 4.8 rejects `temperature`/`top_p`/`top_k` with a
    400 — this was the Fable BLOCKER). `arousal_ceiling` schema omits the blocked value AND every enum is
    server-clamped; a defense-in-depth client re-clamp guards against a stale edge deploy.
  - **Accept/reject review panel** (`ChannelProfilesPanel.tsx`) — generation stages proposals; the form is
    filled only on **Apply**, the DB only on **Save**. Enforced dials flagged; the editorial brief + cast brief
    shown (cast brief copyable).
  - **Voice cast brief** — stage 2 emits a 200–600 char ElevenLabs-ready `voice_description`; on Save it's
    stashed in `localStorage` keyed by the assigned `character_id`, and the **Casting Studio** offers a one-click
    "Seed from channel cast brief" for the voice design. Auto-gen NEVER casts or writes `characters`
    (pipeline boundary). Durable server column deferred (needs HQ worker-read confirmation).
  - **Keep-rate telemetry** — `dash_0010` (dashboard-owned, owner-scoped RLS, `user_id` default `auth.uid()`);
    on Save, proposed-vs-saved rows written best-effort (never blocks the Save).
  - **Review:** Fable-5 **BLOCK** (the `temperature`-400 that would 400 every generation *after* consuming a
    cap unit) → folded + 4 more (anthropicError → 502 never mirroring upstream status/text; `max_tokens`
    handled both stages; client enum re-clamp). Fable verified all 8 hard invariants against the code.
  - **Ratify:** cap RPC live-tested (allowed→used=1, at-cap→blocked/used=10, atomic guard held);
    `scripts/ratify-channel-autogen.mjs` **9/9, zero live writes** (no-auto-fill, accept-gated, no-auto-persist,
    no `aggressive` through Apply/Save, telemetry proposed-vs-saved, cast-brief stash by `character_id`, cap-429
    handling); **one live generation** against the deployed function (verify_jwt:true, real key) produced a
    coherent brief + safe-floor enums + a usable cast brief (operator quality gate). `tsc` + `build` clean.
  - **Live state:** edge function `channel-guideline-proxy` **deployed** (v1, verify_jwt:true); `dash_0009`
    (cap) + `dash_0010` (telemetry) **applied**; types regenerated. **`ANTHROPIC_API_KEY` set by the operator.**
  - **suerta (same-vendor L-2 second lens, #82):** independently re-derived and **CONFIRMED correct** the
    migrations (RLS + `auth.uid()` default no-forge; cap RPC race-safe + privilege-tight), money path, key
    custody, no-auto-persist gating, triple-gated enum safety, and the characters boundary. Two minor client-only
    findings **fixed in #82** (`edgeErrorMessage` now surfaces the server's typed error body on 400/502 instead of
    the generic supabase-js string; `DESCRIPTION_MAX=2000` client guard). F3/F4 nits (cast-brief localStorage
    last-writer-wins; no `user_id` index on the write-only telemetry table) deferred + documented in
    `slice-channel-autogen.md` §8.
  - **HQ (Coordination Log) — current.** Posted the cross-team heads-up (E2 auto-gen SHIPPED = the
    channel-researcher the pipeline tracked as deferred; `dash_0009`/`dash_0010` announce), flipped the stale
    **E2 tracker row → SHIPPED**, and logged the `temperature`-400 lesson to the Process Learnings Ledger. No new
    pipeline inbound owed.
  - **NEXT:** operator quality-audit the live generations (the only non-programmatic gate); if v1 quality holds,
    the deferred richness (per-field regenerate, durable `channel_profiles.cast_brief` column pending HQ, a
    telemetry read-out) rides the same edge response shape — no rework. Fable's deferred nits (cap refund on
    upstream outage; CORS origin env; telemetry post-normalization + `strict` tool) are logged in
    `docs/slices/slice-channel-autogen.md` §8.

### Session close state (2026-07-04, `…-cont-x8y66i`) — pick up here
- **Data reality re-checked (live DB):** `episodes.character_id` is now **31/50** (was 0) → the HQ-tracked
  **per-character cost drill-down is now live for free** — `CostBoxDashboard` already renders `characterSplit`;
  it only needed character-linked runs, which now exist. **Nothing to build there.** `jobs.channel` still
  **0/50** → Lane 3b + Phase-3 Lanes 2-3 remain **data-blocked** (per-channel Runs/Cost can't be built until the
  pipeline tags jobs with a channel). `channel_profiles` = 1 (`default`), `characters` = 3, `channel_guideline_telemetry` = 0 (operator hasn't used auto-gen yet).
- **NEXT LANE (the one substantial *unblocked* build) = Phase 2 Lane 2 — "Casting de-modaled"**
  (`docs/slices/slice-channel-first-phase2.md` §4.2). HQ-confirmed unblocked (worker does NOT read
  `channel_profiles.character`; no expand/contract). Move Casting Studio (voice) + Visual Identity out of modal
  overlays into a **split-screen region of the workspace Character tab** — **reuse the handlers/logic verbatim**
  (dirty-guard, cancel = no-write/no-spend, the `voice_recipe` birth-certificate write must all survive the
  de-modal), rebuild only the chrome. Folds in **E1.b** (pre-select the mapped casting persona chip, overridable).
  It's a full build→Fable+suerta→ratify→merge cycle (a UI restructure where operator taste matters); §5 gates are
  falsifiable + QA-creds-required (`scripts/ratify-*.mjs` pattern). §6 open items: reviewer-trio first; Q2 =
  split-screen treatment at 412px (stacked/disclosure on mobile).
- **Pipeline shipped (read-only for us, no action owed):** Visual-Sourcing **Wave A/B** (#64/#65) added additive
  `RenderManifest` receipt fields — `visual_distinctness`, `visual_reuse_advisory`, `visual_relevance`. Optional
  future surfacing on an episode/receipt/operator-watch view; nothing owed.
- **Governance note:** rules **30 & 33** were folded pipeline-side (measure a run by what ships; cap spec review
  ~2 rounds) — the operator syncs the dashboard `governance.md` mirror directly (standing convention); not a
  dashboard build task.

## Earlier (2026-07-04, `…-cont-x8y66i`) — Phase-3 LANE 1 SHIPPED (#75, squash `1475b24`): non-null re-enqueue keys + `idea_job_map` provenance, money-path live-ratified 15/15 (zero live writes).

Branch **`claude/channel-first-phase1-cont-x8y66i`** (off production `ced2c08`). **Trigger:** the pipeline
shipped `episodes.correlation_key` (7 episodes carry it) — this LIFTED Phase-3's structural gate AND made
the dashboard's null-key bug **active** (approval re-enqueues forced `idempotency_key:null` → null-in-null-out
→ money-spending re-runs un-threadable). Phase 2 stays **blocked** (worker-read ASK still 🟡 OPEN, unanswered);
Lane 3b stays **data-blocked** (`jobs.channel` 0/50). So the timely lane = **Phase-3 Lane 1**.

- **Phase-3 Lane 1 (SCOPED per Fable) — ✅ SHIPPED (PR #75, squash `1475b24`).** Was commits `3ef5b5d`
  (build) + `5f2f4c9` (fold) + `039e981` (ratify harness).
  - **What landed (code):** the three approval re-enqueue builders (`buildSpend/Fact/PublishApprovalReenqueue`,
    `src/lib/jobs.ts`) now PRESERVE the caller-supplied key instead of forcing `null`; `confirmQueueAction`
    (`ControlRoom.tsx`) sends a fresh `job_rerun_<id>_<ts>` key on ALL re-enqueue actions (avoids the
    `idempotencyKeyFor` 409 trap) and writes an `idea_job_map` provenance row (job-first, ordered, non-blocking;
    re-enqueue recovers `idea_id` from the parked row's key). New dashboard-owned migration
    `dash_0006_idea_job_map` (owner-scoped, ownership-integrity RLS, `idea_id` ON DELETE SET NULL). Tests +
    `database.types.ts` + `data-contract.md` updated. **DEFERRED (Fable ruling):** the §3.4 `enqueue_job_with_map`
    RPC + Lane 2 resolver + Lane 3 per-channel Runs/Cost UI (their consumers are data-blocked).
  - **Review:** Fable-5 round-1 **REQUEST-CHANGES** caught a real diff-introduced money-path BLOCKER — a
    double-submit race (`setQueueActionSubmitting(false)` fired before the awaited `idea_job_map` lookup closed
    the dialog → a 2nd confirm click inserted a duplicate fresh-key spend job = double spend). Folded (`5f2f4c9`:
    hold `submitting` true across the lookup; release with `setPendingQueueAction(null)`). Fable re-audit
    **APPROVE**. Also corrected the stale contract prose ("publish sets both flags" — false; publish_only skips
    render, no re-spend, does NOT force spend).
  - **Migration:** `dash_0006` **APPLIED live** (HQ heads-up posted first — Coordination Log §2026-07-04). Structure
    verified (5 cols, 4 RLS policies, RLS on, `idea_id` FK=SET NULL, `owner` FK=CASCADE); types match live.
    **SET NULL proven** via an MCP seed→delete-idea→assert→cleanup round-trip (map row survives with `idea_id`
    null, `channel`/`owner` kept — channel-level cost preserved).
  - **Money-path live-ratify — 15/15, ZERO live writes** (`scripts/ratify-lane1.mjs`, intercept-and-abort;
    GATES `L1-1..L1-17`): non-null unique `job_rerun` keys on spend/publish/stale, double-gate step1/step2,
    payload flag identity (publish does NOT force spend), the double-submit race fix (triple-confirm → 1 write),
    `idea_job_map` provenance incl. seeded positive recovery (`idea_id` recovered). `dash_0006` applied live;
    **SET NULL proven** via an MCP round-trip. Live `jobs` == 50 before/after (no money writes leaked).
  - **NEXT — Phase 2 is now UNBLOCKED (pipeline ANSWERED the worker-read ASK, 2026-07-04):** the worker does
    **NOT** read `channel_profiles.character` (grep-verified — `load_channel_profile()`/`_profile_from_row()`
    consume only `channel`+`engagement_posture`; character resolves from the job's `character` param →
    `characters`). So the Phase-2 FK is safe with **NO expand/contract window and NO pipeline migration** — the
    spec's "keep `character` populated through cutover" (the `if-yes` branch) is unnecessary; retire the free-text
    whenever the DASHBOARD's own reads move to `character_id` (Lane 3c's best-effort name-match is the only
    remaining reader). **Simplify `slice-channel-first-phase2.md` §2/§3 accordingly at build.** ⚠️ Data-ratify
    caveat: Phase-2's payoff (FK link + de-modaled casting on a CAST character; hub avatar via `character_id`)
    can't be fully live-demonstrated while `default` is the only channel AND uncast — cast `default`→Fine Print
    (operator, ungated: setting `channel_profiles.character` is normal config, NOT the retire-the-column ASK) to
    make it demonstrable, or ratify the migration/backfill (0-row on uncast) + build the FK-preference logic and
    ratify the cast-state once a channel is cast.
  - **Also NEXT (unchanged gates):** Lane 3b (data-blocked, `jobs.channel` 0/50 — re-check via `execute_sql`);
    Phase-3 Lanes 2-3 (resolver + per-channel Runs/Cost UI) + §3.4 RPC — build when real channel-tagged threaded
    data exists (Lane 1 now captures the provenance so future idea→job→episode threads accumulate).
- **HQ:** heads-up posted (Coordination Log, 2026-07-04) — the non-null idempotency-key seam change (one grep
  ask back: does any pipeline tooling treat null key as "approval re-run"?) + the `dash_0006` announce.

---

## ⚡ LATEST (2026-07-04, continuation `…-cont-t38jxy`) — Lane 5 SHIPPED: legacy `?view=`→hub deep-link redirect (roster-preserving), live-ratified 12/12. Read this first.

Branch **`claude/channel-first-phase1-cont-t38jxy`**, fresh off production (was tip `5eef5f9`, post-Lane-3c).
This session shipped **Lane 5** — reinstating slice §3-Q3's one-time legacy `?view=`→`?hub=channels`
`replaceState` redirect that was commented out during the dual-shell interim.

- **Lane 5 — legacy deep-link redirect (roster-preserving) — ✅ SHIPPED (PR #73, squash `78d03f0`).**
  Codex built (ControlRoom.tsx only) → **Fable-5 REQUEST-CHANGES (1 real BLOCKER)** → Option A fold →
  **Fable-5 re-audit APPROVE-WITH-NITS** → **live-artifact ratify 12/12** (`scripts/ratify-lane5.mjs`).
  - **What landed:** the cold-mount init effect no longer intercepts legacy `?view=` links into the legacy
    console. They fall through to `parseScope`, which already canonicalizes any `?view=` to the default hub
    → a stale bookmark cleanly lands on the Aurora Channels hub (one-time `replaceState`, no history entry,
    no 404). **The change is a ~5-line delete + 2-line fix** — `route.ts`'s `parseScope` already had the Q3
    mapping; only the dual-shell interception in ControlRoom was removed.
  - **Gate 5 preserved (no capability lost):** the WARM `openLegacyConsole(...)` path + the `popstate`
    legacy-reopen branch are UNCHANGED. Character CRUD/bible/history/casting (roster), new-channel creation,
    ideas capture, runs drill-down stay reachable. **The dual shell is retired for DEEP LINKS only, not
    reachability** — the legacy roster is still the home for full character CRUD until the **Phase-2
    character bench** re-homes it (deleting it now would violate gate 5). "Retire the legacy shell"
    *completes* in Phase 2, not here.
  - **Lane-4 popstate nits folded:** `pendingQueueAction` now clears synchronously in `navigate`/
    `openLegacyConsole`/both popstate success callbacks (batched with the transition) — kills the one-frame
    armed-confirm flash on cross-shell popstate into the Action Center.
  - **⚠️ REVIEW-CAUGHT BLOCKER (the value of the gate, log it):** the deleted `?view=` branch was
    **silently load-bearing during the `channelProfilesLoading` window**. A legacy console opened via a CTA
    (HubLanding "Legacy console" / ChannelsHub "New Channel" — both live during load, gated only on
    `creating`) *while `channel_profiles` was still fetching* got **clobbered/snapped-shut** when the
    cold-mount init effect re-ran on load-resolve (`didInitScopeRef` not yet committed → it canonicalized the
    warm-pushed `?view=` back to `?hub=channels`, overwriting the pushed history entry). Invisible in the
    diff; only surfaced under adversarial tracing of the loading window. **Fix (Option A):** `navigate` +
    `openLegacyConsole` now set `didInitScopeRef.current = true`, so an explicit user nav settles the initial
    scope and the init effect no-ops. Ratified live via **L5-10** (delay the channel_profiles GET ~3s, click
    New Channel during it, assert the console survives resolve).
  - **RATIFY HARNESS re-warmed this container:** operator provided QA creds mid-session → gitignored
    `.env.local` written (URL + anon from Supabase MCP + `RATIFY_EMAIL`/`PASSWORD`). Clean rebuild AFTER
    `.env.local` (NEXT_PUBLIC baked at build time — the known trap). Reusable walk = `scripts/ratify-lane5.mjs`.
- **DATA REALITY re-checked 2026-07-04 (Supabase MCP):** `channel_profiles` = **1** (`default`, uncast);
  `jobs` = **50 total, 0 with a `channel`** (was 0/47 — pipeline produced 3 more jobs, still none
  channel-tagged); `ideas.channel` ∈ {"Food","Dark history"} (free-text, ≠ the `default` codename). **Lane
  3b stays data-blocked** — no channel-tagged parked job to exercise the mandatory money-path live-ratify.
  The enqueue path still isn't writing `jobs.channel` (standing cross-team finding, now count-updated).
- **NEXT — pick per data reality + value:**
  - **Lane 3b — Production tab — STILL DEFERRED** (data reality above). Build when real channel-tagged
    ideas/jobs exist (pipeline writes `jobs.channel` + ideas carry the channel *codename*, not a display
    name). Plan unchanged (see the Lane-3b entry below / slice §4).
  - **Phase 2** (`channel_profiles.character_id` FK + de-modaled split-screen Character surface + a global
    character bench that **re-homes the legacy roster** — the prerequisite to fully deleting the dual shell)
    — gated on the still-pending HQ answer "does the worker read `channel_profiles.character`?" (check its
    status first). **This is the lane that lets Lane 5's "retire the legacy shell" finish.**
  - **Phase 3** (idea→job→episode threading + the pipeline correlation key — the unlock for real per-channel
    Runs/Cost).
  - **Polish backlog:** Character-tab error-state Retry button uses legacy `.btn` styling (cosmetic, rare
    path); Lane 5 nit — eagerly redirect a `?view=` buried behind an in-load nav (currently only on Back);
    a warm-open-during-load regression test once jsdom/RTL infra exists.

---

## ⚡ LATEST (2026-07-03, continuation `…-cont-40jine`) — Lane 3a SHIPPED: channel WORKSPACE shell + Guidelines + Cost tabs + N11, live-ratified 24/24. Read this first.

Branch **`claude/channel-first-phase1-cont-40jine`**, fresh off production (tip `4e6ea38`, post-Lane-4).
This session started **Lane 3** (re-parent the 4 workspace tabs into the channel workspace) and shipped
the first, cleanest sub-lane:

- **Lane 3a — channel-workspace shell + Guidelines + Cost tabs + N11 — ✅ SHIPPED (PR #71, squash `dcfe6c7`).**
  Codex built → Architect committed → **Fable-5 APPROVE-WITH-NITS** (no blockers; correctness/routing §3/
  Fork-A no-leak §6/`.tab-panel` display:none trap/savebar-specificity all code-verified) → all nits folded
  → **live-artifact ratify 24/24 substantive gates** (GATES `L3a-1..20 + G10a..e`). What landed:
  - **Workspace shell** rebuilt to the mock (`docs/design/aurora-system/aurora-screens-channel-workspace.html`):
    breadcrumb + `workspace-header` (avatar/name/**cast badge**) + `workspace-nav` `nav-tab` **tablist with
    roving-tabindex + Arrow/Home/End/Enter keyboard nav** + one active `tab-panel` (carries `.active` — the
    display:none trap). All classes already existed in `aurora.css`.
  - **Guidelines tab** = the existing `ChannelProfilesPanel` re-parented via a new `scopedChannel` prop
    (hides master list / mobile picker / Delete / +New; edits only this channel's row; no capability lost).
    Legacy paper/stamp field theme was **Aurora-re-skinned** via a scoped `.channel-profiles.scoped` CSS
    override block (theme-aware; **Save button AA 20.34:1 dark / 18.17:1 light** — measured, gate 10 clean).
  - **Cost tab** = honest **DEFERRED** panel (§4 — episodes/receipts carry no channel key; NO fabricated
    per-channel $); "View Global Cost Center →" opens the real global Cost Box (`openLegacyConsole("cost")`).
  - **N11 folded** — a guarded "Hub" button in the legacy `.cr` rail returns to the Aurora hub.
  - **Production tab** = honest placeholder under the new shell (**Lane 3b — DEFERRED, see below**).
- **Lane 3c — channel workspace CHARACTER tab — ✅ SHIPPED (PR #72).** Codex built (ControlRoom.tsx only)
  → **Fable-5** review → **live-artifact ratify 9/9 gates** (GATES `L3c-1..9`). Resolves the channel's cast
  character by best-effort name match of the loose free-text `channel_profiles.character` → `chars[].codename`
  (NO FK — that's Phase 2). Two states from the mock: **CAST** (avatar + name + concept + read-only bible
  summary + a Casting Configuration box) and **UNCAST** ("No Character Assigned" + Assign Character / Create
  New) — `default` is uncast, so the uncast state is the live-ratified truth. **Q1 "no capability lost"**: full
  character CRUD/bible/history/restore/casting stays reachable — "Manage all characters →" / "Create New" →
  `openLegacyConsole("roster")`; "Assign Character" → the Guidelines tab (the free-text `character` field).
  **NO inline Casting/Visual modals** (Phase 2 de-modaling; Configure Voice/Visuals → legacy roster) — pure
  re-parent, no new write path.
- **Lane 3b — Production tab — DEFERRED (data reality, not a code blocker).** The channel-scoped Ideas/Queue
  and its **mandatory money-path live-ratify cannot be exercised** against the current live DB: verified
  2026-07-03 — `ideas.channel` values are **"Food"/"Dark history"** (free-text display names, NOT the only
  `channel_profiles` codename **"default"**), and **all 47 `jobs.channel` are NULL**. So for `default` the
  Production Ideas + Queue are empty-in-practice, and there is **no channel-tagged parked job** to drive the
  inline approve/publish double-gate through a live intercept-and-abort walk. This is the same class as the
  already-filed "jobs.channel populated on 0 rows" finding, now extended to ideas (a codename-vs-free-text
  mismatch). **Build Lane 3b when** real channel-tagged ideas/jobs exist (or the pipeline starts writing
  `jobs.channel` + the operator tags ideas with the channel codename) — then its money path is demonstrable.
  Plan when unblocked: channel-scope Ideas via `ideas.channel` (quick-capture writes `channel=scope.channel`)
  + Queue via `jobs.channel` (Fork-A), reuse `openEnqueuePanel` + the `requestQueueAction`/`confirmQueueAction`
  money path **verbatim** (reuse the existing `QueueActionDialog` modal — poll-safe, double-gate intact) →
  Fable money gate + intercept-and-abort ratify (zero live writes) + honest DEFERRED Runs (§4).
- **NEXT: Lane 5 — retire the legacy shell** once Production (3b) lands (or is confirmed deferred): reinstate
  slice §3 Q3's one-time legacy `?view=`→hub `replaceState` redirect (commented in ControlRoom during the
  dual-shell interim), remove the dual-shell reachability once every surface is re-parented. Carried Lane-4
  popstate nits (cross-shell flash; openLegacyConsole armed-pending) still open — fold into Lane 5. Then
  Phase 2 (`channel_profiles.character_id` FK — gated on the still-pending HQ answer "does the worker read
  `channel_profiles.character`?") / Phase 3 (idea→job→episode threading + the correlation key).
- **RATIFY HARNESS re-warmed this container:** operator provided QA creds mid-session →
  gitignored `.env.local` written (`RATIFY_EMAIL/PASSWORD` + Supabase URL + anon key from Supabase MCP).
  **TRAP learned/logged:** `NEXT_PUBLIC_*` inline at **BUILD** time — a prod build made *before* `.env.local`
  existed ships a client with no Supabase URL/key → every browser read is empty → hub 0 cards + workspace
  redirects to hub (looks like an app bug; it's a stale build). **Rebuild AFTER writing `.env.local`.** Live
  DB truth: `channel_profiles` = **1** row `default` (uncast, `character` null). Bespoke walk =
  `scripts/ratify-lane3a.mjs`. Env-only console noise = 3× `ERR_CONNECTION_RESET` from the sandbox-blocked
  Google Fonts CDN (`globals.css:1` `@import`), not an app defect (#68 class).
- **NEXT: Lane 3b — Production tab** (channel-scoped Ideas via `ideas.channel` + Queue via `jobs.channel`
  Fork-A + honest DEFERRED Runs §4; reuse `openEnqueuePanel` + the `requestQueueAction`/`confirmQueueAction`
  money path **verbatim** → **mandatory Fable money gate**, intercept-and-abort the `jobs` POSTs, zero live
  writes). **Then Lane 3c — Character tab** (resolve the channel's cast char by best-effort name match; cast
  read-only summary + inline Casting/Visual modals + "Manage all characters →" to the legacy roster for full
  CRUD/history/restore = Q1 global reachability, no capability lost; uncast empty state). Then Lane 5 (retire
  legacy shell + reinstate the `?view=`→hub redirect). Carried Lane-4 popstate nits still open (fold into 3b/5).

---

## ⚡ LATEST (2026-07-03, continuation `…-cont-la0yh9`) — foundation MERGED (#64); 2 AA fixes shipped; live UI ratify still creds-blocked. Read this first.

Branch **`claude/channel-first-phase1-cont-la0yh9`**, fresh off production. The Phase-1 FOUNDATION
merged to production as **PR #64 (squash `2daf70f`)** since the entry below was written. This session:

- **Ratified the DB-truth half of IMMEDIATE #1 via Supabase MCP (no creds needed):**
  `channel_profiles` = **1** (hub grid must show exactly 1 card); `episodes` has **no `channel` column**
  (has `character_id`) → per-channel Runs/Cost genuinely DEFERRED (§4 honesty holds against the live DB);
  **`jobs.channel` is populated on 0 of 46 rows** → the hub's per-card "Active Jobs" correctly computes to
  **0** for the channel, but is *empty in practice* because no live job carries a channel slug yet (a real
  finding, not a bug — the scoping code is right; the pipeline/enqueue path isn't writing `jobs.channel` on
  these rows). Worth an eyes-on once real channel-tagged jobs exist.
- **Shipped 2 measured AA fixes (Codex build → Fable-5 gate → squash-merge):**
  - **PR #65 (`87dfa45`)** — the carried-forward OPEN dark `--danger` badge item was a *real FAIL* (4.34:1
    on the composited panel, not the token comment's 5.2:1-vs-pure-base). Added `--danger-fg #FF6B81`
    (6.10:1), routed text uses. Proven by compositing calc **and** Chromium pixel-sample. Fable APPROVE-WITH-NITS.
  - **PR #66 (`fae85c6`)** — Fable-surfaced follow-up: `.btn-danger:hover` white-on-solid `#FF1744` = 3.85:1.
    Added `--danger-solid #CC0033` (5.81:1). Ratified via forced-`:hover` render **after the 0.3s transition
    settled** (tween misreads mid-transition — measured-gate lesson). Fable APPROVE. GATES `L1-AA1/L1-AA2` PASS.
- **IMMEDIATE #1 — RATIFIED on the live artifact (operator provided QA creds mid-session).** Local prod build
  (`next build` clean + `next start :4311`) + Chromium + browser→supabase bridged (28 reads proxied, 0 failed,
  0 ws → polling-only). All 10 gates green (GATES `I1-1..I1-10`): bare `/`→hub (canonical `?hub=channels`),
  grid==1==live `channel_profiles`, per-card Active Jobs honest 0, no per-channel cost, open→workspace,
  Back→hub, Legacy console + capabilities, "+ New Channel", **dual-shell dirty-guard** (edit→"UNSAVED CHANGES
  IN BUFFER"→nav blocked→"KEEP EDITING" preserves). 2 console errors are env-only (sandbox blocks Google Fonts
  CDN; login-POST abort on redirect) — NOT app defects. The un-ratified `#64` merge is now closed out.
- **RATIFY HARNESS IS WARM + PROVEN THIS CONTAINER:** `.env.local` has `RATIFY_EMAIL`/`RATIFY_PASSWORD` +
  Supabase URL/anon (gitignored, **ephemeral — re-request creds each fresh container**). The bridge pattern:
  `ctx.route('**/*.supabase.co/**')` → Node `fetch` forwarding `req.headers()` (JWT rides along, RLS applies),
  fulfill with the response (strip content-encoding/length). Login server-action runs in the local node server
  so it needs no browser bridge. **Trap:** rail nav has hidden mobile-duplicate buttons — target the *visible
  desktop* `.cr .rail .navbtn` (a `.first()`+`.catch()` faked a dirty-guard "gap"). **Trap:** sample AFTER CSS
  transitions settle (a mid-transition tween faked a hover-AA fail).
- **Lane 4 — global inline Action Center — ✅ SHIPPED to production (PR #69, squash `43316ec`).**
  New `src/components/aurora/ActionCenter.tsx` (presentational; lists `actionableJobs`, approves in-row) wired
  into the `?hub=actions` return; reuses `requestQueueAction`→inline confirm→`confirmQueueAction` +
  `build{Fact,Spend,Publish}ApprovalReenqueue` **verbatim** (no new write path). Fable round-1 REQUEST-CHANGES
  caught a real regression (**F1**: navigating away with a confirm open left an *invisible armed* `pendingQueueAction`
  → froze both pollers globally + stale-snapshot fire risk) → folded (clear `pendingQueueAction` on scope change,
  + a11y Esc/focus-restore, + submitting-guard) → round-2 **APPROVE-WITH-NITS**. **Live money-path ratify = 9/9,
  ZERO live writes** (every `jobs` POST intercepted-and-aborted): double-gate intact on publish+spend (step1 no
  write, step2 exactly one), payloads == the builders (`publish_only/publish_approved/source_episode_id`;
  `spend_approved`), poll-survival, and F1 verified (Back → return → 0 armed confirms). GATES `L4-1..L4-9 + L4-a11y`.
- **Lane 4 carried nits (Fable round-2, non-blocking, safe-direction — fold into Lane 3/5):** (1) a cross-shell
  popstate into `?hub=actions` with a still-armed *legacy* pending can flash the inline confirm for one frame
  before the scope-effect clears it (worst case a stray Enter *cancels* — strictly better than the pre-fold
  invisible-armed bug); (2) `openLegacyConsole` with an armed aurora confirm doesn't clear pending, but the
  legacy modal renders it visibly + cancellably (pre-existing, not the F1 invisible-armed case). Both optional.
- **NEXT after Lane 4 merges: Lane 3** — re-parent the 4 workspace tabs (Production·Character·Guidelines·Cost)
  against Aurora; Fork-A `channelId` toggles global vs channel-scoped; Production scopes Ideas+Queue (real cols),
  Runs/Cost = honest DEFERRED (§4). Fold **N11** (hub link in the legacy rail). Then Lane 5 (retire legacy shell +
  reinstate the `?view=`→hub redirect). Ratify harness stays warm this container (see the RATIFY HARNESS note above).

---

## ⚡ LATEST (2026-07-03) — PHASE-1 BUILD: Lanes 1 / 2a / 2b landed + Fable-approved. Read this first.

> **PROCESS CHANGE (operator, 2026-07-03): the pre-merge review gate is now FABLE-5 ONLY** ("only
> use fable before merge") — Codex stays the builder; drop Gemini/suerta from the review SEAT. The
> loop: Codex builds → Architect commits → **Fable-5 reviews before merge** → fold → re-review until
> APPROVE → merge. **Operator also directed: proceed autonomously, keep looping, don't stop to ask;
> route questions to Fable first, only defer to the operator if truly blocked, then move on. Small
> spend is ungated. Update HQ frequently for the pipeline.** (Earlier lanes below used Gemini+suerta;
> that's superseded.)
>
> **DESIGN-FIDELITY METHOD (operator, 2026-07-03): build from the MOCK's CSS, not the markdown
> summary.** The HTML mocks are the source of truth; if spec and mock disagree, the mock wins. Make
> fidelity a MEASURED gate: render built-vs-mock in Chromium and pixel-diff (mask the animated
> translucent backdrop + the intentional data omissions). `aurora.css` was rebuilt to lift the mock
> CSS verbatim on this basis (0.52%/0.65% content-diff proven).

Build session on branch **`claude/channel-first-phase1-build-gji3vi`** (fresh from production
`new-session-3l99vs`; harness-designated working-branch name; kickoff's `…-dx9gan` superseded). **Lanes
1, 2a, 2b are built, Fable-gated, and pushed** (NOT yet merged to production, NOT yet browser-ratified
against the live DB — that needs QA creds, see the blocker below):

- **Lane 1 — Aurora design-system FOUNDATION** (commit `483de36`). New `src/app/aurora.css` (tokens
  light+dark under `[data-theme]`, aurora backdrop + monochrome noise, glass panel, `.au-btn*` /
  `.au-badge` primitives **renamed off the legacy globals `.btn`/`.status-badge` to avoid bleed**,
  inputs, avatars, self-contained channel card, action-center hero + inline row, layout helpers,
  focus-visible, reduced-motion) + `layout.tsx` (import, `data-theme="dark"` default, SSR-safe
  pre-hydration theme script, theme-aware `themeColor`) + `src/lib/theme.ts` (theme seam + live
  `<meta theme-color>` sync). **Additive, scoped under `.aurora-app`; the legacy `.cr` app is
  untouched and still builds.** Full review loop: **Gemini + suerta(Opus)** both REQUEST-CHANGES →
  all folded. suerta caught a real WCAG-AA blocker the other lenses missed — light-mode danger/warn
  badge text failed 4.5:1 on their own 15% tints; corrected (`--danger:#B91C1C`, `--warn:#92400E`,
  light only) and **proven by measurement** (5.10 / 6.05 / 5.82). Build clean; visual smoke Chromium
  dark+light @1440 + 412. Gates `L1-1..L1-10` PASS in `GATES.md`.
  - **OPEN AA item (carry forward):** dark-mode `--danger` badge text (`#FF1744`) is borderline
    (~4.3:1 by static estimate; true value depends on the composited surface + aurora bleed-through)
    → **pixel-sample it on the rendered dark screens at the first browser-ratification gate**; if
    <4.5, darken/brighten the dark danger text or raise `--danger-bg` opacity.
  - **AA fidelity note:** `aurora.css` was later REWRITTEN to lift the mock CSS verbatim (commit
    `9825040`) — supersedes the hand-port; kept the AA light-token corrections + `isolation:isolate` +
    focus-visible + reduced-motion; 3 legacy-collision renames (`status-badge`→`status-chip`,
    `metric-value`→`au-metric-value`, `pulse-dot`→`au-pulse-dot`). One real bug fixed: the scoped
    reset lacked `margin:0/padding:0` → default `<h1>/<p>` margins inflated text ~100px. Gates
    `L1F-1..L1F-5` PASS. **OPEN AA item still stands:** dark `--danger` badge ~4.3:1 → pixel-sample at
    the first live-ratify gate.
- **Lane 2a — URL-routing MODEL** (commit `af5e8c5`). `src/lib/route.ts` + 12 tests — pure TS for
  slice §3 (hub/channel/tab; legacy `?view=`→hub; bare→hub; unknown channel→hub; invalid
  tab→production; idempotent). Gates `L2r-1..L2r-7` PASS.
- **Lane 2b — hub + routing wiring — FABLE-APPROVED** (hub rebuild `<hub commit>`, wiring `8697979`,
  fixes `1767bae`). `HubLanding`/`ChannelsHub`/`AuroraShell` built from the mock markup (1.71% diff);
  `ControlRoom.tsx` wired to `route.ts` as the new shell. **Interim DUAL-SHELL:** hub is the landing;
  the legacy `.cr` shell stays fully reachable (valid `?view=` opens it + a "Legacy console" button)
  so nothing is dark while surfaces re-parent. Fable round-1 REQUEST-CHANGES (4 blockers) → folded →
  round-2 **APPROVE-WITH-NITS**. Gates `L2b-1..L2b-6` PASS. Accepted nits + the **N11 "add a hub link
  in the legacy rail"** carry to Lane 3.

**FUTURE-WORK SPECS (drafted + consensus-reviewed this session):**
`slice-channel-first-phase2.md` (FK + casting de-modal) and `slice-channel-first-phase3.md`
(threading) are **v2** — a full 3-way review (Fable-5 + Gemini + Codex) returned REQUEST-CHANGES with
converged, code-verified blockers (Phase-3's killer: approval re-enqueues force `idempotency_key:null`
→ the map/correlation join would orphan every money-spending re-run; fixed in v2 by a jobs.ts
non-null-key change + the missed `stale` path + owner-integrity RLS + owner-scoped residuals). Round-2
(**Fable-only** now) pending before Phase-2/3 build — which is gated behind Phase 1 anyway.

**HQ:** posted a comment on the 📮 Coordination Log (2026-07-03): Phase-1 has NO shared-seam impact;
filed the Phase-2 dependency — **does the pipeline worker read `channel_profiles.character`?** (they
need lead time); echoed the Phase-3 `episodes.correlation_key` gate.

**NEXT LANES (Fable-only pre-merge gate; live-ratify when QA creds land):**
1. **Lane 4 — global inline Action Center** (`?hub=actions`, replaces the placeholder) — reuse
   `QueueActionDialog`'s handlers/validation, DISCARD its modal chrome, act **in-row**, KEEP the
   publish double-gate. **Money path → Fable gate is mandatory; assert intercepted payloads + the
   double-gate intact.** Poll-surviving.
2. **Lane 3 — re-parent the 4 workspace tabs** (Production·Character·Guidelines·Cost) replacing the
   placeholders, rebuilt against Aurora; Fork-A `channelId` prop toggles global vs channel-scoped
   (build each once; no leak). Production scopes Ideas+Queue (real cols); Runs/Cost = honest DEFERRED
   state (§4). Fold **N11** (hub link in the legacy rail).
3. **Lane 5 — retire the legacy shell** once all surfaces re-parented; reinstate §3 Q3's one-time
   legacy `?view=`→hub redirect (deferred during the dual-shell interim, commented in ControlRoom).
Then Phase 2 / Phase 3 (specs v2 above; round-2 Fable review first).

**BLOCKER for ratifying lanes 2b+:** **QA creds (`RATIFY_EMAIL`/`RATIFY_PASSWORD`) are NOT in the
container** — request from the operator and put in gitignored `.env.local` before the ratify gates.
Design-system + routing-model lanes did not need them; every data-driven screen does.

**Toolchain confirmed live this session:** Codex (login via `printenv OPENAI_API_KEY | codex login
--with-api-key`), `scripts/gemini.sh` REST (default `gemini-3.1-pro-preview`), suerta via Agent tool
(the `claude`/`general-purpose` subagent). Visual smoke = inline the shipped CSS into a standalone
HTML + Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (run the node script from the
repo root so it resolves `playwright`). WCAG contrast proved with a small node compositing calculator
(composite the 15% badge tint over the surface, then ratio vs text — pure-white is NOT the effective
bg). **Codex did NOT touch `docs/HANDOFF.md` this session (guard held).**

---

## ⚡ (2026-07-03) — PHASE-1 DESIGN LOCKED (Aurora). Context for the build above.

The Phase-1 **design is done and chosen**; the next session **builds** it. Full kickoff (branch +
paste-in starting prompt + traps): **`docs/PHASE1-BUILD-KICKOFF.md`**.

- **Branch:** the design/spec/governance work is **merged to production** (PR #62, squash `cc5cb39`,
  2026-07-03). **Branch fresh from production** `claude/new-session-3l99vs` (rule 27), keeping the
  working-branch name `claude/channel-first-phase1-dx9gan`. The build session is the first to add
  **app code** for Phase 1.
- **Design language = "Aurora"** (operator pick, 2026-07-03, via a multi-round tournament; both
  light+dark first-class). Runners-up retained as fallbacks. Chosen mock =
  `docs/design/finalists/finalist-3-aurora.html`; **full build package =
  `docs/design/aurora-system/`** (design-system spec + component gallery + Action Center/Overview +
  channel-workspace screens).
- **Build spec:** `docs/slices/slice-channel-first-phase1.md` (L-4 reviewed) — IA, URL-state routing
  (extend `?view=`, **no router lib**), re-parenting map, **channel-scoping DATA REALITY §4**
  (episodes have no channel → per-channel Runs/Cost DEFERRED; Ideas/Queue are scopable), inline
  Action Center §5, Fork-A `channelId` §6, gates §10. Review tiers: `docs/design/channel-first-review-plan.md`
  (**Gemini + suerta; Fable-5 on the Action Center money path**).
- **Cross-team:** correlation-key ask **ANSWERED + QUEUED** (pipeline will add `episodes.correlation_key`
  echoing the job's `idempotency_key`; gates **Phase 3 only**, not needed for 1/2). **Tier-2
  per-character cost UNBLOCKED** (22/41 episodes now linked; data-verified, UI ratify pending creds).
- **PARKED/deferred:** bible auto-draft (`slice-bible-autogen.md`, operator-parked); casting
  empty-bible guard (`slice-casting-bible-guard.md`) = interim stopgap (fold into Phase-2 casting or
  standalone if asked); E2 auto-fill + 2b visual gen deferred; Phase 2 (character_id FK + casting
  elevation) and Phase 3 (threading) later. **governance.md** refreshed to operator's latest (1–41).
- Design exploration trail: `docs/design/design-tournament.md`, `docs/design/design-research-2026.md`,
  `docs/design/directions*/`.

---

## ⚡ (2026-07-02) — CHANNEL-FIRST REDEFINITION RATIFIED (D-6). Context for the above.

The operator stepped back from incremental slices and questioned the whole dashboard
workflow. Outcome: **the dashboard is being reorganized channel-first** (the channel/show
is the root; the character is its face; 1 channel = 1 character for now, seam open for
future many). This **reshapes the spine, not the scope** (D-2 stands — focused control
tool, not kanban). **Ratified into `DIRECTION.md` as D-6.**

- **The design + phased plan + full review trail:** **`docs/design/channel-first-redefinition.md`**
  (Gemini high-thinking design pass + suerta/Opus adversarial review, synthesized +
  fact-checked vs the data contract; **D-6 doc-fidelity Gemini pass = PASS 2026-07-02**).
  Hub-and-spoke IA (global Channels hub → per-channel workspace: Production · Character ·
  Guidelines · Cost), casting elevated, onboarding handoffs, `character_id` FK, global inline
  action queue.
- **VISUAL-DESIGN MANDATE (operator, 2026-07-02):** the current look & feel is **not good enough**
  → the redesign includes a **first-class visual/UI rebuild**, not an IA re-skin. **Phase 0/1
  stands up a real design system** (type/color/spacing/components/states/motion, WCAG 2.2 AA) and
  the re-parented surfaces are **rebuilt against it** — "reuse today's components" = reuse the
  **data/logic seams, not the current styling.** Design vendor = Gemini (`docs/design/`).
- **NEXT SESSION = Phase 1 planning/build** (dashboard-autonomous): the Channels hub +
  channel-workspace shell, **re-parenting today's screens** into it (reuse, don't rewrite
  the 2,472-line monolith). Phase 2 = character-link FK (expand/contract, HQ heads-up) +
  casting elevation. Phase 3 = the idea→episode thread, **gated on a pipeline correlation
  key** (HQ ask filed 2026-07-02 — check its status before building Phase 3's job→episode
  join; idea→job stitch is ours via a dashboard-owned idempotency_key↔idea map).
- **Everything in §4 below is now sequenced UNDER D-6.** E2 (channel auto-fill) is **parked**
  and re-homes into the channel Guidelines surface (`docs/slices/slice-channel-onboarding-e2.md`,
  scoped + reviewed: A structured-paste + B2 cast_brief jsonb; no bucket-3 spend). E1.b
  (persona chip into casting) is subsumed by the channel↔character link. New channel rows
  become "create a channel" in the new hub.
- **Deferred/operator-owned unchanged:** v3 casting-audio audition, QA password rotation,
  §4.B visual-candidate provider fork (bucket-3), Gate-2 first character-linked run.


---

> Rotated from docs/SESSION-HANDOFF.md on 2026-08-11 (rule 34 — verbatim relocate).

## 🔚 CLOSE-OUT 2026-08-07 (dashboard UX + auth + generator session) — what shipped, and the two big one-shot specs (SIMPLIFICATION REDO + PER-USER ISOLATION) ready for the next session

### Shipped this session (all on default branch `claude/new-session-3l99vs`)
- **Google OAuth + fail-closed beta allowlist** (`7ec2da2`). Unset `DASHBOARD_ALLOWED_EMAILS` admits ONLY the operator floor (`DASHBOARD_OPERATOR_EMAIL`, default `cameronnicodemus@gmail.com`); requires `email_confirmed_at`; no user-email trim; `NEXT_PUBLIC_SITE_URL` preferred over forwarded host. **Operator setup to activate:** enable Google provider in Supabase Auth + add prod `/auth/callback` to its redirect allowlist; set `DASHBOARD_ALLOWED_EMAILS` (beta emails) + `NEXT_PUBLIC_SITE_URL` in Vercel. (`BUILD-NOTES-D3.md`.)
- **Honest video progress bar + plain-language pass.** `src/lib/renderProgress.ts` (9-stage ladder researcher→distribution, monotonic furthest-step, "Step N of 9 · <plain label>", NO fake %/ETA), `src/lib/hooks/useRenderProgress.ts` (5s refetch, 100-id chunk, entertainment_judge excluded), `src/lib/plainLanguage.ts` (park_kind→"Waiting on you", verdict→"Result", receipts→"What happened", below_floor→"Low-quality shots flagged", final_stage→"Stopped at", terminal_state/failure_class→"Why it stopped"). Two-lens reviewed; monotonic + polling fixes folded.
- **AI character generator** (`1ac4dea`). `character-proxy` edge function LIVE (verify_jwt on; Claude Opus draft_character tool; anti-real-person prompt; advisory-only, never writes a character), migration `dash_0013_character_usage` APPLIED + probe-verified (25/user/day cap, mirrors dash_0009), `src/lib/castingCharacter.ts` + `CharacterGenerator.tsx` in the create flow, confirm-before-overwrite. Operator note: optionally set `CHARACTER_PROXY_ALLOWED_ORIGINS` to the prod URL (CORS hardening; works without it).

### ⭐ ONE-SHOT SPEC A — THE SIMPLIFICATION REDO (operator-requested "make it easier to use")
Diagnosis + visual proposal artifact: **the dashboard grew to 12 destinations + ~8 overlays** (5 nav + 3 hidden hubs Actions/Overview/Reveal + a 4-tab channel workspace with 2 "coming soon" tabs), still leaked jargon (now fixed by the plain-language pass = **move 2 DONE**), approvals appear in 3 places, and it's all inside one **3,246-line `src/components/ControlRoom.tsx` god-component**. Remaining moves, cheapest-first, each its own reviewed commit:
1. **One approval queue** — fold the 3 approval surfaces (landing `HubLanding.tsx` Action Center panel, hidden `aurora/ActionCenter.tsx` hub, and the copy inside `aurora/RunsHub.tsx`) into ONE canonical queue on Home. Reuse the shared `QueueActionDialog`/`FactClaimsReviewSection`; remove the duplicate render sites. (high payoff / low effort)
3. **Retire dead rooms** — remove the `Reveal` hub (flag-gated `NEXT_PUBLIC_REVEAL_WRITE_ENABLED` + `MOCK_REVIEW_FIXTURES`, near-dead) and fold `Overview` into Home; drop them from `route.ts` HUB_KEYS + `AuroraShell` NAV and the `ControlRoom.tsx:~1930-1940` nav-highlight remap so the nav stops pointing at pages it won't admit you're on. (high / low)
4. **Drop the "coming soon" tabs** — the per-channel workspace `Production` + `Cost` tabs are deferred placeholders (`ControlRoom.tsx:~2708-2966, 3205-3237`); collapse the 4-tab strip to the 2 that hold real content until the others do. (med / low)
5. **Unify casting into one flow** — casting is scattered across `CharactersHub` grid + `CastingStudioPanel.tsx` (voice) + `VisualIdentityPanel.tsx` (image) + the workspace Guidelines tab (channel link). Walk it as one path: pick character → voice → face → attach to channel. (high / med — spec on its own)
6. **Remove the global Basic/Advanced toggle** (`AuroraShell.tsx:74-108`, `UiModeContext`) — pick one good default, put rare advanced controls behind a local "more options". (med / low)
Structural note (not a move, but the reason it sprawled): the god-component has no seam that makes adding a place cost anything — a later ControlRoom.tsx split is the durable fix. Recommend executing moves 1+3+4 first (one afternoon, mostly surface), then 5 as its own slice.

### ⭐ ONE-SHOT SPEC B — PER-USER ISOLATION (operator ratified: "no user shares channels"; operator still pays)
Goal: beta users see only THEIR OWN channels/characters/ideas/renders; operator keeps everything; global spend cap stays (operator pays). **Operator DECISION locked: each user gets their own channels — `channel_profiles` becomes per-user, duplicate names allowed.** Backfill target = the one existing user `e5503683-2826-4168-bee2-7811e6e21f40`.

| table | today | change |
|---|---|---|
| `characters` | has `owner` (9 rows, all operator, 0 null) | RLS scope `owner=auth.uid()` — **Phase 1, safe now** |
| `ideas` | has `owner` (4 rows, all operator) | RLS scope — **Phase 1** |
| `channel_profiles` | keyed by `channel` text, 5 rows, NO owner | add `owner`, backfill operator, unique `(owner, channel)`; keep a GLOBAL `default` row (owner NULL) so new users get a working default — **Phase 2** |
| `jobs` | 149 rows, NO owner | add `owner`, backfill operator; enqueue stamps `auth.uid()`; RLS own-rows — **Phase 2** |
| `episodes`,`receipts` | keyed by episode_id, NO owner | **no new column** — RLS derives via `EXISTS(job with same episode_id AND owner=auth.uid())` — **Phase 2** |

**Why the worker is unaffected:** the pipeline uses the **service-role key which bypasses RLS** (verified: `worker.py` + `channel_profiles.py` use `SUPABASE_SERVICE_KEY`). RLS never touches it.
**THE CROSS-TEAM PIECE (Phase 2 is NOT dashboard-only):** the pipeline resolves a channel by NAME today (`reels-content-generation/src/pipeline/channel_profiles.py:73 load_channel_profile(channel)` matches `row.channel == requested`). With per-user channels that's ambiguous — the pipeline MUST resolve by `(owner, channel)`, so `jobs` carries `owner`, the worker passes `job.owner`, and `load_channel_profile(channel, owner)` filters by owner (falling back to the global default row). This needs a paired pipeline change + a Coordination Log heads-up (shared tables `jobs`/`channel_profiles`/`episodes`/`receipts`). Land the dashboard + pipeline halves together or a render could load the wrong user's channel config.
**Sequencing:** Phase 1 (characters+ideas RLS) is safe, dashboard-only, do first. Phase 2 (channel_profiles+jobs owner + derived episode/receipt RLS + the pipeline owner-aware lookup) is the coordinated slice — expand/contract: add nullable owner → backfill → pipeline reads owner → enforce RLS + `(owner,channel)` unique. Per-user API keys + billing are LATER (BYO-keys step), not this slice.

### Channel-type DEMO GALLERY in the create flow (operator idea, 2026-08-07)
Before a (beta/subscription) user creates a channel, show a **gallery of channel-type cards, each with a short looping demo reel** + a one-line "what it's good for". Serves onboarding, sets the quality bar, and drives subscription conversion. **The demo clips already exist / are being built** — the pipeline's prototype reels are the seed content: `stickwick_procedural.mp4`, `datachan_sugar_ranking.mp4` (real sourced episode), `sim_plinko_race.mp4`, plus food/dark-history/persona samples. Dashboard build: a `ChannelTypeGallery` in the "New channel" surface (§ simplification move — this is part of the channel-creation flow, not a new global hub). Each card: type name, demo video, blurb, "Use this type" → into the (required-fields) create flow. Store demo clips as static assets (or a `channel_types` reference table). Pairs naturally with the required-field markers work.

### Caption on/off per channel (operator, 2026-08-07)
Burned-in caption toggle per channel — captured pipeline-side as a `craft_dials.captions` (on|off, default on) on the channel-profile object (`reels-content-generation` `channel-profile-object.md` §3a). Dashboard surface: a simple toggle in the channel workspace Guidelines tab alongside the other craft dials.

### Queued small follow-ups (either session)
- **Bring-your-own character image** — upload ALREADY EXISTS (`VisualIdentityPanel.tsx` → private `character-refs` bucket via `castingVisual.ts:uploadRefImage`, accepts png/jpeg/webp, locks `reference_image_url`). Gap: the copy says "generate elsewhere then upload"; reframe to welcome **selfies/drawings**, and **add HEIC/HEIF** so iPhone photos work. Flag (operator-owned, publish-time): the locked "original character, no identifiable real person" rule — a real-person selfie on a published character is a likeness question; upload freely, surface a quiet note at publish, don't restrict uploads.
- **Required-field markers in the character studio** — operator model = TWO TIERS: *Required to save* = Name (codename), Concept, Bible-with-content (the bible starts EMPTY `{}` and is creator-filled — NOT auto-generated; the "describe" step only makes the voice description); *Required to use* = locked Voice, plus a Reference image ONLY for visual-continuity channels (never for voice-only characters like Fine Print). Show done-vs-needed; don't nag food characters for an image.

---

