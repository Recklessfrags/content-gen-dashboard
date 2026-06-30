# SESSION HANDOFF — start here to finish the project

_Last updated: **2026-06-30** by the Architect (Claude). This is the **one authoritative
"start here"** for a **new chat** picking up the work. Read this top-to-bottom, then the
canonical docs it points to. Deep running history is in `docs/HANDOFF.md`; this file is the
fast path._

> **Built against the hardened-handoff checklist** (pipeline lesson, 2026-06-30): one
> authoritative start-here · branch state pinned · don't-stall/don't-drift constraints ·
> contract matched to the real schema · DONE = falsifiable gates ("floor ≠ done"). A
> **cold-start (MD) review** was run against this doc on 2026-06-30 — see §0.

---

## 0. First actions for a fresh session (do these in order)

1. **`git fetch` BEFORE judging anything.** Local refs lie. Production = the GitHub default
   branch **`claude/new-session-3l99vs`**; confirm its tip before assuming merge state.
2. **Re-arm the 5-minute HQ monitor.** This session polls Notion HQ every ~270s
   (`ScheduleWakeup`) for pipeline replies and re-arms each cycle. It does **not** survive a
   session switch — re-arm it first thing. (Prompt: "Check HQ Notion pages incl. sub-pages
   under the 'Reels Content — Agent Workforce' root; respond as needed; re-arm the timer.")
3. **Read, in order:** this file → `AGENTS.md` (loop rules) → `DIRECTION.md` (scope) →
   `docs/contracts/data-contract.md` (DB shapes + ownership) → `GATES.md` → the 📮
   Coordination Log in Notion (current cross-team state, §6).
4. **Don't-drift / don't-stall:** the dashboard is a **focused control tool, NOT a
   kanban/production board** (D-2). Don't invent scope. If you park, say why; don't stall
   silently. Build app code **only through Codex** (§3); the Architect commits docs only.

**What "done" means here:** a slice is done when it's **merged to the default branch, its
gates are green on the real artifact** (not just unit-green — see §4 "floor ≠ done"), and an
**independent reviewer that did not build it** signed off. The human ratifies/merges.

---

## 1. What this is (60 seconds)

An automated agent workforce that produces faceless short-form video. **Two repos, one
shared Supabase project:**

- **Dashboard** (`recklessfrags/content-gen-dashboard`, THIS repo) — the **Character
  Control Room**: a focused control tool. Owns characters/bibles, ideas, casting, channel
  profiles; surfaces Runs (pipeline output) read-only + Overview + Cost Box + a run-queue.
  **Read `DIRECTION.md`** — product ground truth (focused tool, NOT a kanban board).
- **Pipeline** (a SEPARATE repo, **out of this session's GitHub scope**) — owns research →
  fact-check → gate → script → assembly → distribution. Writes `episodes`/`receipts`/`jobs`;
  the dashboard reads them read-only and enqueues `jobs` input fields.

**The loop (separation of powers — `AGENTS.md` is canonical; "no one grades their own work"):**
- **Architect (Claude / you)** — judgment only: specs, gates, briefs, review, ratify,
  cross-team coordination. **Never writes app code.** Commits **docs/markdown only** (logged
  exception). Pushes back; investigates THEN concludes (in both directions — reflexive
  agreement and reflexive alarm are the same error).
- **Designer (Gemini)** — UI/UX artifacts + independent review (a vendor different from the
  builder).
- **Builder (Codex)** — all app code + migrations, in a sandbox. **Cannot commit** (sandbox
  `.git` is read-only) — the Architect commits Codex's edits.
- **Independent review** — the two agents that did NOT build (Claude + Gemini) review each
  diff adversarially; the **human** ratifies/merges.

**Canonical docs after this:** `AGENTS.md`, `DIRECTION.md`, `GATES.md`,
`docs/contracts/data-contract.md`, `docs/slices/*`, `docs/design/*`, `docs/HANDOFF.md` (full
history).

---

## 2. Current status (what's DONE) — through PR #24, 2026-06-30

**Production = default branch `claude/new-session-3l99vs`, live at
`https://content-gen-dashboard.vercel.app` (Vercel project `content-gen-dashboard`, team
`canicode`). Production tracks the default branch; pushing a branch auto-deploys a preview.**

Shipped & merged (high level — see `docs/HANDOFF.md` + `GATES.md` for per-slice detail):

- **Slices 1–4** (foundation: characters/ideas CRUD + bible jsonb + owner-scoped RLS;
  drill-down + bible history `0002`; Overview; Tier-1 Cost Box).
- **Test safety-net + CI gate** — Vitest on `lib/*`, pinned Supabase deps,
  `.github/workflows/ci.yml` (`tsc --noEmit` + `npm test` + `npm run build`). Note: repo
  checks are **not merge-blocking** today (merges succeed with CI in_progress).
- **Security hardening** — casting-proxy CORS allowlist; sign-up UI removed; open sign-ups
  off + leaked-password protection on (Supabase console).
- **Jobs feature** — idea→`jobs` enqueue + run-queue view + `ready_for_review` approval.
- **Casting Studio** — edge function + `casting_usage` migration (`dash_0001`), client lib
  (`src/lib/casting.ts`), UI, follow-ups (bracket library + decision gate), and the
  **bracket↔voice_id reconcile** (`reconcileBracket`, PR #15).
- **Per-character Cost Box** (Tier 2 / C1) — `computeCostStats(... characters)` +
  Per-Character Cost card (PR #16).
- **Gemini REST wrapper** — `scripts/gemini.sh` (the `gemini` CLI 503s; use the wrapper),
  default model `gemini-3.1-pro-preview`, fallback `gemini-3.5-flash` (PR #17).
- **ControlRoom decomposition** — phase 1 extracted sub-components into
  `src/components/controlroom/*`; phase 2 lifted read-state into feature hooks
  `useEpisodes` / `useJobs` / `useCostReceipts` (PRs #18–#20). `Field` lifted into
  `controlroom/shared.tsx` (PR #24).
- **0016 wiring** — resume-to-distribution publish path (`publish_only` +
  `source_episode_id`) + `jobs.error`/`park_kind` display (PR #21); publish-retry trap fix:
  source resolves as `source_episode_id || episode_id` (PR #22).
- **channel_profiles** (dashboard-owned, **fully shipped**) — `dash_0002` migration + data
  layer (PR #23) and the Channel Profile editor + `channels` view (PR #24). **`dash_0002`
  is APPLIED to the live DB** (table + 4 `authenticated` CRUD policies + `default`
  food-behavior seed, verified). Engagement dials (`claim_discipline`/`arousal_ceiling`)
  render with a **"stored — not yet active"** badge — the pipeline does not enforce them yet.

**Migrations.** Repo tracks **4 dashboard-owned** migrations: `0001_init`,
`0002_bible_revisions`, `dash_0001_casting_usage`, `dash_0002_channel_profiles`. The live
project has more — the rest are **pipeline-domain** (jobs queue, live-adapters,
`published_posts`, `asset_ledger`, `episodes.character_id`, bare-`0016`
`publish_only`/`source_episode_id`/`park_kind`, audit-log). **Namespacing is the contract:**
dashboard migrations are `dash_NNNN_*`; pipeline migrations are bare `NNNN_*`. Do NOT absorb
pipeline migrations here.

**Supabase:** project `reels-content` = `tyeejhaknqkeftjykqog`. Login
`cameronnicodemus@gmail.com` (temp password in `docs/HANDOFF.md` — change it). Storage:
`render-assets` (public, pipeline-owned).

---

## 3. Operational setup the new session MUST know (these cost real time)

- **Builder = Codex.** Invoke non-interactively:
  `codex exec --sandbox workspace-write --skip-git-repo-check "<prompt>" < /dev/null`.
  Codex **cannot commit** (sandbox `.git` read-only) — it edits files; **the Architect
  reviews + commits**. **Codex habitually edits `docs/HANDOFF.md`** to narrate its work on
  feature branches — **revert that** (`git checkout -- docs/HANDOFF.md`) before committing.
- **Designer/reviewer = Gemini, via the REST wrapper.** The `gemini` CLI 503s — use
  **`bash scripts/gemini.sh [model] < prompt`** (default `gemini-3.1-pro-preview`, fallback
  `gemini-3.5-flash` on 503/UNAVAILABLE or 404/NOT_FOUND). **On a fresh checkout the script
  can lose its exec bit → call it via `bash scripts/gemini.sh`.** Large payloads can time
  out (~3 min) — send the diff/critical functions, not whole large files.
- **Reviewer discipline (anti-lazy-pass).** Prompt reviewers to "find the most likely
  failure; default to REQUEST CHANGES on doubt." **Verify every verdict against reality** —
  APPROVE ≠ correct, REQUEST CHANGES ≠ correct. Examples this session: Gemini called
  `character` (a column name) a "fatal reserved word" → **empirically refuted** with a
  Postgres temp-table test (it's non-reserved); Gemini wanted the publish source flipped to
  `episode_id`-first → **declined** (the worker posts `source_episode_id` for publish_only
  jobs). A second independent reviewer catches what one misses (different vendors, different
  blind spots).
- **Supabase MCP:** runs SQL / `apply_migration` / buckets + RLS. **CANNOT delete storage
  buckets** (protect trigger). Applying a `dash_*` migration to the live DB is a deliberate
  gated step — **post the migration name to HQ first**, then apply, then verify.
- **Notion MCP editing is fragile on legacy pages.** The HQ root's older decision-log blocks
  store inline markdown such that fine-grained `update_content` string-deletion can't match
  cleanly and can mangle adjacent markup. **Prefer rebuilding a section or hand-editing** over
  surgical string-replace on those blocks. `notion-create-comment` intermittently returns
  "stream closed before response" — verify with `get-comments` and retry.
- **In-browser ratification bridge:** headless Chromium can't TLS-egress the sandbox proxy;
  run `next build` + `next start`, launch global Playwright
  (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`), and bridge `page.route('**/*supabase.co/**')`
  → Node `fetch` (carry the JWT so RLS applies). Scripts in scratchpad (`*_ratify.mjs`).
- **RATIFY ON MOBILE TOO** for any UI slice: load at **412px**, assert
  `scrollWidth == clientWidth`, no stray `position:absolute`/`transform:rotate` bleed.
- **Git:** develop on the designated branch; `git push -u origin <branch>` (retry w/
  backoff on network errors). Don't create PRs unless asked; the human merges via "merge"
  (squash). Never push to a different branch without explicit permission.

---

## 4. WHAT'S LEFT (prioritized, with triggers)

> **"Floor ≠ done."** Some quality only shows on the **real artifact** (rendered UI / real
> data), not unit-green. "renders without error," "200 OK," "migration applied" are green
> checks that don't prove the **UX or data is correct**. For every gate ask: *could this
> pass while the thing I care about is broken?*

### A. ControlRoom decomposition — phase 2 remaining (task #40, in progress)
Done: `useEpisodes`/`useJobs`/`useCostReceipts`. **Remaining slices:** (1) the drill-down
per-episode `receipts` slice (separate from the global cost-receipts hook); (2) the
entangled `useCharacters`/`useIdeas` (optimistic writes + `clientWriteState` — **highest
risk, do last**). Behavior-preserving; one slice per PR; independent review each.

### B. Realtime / polling (task #37)
Needs the pipeline to enable the `supabase_realtime` publication on the read tables
(Runs/queue) — a quick HQ ask when building. **Pre-req fix (latent bug captured during
channel_profiles Slice B review):** `ChannelProfilesPanel`'s form-reset `useEffect`
(`[creating, loading, profiles, selectedProfile]`) will **clobber unsaved edits** once
background refetch/polling exists — make it dirty-aware or key the reset to selected-channel
change **before** enabling polling on that view. Same caution for any editor fed by a polled
hook.

### C. channel_profiles enforcement (pipeline-side; we flip a badge)
The table + editor are shipped; the **worker-read + ADR-005 dial enforcement are later
pipeline work** (post their quality slice). When they ping that it's live, flip the editor
dials' **"stored — not yet active"** badge to active. No dashboard schema change expected.

### D. Casting phase-2 — image/style (needs an HQ proposal first)
Gemini image models are available. Draft a proposal in HQ before building (per the loop).

### E. Tier-3 ROI table — furthest out
Needs publishing live AND an analytics-ingestion service (per-platform API + OAuth + sync).
`DIRECTION.md` says analytics "deferred, not killed." Order: cost now → per-character (done)
→ ROI after publishing.

### F. Cosmetic HQ cleanup (trivial, human or rebuild)
The decision-log prune (2026-06-30) left **one stray `***…*` asterisk line** near the
Task #21 tombstone on the HQ root — the Notion editor can't match it to delete. 15-second
manual delete in Notion, or rebuild that section. Non-blocking.

### G. Pipeline-side keystone (out of our scope, unblocks our Tier-2 data)
The first real **Mad Dog → Acoustic Kitty** run populates `episodes.character_id` (D-1).
The column is live; 0 episodes linked yet, so per-character cost has the seam but no data.

---

## 5. Decisions already locked (don't reopen without new info)

- **D-1** Episode↔character link — lands at the Acoustic Kitty run (`character_id` live, 0
  linked).
- **D-2** Dashboard = focused control tool, not a kanban board — encoded in `DIRECTION.md`.
- **D-3** Auth — "me now, scoped others later" (owner-scoped RLS for user data).
- **D-4** `character_bible_revisions` — ratified (`0002`).
- **D-5** Storage — `render-assets` (public, pipeline-owned) vs user-uploads (private,
  owner-scoped, designed-not-built).
- **publish_only (0016)** — resume-to-distribution: a `publish_only` job mints **no new
  episode**; the worker sets `jobs.episode_id = source_episode_id` on start and resumes at
  Distribution (no re-render, no double-spend). **Source-first precedence is correct**
  (our PR #22). Still double-gated (nothing posts without a Buffer token).
- **channel_profiles contract** (locked cross-team) — dashboard-owned; **text columns, not
  PG enums**; jsonb for structured fields; **RLS = `authenticated` full CRUD** (operation-
  global, no `owner` column; worker reads via service role); `default`/unknown channel →
  food behavior. Dials are **stored, not yet enforced**.
- **Runtime field** — **operator-owned/editable** (pipeline ruling; reverted the earlier
  "advisory/pipeline-measured" framing).
- **Cost tiers** — Tier 1 (shipped) → Tier 2 (per-character, shipped; data at D-1) → Tier 3
  (ROI, after publishing + analytics).

---

## 6. Where things live (HQ is now restructured)

- **Notion "Reels Content — Agent Workforce"** (`38cd346e-22d2-81e9-9dbf-fa8c4a2dcf7b`) — the
  *thinking/tracking* layer (decisions, roadmap, brand, ideas). **Canonical specs live in
  the repo, not here.**
- **📮 Coordination Log** (`38fd346e-22d2-8133-bd2e-e5b7f97f7c2e`) — the cross-team message
  bus, with an **Open Cross-Team Items tracker** at the top (read it instead of opening every
  thread). New dated pipeline↔dashboard exchanges and pipeline build/lesson pages are
  parented under it. **Keep the tracker current as state changes.** As of 2026-06-30 every
  cross-team item is CLOSED/CONFIRMED except the cosmetic HQ residue (§4.F).
- Repo memory: `docs/HANDOFF.md` (full), this file (fast path), `GATES.md`, `DIRECTION.md`,
  `docs/contracts/data-contract.md`, `docs/slices/*`, `docs/design/*`.
- **Honest caveats carried forward:** Slice 1 foundation was Claude-solo/Claude-verified
  (provenance caveat in `docs/HANDOFF.md`). CI checks are not merge-blocking. The cottage-
  cheese pipeline slice proved **fact-discipline, not video quality** (pipeline's own
  Clarification page).
