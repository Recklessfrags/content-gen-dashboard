# Slice — Channel-first Phase 3 (idea→job→episode threading + per-channel Runs/Cost)

_Status: **SPEC — v2, consensus round-1 folded** (Fable-5 + Gemini + Codex all REQUEST-CHANGES on v1;
they converged on a STRUCTURAL flaw: v1's map keyed on `idempotency_key`, but approval re-enqueues
force `idempotency_key: null` — so the map could not store the money-spending re-runs and every
approved run orphaned. v2 redesigns the key convention + provenance recovery + ownership RLS +
feature-detection + owner-scoped residuals. **Round-2 consensus pending.**). Author: Architect
(Claude), 2026-07-03. Direction: `DIRECTION.md` D-6. Review tiers: **the jobs.ts re-enqueue-key
change touches the approval/money path → S(Fable-5)** (spec + build) alongside the migration tier;
UI lanes = G + S(Opus). Cross-team gates: review-plan §3._

---

## 0. What the reviewers broke in v1 (so v2 doesn't repeat it)

Verified against the live code by all three reviewers:
- `buildSpendApprovalReenqueue` / `buildFactApprovalReenqueue` / `buildPublishApprovalReenqueue`
  (`src/lib/jobs.ts`) all force **`idempotency_key: null`** (deliberate — NULLs are UNIQUE-exempt, so
  the re-enqueue never 409s). The worker echoes the job's `idempotency_key` into
  `episodes.correlation_key` at `begin_episode` → **null in, null out.** A map keyed on
  `idempotency_key` (v1) therefore **cannot represent the approved re-run — the run that actually
  spends money and produces the finished episode.** v1 orphaned exactly the runs Runs/Cost needs.
- There is a **fourth** re-enqueue path v1 missed: `stale` (`ControlRoom.tsx` `confirmQueueAction`),
  which re-enqueues via `buildJobInsert` with a fresh `job_rerun_${job.id}_${Date.now()}` key.
- **No `idea_id` is stored anywhere** in `JobEnqueueInput`/`jobInputFromRow`/the jobs row — provenance
  can only be recovered by mapping the parked row's key → the map.
- `jobs.episode_id` / `jobs.source_episode_id` are **exact** job→episode pointers live TODAY (worker-
  written; `publishSourceEpisodeId` already uses them) — v1 ignored them and mislabeled provable-exact
  matches as "approximate."

---

## 1. Goal

Stitch idea → job → episode into one thread, unlocking real per-channel Runs & Cost (the Phase-1 §4
deferred tabs). Lanes, gated in order:

1. **Non-null re-enqueue keys + idempotency map** — make EVERY dashboard-originated job (initial +
   all four re-enqueue paths) carry a fresh non-null `idempotency_key`, and record
   `idempotency_key → idea_id` in a dashboard-owned map.
2. **The resolver** — exact via `jobs.episode_id`/`source_episode_id` (today) and
   `episodes.correlation_key` (when live); approximate fallback labeled; unmatched → owner-scoped
   residual.
3. **Threaded Production + per-channel Runs/Cost** — the real thread + channel-scoped Runs/Cost with
   an honest, **owner-scoped** unattributed residual.

**NOT here:** any write to pipeline-owned tables. `correlation_key` is added by the pipeline
(operator-sequenced). No fabricated numbers — unresolved → owner-scoped residual, never invented.

---

## 2. Cross-team dependency + feature-detection (reviewer BLOCKER)

- **`episodes.correlation_key`** — pipeline-owned, worker echoes the job's `idempotency_key` at
  `begin_episode`. **Status 2026-07-03: ANSWERED FEASIBLE, QUEUED, NOT started; operator-sequenced.**
  Fresh-fetch HQ before building lane-2's correlation-key tier (L-1).
- **Feature-detection must NOT statically select an absent column** (a `select("*, correlation_key")`
  400s the whole episodes query and kills the surface the day before the pipeline lands it). Specify:
  a one-time **error-tolerant probe** (a `select("correlation_key").limit(1)` in a try/catch, or a
  `database.types.ts`-regen build flag) sets a `hasCorrelationKey` boolean; the main episodes query
  only requests `correlation_key` when true. **Gate: with the column absent, every episodes/Runs/Cost
  surface still renders** (no 400).
- Lanes 1 + 2 (map + exact-via-`episode_id` + fallback) need **nothing** from the pipeline and proceed
  now; only the correlation-key *tier* waits.

---

## 3. Lane 1 — Non-null keys + `idea_job_map` (`dash_0006`)

### 3.1 jobs.ts change (money-path — S(Fable-5)): every re-enqueue carries a fresh non-null key
The three approval builders currently emit `idempotency_key: null`. Change them (and confirm the
`stale` path) so **all four re-enqueue paths generate a fresh, unique, non-null key** — the contract
permits it ("dashboard generates its own unique-per-logical-job key"); a derived key like
`job_rerun_${parentJobId}_${ts}` never collides, so the null-to-avoid-409 trick is unnecessary.
- Enumerate the map-write CALL SITES (not "wherever provenance is preserved"): the initial
  `enqueueJob` (Wire capture) AND `confirmQueueAction` for all of `fact | spend | publish | stale`.
- **This is an approval/money-path change** → S(Fable-5) build review; assert the double-gate + park
  semantics are unchanged (a fresh key must not alter fact/spend/publish approval behavior — only the
  key value changes; verify no 409-avoidance regression, no accidental re-approval).

### 3.2 The map table
```sql
create table public.idea_job_map (
  idempotency_key text primary key,
  idea_id uuid null references public.ideas(id) on delete set null,   -- SET NULL: history survives an idea delete
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  channel text null,                 -- denormalized from the job; null routes to the 'default' profile at read (worker semantics)
  created_at timestamptz not null default now()
);
create index idea_job_map_idea_id_idx on public.idea_job_map (idea_id);
create index idea_job_map_owner_channel_idx on public.idea_job_map (owner, channel);
```
- **`on delete SET NULL` (not cascade — reviewer BLOCKER):** deleting an idea must NOT retroactively
  de-attribute already-rendered spend. The map row survives as "idea deleted" with `channel` intact,
  so channel-level Cost is preserved; only the idea link goes null.
- **RLS (ownership-integrity, not just isolation — reviewer BLOCKER):** all verbs `to authenticated`;
  `select/update/delete using (owner = auth.uid())`; **`insert with check (owner = auth.uid() AND
  (idea_id IS NULL OR EXISTS (select 1 from public.ideas i where i.id = idea_id and i.owner =
  auth.uid())))`** — a row may only point at an idea the same owner owns. Negative gate: cannot insert
  a map row referencing another owner's idea.
- **`idempotency_key` PK** — one map row per logical job; because §3.1 makes every key non-null, the
  approval re-runs now have a real key and ARE captured.

### 3.3 Provenance recovery at re-enqueue (reviewer BLOCKER — multi-hop)
Since no job row carries `idea_id`, the map-write on a re-enqueue resolves provenance by looking up
the PARKED row's key: `idea_id = (select idea_id from idea_job_map where idempotency_key =
<parkedJob.idempotency_key>)`, then insert a new map row `(newKey, thatIdeaId, channel, owner)`. With
§3.1 making every key non-null, this chains across hops (park → fact-approve → spend-park →
spend-approve all resolve to the same `idea_id`). Ad-hoc (non-idea) enqueues have no parent map row →
`idea_id` null → honest "no originating idea."

### 3.4 Atomicity (reviewer SHOULD)
A job insert and a map insert across two client calls can leave a job with no map (silent orphan).
Define it: prefer a single **Postgres RPC** (`enqueue_job_with_map`) that inserts the job (RLS
`jobs_enqueue`) and the map row in one transaction; if an RPC is out of scope, define strict order
(job first, then map) and **surface a map-insert failure** (do not un-enqueue, do not fail silently).
Gated apply: HQ heads-up (dashboard-owned; announce) → apply → verify → negative RLS test (cross-owner
idea reference rejected; second owner cannot read) → VALIDATE → regen types.

---

## 4. Lane 2 — The resolver (`src/lib/thread.ts`, pure + unit-tested)

Per episode, resolve in this order and stamp `matchConfidence`:
1. **Exact (live today):** `jobs.episode_id` / `jobs.source_episode_id` == `episodes.episode_id` →
   the job → its map row → `idea_id`. `publish_only` re-enqueues never begin a new episode, so they
   attach to their **`source_episode_id`** (correlation_key will never cover them). `matchConfidence:
   "exact"`.
2. **Exact (future):** `episodes.correlation_key` == a `jobs.idempotency_key` == a map row (only when
   §2 detection says the column is live). `"exact"`.
3. **Approximate (Phase-3-only, labeled):** `episodes.food` + `episodes.character_id` + a bounded time
   window around the job's `created_at`. **Note `episodes.character_id` is 0-populated today (schema
   live, data-blocked), so for existing rows this degrades to food+window — Q2's window width is the
   whole ballgame.** `"approximate"`.
4. **Unmatched → `"unattributed"`.**
The resolver takes episodes + jobs + map rows → thread records; no hidden state; testable without the
DB. **Per-channel scoping derives from the resolved job's `channel`** (null → `'default'` profile, per
worker tolerant-resolution).

---

## 5. Lane 3 — Threaded Production + per-channel Runs/Cost (owner-scoped residual)

- **Workspace Production:** renders the thread (idea → job(s) → episode(s)) with the confidence badge
  on approximate links.
- **Per-channel Runs tab:** the resolved episodes for this channel + an **owner-scoped** "N
  unattributed" footnote.
- **Per-channel Cost tab:** channel-scoped spend (`receipts`→resolved `episodes`→channel), Fork-A
  `channelId` prop.
- **UNATTRIBUTED = the operator's OWN unresolved jobs, NEVER global-minus-resolved (reviewer
  BLOCKER):** `episodes`/`receipts` are operation-global (no owner) — computing residual as *global
  total − this channel's resolved* would surface every other operator's runs/spend. Instead the
  residual is derived **only from the operator's own jobs (via `idea_job_map`/owned jobs) that failed
  to resolve an episode**; global pipeline totals are never differenced into a per-operator number.
- **Onboarding auto-routing (D-6):** capturing an idea in a channel workspace pre-fills channel +
  character (Phase-2 FK) and, on enqueue, writes the map row — new work threads automatically.

---

## 6. Gates (falsifiable, MEASURED; QA creds required)

**Keys + map (lane 1)**
1. Every dashboard enqueue — initial AND all four re-enqueue paths (`fact|spend|publish|stale`) —
   carries a **non-null** `idempotency_key` (intercept-and-abort; assert each payload) and writes one
   `idea_job_map` row. Ad-hoc enqueue → `idea_id` null.
2. **Multi-hop:** idea → enqueue → fact-park → fact-approve → spend-park → spend-approve — all three
   jobs' map rows resolve to the SAME `idea_id` (proves §3.1+§3.3 fixed the null-key orphan).
3. Money-path unchanged: fact/spend/publish double-gate + park semantics identical after the key
   change (no re-approval, no 409 regression).
4. RLS: a second owner cannot read another's map rows AND cannot insert a row referencing another
   owner's `idea_id` (negative test). Deleting an idea SET-NULLs its map rows (row + `channel`
   survive).
5. Atomicity: a job insert with a failing map insert surfaces the failure (no silent orphan);
   RPC/transaction path proven.

**Resolver + honesty (lanes 2–3)**
6. `thread.ts` unit tests: exact via `episode_id`/`source_episode_id`; `publish_only` attaches to
   `source_episode_id`; correlation_key tier only when detected live; approximate labeled; unmatched
   → unattributed; no episode assigned to >1 idea.
7. **Feature-detection:** with `correlation_key` absent, all episodes/Runs/Cost surfaces render (no
   400). With it present (simulated), the exact tier engages.
8. Per-channel Runs/Cost show ONLY resolved episodes for that channel; a second channel is disjoint;
   an episode with no resolvable channel is NOT in any channel's scoped list. The **unattributed
   residual is owner-scoped** — assert it is derived from the operator's own unresolved jobs, and that
   a channel's Cost never equals `global − resolved` (no cross-operator leak).
9. Cross-team fresh-fetch (L-1) before the correlation-key tier; consensus review (Fable-5 + Gemini +
   Codex) per lane on spec + build; migrations gated-applied + VALIDATED; re-walk merged result.

---

## 7. Open items (reviewer trio first; operator only if blocked)

- **Q1 — correlation_key liveness/sequencing:** operator-owned (pipeline migration + worker write).
  Lanes 1–2(exact-via-episode_id)–3 proceed now; the correlation-key tier lights up when live.
- **Q2 — fallback window width:** with `episodes.character_id` 0-populated, the food+window heuristic
  is the whole fallback for existing rows — err narrow + "approximate" + residual over a wrong
  exact-looking assignment. Reviewer trio sets it.
- **Q3 — RPC vs ordered-writes for atomicity (§3.4):** default = an `enqueue_job_with_map` RPC;
  confirm it composes with the `jobs_enqueue` RLS policy.
