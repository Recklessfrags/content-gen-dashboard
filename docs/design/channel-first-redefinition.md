# Channel-first redefinition — design pass (PROPOSAL, pending operator ratification)

_Status: **PROPOSAL** — not yet a locked direction. Author: Architect (Claude), 2026-07-02, from
a commissioned design pass. **Product-direction change → human-owned:** on operator ratification
this becomes a dated ruling in `DIRECTION.md` and the phased slices are planned against it.
Nothing is built from this doc yet._

_**Review trail:** core design authored by **Gemini (design model, high thinking)** against an
Architect brief; adversarially reviewed by **suerta (Opus)**; synthesized + fact-checked against
`data-contract.md` by the Architect. This doc = the accepted synthesis (Gemini's design **with
suerta's three corrections folded in**), not Gemini's raw output._

_**Ledger lesson (rule 24):** the cross-vendor design's headline "UI-layer only, no DB change"
claim (F4 threading) hid a cross-team pipeline dependency; the independent second lens caught it.
Re-confirms L-2 / rule 33 — a single author's "no dependency here" is not self-certifying._

---

## 0. Why this exists

The operator stepped back from incremental slices (mid-E2) and questioned the **whole dashboard
workflow**. An as-is map (read from live code) confirmed the tool is **7 flat, disconnected nav
tabs** with no workflow spine and no cross-view links (frictions **F1–F6**, `docs/design/` map /
session notes). The operator then supplied the load-bearing correction:

> **The tool is character-first; it should be channel-first.** "I create the channel idea first
> — 'what do I want to talk about' — and work through the rest. The character is the face of the
> channel, usually already implied by it." (e.g. channel _"unusual animal facts & explainers"_ →
> episode _"how do birds find water?"_)

**Confirmed model.** Root object = **Channel**. Hierarchy:
`Channel (show + guidelines) → Character/persona (its face) → Ideas (episode topics) → Run/episode → Cost`.
**Cardinality: 1 channel = 1 character for now; the architecture must NOT preclude a future
1-channel→many-characters or shared character** (operator-confirmed).

**Good news up front:** the **data model already supports channel-first** — `channel_profiles`
is a first-class table; `ideas`/`jobs`/`episodes` already carry a channel. So this is a
**redesign of information architecture, navigation, and the mental model — NOT a database
teardown.** The one genuinely missing seam is a real character↔channel link (§3).

**Visual-design mandate (operator, 2026-07-02):** the current **look & feel is not good enough**
and is to be **rebuilt to first-class** as part of this work — this is IA *and* a visual/UI
overhaul, not a re-skin of the existing styling. Phase 1 stands up a **proper design system**
(type scale, color/neutrals, spacing, components, states, motion, WCAG 2.2 AA) that the
re-parented surfaces are rebuilt against; "reuse today's components" means **reuse the data/logic
seams, not the current visual styling**. Treat the visual-design track as a first-class
deliverable of the redesign, spec'd and reviewed like the IA. (Design vendor per AGENTS.md =
Gemini; artifacts into `docs/design/`.)

---

## 1. Accepted design — hub-and-spoke, channel-rooted

**Global hub**
- **Channels home** — the entry surface. Grid of channel cards (title · character thumbnail if
  cast · active-jobs count · 30-day cost). "+ New channel." Empty state for a brand-new operator.
- **Action Center** — a **global, cross-channel action queue** of everything waiting on the
  operator (parked jobs: fact/spend/publish; and later: uncast characters, empty bibles). **See
  Correction 3 — this must be inline-actionable, not just a list that routes away.**
- **System overview** — global read-only roll-up (today's `Overview` + `Cost` global views).

**Channel workspace (the spoke, e.g. "Weird Food")** — sub-nav:
- **Production** — the unified idea→run stream (today's `The Wire` + `Queue` + `Runs`, threaded).
- **Character** — the channel's persona: casting (voice + visual) **elevated to first-class**
  (today's `Roster` dossier + the casting modals) — fixes **F5**.
- **Guidelines** — the channel config editor (today's `Channels` CRUD); the parked **E2**
  cast-brief pre-fill is an input here.
- **Cost** — this channel's spend (scoped view of the Cost Box).

**What each friction gets** (suerta-graded, honestly):
- **F2 (no cross-view links) — real fix.** Character + ideas + cost for a channel become one
  context, not three tabs the operator mentally joins. Strongest structural win.
- **F5 (casting buried) — real fix.** Split-screen Character surface (casting tools ‖ written
  bible), not a modal.
- **F6 (themed vocabulary) — real fix.** Plain names: Channels, Character, Ideas, Production.
- **F3 (character↔channel unlinked) — fixed, but by the DB link (§3), not the nav.**
- **F1 (no spine) — fixed for onboarding; MUST NOT regress the daily loop** (Correction 3).
- **F4 (idea→episode thread) — NOT auto-fixed; needs the honest re-plan** (Correction 1).

**Onboarding handoffs (fixes F2 for cold-start):** empty hub → **Create channel** → _Topic &
Guidelines_ (Save & continue) → **auto-route** to _Character_ (define persona, cast; Save & cast)
→ **auto-route** to _Production_ ("what's the first episode?") → add idea → **Send to pipeline**
(the idea **stays in the same list**, badge Draft→Queued, inline polling). Add a **save-and-exit
escape hatch** at each step (a solo founder will often create a channel and stop).

---

## 2. The three corrections (folded in — suerta, verified against the contract)

### Correction 1 — F4 threading is NOT dashboard-autonomous; split it honestly
Gemini proposed writing `ideas.id` into the `jobs` payload and into `episodes.idea_id`, then
merging in React. **Both writes are impossible:** the enqueue whitelist is frozen/RLS-enforced
and has **no `idea_id`**; `episodes` is **pipeline-owned, read-only, with no `idea_id` column the
dashboard can add.** So the "merge on idea_id" plan has no id to merge on for 2 of 3 joins.

**The honest decomposition:**
- **idea → job — dashboard-autonomous.** The dashboard **owns the `idempotency_key`** (it's in
  the whitelist). Persist an **`idempotency_key ↔ ideas.id` map in a dashboard-owned table** at
  enqueue time → later resolve "which job did this idea produce." Build this now.
- **job → episode — REQUIRES the pipeline.** `episodes` exposes no job/idea/idempotency
  correlation key (only `episode_id, food, status, spend, sentinels, character_id, created_at`).
  Robust threading needs a **cross-team ask**: the pipeline echoes the `idempotency_key` (or a
  `job_id`) onto `episodes`. Until then, in-flight/published threading is **best-effort heuristic**
  (food + character + time window — lossy, races on recurring topics) and the operator is **told
  so**. **File the pipeline correlation-key request on HQ; do not label Phase 3 dashboard-only.**

### Correction 2 — the character↔channel migration is expand/contract, not a column swap
The FK direction is right (§3), but Phase 2 as drawn ("drop the free-text `character`, add the
FK") is unsafe: (a) free-text values need **resolution/backfill** to `characters.id` (typos,
casing, unmatched names → a manual reconciliation pass); (b) the pipeline may **read
`channel_profiles.character`** — dropping it is a breaking shared-contract change. So: **add
`character_id` (nullable), backfill, keep `character` text live until the worker is confirmed
migrated off it, THEN drop** — expand/contract + HQ heads-up. Confirm with the pipeline whether
the worker actually consumes `channel_profiles.character` before touching it. (Worker traversal
of the FK into owner-scoped `characters` is fine — the worker reads via **service role**, which
bypasses RLS.)

### Correction 3 — the Action Center must be a true global action queue (or F1 regresses)
The operator's highest-frequency job is the **approval/park-triage loop** — inherently
**cross-channel and time-ordered**. If "select a channel first" forces the operator into a spoke
to approve each parked job, the F1 "spine" **regresses the one loop that runs daily.** So the
**Action Center clears the whole parked queue inline** (approve/reject in place, cross-channel,
sorted by wait/cost) — the approval loop is **explicitly exempt** from "select a channel first."

---

## 3. Character ↔ channel link (the missing seam)

**Add `channel_profiles.character_id uuid` FK → `characters.id`; keep `characters` unchanged.**
- **1:1 now, future-open:** an FK on `channel_profiles` strictly limits one channel to one
  character today, yet a single character can be referenced by **many** channels later (n:1) with
  **zero** schema change; a future channel→**many** characters becomes a `channel_characters`
  junction. Correct minimal seam.
- **Specify `ON DELETE SET NULL`** (deleting a character nulls the channel's link, never orphans).
- **Unattached characters are fine** — a character no channel references is just a casting-bench
  draft (a feature, not a bug).
- **Migration = Correction 2** (expand/contract; confirm worker consumption first).

---

## 4. Design forks (options + recommendation)

**Fork A — where do Cost & the job/approval queue live?** _Global only_ (violates channel-first)
· _channel-scoped only_ (can't see total spend / all blockers at a glance) · **Hybrid roll-up +
drill-down (recommended)** — build each component once, pass an optional `channelId` to toggle
aggregate vs scoped. A solo founder is a manager of agents: needs the global blockers/spend view
**and** the isolated per-channel workspace. (Pairs with Correction 3's global Action Center.)

**Fork B — thread idea→episode by consolidating tables, or stitch?** _DB consolidation_ (merge
ideas/jobs/episodes — violates the pipeline boundary, massive cross-team rewrite, rejected) ·
**Correlation-key stitch (recommended)** — keep tables separate; dashboard owns idea→job via the
idempotency map; pipeline echoes a correlation key for job→episode (Correction 1). Note: this
still needs **one** small pipeline change — it does **not** escape cross-team work, it minimizes it.

---

## 5. Phased migration (reuse components; no big-bang; 2,472-line monolith split incrementally)

- **Phase 0/1 — Design system + Hub & workspace shell (high impact, dashboard-autonomous).**
  FIRST establish the **first-class design system** (per the visual-design mandate above) — the
  new look & feel the redesign is built in. Then Channels home + channel-workspace wrapper with
  sub-nav, **re-parenting existing data/logic seams** (Channels editor, dossier, Wire, Queue,
  Runs, Cost) into it as channel-scoped tabs — **rebuilt against the new design system**, not
  re-housed with old styling. Extend the existing Next.js URL-state routing (**not** a new router
  lib). Kills F1/F2/F6 + the tab-hop tax and lands the visual uplift.
- **Phase 2 — Character link + casting elevation (medium impact; expand/contract, cross-team
  heads-up).** `character_id` FK (Correction 2); pull casting out of modals into the split-screen
  Character surface. Fixes F3/F5.
- **Phase 3 — Unified Production thread + handoffs (highest impact; PART cross-team).** Build the
  threaded Production list + onboarding auto-routing. **idea→job stitch ships dashboard-side;
  job→episode threading is gated on the filed pipeline correlation-key ask** — until it lands,
  ship the honest best-effort version with a "matched approximately" note. Fixes F4.

Global Action Center (Correction 3) rides in Phase 1 (as a real inline-approve queue).

---

## 6. Risks / what this does NOT solve
- **The pipeline correlation key is the critical path for F4.** If it's not scheduled, Phase 3's
  headline feature degrades to heuristic matching. **File the HQ ask early.**
- Does not fix pipeline latency or generative (voice/image) quality — those stay operator-judged
  (constraint C). New casting surface still needs robust async loading/error states.
- Global vs channel-scoped component state must be cleanly prop-driven (`channelId`) or data leaks
  between channels.
- Existing capability must stay reachable through the re-parenting (nothing lost).

---

## 7. Open items for the operator (before this becomes a `DIRECTION.md` ruling)
1. **Ratify channel-first as the new product direction** (with this phased plan). It supersedes
   the character-first framing in `DIRECTION.md` (D-2 stays: still a focused control tool, not a
   kanban — this reshapes the *spine*, not the *scope*).
2. **Approve filing the pipeline ask** for an `episodes` correlation key (idempotency_key/job_id
   echo) — the F4 dependency. (Cross-team; HQ heads-up.)
3. **E2 stays parked** and re-homes into the channel Guidelines surface once Phase 1/2 land.
