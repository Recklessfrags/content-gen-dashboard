# SESSION HANDOFF — start here to finish the project

_Last updated: 2026-06-28 by the Architect (Claude). This is the onboarding doc for a
**new chat** picking up the work. Read this first, then the canonical docs it points to.
For deep running history see `docs/HANDOFF.md`; this file is the fast path._

_Update (2026-06-28): Slices 2–4 are now **merged to the default branch and live in
production** — see §2._

---

## 1. What this is (60 seconds)

An automated agent workforce that produces faceless short-form video. **Two repos, one
shared Supabase project:**

- **Dashboard** (`recklessfrags/content-gen-dashboard`, THIS repo) — the **Character
  Control Room**: a focused control tool. Owns characters/bibles + ideas; surfaces Runs
  (pipeline output) read-only + an Overview + a Cost Box. **Read `DIRECTION.md`** — it is
  product ground truth (focused tool, NOT a kanban/production board).
- **Pipeline** (`recklessfrags/reels-content-generation`, a SEPARATE repo, **out of this
  session's GitHub scope**) — owns research → fact-check → gate → script → assembly →
  distribution. Writes `episodes`/`receipts`; the dashboard reads them read-only.

**The loop (separation of powers — `AGENTS.md` is canonical):**
- **Architect (Claude / you)** — judgment only: specs, gates, briefs, review, ratify.
  Never writes app code. Commits **docs/markdown only** (logged exception).
- **Designer (Gemini CLI)** — UI/UX artifacts into `docs/design/` only.
- **Builder (Codex CLI)** — all app code + migrations. Reviewed + merged by the Architect
  as Codex-authored commits.
- **Independent reviewer** — a separate agent audits each slice's diff (stands in for
  "no one grades their own work"); the **human** does final ratification sign-off.

**Canonical docs to read after this:** `AGENTS.md` (rules), `DIRECTION.md` (scope),
`GATES.md` (acceptance + status of every slice), `docs/contracts/data-contract.md`
(DB shapes + ownership), `docs/slices/*` (per-slice specs), `docs/HANDOFF.md` (full history).

---

## 2. Current status (what's DONE)

**Dashboard: Slices 1–4 shipped, ratified, pushed, and PROMOTED to production — all gates PASS.**
- Slice 1: foundation (characters/ideas CRUD, bible jsonb, Runs, auth + owner-scoped RLS).
- Slice 2: run/receipt **drill-down** + bible **version history** (table
  `character_bible_revisions`, migration `0002`, applied to live DB).
- Slice 3: read-only **Overview** (aggregate counts/spend/gate-pass-rate).
- Slice 4: read-only **Cost Box** (Tier 1 spend governance — running total, by-provider
  via per-row deltas, in-flight aware, USD-only with asset-gap note, cap parked).
- Hotfix: red-diagonal CSS class collision (`.stamp` → `.casting-stamp`).

**Branch state:** the Slices 2–4 work branch (`claude/dashboard-slice-count-pof88m`) has
been **merged into the default branch** `claude/new-session-3l99vs` via merge commit
`00d5fcc` ("Merge dashboard Slices 2-4 to production (promote)"). That work branch is now
deleted. `main` still does not exist — the GitHub default branch is `claude/new-session-3l99vs`,
and production tracks it. Everything is committed + pushed.

**Live URLs / login:**
- Production (now ALL 4 slices — tracks the default branch): `https://content-gen-dashboard.vercel.app`
  (Vercel deploy from `00d5fcc` is `target: production`, state READY.)
- Login: `cameronnicodemus@gmail.com` / temp password in `docs/HANDOFF.md` (change it).

**Supabase:** project `reels-content` = `tyeejhaknqkeftjykqog`. Seed: 2 characters
(Mad Dog McGrath active / Grandma Pearl draft), 4 ideas, 3 cottage-cheese episodes.
**Storage: 0 buckets** (see D-5 / §4).

---

## 3. Operational setup the new session MUST know (these cost real time)

- **Loop tooling:** `gemini` and `codex` CLIs exist (`/opt/node22/bin`). 
  - **Codex ignores `OPENAI_API_KEY`** — you must log it in once:
    `printf '%s' "$OPENAI_API_KEY" | codex login --with-api-key` (writes `~/.codex/auth.json`).
    Run codex non-interactively: `codex exec --sandbox workspace-write --skip-git-repo-check "<prompt>" < /dev/null`.
  - **Gemini:** `gemini -y -p "<prompt>" < /dev/null` (the `-y` auto-approves its file writes).
  - The environment's injected `GEMINI_API_KEY`/`OPENAI_API_KEY` had stray `<>` brackets
    (now fixed by the human). If a session boots with invalid keys, verify with a curl to
    each provider; if bad, source clean ones for the CLI calls.
- **In-browser ratification (the bridge):** headless Chromium **cannot TLS-egress the
  sandbox agent proxy** (CONNECT opens, MITM-CA handshake aborts). So to drive the app in a
  real browser: run `next build` + `next start`, launch global Playwright
  (`/opt/node22/lib/node_modules/playwright`, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`),
  and **bridge browser→Supabase via `page.route('**/*supabase.co/**')` → Node `fetch`**
  (run the node script with `NODE_USE_ENV_PROXY=1`). The real client code runs unmodified;
  only the transport hop is forwarded (carry the JWT so RLS applies). Example scripts are in
  the session scratchpad (`*_ratify.mjs`). For the live Vercel URL, bridge ALL requests and
  navigate to `/login` directly (the unauth `/`→`/login` redirect doesn't replay through the
  bridge; verify it with curl instead).
- **RATIFY ON MOBILE TOO.** Lesson from the red-diagonal regression: ratifications checked
  data but not mobile pixels. Every UI slice: load at **412px**, assert
  `scrollWidth == clientWidth` (no horizontal overflow) AND no stray
  `position:absolute`/`transform:rotate` elements bleeding across the view.
- **Supabase MCP:** can run SQL / `apply_migration` / create buckets + RLS policies.
  **CANNOT delete storage buckets** (a `protect_delete` trigger blocks it) — bucket deletes
  must go through the Supabase dashboard/Storage API (a human step).
- **Vercel:** project `content-gen-dashboard`, team `canicode`
  (`team_ZdMtQu9H5HYrMPFTf4TL0fC1`). Pushing the branch auto-deploys a preview; **production
  tracks the GitHub default branch**.
- **Git:** commit app code as **Codex-authored** but with committer
  `Claude <noreply@anthropic.com>` (so GitHub shows it verified):
  `git -c user.name=Claude -c user.email=noreply@anthropic.com commit --author="Codex <codex@local>" ...`.
  Docs commits are plain Architect commits.

---

## 4. WHAT'S LEFT TO FINISH (prioritized, with triggers)

### A. `render-assets` Supabase bucket — the current blocker 🔑 (pipeline-repo-owned)
The pipeline's back half (voice/music/Assembly/render/Buffer) is built but **unverified
against live keys**. Its first real job needs a **public** bucket to host VO/music/clips so
JSON2Video/Buffer can fetch by URL. **Recipe** (public read, service-role write, no
per-user policies):
```sql
insert into storage.buckets (id, name, public, file_size_limit)
values ('render-assets','render-assets', true, 524288000) on conflict (id) do nothing;
-- no policies needed: public flag serves reads; service role bypasses RLS for writes.
```
Owned by the pipeline repo (record the config there). Can be created in the shared project.

### B. The Acoustic Kitty run — the keystone trigger (pipeline session's job)
First real episode = **Mad Dog McGrath → "Acoustic Kitty"** (dark/declassified-history
channel, NOT food). It (a) validates the unverified pipeline subsystems, (b) wires the
character **bible into the script-writer**, and (c) lands **`character_id` on `episodes`**
(decision **D-1**). Publish held at `approval_required` (validation run). **This is out of
this repo's GitHub scope** — it's the pipeline session's work.

### C. Dashboard work UNBLOCKED by B (build via the loop once `character_id` exists)
- **Tier 2 — per-character / per-idea cost.** The Cost Box already has a disabled
  "CHARACTERS DEFERRED" seam; drop in `group by character` once the key lands.
- **Idea → pipeline linkage** ("queue an idea as a run") — enqueues an `episodes` write
  the pipeline picks up; a cross-repo contract change, do it WITH the pipeline owner.

### D. Character-generation flow — queued dashboard slice (after Acoustic Kitty)
Agents design 3–4 candidate characters → surfaced as cards in the dashboard → operator
picks/remixes → becomes a real `characters` row. Output schema = the bible fields. Guardrails:
advertiser-safe, no hard profanity, legally clean/original. Reusable casting for every future
channel. (Locked in Notion; sequenced behind Acoustic Kitty.)

### E. Tier 3 — ROI table (cost ÷ views/revenue) — furthest out
Needs **publishing live AND an analytics-ingestion service** (per-platform API + OAuth +
sync). Note: `DIRECTION.md` marked analytics "out of scope," but the Notion "ROI table —
SCOPE CORRECTION" clarifies it's **deferred, not killed** (it's the unit-economics view).
Build order is fixed: cost now → per-character at D-1 → ROI after publishing.

### F. User-upload bucket (private, owner-scoped) — DESIGNED, NOT BUILT
Only stand up a private `character-assets` bucket (owner-scoped RLS, path `<uid>/file`) when
a dashboard feature actually uploads a file (e.g. reference-image upload, likely part of the
character-generation flow). Spell it correctly; capture it in a migration. (See D-5.)

### G. Standing human decisions (not blocking the loop)
- ~~**Promote dashboard to production:** merge `claude/dashboard-slice-count-pof88m` → the
  GitHub default branch to deploy Slices 2–4.~~ **DONE (2026-06-28)** — merge `00d5fcc`;
  the production deploy is READY at `content-gen-dashboard.vercel.app`.
- **Final ratification sign-off** of all slices (independent-agent review has stood in).
- Change the temp login password.

---

## 5. Decisions already locked (don't reopen without new info)

- **D-1** Episode↔character link — DEFERRED; lands at the Acoustic Kitty run (`character_id`).
- **D-2** Dashboard = focused control tool, not a kanban board — LOCKED; encoded in `DIRECTION.md`.
- **D-3** Auth — "me now, scoped others later" (owner-scoped RLS from day one).
- **D-4** `character_bible_revisions` contract amendment — RATIFIED (migration 0002).
- **D-5** Storage — two buckets, contradictory read rules can't share one: `render-assets`
  (public, pipeline-owned) vs user-uploads (private, owner-scoped, dashboard-owned,
  designed-not-built).
- **Cost tiers** — Tier 1 (shipped) → Tier 2 (per-character, at D-1) → Tier 3 (ROI, after
  publishing + analytics).

## 6. Where things live

- Decisions + roadmap + brand notes: **Notion "Reels Content — Agent Workforce"**
  (`38cd346e-22d2-81e9-9dbf-fa8c4a2dcf7b`). Architect-only; humans trigger re-syncs.
- Repo memory: `docs/HANDOFF.md` (full), this file (fast path), `GATES.md`, `DIRECTION.md`,
  `docs/contracts/data-contract.md`, `docs/slices/*`, `docs/design/*`.
- Honest caveat carried forward: the Slice 1 **foundation** was built Claude-solo and
  Claude-verified (provenance caveat in `docs/HANDOFF.md`); "the loop ran" ≠ "a human
  independently verified." Final human sign-off still closes that.
