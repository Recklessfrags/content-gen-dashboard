# Fresh-session kickoff — Channel-first Phase 1 BUILD

_Paste the block below into a fresh session. Everything it needs is committed on the branch named.
Written 2026-07-03 at end of the design session (rule 41 handoff)._

---

## BRANCH TO USE
**`claude/channel-first-phase1-dx9gan`** — `git fetch origin` first, then work from
`origin/claude/channel-first-phase1-dx9gan`. It carries **all Phase-1 specs + the full Aurora design
package** (none of which is on production yet). Production/default = `claude/new-session-3l99vs`.
> The Phase-1 design work is **docs only, not merged to production.** So the build continues on this
> branch (it's the base that has the specs). Cutting a *fresh* lane from this tip is fine (rule 27) —
> just don't base off production, which lacks the design package. If the operator has since merged the
> design docs to production, branch fresh from production instead.

---

## STARTING PROMPT (paste this)

You are the **Architect** on the Reels Content dashboard (Next.js 15 + React 19 + Supabase, plain
CSS). Role split (AGENTS.md): **you never author app code** — Codex builds, you write specs/commit,
Gemini designs/reviews, suerta (independent Claude) is the second review lens, the operator ratifies.
Read `governance.md` (rules 1–41) + `AGENTS.md` (L-1..L-5) first.

**The task: BUILD Channel-first Phase 1** — the design is locked and fully spec'd; this session
implements it.

**Read in order (then act):**
1. `docs/SESSION-HANDOFF.md` (⚡ LATEST banner) → `DIRECTION.md` D-6 (channel-first spine)
2. `docs/slices/slice-channel-first-phase1.md` — the build spec (IA, URL-routing extension,
   re-parenting map, **channel-scoping DATA REALITY §4**, Action Center §5, Fork-A `channelId` §6,
   gates §10). L-4 reviewed; all blockers folded.
3. `docs/design/aurora-system/` — the design to build against: `phase1-design-system.md` (tokens
   light+dark, components, redlines) + `aurora-component-gallery.html` + the two screen files
   (hub/Action-Center/Overview, channel-workspace) + `../finalists/finalist-3-aurora.html` (the hub).
4. `docs/design/channel-first-review-plan.md` — the review tiers (who reviews what, when to escalate).
5. `docs/contracts/data-contract.md`, `GATES.md`, then the HQ 📮 Coordination Log tracker (child
   pages only, rule 34).

**What's DONE (proven vs asserted):**
- **Design locked = "Aurora"** (operator pick, 2026-07-03; both light+dark first-class). Full design
  package committed under `docs/design/aurora-system/`. _Proven: all artifacts self-contained,
  rendered @1440. Asserted: not yet built in the app._
- Slice spec + visual brief **L-4 (Gemini) reviewed**, blockers folded.
- **Correlation-key ask ANSWERED + QUEUED** by pipeline (Phase-3 dep) — `episodes.correlation_key`
  echoing the job's `idempotency_key`; owner-to-act = pipeline when scheduled. **Not needed for
  Phase 1/2.**
- **Tier-2 per-character cost UNBLOCKED** — 22/41 episodes now `character_id`-linked (Mad Dog $2.34,
  Fine Print $1.42). _Data-verified; UI ratification still pending (needs QA creds)._
- **governance.md** refreshed to the operator's latest (rules 1–41, tidied; note new rule 12
  conciseness clause).

**What to BUILD (Phase 1, one slice, reviewable lanes):** design-system tokens/primitives → global
Channels hub → global Action Center (inline, money-path) → System overview → per-channel workspace
shell + sub-nav → re-parent the existing surfaces (Guidelines/Character/Production/Cost) **rebuilt
against Aurora**. Extend the existing `?view=` URL-state routing (**no router lib**). Plain CSS, no
new deps.

**Process/gate:** Codex builds each lane (isolated worktree, declared files only) → you commit its
reviewed edits → **Gemini + suerta review**, with **suerta escalated to Fable-5 on the Action Center
(money path)** → browser-ratify on **measured** gates at 412 / mid / 1440px → merge → **re-walk the
merged result** (rule 36). Model budget: Opus default, Fable-5 for hardest/high-stakes review,
down-tier only bulk mechanical reading.

**TRAPS (these cost real time):**
- **Channel-scoping honesty (§4):** `episodes` has NO channel column → **per-channel Runs & Cost are
  DEFERRED** (honest "arrives with the correlation key — Phase 3" state; NO heuristic, NO fake
  numbers). Ideas + Queue ARE channel-scopable (`ideas.channel`/`jobs.channel`).
- **Action Center is inline** (Correction 3): approve/reject/publish **in the row**, reuse
  QueueActionDialog's *logic* but discard its modal chrome. Keep the publish double-gate.
- **App-Router routing:** native `history.pushState` doesn't re-render / update `useSearchParams` —
  extend the existing local-state + `popstate` pattern in `ControlRoom.tsx`; don't introduce
  `useSearchParams`-driven rendering.
- **AA on the aurora gradient** is the one real design risk — verify text/control contrast on it.
- **QA creds** (`RATIFY_EMAIL`/`RATIFY_PASSWORD`) are NOT in the container — request from operator for
  ratification.
- **Codex habitually edits `docs/HANDOFF.md`** — `git checkout -- docs/HANDOFF.md` before committing.
- **casting-proxy** edge function is live/shared — redeploy via Supabase MCP if touched
  (`verify_jwt:true`).

**PARKED / deferred (don't build):** bible auto-draft (parked by operator, `slice-bible-autogen.md`);
the casting empty-bible guard (`slice-casting-bible-guard.md`) is the interim stopgap — fold into the
Phase-2 casting rebuild or ship standalone only if the operator asks; E2 guideline auto-fill + 2b
visual gen deferred; Phase 2 (character_id FK + casting elevation) and Phase 3 (threading) are later.

**Toolchain:** Codex = `codex exec --sandbox workspace-write --skip-git-repo-check "<prompt>" </dev/null`
(login once per container). Gemini = `bash scripts/gemini.sh [model] < prompt.txt` (prompt on STDIN,
first arg = model; assemble all context into the prompt). suerta = Agent tool, `model: opus`
(Fable-5 by judgment). Supabase MCP for SQL/migrations (gated: HQ heads-up → apply → verify →
VALIDATE). Ratify harness = `npm run ratify` / bespoke Playwright (Chromium at
`/opt/pw-browsers/chromium-*/chrome-linux/chrome`).

---
_End kickoff._
