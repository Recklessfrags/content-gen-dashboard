# SESSION HANDOFF — start here to finish the project

_Last updated: **2026-07-12 (NINE dashboard slices shipped — #1a park view, schema reconcile, #2-display, #3 scoring UI (mock), UX declutter, #4 channel filter, #5 design-system pass, #6 group-by-state, #7 persona "Use in casting", #8 reveal-approval preview phase-1 (mock `?hub=reveal`). Sol design audit fully shipped. Prod tip = `e6310e9` on `claude/new-session-3l99vs`; branch `claude/wire-aurora-home-5b-lleyyg` restarted fresh off it.** by the Architect (Claude)._
This is the **one authoritative "start here"** for a **new chat** picking up the work. Read this top-to-bottom,
then the canonical docs it points to. Deep running history is in `docs/HANDOFF.md`; this file
is the fast path._

> **Built against the hardened-handoff checklist** (pipeline lesson, 2026-06-30): one
> authoritative start-here · branch state pinned · don't-stall/don't-drift constraints ·
> contract matched to the real schema · DONE = falsifiable gates ("floor ≠ done").

---

## ⚡ LATEST (2026-07-12) — NINE dashboard slices shipped to prod (`e6310e9`). Read this first.

All merged to `claude/new-session-3l99vs` via squash PRs; branch `claude/wire-aurora-home-5b-lleyyg`
is restarted fresh off the prod tip after each. Read-only/design class unless noted; each: Codex build
→ tsc/vitest/next-build gates → Gemini cross-vendor review → merge nod (problem-solver or direct owner
ratification). **The full Sol design audit is shipped.**

**9. #8 reveal-approval preview — phase 1** (PR #149) — `src/lib/revealApproval.ts` + `RevealHub.tsx`
   (`?hub=reveal`, entry from the Action Center). The dashboard half of the **ratified reveal-approval
   contract** (`docs/contracts/data-contract.md` → "Reveal-approval contract"; reels#88 spec
   `spec-channel-dna-and-reveal-spine.md` §8). MOCK fixtures, local-only, **no writes** — per-reveal
   card (synthesis + grade chip + auditor reason + brand caution + grounding via the #2-display
   component) with Approve/Edit/Reject. **PHASE 2 (not built): the `reveal_approvals` migration + real
   `jobs.reveal_*` write-back — TWO-LENS (Gemini + suerta/Opus) + owner GO — gated on the PIPELINE
   landing `reveal_approved`/`reveal_override`/`reveal_rejected` columns + a #88 heads-up.**

1. **#1a park view** + **`channel_profiles` schema reconcile** (PR #141) — `src/lib/parkReason.ts`,
   ResearchProfile/Sourcing parsers (fail-closed, preserve-on-update).
2. **#2-display** (PR #142) — `src/lib/factClaims.ts`; read-only flagged-claim + grounding display in
   the fact-approval dialog (Gemini caught a `javascript:`-URI XSS → `isSafeHttpUrl` allowlist).
3. **#3 scoring UI** (`?hub=review`, PR #143) — `src/lib/renderReview.ts` + `ReviewHub.tsx`, led
   questionnaire vs MOCK fixtures, **no DB writes** (flips mock→real only when a gate-passing MP4
   lands + owner ratify). Shipped with the **UX declutter** (helper text below controls, cast-button
   helper, compact persona card).
4. **#4 RunsHub channel filter** (PR #144) — `src/lib/runsChannelFilter.ts`; filter Runs by channel,
   empty/`default`/legacy-null → explicit "Unassigned" facet. Diagnosis: enqueue path fixed ~07-04
   (~97% tagged since); legacy nulls predate it; lane-2 backfill is the pipeline's `jobs` write,
   lane-3 enqueue guard held → C3.
5. **#5 design-system pass** (PR #145) — persistent bottom **mobile nav bar** in `AuroraShell`
   (Channels/Characters/Ideas/Runs/Review), **button-color language** fix (`.aurora-app .btn` default
   so bare `.btn` isn't red; Legacy console → secondary), **duplicate channel H2 removed** on the
   Guidelines tab. From the Sol design audit (local-render, 8 surfaces).
6. **#6 RunsHub group-by-state** (PR #147) — `src/lib/runsGrouping.ts`; the Runs flat list + attention
   toggle → collapsible sections (Needs attention / In progress / Done, Done collapsed), composing with
   the #4 channel filter. Every `JobStatus` maps to exactly one group (test-asserted). The last Sol-audit item.
7. **#7 persona "Use in casting"** (PR #147) — the deferred E1.b: a "Use in casting →" button on the
   channel's Recommended-persona card opens the Casting Studio with the persona pre-selected in the
   *design* step (`ControlRoom` `castingSuggestedPersona` state → modal `suggestedPersonaChipId`, cleared
   on close). **No spend** — pre-fill is in-memory; the Generate-previews/Cast-&-lock ElevenLabs gate is
   untouched (Gemini-verified). Also fixed a dangling default persona id (`deadpan-demystifier` →
   `deadpan-absurdist`, + guard test).

**In flight (three, each waiting on a decision/dependency):**
1. **#8 reveal-approval preview PHASE 2** — the real `reveal_approvals` migration + `jobs.reveal_*`
   write-back. **TWO-LENS + owner GO.** Gated on the PIPELINE landing the `reveal_*` columns + a #88
   heads-up (they build it into the content-spine migration). The mock shell (phase 1) is live.
2. **#3 scoring hub → REAL** — the first gate-passing render landed (`cottage-cheese-20260712-034826`,
   below_floor_cuts=0). Wire `?hub=review` to the real render + the `render_reviews` write path.
   **Owner ratify** (first write on that path) — awaiting the owner's go.
3. **MULTI-USER** (owner wants a select few users; owner pays spend, others create+test): `characters`/
   `ideas`/`bibles` are ALREADY owner-scoped RLS + `casting_usage` per-user; GAPS = `channel_profiles`
   is shared (no owner col) and `jobs` has no owner (spend not per-user). Plan: Google login + email
   allowlist [mine]; channel `owner` col + RLS + backfill [mine, verify pipeline's channel reads];
   `jobs.owner` spend-attribution = **cross-team (pipeline owns jobs)**. Awaiting owner's two decisions:
   channels private-vs-shared; spend approve-every-run vs per-user cap.

**Parked / gated:** domain name (owner: ship first, name later); **#1b repair-trigger** (money-path)
HELD — the repair *machinery* is proven (pipeline PR #96, repair_attempt now unbounded) but a
repair-to-complete-MP4 still awaits the sourcing arc, AND #1b needs owner priority to start. Deferred
UI (no auto-build, rule 15): Advanced-mode progressive-disclosure regroup, mobile "More" menu.
**Content-spine/gate-rebuild** (reels `spec-channel-dna-and-reveal-spine.md`) is being built by the
pipeline; the dashboard's only piece is the reveal-approval preview (#8). The **Channel DNA object**
(§3) will extend `channel_profiles` → a future cross-team handshake when it's built.

> **Maintenance note:** this ⚡ entry supersedes the 07-06 one below; when adding the next entry, rotate
> entries older than the two most recent into `docs/handoff-archive/` verbatim (per the maintenance rule).

## ⚡ (2026-07-06) — RUNS HUB (per-worker failure attribution) + EMPIRICAL RUN-COST ESTIMATE shipped.

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

> **📁 Prior session snapshots (2026-07-02 … 2026-07-06) are archived verbatim** in
> [`docs/handoff-archive/SESSION-HANDOFF-archive-2026H1.md`](handoff-archive/SESSION-HANDOFF-archive-2026H1.md)
> — rotated out 2026-07-07 to keep this file a fast-path snapshot (rules 41 + 34; nothing
> deleted). Below the current snapshot: the **evergreen reference manual** every session still needs.
> **Maintenance (AGENTS L-6):** when you add a new ⚡ entry, move entries older than the two
> most recent into that archive, verbatim — so this file never re-bloats.

---

## 0. First actions for a fresh session (do these in order)

1. **`git fetch` BEFORE judging anything.** Local refs lie. Production = the GitHub default
   branch **`claude/new-session-3l99vs`**; confirm its tip before assuming merge state.
2. **Model budget (governance rules 30–34, operator-ratified 2026-07-02 — binding):**
   sessions default to **Opus**; Fable-5 by operator pick or agent judgment for the hardest
   fork/architecture work only. Reviewer seats default to Opus (escalate by judgment).
   Bulk reading → down-tiered (Haiku/Sonnet) subagents, conclusions only. **Fetch HQ by
   child page, not the whole log.** End the session when the context outgrows the remaining
   work. Tier→model map = `AGENTS.md` L-5.
3. **Check HQ at natural checkpoints** (after commits/merges, around coordination work,
   before ending a session) — the 📮 Coordination Log tracker first, then only the child
   pages you need. Always fresh-fetch before telling the operator "nothing is buildable"
   (L-1).
4. **Read, in order:** this file → `governance.md` (41 shared rules) → `AGENTS.md` (project
   layer, L-1..L-5) → `DIRECTION.md` (scope) → `docs/contracts/data-contract.md` (DB shapes +
   ownership) → `GATES.md` → the 📮 Coordination Log tracker (§6).
5. **Don't-drift / don't-stall:** the dashboard is a **focused control tool, NOT a
   kanban/production board** (D-2). Don't invent scope. If you park, say why. Build app code
   **only through Codex** (§3); the Architect commits docs + Codex's reviewed edits.
6. **Talk terse (L-3):** one line at task start, a prompt only on real problems or
   human-only decisions (sharpened question + recommendation), then the final result.

**What "done" means here:** merged to the default branch, gates green **on the real
artifact** (measured, not presence-only — see §4 header), independent reviewer sign-off.

---

## 1. What this is (60 seconds)

An automated agent workforce that produces faceless short-form video. **Two repos, one
shared Supabase project:**

- **Dashboard** (`recklessfrags/content-gen-dashboard`, THIS repo) — the **Character
  Control Room**: owns characters/bibles, ideas, casting (voice + visual), channel
  profiles; surfaces Runs/Queue (pipeline output) read-only + Overview + Cost Box.
  **Read `DIRECTION.md`** — product ground truth.
- **Pipeline** (a SEPARATE repo, **out of this session's GitHub scope**) — owns research →
  fact-check → gate → script → assembly → distribution. Writes `episodes`/`receipts`/`jobs`;
  the dashboard reads them and enqueues `jobs` input fields (RLS-constrained).

**The loop (separation of powers — `governance.md` canonical, `AGENTS.md` binds it locally):**
- **Architect (Claude)** — judgment only: specs, gates, reviews, coordination, commits.
  **Never authors app code.**
- **Builder (Codex)** — all app code + migrations, sandboxed, cannot commit.
- **Cross-vendor reviewer (Gemini)** — via `scripts/gemini.sh` (STDIN! see §3).
- **suerta (independent Claude reviewer, Opus default)** — second lens on
  migration/money-path/contract slices (L-2), additive to the cross-vendor gate.
- **Human operator** — ratifies; has authorized the Architect to squash-merge PRs.

---

## 2. Current status (what's DONE) — through PR #55, 2026-07-02

**LATEST — Casting Studio voice-design upgrade SHIPPED (§4.A, PRs #53/#54/#55, all
merged to production):** the "flat/generic voice" root cause is fixed. The
`casting-proxy` edge function is **deployed live (version 5)** and now forwards +
**server-clamps** `model_id` (**pinned `eleven_ttv_v3`** — it was defaulting to the flat
`ttv_v2`), `guidance_scale` [0,100], `seed` [0,2147483647], and **drops the v2-only
`quality` param on v3** (live-ratification catch: EL 400s `quality` on v3). The proxy is
the true clamp boundary (verified by direct authed calls, out-of-range → clamp not
reject). The Casting Studio input is now a **"Casting Card"** (Fable-5 synthesis): six
KIT-slot chip pickers backed by curated rich-prose phrase banks that live-assemble an
editable ~200–600-char `voice_description` paragraph (one-way sync, detach-on-edit,
never reverse-parse) — slider-level ease **and** KIT-compliant richness. `voice_recipe`
now records the full **birth certificate** (raw description + preview + `builder_state` +
generation params) — **no migration** (CHECKs are permissive-additive). **Operator
audition gate** before lock (single active focus trap; cancel = no write/no spend).
Persona archetype bank curated to the live roster + expanded to **19** archetypes
(`docs/design/casting-phrase-bank.md` = the curated content source of truth;
`src/lib/castingPhrases.ts` = transcription). Reviews: Gemini spec + build + suerta(Opus)
all folded; money path measured live; browser smoke passed. **`quality` has NO operator
UI in v1** (plumbing kept; EL publishes no range and v3 rejects it). **Still pending:
the operator's audition of live v3 audio** (the generative-quality gate — no programmatic
gate exists; do it on production `content-gen-dashboard.vercel.app`) and, per the
operator, residual "AI vibe" reduction is a **future research item spanning voice +
script** (logged in the HQ Process Learnings Ledger).

**Prior foundation — through PR #51, 2026-07-02**

**Production = default branch `claude/new-session-3l99vs`, live at
`https://content-gen-dashboard.vercel.app` (Vercel team `canicode`). Pushing a branch
auto-deploys a preview; merging to default deploys production.**

Foundation through 2026-07-01 (detail in `docs/HANDOFF.md` + `GATES.md`): slices 1–4
(CRUD/bible/RLS, drill-down + history, Overview, Cost Box T1+T2), CI safety net, security
hardening, jobs enqueue + run-queue + approvals, Casting Studio (voice design via
`casting-proxy` edge function, `dash_0001`), ControlRoom decomposition into
`src/components/controlroom/*` + feature hooks, 0016 publish_only wiring,
channel_profiles (`dash_0002` + editor), #37 5s-polling (active Queue/Runs only),
Casting 2a visual identity (`dash_0003`, private `character-refs` bucket, upload→lock,
bucket-relative paths), voice_templates (`dash_0004`, recipe library +
`characters.voice_recipe` provenance), ADR-005 badge flip.

**2026-07-02 session (all merged to production):**
- **fact-approval + park_kind adoption** (PR #45) — column-first park resolution
  (`resolveParkKind`; receipts inference only as null-legacy fallback; hard-park values
  `blocked|exhausted` never inferred), fact-approval dialog (fresh re-enqueue with
  `fact_approved=true`, **NO auto-spend**, warns if already spend-approved), cache
  re-resolution closes the status-before-park_kind race. `jobs.channel` enqueue landed
  just before (PR #42) with the CI lockfile fix.
- **governance.md adopted** (PR #44) — canonical 29-rule shared file at repo root;
  `AGENTS.md` restructured to the project layer. **Extended to rules 30–34** (model-budget,
  PR #51) + L-4 two-lens staffing + **L-5 tier→model map**.
- **Mobile channels bar** (PR #46 broken placement → PR #47 fix → **PR #49 hotfix**: the
  #47 cherry-pick had resurrected the old duplicate `.mobile-roster` block, wrecking the
  Channels view on phones — deletion-only fix, 9 measured gates).
- **Mobile-UX batch 1** (PR #50) — three parallel Codex lanes from the independent audit
  (`docs/design/mobile-audit-2026-07-02.md`, spec `docs/slices/slice-mobile-ux-batch1.md`):
  queue actionable-first sort + filter chips (poll-surviving), runs chips, wire-capture
  selects enabled (`""`→`null` for the uuid FK), fixed bottom savebar ≤880px (240/340px
  reserve + safe-area), Visual-Identity bottom-sheet cascade fix, coarse tap floors
  (44px, block moved to end-of-file — floors were dead by source order), delete confirm,
  clamped error disclosures, misc. Per-lane suerta reviews (3× REQUEST CHANGES, blockers
  fixed + re-verified), **53 measured gates** at 412/700/1440px, retro Gemini aggregate
  PASS. Residuals recorded in the slice doc (§4.F).
- **FOOD voice cast + locked — the pipeline's voice roadblock is CLEARED.** Character
  **"Fine Print"** (id `ead6f8d2-…`), `voice_id: UaeNbtcDFAdeGzcWxlV8`, operator-picked
  winner; `voice_recipe` birth-certificate written (raw rich description embedded);
  template **"Honest Demystifier v1"** filed. Pipeline verified live and closed the row.
  **ElevenLabs two-key split done by operator:** worker key (TTS+Music) on Railway;
  Casting key (TTS + Voice Generation + Voices write) in the Supabase edge-function
  secret. **Casting quality lesson (major):** slider-composed one-line prompts produce
  flat generic voices; the winner came from a **rich persona-format description + long
  performance-script preview** (per EL's design guide + the pipeline's CASTING KIT,
  now mirrored on HQ). The proxy still calls EL defaults (ttv_v2, no guidance) — §4.A.

**Migrations.** Repo tracks 6 dashboard-owned: `0001_init`, `0002_bible_revisions`,
`dash_0001_casting_usage`, `dash_0002_channel_profiles`, `dash_0003_visual_identity`,
`dash_0004_voice_templates` — all APPLIED + VALIDATED live. Pipeline migrations are
bare `NNNN_*` (theirs; do NOT absorb). Expand/contract choreography is mandatory for
shared-seam migrations (§5).

**Supabase:** project `reels-content` = `tyeejhaknqkeftjykqog`. QA login =
`cameronnicodemus@gmail.com`; creds live ONLY in gitignored `.env.local`
(`RATIFY_EMAIL`/`RATIFY_PASSWORD` — password has NO space; quote it). **Open security
follow-up: operator still intends to rotate the QA password.**

---

## 3. Operational setup the new session MUST know (these cost real time)

- **Codex (builder):** `codex exec --sandbox workspace-write --skip-git-repo-check
  "<prompt>" < /dev/null`. Cannot commit. **Fresh container: `printenv OPENAI_API_KEY |
  codex login --with-api-key` once**, verify `codex login status`. Codex habitually edits
  `docs/HANDOFF.md` — revert that before committing. Parallel lanes: one `git worktree`
  per lane, `node_modules` symlinked, disjoint declared files only (governance rule 25).
- **Gemini (cross-vendor reviewer) — INVOCATION MATTERS:** `bash scripts/gemini.sh
  [model] < prompt.txt`. **The prompt goes on STDIN; the first ARGUMENT is the MODEL
  name.** Passing the prompt as the argument makes every call 404 into a flash fallback
  fed an EMPTY prompt → fluent, totally off-topic output (or a hang waiting on stdin).
  This burned a whole review cycle on 2026-07-02 and got misread as a vendor outage
  (ledger lesson: verify with a minimal direct call before substituting a costlier
  reviewer). Default model `gemini-3.1-pro-preview`; flash for light passes. Assemble all
  context INTO the prompt (REST wrapper reads no files).
- **suerta (L-2 second lens):** spawn via the Agent tool, **`model: "opus"` by default**
  (Fable-5 by judgment for high-stakes reviews only — rule 33). Prompt it adversarially
  with file paths + the spec; verify its verdicts against reality like any reviewer's.
- **Supabase MCP:** SQL / `apply_migration` / RLS. Cannot delete storage buckets.
  Applying a `dash_*` migration live = gated: **HQ heads-up first**, apply, verify
  structure, negative contract tests, VALIDATE as a separate step.
- **Ratification harness:** `npm run ratify` (`scripts/ratify.mjs`, `docs/ratify.md`) or
  bespoke Playwright walks. Prod build + `next start` on a dedicated port (never 3000) +
  Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (pass `executablePath`;
  `npm i --no-save playwright` per container) + **bridge `context.route('**/*.supabase.co/**')`
  → Node fetch** (forward `request.headers()` into the Node fetch so the browser's JWT
  rides along and RLS applies; Node trusts the proxy CA). Patterns proven
  this session: **intercept-and-abort** for writes (fulfill POST with 503, capture the
  payload — zero live writes), **live REST counts fetched at assert time** for data gates,
  `page.on("dialog")` for `window.confirm` gates. **Gates measure the EXPERIENCED property**
  (widths, positions, reachability, tap sizes, payload contents) — presence-only gates
  false-pass (ledger, twice). **Scroll the actual scroll container** — on mobile the
  document scrolls, `.dossier` doesn't (a walk-script bug faked 3 failures on 2026-07-02).
  Ratify mobile at 412px (+ a mid-width spot-check) AND desktop 1440px. **Re-walk the
  merged result after any conflict resolution** — #46/#47's cherry-pick resurrected dead
  code that gates had passed pre-merge (ledger).
- **Casting proxy (edge function `casting-proxy`):** actions design/create/tts/delete,
  daily cap 25 design+create per user. Direct authed calls for ops work: password-grant
  token via `POST /auth/v1/token?grant_type=password`, then hit
  `/functions/v1/casting-proxy` with curl (python urllib truncates the big chunked
  responses — use curl). Previews return base64 mp3s (`previews[].audio_base_64`).
- **Notion MCP:** fine-grained `update_content` string-matching fails on
  formatting-mixed table cells — prefer short unique substrings; fall back to comments
  (status still belongs in the tracker). Fetch child pages, not the whole log (rule 34).
- **Git:** cut branches fresh from `origin/claude/new-session-3l99vs` (that IS the
  default/production branch — verify with `git remote show origin`, don't assume `main`).
  After a squash merge, prefer cutting a fresh branch; if the working branch carries
  commits NOT in the squashed set, reset it onto the new default tip and cherry-pick
  **only those post-squash commits** (`git checkout -B <branch> origin/<default> &&
  git cherry-pick <shas>`) — never re-pick content the squash already landed — then
  `--force-with-lease`. The operator has authorized Architect squash-merges via the
  GitHub MCP. Commit trailers per harness instructions.

---

## 4. WHAT'S LEFT (prioritized, with triggers)

> **"Floor ≠ done."** For every gate ask: *could this pass while the thing I care about
> is broken?* UI gates measure experienced properties; generative-output quality has NO
> programmatic gate — **the operator's ear/eye IS the gate** (spec an operator audition
> step; ledger 2026-07-02).

### A. Casting Studio voice-design upgrade — ✅ DONE (shipped PRs #53/#54/#55, 2026-07-02)
Shipped exactly the spec (`docs/slices/slice-casting-voice-upgrade.md`, frozen v3):
proxy v3 + server clamps (casting-proxy deployed **v5** live), the **Casting Card**
(chip builder → editable KIT-format description — the §3 "solve both" synthesis chosen
over retire-vs-keep-sliders after operator redirect + a Fable-5 consult), birth-certificate
`voice_recipe`, operator audition gate, 19 curated persona archetypes. No migration; worker
TTS contract untouched. Full loop ran (Gemini spec + build + suerta reviews; money path
measured live; browser smoke). **Two residual/handoff items:**
- **Operator audition of live v3 audio is the last gate** (generative quality — the
  operator's ear; do on production). Merged ahead of it on explicit operator GO.
- **Residual "AI vibe" reduction** (operator, may be partly the *script* = pipeline-side)
  is a **future research item** — logged in the HQ Process Learnings Ledger; not scoped.
- The `casting-proxy` edge function is **deployed to the shared live project** (v5) — it
  is NOT branch-scoped and NOT redeployed by a Vercel merge; if you change it, redeploy
  via the Supabase MCP `deploy_edge_function` (keep `verify_jwt: true`).

### B. Casting 2b — visual candidate generation (ruled, deferred; provider fork OPEN)
Operator ruled Option 3 (in-dashboard generation) but deferred. The two reviewers
**split** on provider: suerta → Gemini image API (NEW dedicated key, ~30 images/day,
count-enforced); Gemini → Higgsfield (prepaid credits bound leak damage, Soul models,
~50/day). Both agree: count-based cap, never the shared reviews key, no dual-provider
build. **Must-verify before deciding: can Higgsfield's cloud API spend the operator's
existing consumer credits?** (If not, its main argument collapses.) Bucket-3 —
operator decides; no spend until then. 2c image-to-video stays pipeline-owned.

### C. HQ tracker prune — pipeline executes; we watch
Co-decision DONE (dashboard answered on the prune page: approach agreed; **10 archive /
6 keep** — realtime/polling → archive, Casting phase-2 → keep, park_kind → archive).
The 2026-07-02 session armed an hourly **session-local cron watch** (down-tiered
subagent checks the prune page; acks + closes when executed). **Crons die with the
session** — if this container is gone and the prune is still pending, re-check at
natural checkpoints or re-arm a watch.

### D. Gate-2 first character-linked run — OPERATOR step (pipeline side)
Everything is ready: enqueue with `character=Fine Print` (pipeline's kit page says
`fineprint` — codename consistency: check what their enqueue expects), approve spend,
`verify_quality_real.py`, watch the MP4. This run also populates
`episodes.character_id` → per-character cost (Tier-2) fills in for free. Optional
follow-on: re-audit pre-playbook voices (Mad Dog, Grandma Pearl) while nothing is
published — operator's call.

### E. Channel-onboarding auto-fill + new channels — hold LIFTED; E1 shipped, E2 deferred
Spec: `docs/slices/slice-channel-onboarding.md` (frozen). Operator lifted the hold
2026-07-02 ("do in order of importance"; the "finish the voice work" precondition was met).
- **E1 — on-creation persona auto-suggest: ✅ DONE, merged to production (PR #58).** A
  pure curated mapping (`src/lib/suggestPersona.ts`, channel fields → `PERSONA_BANK` chip)
  → non-binding advisory hint in `ChannelProfilesPanel`. No spend/LLM/migration. Full loop
  green (Gemini spec+build review, Architect, **10/10 in-browser gates** — `GATES.md` E1).
  Mapping table is operator-redlinable data (draft seeded from the phrase-bank roster-fit).
- **E1.b — pre-select the persona chip in the Casting Studio** for a channel-linked
  character: deferred to phase-2 (the `channel_profiles.character`↔`characters` link is
  loose/free-text today; needs a link decision).
- **E2 — guideline auto-fill editor: DEFERRED/blocked** on the unbuilt channel-researcher
  + the undecided cast-brief storage (roadmap item 5 gap; likely a `dash_*` migration).
  Its own slice when prioritized. Any editor UI around packaging/music-mood sentinels must
  be labelled non-enforcing (recipe §B: SPEC'D-NOT-BUILT).
- **New channel rows** (e.g. `weird_food`, §4.F.4) remain operator-priority calls.

### F. Mobile batch-1 residuals (recorded in `docs/slices/slice-mobile-ux-batch1.md`)
(1) 481–620px coarse band: savebar can occlude up to ~70px worst-case (extend the 340px
reserve to ~640px or measure the bar); (2) Exit button label-in-name (WCAG 2.5.3);
(3) `.ccr-tpl-trigger` flush alignment on touch; (4) `weird_food` channel row — values
are in the pipeline's FOOD brief (§2 of their page), create when the operator wants it
(it's channel work → arguably under the hold).

### G. Standing smaller items
- **Governance re-adoption — ✅ DONE, merged to production (PR #57).** Re-adopted the
  refined rules **20 & 32**, strengthened **34**, and new **35–41** verbatim from the HQ
  mirror; numbering restored to **1–41**; count refs fixed in `governance.md`/`AGENTS.md`/
  this file. Reviews: Gemini fidelity PASS + suerta/Opus second-lens PASS. Both HQ
  governance rows CLOSED.
- **Operator audition of v3 casting audio** (§4.A) — the last quality gate; operator-owned.
- **QA login not in this container** — `.env.local` is gitignored + ephemeral; the QA
  creds (`RATIFY_EMAIL`/`RATIFY_PASSWORD`) must be **re-requested from the operator** each
  fresh container for ratification. **QA password rotation** remains operator-owned + open.
- **Worker-key Music scope question** — operator challenged whether the EL worker key
  needs Music (Epidemic key exists on Railway); pipeline owes a grep-verified answer
  (comment on the voice ask page). Key already created WITH Music — worst case it's
  removable width.
- **Tier-3 ROI table** — furthest out (needs publishing + analytics ingestion).
- **CI checks are not merge-blocking** — unchanged.

### H. Deferred OWNER decisions — food-channel thesis (operator: "leave for now, note for later," 2026-07-11)
The `weird_food` `channel_profiles` row now **EXISTS and resolves live** (created 2026-07-09;
`research_profile.thesis` set; supersedes the "create the row" note in §4.E/§4.F.4). Two owner
calls are parked — **do NOT raise them until their trigger fires** (owner explicitly deferred):
1. **Thesis WORDING reconcile.** The live thesis reads softer than the owner's ratified framing —
   it opens *"One legal name, very different foods… difference, not deception; the regulation is the
   proof, never an accusation,"* whereas the owner's framing is more exposé: *"natural vs. engineered
   — how they engineer food to legally pass as the real thing, and how to spot it."* Editorial
   preference, owner-owned. **Trigger:** when the pipeline's researcher **extraction-retarget**
   (quality-wave) is being worked, or the first gate-passing food render is up for the owner's eye —
   whichever first. Until then the wording change has no effect (researcher only shifts tone today).
2. **Per-episode FORMULA as a pipeline-read field.** Whether *"real → engineered + tricks → cost/
   shelf-life motive → legal loophole → how to spot it"* should live in its own structured field the
   researcher is forced to follow (vs. only implied by the thesis string). This is a **@pipeline
   design question** first (new `research_profile` sub-key vs. fold into thesis), then owner ratifies.
   **Trigger:** raise with @pipeline when the researcher-retarget lands; gated behind render-completion.

---

## 5. Decisions already locked (don't reopen without new info)

- **D-1..D-5, publish_only/0016, channel_profiles contract, runtime field, cost tiers,
  two-repos + pg_jsonschema + expand/contract choreography (no coordinator), anti-bias
  forced-steelman** — all as previously recorded (see git history of this file /
  `docs/HANDOFF.md`).
- **park_kind vocabulary (operator-ruled):** approval parks `fact|spend|publish`
  (status `ready_for_review`), hard parks `blocked|exhausted` (status `error`),
  explicit null otherwise; column-first resolution, hard parks never inferred.
- **Fact approval ≠ spend approval:** fact re-enqueue never auto-approves spend.
- **Food register (operator-locked):** "The Honest Demystifier" — deadpan-with-
  personality, fact-first regulatory demystification; cast for timbre, the worker
  drives per-line energy. Voice = Fine Print (locked).
- **Model-budget rules 30–34 (operator-ratified 2026-07-02):** right-sizing, not
  minimizing; top tier by judgment; reviewer seat Opus-default; down-tiered bulk
  sweeps only for mechanical work; child-page HQ fetches; sessions scoped by context
  weight. Local map in `AGENTS.md` L-5.
- **2b = Option 3 (in-dashboard gen), deferred** until parallel capacity or a useful
  moment; provider fork open (§4.B).
- **Casting voice input = the "Casting Card" (§4.A, ruled 2026-07-02):** chip builder
  that emits an editable rich KIT-format `voice_description` (NOT sliders composing a
  one-liner — that caused the flat voices; NOT a bare free-text box). `eleven_ttv_v3`
  pinned; **`quality` is v2-only** (EL rejects it on v3 — proxy drops it on v3). Persona
  bank is a **static curated list** (auto-gen is deferred → §4.E). AI "punch-up" =
  phase-2, deferred.

---

## 6. Where things live

- **Notion "Reels Content — Agent Workforce"** (`38cd346e-22d2-81e9-9dbf-fa8c4a2dcf7b`) —
  thinking/tracking layer. Canonical specs live in the repo.
- **📮 Coordination Log** (`38fd346e-22d2-8133-bd2e-e5b7f97f7c2e`) — cross-team bus +
  Open Cross-Team Items tracker. **Fetch child pages, not the whole log.** Key child
  pages: the CASTING KIT (playbook mirror), FOOD CHANNEL design brief, model-budget
  rules page, prune co-decision page, Process Learnings Ledger
  (`390d346e-22d2-8152-bb7c-deef7d4c246b` — append lessons the moment they surface).
  After the prune executes, closed rows live in a 🗄 Tracker-archive child page.
- Repo memory: `governance.md` (rules 1–41) → `AGENTS.md` (L-1..L-5) → this file →
  `docs/HANDOFF.md` (full history) → `GATES.md`, `DIRECTION.md`,
  `docs/contracts/data-contract.md`, `docs/slices/*`, `docs/design/*`,
  `docs/roadmap-dashboard.md`.
- **Honest caveats carried forward:** Slice-1 provenance caveat; CI not merge-blocking;
  the cottage-cheese pipeline slice proved fact-discipline, not video quality; PR #46
  and the #47 cherry-pick both shipped broken mobile UI past green gates — the measured-
  gate + re-walk-the-merge rules exist because of them.
