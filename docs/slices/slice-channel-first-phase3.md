# Slice — Channel-first Phase 3 (idea→job→episode threading + per-channel Runs/Cost)

_Status: **SPEC — DRAFT, awaiting consensus review** (Fable-5 + Gemini + Codex). Author: Architect
(Claude), 2026-07-03. Direction: `DIRECTION.md` D-6 (Phase 3 = the idea→episode thread, gated on the
pipeline correlation key). Depends on Phase 1 (shell) + Phase 2 (FK). Review tiers
(`docs/design/channel-first-review-plan.md` §4): **idempotency-map migration = G + S(Fable-5)**;
**job→episode join = G + S(Fable-5) + HQ ask gate** (verify correlation key landed; else deferred-
only); thread UI + onboarding routing = G + S(Opus). Cross-team gates in §3 of the review plan._

---

## 1. Goal

Close the loop the Phase-1 §4 "DATA REALITY" left honestly deferred: **stitch idea → job → episode
into one thread**, unlocking **real per-channel Runs & Cost** and a unified threaded Production view.
Three lanes, gated in order:

1. **Idempotency map** (`dash_*` migration) — a dashboard-owned `idempotency_key ↔ ideas.id` map,
   written at enqueue, so we can attribute a job (and its episode) back to the originating idea.
2. **The join** — `ideas.id` ↔ `idempotency_key` (our map) ↔ **`episodes.correlation_key`** (the
   pipeline echo). Gated on the pipeline having landed `correlation_key`; until then, the honest
   best-effort fallback (`food` + `character_id` + time window), **labeled "matched approximately."**
3. **Threaded Production + per-channel Runs/Cost** — the workspace Production surface shows the real
   idea→job→episode thread; per-channel Runs and Cost (the Phase-1 deferred tabs) fill in from the
   join, scoped by the channel's ideas/jobs.

**Explicitly NOT here:** any change to pipeline-owned tables (we only READ `episodes`/`receipts`;
the `correlation_key` column is added by the **pipeline**, operator-sequenced). No fabricated
numbers ever — if the join can't resolve, show the deferred/approximate state, never invented data.

---

## 2. Cross-team dependency (the gate — verify LIVE before building lane 2/3)

Per `data-contract.md` and the review plan §3.2 (fresh-fetch HQ; never trust a cached cross-team
state — L-1):
- **`episodes.correlation_key`** — additive nullable, **pipeline-owned**, the worker echoes the
  job's `idempotency_key` onto it at `begin_episode`. **Status as of 2026-07-03: ANSWERED FEASIBLE,
  QUEUED, NOT started; owner-to-act = OPERATOR to sequence** the pipeline's shared-`episodes`-schema
  migration + live-worker write. **Before building lane 2's real join, fresh-fetch the HQ ask and
  confirm the column is live + populating.** If not live: ship lanes 1 + 3's UI on the **best-effort
  fallback only**, clearly labeled, and leave the real join behind a feature check that lights up
  when `correlation_key` appears.
- The dashboard side (idea→job map) is **ours** and unblocked — lane 1 can proceed now.

---

## 3. Lane 1 — Idempotency map (`dash_0006_idea_job_map`)

**Why a map (not a column on `jobs`):** `jobs` is pipeline-owned/enqueue-only; we cannot add columns
to it. `ideas.id` → the `idempotency_key` we generate at enqueue is a **dashboard-owned** fact, so it
lives in a dashboard table.

```sql
create table public.idea_job_map (
  idempotency_key text primary key,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  channel text null,                 -- denormalized from the job for fast channel scoping
  created_at timestamptz not null default now()
);
create index idea_job_map_idea_id_idx on public.idea_job_map (idea_id);
create index idea_job_map_owner_channel_idx on public.idea_job_map (owner, channel);
```
- **Owner-scoped RLS** (same shape as `ideas`): all verbs `to authenticated` gated by
  `owner = auth.uid()`; insert `with check owner = auth.uid()`.
- **`idempotency_key` PK** mirrors the `jobs.idempotency_key` UNIQUE (one map row per logical job).
  A re-enqueue with a NEW key (fact/spend/publish re-enqueue paths) inserts a NEW map row pointing at
  the SAME `idea_id` — so the thread survives re-runs. A duplicate key (409) does not double-insert
  (upsert on conflict do nothing).
- **Write path:** wherever the dashboard enqueues a job **from an idea** (the Wire capture →
  enqueue, and the re-enqueue paths in `jobs.ts` that preserve idea provenance), insert the map row
  in the SAME logical step. **Enqueues NOT originating from an idea** (ad-hoc) simply have no map row
  — the thread shows "no originating idea," which is honest.
- Gated apply (review-plan §3.3): HQ heads-up (dashboard-owned, but announce) → apply → verify →
  negative RLS test (a second owner cannot read the row) → VALIDATE. Regenerate `database.types.ts`.

---

## 4. Lane 2 — The join (idea ↔ job ↔ episode)

Resolution, per episode row (READ-only over pipeline data):
1. **Preferred:** `episodes.correlation_key` == a `jobs.idempotency_key` == an `idea_job_map`
   row → `idea_id`. Exact, survives resumes. **Only when `correlation_key` is live (§2).**
2. **Fallback (labeled "matched approximately"):** `episodes.food` + `episodes.character_id` +
   a bounded time window around the job's `created_at`. This is the Phase-1 §4 heuristic —
   **allowed ONLY in Phase 3, and ONLY with the explicit "approximate" label.** Never presented as
   exact.
- The join is a **pure, unit-tested resolver** (`src/lib/thread.ts`) taking episodes + jobs + map
  rows → thread records with a `matchConfidence: "exact" | "approximate" | "unmatched"`. No hidden
  state; testable without the DB.
- **Per-channel scoping now becomes real:** an episode inherits its channel via the resolved job's
  `channel` (or the map's denormalized `channel`). This is what unblocks the Phase-1 deferred
  per-channel Runs/Cost tabs — **but only for episodes that resolve**; unresolved episodes stay in
  the global roll-up and are counted honestly (a "N unattributed" line, never silently dropped or
  mis-assigned).

---

## 5. Lane 3 — Threaded Production + per-channel Runs/Cost

- **Workspace Production** (Phase 1 showed Ideas + Queue channel-scoped, Runs deferred): now renders
  the **thread** — idea → its job(s) → their episode(s) — using the lane-2 resolver, with the
  match-confidence badge on approximate links.
- **Per-channel Runs tab:** replaces the Phase-1 honest-deferred state with the real channel-scoped
  Runs list (resolved episodes for this channel) + an explicit "N unattributed (in global Runs)"
  footnote. Confidence-labeled.
- **Per-channel Cost tab:** replaces the Phase-1 deferred Cost with channel-scoped spend
  (`receipts`→resolved `episodes`→channel), Fork-A `channelId` prop on the existing Cost component;
  unattributed spend shown as a labeled residual, never distributed by guess.
- **Onboarding auto-routing** (D-6): capturing an idea inside a channel workspace pre-fills channel +
  character (Phase-2 FK) and, on enqueue, writes the map row — so new work threads automatically.

---

## 6. Gates (falsifiable, MEASURED; QA creds required)

**Map (lane 1)**
1. Enqueue-from-idea writes exactly one `idea_job_map` row (`idempotency_key`, `idea_id`, `channel`,
   `owner`) — intercept-and-abort; assert payload. Ad-hoc enqueue writes none.
2. Re-enqueue (fact/spend/publish) with a new key adds a row pointing at the SAME `idea_id`;
   duplicate key does not double-insert.
3. RLS: a second authenticated owner cannot read another owner's map rows (negative test).

**Join (lane 2) — pure resolver**
4. `thread.ts` unit tests: exact match via correlation_key; approximate via food+character+window
   (labeled); unmatched → unattributed; no episode assigned to >1 idea; resumes/duplicate keys don't
   double-count.
5. With `correlation_key` NOT live, the resolver returns approximate/unmatched only (no exact) and
   the UI labels it — **could this pass while silently showing global data as channel-scoped? No:**
   assert an episode with no resolvable channel is NOT in any channel's scoped list.

**UI (lane 3)**
6. Per-channel Runs/Cost show ONLY resolved episodes for that channel; a second channel is disjoint;
   unattributed count/spend shown as a labeled residual (assert against REST counts with the QA token).
7. Thread renders idea→job→episode with the confidence badge on approximate links; no fabricated
   number anywhere (spot the deferred→real transition is honest).

**Cross-team + quality**
8. HQ ask fresh-fetched; if correlation_key not live, only the fallback ships (labeled) — verified,
   not assumed.
9. Consensus review (Fable-5 + Gemini + Codex) on each lane's spec + build; migrations gated-applied
   + VALIDATED; re-walk merged result.

---

## 7. Open items (reviewer trio first; operator only if blocked)

- **Q1 — correlation_key liveness + sequencing:** operator-owned (pipeline migration + worker write).
  Lanes 1 + 3-UI proceed on the fallback; lane-2 exact join lights up when it lands. **Fresh-fetch
  HQ before claiming its state.**
- **Q2 — fallback time-window width:** the food+character+window heuristic needs a defensible window
  (too wide → cross-attribution; too narrow → misses). Reviewer trio to set it; err narrow +
  "approximate" label + unattributed residual over a wrong exact-looking assignment.
- **Q3 — re-enqueue provenance:** confirm every idea-preserving re-enqueue path in `jobs.ts` carries
  the idea_id into the new map row (else re-runs orphan the thread). Enumerate them in build review.
