# Slice #1a — Read-only park view (Runs hub extension)

_Author: Architect (Claude). Status: **BUILD (read-only, reversible).** Problem-solver-ordered
render-independent backlog #1 (HQ reels#88 `4946473241` + confirmation `4946718258`); owner
delegated sequencing to the problem-solver, who green-lit #1a first. Read-only — no writes, no
money path — so per-slice gates + single cross-vendor review; production merge holds for owner
ratification._

## Why
Renders park as a normal state (vision-gate below-floor cuts, fact/spend/publish approval). Today
the owner can't see **why** a render parked without reading raw rows. The first live repair + the
first grounded render are imminent and both may park — this is the instrument to read those
results. Read-only surfacing first; the repair-*trigger* action (#1b, money-path) lands after a
live repair proves the flow.

## Scope (this slice — read-only only)
Surface, for each run, **why it parked**: the park kind, where it stopped, and the specific
below-floor cut(s) / reason. NO write actions, NO `jobs.repair`, NO approve buttons (those are
#1b / #2-approve).

## Data (all read-only, all already in the typed schema)
- `jobs.park_kind` (`fact|spend|publish|blocked|exhausted|null`) + `jobs.error` — already on the job.
- `episodes.final_stage` (where it stopped, e.g. `assembly`) and `episodes.message` (the human park
  reason, which contains the below-floor cut ids, e.g. `"…stock_vision_gate: cut14: stock visual
  did not receive a vision pass…"`). Joined by `episode_id`.
- `resolveParkKind(park_kind, lastReceiptStage)` (exists in `src/lib/jobs.ts`) → `fact|spend|publish|unknown`.

## Build
1. **New pure helper — `src/lib/parkReason.ts` (+ tests):**
   - `parseBelowFloorCuts(message: string | null): string[]` — extract distinct `cut<N>` tokens from
     the message in first-seen order (regex `/\bcut\d+\b/gi`, lowercased, deduped). Empty on null/none.
   - `parkKindLabel(kind: "fact"|"spend"|"publish"|"unknown", parkKindColumn?: string | null): string`
     — human label: fact→"Awaiting fact approval", spend→"Awaiting spend approval",
     publish→"Awaiting publish approval"; if `parkKindColumn` is `blocked`→"Blocked",
     `exhausted`→"Budget exhausted"; else unknown→"Parked".
2. **Enrich `RunCardVM` (`src/components/aurora/RunsHub.tsx`):** add optional read-only fields
   `parkKind?: "fact"|"spend"|"publish"|"unknown" | null`, `parkKindColumn?: string | null`,
   `finalStage?: string | null`, `parkReason?: string | null`, `belowFloorCuts?: string[]`.
   Purely additive — existing consumers/tests unaffected.
3. **Populate in `runsHubCards` (`ControlRoom.tsx`):** join the run's episode (by `episodeId`) from
   the already-loaded episodes (`useEpisodes`); if episodes aren't in that scope, build a
   `Map<episode_id, {final_stage, message}>` from the existing episodes fetch. Set `parkKind =
   resolveParkKind(job.park_kind, null)`, `parkKindColumn = job.park_kind`, `finalStage`,
   `parkReason = episode.message`, `belowFloorCuts = parseBelowFloorCuts(episode.message)`. Only
   meaningful for parked runs (`ready_for_review`/`error`); leave null otherwise. No new network
   fetch if episodes are already loaded.
4. **Render (RunsHub `RunCard`):** for cards with a resolved park (parked/attention), a read-only
   **"Why it parked"** block ABOVE the existing per-worker disclosure: the park-kind chip
   (`parkKindLabel`), `final_stage` ("stopped at · <stage>"), below-floor cut chips (if any), and
   the raw `parkReason` line (clamped/secondary). No buttons. Keep the existing "Run error" note.
   Built to accommodate a future Track-3 "why it parked" reason string (just another reason source).

## Gates / review
- `tsc --noEmit` clean · full `vitest` (incl. new `parkReason` tests) · `next build` clean.
- Single cross-vendor (Gemini) review (read-only, no money path → rule-4 single lens).
- Commit + push to `claude/wire-aurora-home-5b-lleyyg`. **Production merge holds for owner ratification.**

## Explicitly NOT in scope
Repair trigger (#1b, writes `jobs.repair` — money path, two-lens + ratify), any approve action,
the scoring surface (#3), channel-tagging (#4).
