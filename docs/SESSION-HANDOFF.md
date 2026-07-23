# SESSION HANDOFF — start here to finish the project

_Last updated: **2026-07-23 (post-video-POC RECONCILIATION adopted — owner-ratified ruling reels#88 `5058526487`; governance mirror verified in sync; queue re-sorted, zero code owed. Prod tip = `6820b0f` on `claude/new-session-3l99vs`.)** by the Architect (Claude)._
This is the **one authoritative "start here"** for a **new chat** picking up the work. Read this top-to-bottom,
then the canonical docs it points to. Deep running history is in `docs/HANDOFF.md`; this file
is the fast path._

> **Built against the hardened-handoff checklist** (pipeline lesson, 2026-06-30): one
> authoritative start-here · branch state pinned · don't-stall/don't-drift constraints ·
> contract matched to the real schema · DONE = falsifiable gates ("floor ≠ done").

---

## ⚡ LATEST (2026-07-23) — RECONCILIATION adopted: new direction in force (universal directorial layer → dark_history reference channel); dashboard queue re-sorted; governance mirror VERIFIED in sync. Read this first.

**Prod tip = `6820b0f`** (docs #163 = scoring-contract rev 3). **No open PRs; dashboard in-flight = zero** — all tasked work through 07-19 shipped (#156/#158/#159/#160/#161, docs #162/#163). This session shipped no code because none was owed: it was the operator-mandated reconcile-don't-resume pass. Branch `claude/dashboard-governance-sync-ykvjf9` carries only this handoff refresh.

### The ruling that governs the queue (reels#88 comment `5058526487`, owner-ratified 2026-07-23)
**Direction:** build the **universal directorial layer FIRST** (1 editor cut-on-progress + per-channel cut rhythm, 2 synchronized foley, 3 VO humanization, 4 captions/particle/grade) → take **`dark_history`** end-to-end as the reference channel → then per-channel onboarding. Per-channel *generation policy* (fully-generated / process / animation / archival-doc / faceless-avatar) is **`channel_profiles` config, not new pipelines**. Canonical doc: pipeline repo `docs/architecture/handoff-2026-07-20-video-poc-to-pipeline.md` (their `main`; note their default branch is NOT `main` — `git fetch origin main` explicitly).

**Dashboard sort (ACKed with evidence at #88 `5058695023`):**
- **LIVE thread — scoring contract rev 3** (`docs/proposals/render-scoring-contract.md`, docs #163): pipeline is directed to answer our §5 asks early (within-generation `cut_id` stability; `receipts.seq`→generation confirmation; per-cut timing path). **Capture build stays PAUSED until the first universal-layer MP4 exists**; nothing builds against `render_reviews` until ratified.
- **DROPPED (owner-ratified):** `episodes.correlation_key` as a dashboard-consumed join key — rev-3 `(episode_id, cut_id)` + `source_receipt_seq` supersedes it. The column EXISTS live (43/103 episodes, pipeline 0019, shipped 07-04 — the 07-20 handoff's "queued" was stale); `dash_0006_idea_job_map` is unaffected; no DB action taken or implied.
- **HOLDS unchanged:** reveal write-back RLS A-vs-B + `0021` apply (owner-gated bundle, explicitly deferred — publish is far off); scoring mock→real flip (held for a validated relevance judge; the cottage-cheese false-pass is never a calibration source).
- **PARKED under the freeze:** tier-selector mapping, #137 per-model cut, #153 unsaved-edits guard, roster expansion to additional channels.
- **Mad Dog re-cast UNLOCKED** (owner verdict 07-21: contour re-direct insufficient). The OWNER executes it in the Casting Studio (basic mode seeds from `characters.voice_recipe` — the Yosemite Sam × R. Lee Ermey target is already in the row, parser verified fail-safe). Expect `characters` writes when a voice locks; no dashboard change needed.

### Verified this session (investigate-then-conclude, receipts in #88 `5058695023`)
- **Governance mirror = BYTE-IDENTICAL** to the pipeline canonical at their `main` (`2d77b56`) — diff run 2026-07-23. Rule 40 (foundation dimension-check) + the 40→42 renumber were already adopted 07-14 (#158); the 07-20 "dashboard: sync your mirror" heads-up is satisfied per its own "treat as landing confirmation" language. **No repo change needed.**
- **All four `channel_profiles` roster rows are live + fully populated** (`dark_history`/Mad Dog, `grandma`/Grandma Pearl posture `none/aggressive`, `weird_food`/Fine Print, `default` — each with `character_id`/`sourcing`/`research_profile`/`length_target`; dark_history `short_s=100`). The Notion tracker row that still said OPEN is now marked resolved with this evidence; the ruling's "roster rows parked" applies only to FUTURE expansion.
- **#88 is still the live 4-way bus** (today's ruling landed there); Notion Coordination Log = durable mirror, Ledger still takes lessons (2026-07-23 entry appended: a ratified ruling's per-item states still need live-artifact verification).

### Anticipated surfaces (NOT built — freeze + pause; spec only after pipeline contracts land)
1. **Per-channel generation-mode config** in the channel editor, once the pipeline defines the `channel_profiles` generation-policy keys (grouped-jsonb precedent; `vocabularies.json` still unshipped — dropdown vocabularies stay hand-maintained until then, a known rule-40 allow-list smell).
2. **Approval/watch surfaces for universal-layer outputs** — extend the existing Action Center/Runs hub patterns (`operator_watch`, `below_floor_notice`, parked-render triage + RenderPlayer are all live already).
3. **Scoring capture surface** (`dash_0012_render_reviews`) — after rev-3 ratification AND the first universal-layer MP4.

### Next session
1. **Poll the #88 tail FIRST (L-1)**, plus dashboard #139/#153/#155. The trigger to act: the pipeline's rev-3 §5 answers → arbitration → owner ratify.
2. Session traps hit this pass: whole-Coordination-Log Notion fetch overflows (fetch child pages / grep the saved dump; rule 34); Notion `update_content` needs a `content_updates` array with `old_str`/`new_str`; the pipeline repo must be added via `list_repos`+`add_repo` and shallow-clones to its non-`main` default branch.
3. **HQ outcome (L-6):** #88 reconciliation ACK `5058695023`; Notion tracker roster row marked resolved; session re-registered at #155; Ledger lesson appended — all done BEFORE this handoff was written.

### Kickoff prompt (copy-paste for a fresh session)
> You are the DASHBOARD architect (repo `recklessfrags/content-gen-dashboard`). Select/cut your branch fresh from `origin/claude/new-session-3l99vs` (the default/production branch). Read `docs/SESSION-HANDOFF.md` top-to-bottom FIRST, then `governance.md` (42 rules), `AGENTS.md` (L-1..L-6), `DIRECTION.md`, `docs/contracts/data-contract.md`, `GATES.md`. Coordination: GitHub `reels-content-generation#88` is the live 4-way bus — read its tail before judging anything (L-1), plus dashboard #139/#153/#155; re-register your session ID at content-gen-dashboard#155; Notion HQ (Coordination Log + Process Learnings Ledger) is the durable mirror. Direction in force (owner-ratified 2026-07-23, reels#88 `5058526487`): universal directorial layer first → dark_history end-to-end as reference channel → per-channel onboarding; the dashboard is in a WAITING posture — the scoring contract rev 3 (`docs/proposals/render-scoring-contract.md`) is the live cross-team thread awaiting the pipeline's §5 answers; capture build paused until the first universal-layer MP4; `correlation_key` dropped; reveal write-back + scoring mock→real HELD; #137/#153/tier-selector/roster-expansion PARKED. Build app code only through Codex; Gemini cross-vendor review before merge; self-merge only dashboard-only + gate-green + cross-vendor-PASS; shared surfaces need a problem-solver GO; spend/publish/direction are owner-only. Talk terse (L-3).

---

## ⚡ (2026-07-14) — HQ backlog worked: render VIDEO player + `length_target` validation SHIPPED (PR #156 `4895324`).

**Prod tip = `4895324`.** Same session as the 5g entry below, continued after the operator surfaced a
missed backlog.

### ‼️ Coordination protocol (supersedes every older "check Notion HQ" instruction)
- **The 4-way HQ is GitHub issue `reels-content-generation#88`** (owner ⇄ problem-solver ⇄ pipeline ⇄
  dashboard; sign comments "Dashboard architect"). Deep single-track threads: pipeline #82, dashboard
  #139 etc. **Session start: add/clone the reels repo if absent, read the #88 + #82 tails, work the
  problem-solver's backlog top-down, post progress there.** This session fell an evening behind by not
  seeing #88 — don't repeat that.
- **Re-register the session ID at `content-gen-dashboard#155` every new session** (wake-on-post wiring;
  the ID is also in every commit's `Claude-Session` trailer).
- Notion is authorized again but is now the LEGACY layer — the Process Learnings Ledger
  (`390d346e-…246b`) still takes portable lessons (both of this session's lessons appended 2026-07-14);
  live coordination happens on #88.

### What shipped (PR #156, squash `4895324` — problem-solver-cleared, merged upstream 2026-07-14)
- **Render `<video>` player (HIGH — the watch-gate had no watch UI):** `RenderPlayer` — lazy
  "Watch render" disclosure on Action Center approval cards (`job.episode_id`) + Reveal Hub cards
  (fixture id = episode id on the real path, `ControlRoom` builds fixtures `id: episodeId`); streams the
  PUBLIC `render-assets/{episode_id}/mastered.mp4` (verified 206/range). `renderVideoUrl` in
  `src/lib/renderAssets.ts` (note in code: swap to `createSignedUrl` if the owner flips the bucket
  private). Zero writes.
- **`length_target.short_s` hardened** — it became a LIVE pipeline knob (reels PR #102: word bands, cut
  counts, durations derive from it; invalid values silently fail-safe to 70). New `parseShortSeconds`
  (empty→unset; else finite `0 < s ≤ 180`), inline error + `aria-invalid`, **Save disabled while
  invalid**, pipeline-supplied helper copy. All 4 live channels verified carrying values
  (dark_history=100).
- Gates: tsc · **249/249** vitest (+12 new) · next build · Gemini cross-vendor (1 blocker refuted with
  code evidence — RevealHub's fixture id IS the episode id; 1 SHOULD folded — Save disable).

### Standing HOLDS (from the problem-solver's authoritative backlog, reels#88 `4964858225`)
1. **Reveal write-back mechanism — DO NOT BUILD** until the owner rules RLS **A-vs-B** (scoped
   UPDATE grant vs `reveal-resume` edge function; problem-solver leans B, bundled with the `0021`
   apply GO). Decisions keep recording to `reveal_approvals` with "resume pending."
2. **Scoring `?hub=review` mock→real — DO NOT FLIP, old trigger REVOKED:** the
   `cottage-cheese-20260712-034826-4cadec` render was a **FALSE PASS** (caption-not-subject judge bug).
   Never calibrate against it; wait for a validated relevance judge + owner ratify.

### Also this session (earlier, see the 5g entry below for detail)
5g shipped (#152) · handoff refresh (#154) · #136 Mad Dog casting closed as completed (was done 07-09) ·
follow-up #153 filed (guidelines dirty-guard — still awaiting problem-solver triage) · session registry
#155 created · both portable lessons appended to the Notion Ledger.

### Later same session (2026-07-14, after PR #156): Tasks A+B + the self-merge delegation
- **STANDING DELEGATION (problem-solver, reels#88 `4965428201`/`4965474764`): self-merge dashboard-only
  + gate-green + cross-vendor-PASS builds** — no per-PR GO. PS GO only for shared surfaces
  (`jobs`/`channel_profiles`/`characters`/`episodes`/`receipts`/buckets/contract docs) or live
  migrations, brand GREEN-YELLOW-RED, publish/spend/direction. Post a one-line "merged X" on #88 after.
- **Task A shipped — parked-render review surface:** Action Center now = the owner's triage loop:
  errored/stuck section (no actions — read-only), per-card plain-English park explanations
  (`src/lib/parkExplanation.ts`, copy test-asserted), lazy "Why it parked" receipts disclosure (reuses
  the RunsHub diagnostics loader; below-floor cut extraction, cycle-safe), RenderPlayer inline.
- **Task B shipped — governance synced to canonical (reels `d67216a`):** NEW rule 40
  (foundation dimension-check + default-deny), craft rule renumbered 40→42, and three drifted wordings
  adopted verbatim (41 kickoff-prompt extension, 30 tail, 33 tail); count refs → 1–42. Gemini fidelity
  APPROVE ("mirroring means mirroring"). **Note rule 41 now requires the wrap-up kickoff prompt.**
- **Mad Dog `voice_recipe`** now carries a recast-target shape (pipeline intent-capture; parser verified
  fail-safe, nothing behavioral).

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
   before ending a session) — **HQ = GitHub `reels-content-generation#88`** (the 4-way
   channel; see the ⚡ 2026-07-14 protocol above), plus the deep-track issues (#82 pipeline,
   dashboard #139/#153). Always fresh-fetch the #88 tail before telling the operator
   "nothing is buildable" (L-1). The Notion 📮 Coordination Log is the legacy layer (Ledger
   still lives there).
4. **Read, in order:** this file → `governance.md` (42 shared rules) → `AGENTS.md` (project
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
- Repo memory: `governance.md` (rules 1–42) → `AGENTS.md` (L-1..L-5) → this file →
  `docs/HANDOFF.md` (full history) → `GATES.md`, `DIRECTION.md`,
  `docs/contracts/data-contract.md`, `docs/slices/*`, `docs/design/*`,
  `docs/roadmap-dashboard.md`.
- **Honest caveats carried forward:** Slice-1 provenance caveat; CI not merge-blocking;
  the cottage-cheese pipeline slice proved fact-discipline, not video quality; PR #46
  and the #47 cherry-pick both shipped broken mobile UI past green gates — the measured-
  gate + re-walk-the-merge rules exist because of them.
