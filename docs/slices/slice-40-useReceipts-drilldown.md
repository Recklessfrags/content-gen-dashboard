# Slice #40 (phase-2 cont.) — `useReceipts` drill-down hook extraction

_Author: Architect (Claude). Status: spec frozen (read-only for the rest of this slice).
Part of task #40 ControlRoom decomposition, phase 2. This is the **drill-down per-episode
`receipts` slice** — the one remaining read-state extraction **before** the entangled
`useCharacters`/`useIdeas` slice (which is deliberately last)._

> Loop: Architect (this spec + commit) → Builder (Codex, app code) → independent reviewer
> (Gemini, did not build) + Architect → human ratifies/merges. **Behavior-preserving.**

## Goal

Lift the **drill-down per-episode receipts read-state** out of the `ControlRoom.tsx`
monolith into a dedicated `useReceipts(supabase)` hook in `src/lib/hooks/useReceipts.ts`,
mirroring the existing `useEpisodes` / `useJobs` / `useCostReceipts` hooks. **No behavior
change** — pure refactor. This is the per-episode timeline receipts shown in
`DrillDownPanel`, NOT the global cost-receipts (`useCostReceipts`) which stays as-is.

## Critical distinction (do NOT conflate the two receipts reads)

There are **two separate reads of the `receipts` table** in `ControlRoom.tsx`. Only ONE
moves in this slice:

1. **MOVES (this slice):** the **lazy, per-episode drill-down** read — `receipts`,
   `receiptsLoading`, `receiptsError` state (lines ~323–325), `fetchReceipts` (~821–843)
   with its `receiptRequestRef` race-guard (~368), and the clear/reset logic inside
   `openRunDetail` (~845) / `closeRunDetail` (~853). Selects `*` for ONE `episode_id`,
   ordered by `seq` asc. Loads on drill-down open, not on mount.
2. **STAYS PUT (do NOT touch):**
   - `useCostReceipts` (global cost read, already its own hook).
   - The **job-park detection** read inside the `jobParkById` effect (~500–519) that
     selects `stage,seq` for a job's `episode_id`. That is queue-park logic, not the
     drill-down timeline — **leave it entirely alone.**

## Current behavior to preserve EXACTLY (this is the contract)

- **State:** `receipts: Receipt[]` (init `[]`), `receiptsLoading: boolean` (init
  `false`), `receiptsError: string | null` (init `null`).
- **`fetchReceipts(episodeId)`:** bump `receiptRequestRef`; set loading `true`, error
  `null`; `supabase.from("receipts").select("*").eq("episode_id", episodeId)
  .order("seq", { ascending: true }).returns<Receipt[]>()`; if a newer request started
  (`receiptRequestRef.current !== requestId`) **bail without touching state** (stale-
  response guard); else set loading `false`; on error set `receipts=[]` + error message;
  on success set `receipts = data ?? []`.
- **`openRunDetail(episodeId)`** currently: records focus trigger, sets
  `activeEpisodeId`, **clears the list immediately** (`setReceipts([])`), then calls
  `fetchReceipts(episodeId)`. The immediate clear must be preserved (no stale rows flash).
- **`closeRunDetail()`** currently: **bumps `receiptRequestRef`** (cancels any in-flight
  fetch so a late response can't repopulate after close), clears `activeEpisodeId`,
  clears `receipts`, clears error, sets loading `false`.
- **`DrillDownPanel` `onRetry`** (two render sites, ~2218 and ~2308) calls
  `fetchReceipts(activeEpisode.episode_id)` — must still work identically.

## Required hook shape

`src/lib/hooks/useReceipts.ts` — returns an object exposing receipts/loading/error plus
methods that let `ControlRoom` reproduce the exact behaviors above. Suggested (Codex may
refine the names, but behavior must be identical):

```ts
export function useReceipts(supabase: ReturnType<typeof createClient>) {
  // owns: receipts, loading, error, internal requestRef
  // load(episodeId): the fetchReceipts logic above (stale-guarded)
  // clear():        receipts -> []   (immediate, no ref bump) — for openRunDetail's pre-fetch clear
  // reset():        bump requestRef (cancel in-flight) + receipts [] + error null + loading false — for closeRunDetail
  return { receipts, loading, error, load, clear, reset };
}
```

`ControlRoom` then:
- `openRunDetail`: focus/activeEpisodeId bookkeeping stays in ControlRoom →
  `receipts.clear(); void receipts.load(id);`
- `closeRunDetail`: focus/activeEpisodeId bookkeeping stays → `receipts.reset();`
- `DrillDownPanel onRetry`: `void receipts.load(activeEpisode.episode_id)`
- Remove the now-moved `useState`s, `fetchReceipts`, and `receiptRequestRef` from
  `ControlRoom`. **Keep** `activeEpisodeId`/`activeEpisode`, focus refs, and
  `openRunDetail`/`closeRunDetail` wrappers in `ControlRoom` (they orchestrate UI focus,
  not the data read).

## Scope

- **IN:** new `src/lib/hooks/useReceipts.ts`; wire it into `ControlRoom.tsx`; delete the
  moved state/fn/ref. Match the import/style conventions of the sibling hooks.
- **OUT:** any behavior change, any change to `DrillDownPanel.tsx`'s props/markup, the
  `useCostReceipts` hook, the `jobParkById` park-detection read, polling/realtime (that's
  #37, a separate slice), and ANY edit to files other than `ControlRoom.tsx` +
  the new hook file (and this spec).

## Gates (DONE = all green on the real artifact)

1. `npx tsc --noEmit` clean.
2. `npm test` (vitest) green — no regressions.
3. `npm run build` succeeds.
4. **Behavior parity, manually reasoned in the build notes:** open a run detail → receipts
   load; close → in-flight cancels and list clears; reopen a different run → no stale rows
   flash; retry on error re-fetches. The stale-response guard still drops late responses.
5. `git diff --stat` touches only `src/lib/hooks/useReceipts.ts`, `src/components/ControlRoom.tsx`,
   and this spec. Nothing else (esp. NOT `docs/HANDOFF.md`).

## Builder instructions (Codex)

Argue with this spec first if any step is wrong (silent compliance = defect). Build only
the two declared files. You **cannot commit** — leave edits in the working tree; the
Architect reviews + commits. Do **not** edit `docs/HANDOFF.md`. Report raw gate output.
