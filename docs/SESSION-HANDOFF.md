# SESSION HANDOFF — start here to finish the project

_Last updated: **2026-07-05 (COPY AUDIT P1 SWEEP — #118: applied the S2 jargon→plain-English rename map to visible display text across all Aurora-surviving surfaces; deferred the 5 content-production dial labels to the operator; legacy `.cr` still intact pending 5b). Production tip = `c096531` (#118)** by the Architect (Claude)._
This is the **one authoritative "start here"** for a **new chat** picking up the work. Read this top-to-bottom,
then the canonical docs it points to. Deep running history is in `docs/HANDOFF.md`; this file
is the fast path._

> **Built against the hardened-handoff checklist** (pipeline lesson, 2026-06-30): one
> authoritative start-here · branch state pinned · don't-stall/don't-drift constraints ·
> contract matched to the real schema · DONE = falsifiable gates ("floor ≠ done").

---

## ⚡ LATEST (2026-07-05) — COPY AUDIT P1 SWEEP SHIPPED (#118, squash `c096531`): S2 jargon→plain-English rename across every Aurora-surviving surface. Read this first + the "NEXT / operator decision owed" below.

**Production/default = `claude/new-session-3l99vs` @ `c096531` (#118).** This session picked task (a) from the prior
handoff — the **copy-audit P1 tier** — because (b) 5b (The Wire) is a write/money path needing operator go-ahead and
(c) 5g is blocked on 5b. Applied the audit's **S2 rename map to user-visible display text only** (DB columns / enums /
props / CSS classes / pipeline-contract fields untouched — the operator's HARD rule), sentence-cased throughout,
stripped implementation leaks, and added the P1 empty-state CTA. Branch for new work: **start fresh off production**
(keep your harness-designated working-branch name).

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
TASK — pick one, per value:
  (a) OPERATOR DECISION OWED (surface it first): the 5 content-production DIAL LABELS — Treatment, Packaging,
      Source ladder, Arousal ceiling, Claim discipline — were DEFERRED this session (content-style-guide §8 flags
      them as an open operator-vocabulary question). If the operator confirms the S2 renames (Style / Title &
      thumbnail / Footage sources / Intensity limit / Fact-check strictness), apply them in ChannelProfilesPanel.tsx
      (VISIBLE LABELS ONLY — the `treatment`/`packaging`/`source_ladder`/`engagement_posture.*` DB fields + enums stay).
  (b) SUB-LANE 5b — The Wire (ideas) Aurora home + EnqueueIdeaPanel: last buildable reachability gap before the
      legacy `.cr` shell can be deleted (5g). WRITE/MONEY path (enqueue-idea-as-run) → get operator go-ahead first.
      Its rewrite is also copy-audit-spec'd → closes a structural blocker AND lands audit-clean copy in one pass.  ← RECOMMENDED.
  (c) SUB-LANE 5g — delete the legacy `.cr` shell. Blocked on 5b landing (5c/5f data-blocked). Consensus review.
Drive build→review (Gemini cross-vendor; +suerta on money/contract/migration)→ratify→squash-merge via GitHub MCP
(owner recklessfrags, repo content-gen-dashboard) into claude/new-session-3l99vs. Keep chat terse (L-3).
```

### What shipped this session (merged to production, #118)
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
    stripped (the enforcement hint rewritten to the style-guide §4 plain pattern). **Dial LABELS left unchanged (deferred).**
  - **Compare / History / Visual overlays** — dossier/bible/manual → character profile; `Codename`→Name; de-alarmed the
    Visual chip (`CORRUPTED`→`Missing`).
- **Gates:** `tsc` + **148 tests** + `next build` clean. **Live ratify `scripts/ratify-copy-p1.mjs` 11/11, ZERO live
  writes** (every write table intercept-and-aborted; new copy renders, old jargon gone on all 6 surface groups).
  **Cross-vendor (Gemini) review APPROVE** (no identifier/semantic breakage; apostrophes escaped; the 2 structural
  items verified in-spec + correct). Display-copy only (low-stakes rule 5) → single cross-vendor pass; no suerta needed.

### NEXT / operator decision owed
- **⚠️ OPERATOR DECISION OWED — the 5 content-production dial renames.** `content-style-guide.md §8` flags
  `treatment` / `packaging` / `source ladder` / `arousal ceiling` / `claim discipline` as an **open operator-vocabulary
  question** (are these words the operators actually use, or jargon to rename?). The **copy-audit S2 map proposes**:
  Treatment→**Style**, Packaging/Title+Thumbnail style→**Title & thumbnail**, Source ladder→**Footage sources**,
  Arousal ceiling→**Intensity limit**, Claim discipline→**Fact-check strictness**. This session **deferred** them (a
  brand/vocabulary call = human-only, rule 20). **Ask the operator to confirm/adjust, then apply the visible LABELS in
  `ChannelProfilesPanel.tsx` only** (the DB `treatment`/`packaging`/`source_ladder`/`engagement_posture.*` fields + enums
  stay — HARD rule). Casting **"persona"** (voice concept, not the character) was intentionally kept.
- **(b) 5b The Wire** (RECOMMENDED, needs go-ahead) and **(c) 5g delete `.cr`** (blocked on 5b) — unchanged from below.
- **P2 theming** — mostly absorbed by the 5g `.cr` deletion; the surviving-into-Aurora dossier-editor/ActionCenter copy
  is now done. **P3 nits** — placeholder-examples, `eps`→episodes, remaining literal Title-case buttons — low value, defer.

### HQ / cross-team (per rule L-6 — wrap-up is HQ THEN handoff, #117)
- **Coordination-Log tracker: NO cross-team update owed.** This session was **dashboard-internal display copy** — no
  schema/contract/shared-surface data or behavior change (the DB columns/enums/pipeline-contract fields were the HARD-RULE
  exclusion; the money-path gate logic was untouched). No tracker row, no heads-up.
- **Process Learnings Ledger: appended 1 portable lesson (2026-07-05)** — a live Next.js ratify must `next build` with
  `.env.local` present (NEXT_PUBLIC_* inline at build time, not `next start`), and a content-assertion gate must confirm
  the app hydrated (wait for `.aurora-app`) or "text absent" false-passes as "jargon removed." (Cost a rebuild this session.)

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
