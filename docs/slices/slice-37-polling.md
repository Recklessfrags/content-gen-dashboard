# Slice #37 — live Runs/Queue via polling (no realtime)

_Author: Architect (Claude). Status: spec FROZEN (v2 — after a cross-vendor Gemini
review, REQUEST CHANGES, whose two substantive findings were verified against the code
and folded in: (1) a permanent-spinner race between `refetch`'s loading flag and a
`poll` that wins the `requestRef` check; (2) stale episode data behind the Queue view's
episode drill-downs). Operator GO: 2026-07-01. Pipeline ruling (2026-06-30): **poll, do
NOT enable `supabase_realtime`** — single worker, ~1 episode/12 min, low write volume.
Zero pipeline dependency, zero DB change._

> Loop: Architect (spec, cross-vendor reviewed) → Codex (build) → Gemini + Architect
> review the diff → ratify (desktop + 412px mobile) → human merges.

## What ships

While the operator is **looking at the Queue or Runs view**, the list refreshes itself
every few seconds, silently — no manual reload to see a job move from `queued` →
`running` → `ready_for_review`, or an episode land. Everything else backs off: polling
stops when the tab is hidden, when the operator is in another view, or when a
dialog/drill-down is open on top of the list.

## Non-goals (do not build)

- **No realtime / `supabase_realtime`** — ruled out by the pipeline (2026-06-30).
- **No polling of any other view** — Overview/Cost keep deriving from already-loaded
  state (S3-3); Roster/Wire/Channels are operator-edited surfaces (clobber risk, the
  PR #27 lesson) and stay fetch-on-mount + explicit refetch.
- **No new UI chrome** — no "LIVE" badge, no spinner on background refreshes, no
  settings knob. D-2: focused tool.
- **No new deps, no migration, no schema.**

## Files

- **NEW `src/lib/hooks/usePolling.ts`** — generic interval hook.
- **`src/lib/hooks/useEpisodes.ts`**, **`src/lib/hooks/useJobs.ts`** — add a silent
  `poll` alongside `refetch`.
- **`src/components/ControlRoom.tsx`** — two `usePolling` call sites.
- Unit tests for the changed `lib` surface (`src/lib/hooks` is under Vitest reach via
  `lib/*`; if hook-level tests need a DOM harness that doesn't exist, test the pure
  scheduling logic factored so it is testable — do not add a new test framework).

## Design (concrete — no options)

### 1. Silent poll on the two hooks

In `useEpisodes` and `useJobs`, factor the fetch body into one internal function used
by both entry points:

- `refetch()` — sets `loading` true at start, clears `error`, on error **clears the
  list** and sets `error`. Existing callers keep exact behavior.
- `poll()` — background variant: never sets `loading` **true**; on success replaces the
  list and clears `error`; on **error keeps the current list** (stale-but-visible beats
  a blanked view on a transient blip). **Error-visibility rule (v3, Architect diff
  review):** a poll error sets `error` **only when the current list is empty** —
  otherwise it is swallowed (the next tick recovers). Rationale: both views render
  `error ? <error state> : list`, so setting `error` while data exists would swap a
  populated list for the "Comms Down" panel — the exact blanking P-4 forbids. Setting
  it on an empty list is correct (there is nothing to preserve, and the retry button
  becomes reachable).
- Both share the existing `requestRef` guard so a stale response never overwrites a
  newer one (`poll` and `refetch` bump the same counter — last request wins).
- **Loading-race rule (review finding 1, verified):** whichever request **wins** the
  `requestRef` check must unconditionally `setLoading(false)` on completion — including
  `poll`. Otherwise: `refetch` sets `loading=true` → a poll tick bumps the counter →
  the refetch response loses the check and early-returns **without** clearing
  `loading` → the winning poll (forbidden from touching `loading`) leaves the spinner
  stuck forever. Clearing an existing loading state from a poll is required; only
  *raising* it is forbidden.
- `poll` must be a stable `useCallback` (deps: `supabase` only), like `refetch`.

### 2. `usePolling(fn, { enabled, intervalMs })`

New hook, one job: while `enabled` and the document is visible, call `fn` every
`intervalMs`; otherwise do nothing.

- On the transition to active (enabled flips true, or visibility returns): fire `fn`
  **immediately**, then start the interval. On deactivation: clear the interval.
- **No overlap:** if the previous `fn()` promise is still in flight, the tick is
  skipped (a ref flag), not queued.
- Visibility: register a `document.addEventListener("visibilitychange", …)` handler
  (not a render-time read); `document.visibilityState === "hidden"` counts as disabled,
  and the transition back to `"visible"` fires the immediate poll from §"transition to
  active". Guard `typeof document !== "undefined"` for SSR safety.
- Cleanup on unmount; changing `fn`/`intervalMs` must not leak intervals (keep the
  latest `fn` in a ref so the interval itself isn't torn down by identity churn).
- No `Date.now()` cleverness, no backoff ladder — fixed interval, on/off only.

### 3. Wiring in `ControlRoom`

```
const overlayOpen = activeEpisodeId !== null || pendingQueueAction !== null;
usePolling(pollJobs,     { enabled: view === "queue" && !overlayOpen, intervalMs: POLL_MS });
usePolling(pollEpisodes, { enabled: (view === "runs" || view === "queue") && !overlayOpen, intervalMs: POLL_MS });
```

- **`POLL_MS = 5000`**, inside the pipeline-agreed 3–5 s band, cheapest end.
- **Jobs poll on the Queue view only. Episodes poll on BOTH Runs and Queue views**
  (review finding 2, verified): the Queue view opens episode-linked drill-downs
  (`aria-expanded={activeEpisodeId === job.episode_id}` on job rows), so its episode
  data must be as fresh as the queue itself — otherwise the drill-down opens on
  episode state as old as the last Runs visit. Runs view does not poll jobs.
- **Overlay guard:** while the receipts drill-down (`activeEpisodeId`) or the
  queue-action dialog (`pendingQueueAction`) is open, polling pauses. This prevents
  (a) `activeEpisode` (derived via `episodes.find`) vanishing/reordering under an open
  panel and (b) the approve/re-run dialog's job row shifting mid-confirmation — the
  PR #27 clobber lesson applied to modals. On close, the immediate-fire rule (§2)
  refreshes at once.
- The interval constant lives next to the call site as a named `const POLL_MS = 5000`.

### 4. Focus/a11y constraint

Background refreshes must not steal or reset keyboard focus. List items are keyed by
stable ids (`job.id`, `episode_id`) — reordering moves the focused element with its
key, which is acceptable; nothing may call `.focus()` from a poll path, and `loading`
(which swaps list content for a loading state) must never flip during a poll.

## Acceptance criteria (gates — frozen with the spec)

| # | Gate | How verified |
| --- | --- | --- |
| P-1 | On Queue view, an out-of-band `jobs` change appears within ~10 s with **zero user interaction**; same for Runs/`episodes`. | Ratify-harness variant: bridge-inject a row change (or watch `running` flip), assert DOM updates. |
| P-2 | **No loading flash** during background polls — the list DOM is never replaced by the loading state after initial load while polling. | Assert `loading` UI absent across ≥2 poll cycles. |
| P-3 | Polling stops when: tab hidden, other view active, drill-down open, queue dialog open. Resumes (with an immediate refresh) when the condition clears. | Count bridged Supabase REST hits per state (the ratify bridge sees every request). |
| P-4 | A transient poll failure leaves the previous list rendered (no blank view); a subsequent success recovers silently. | Force one bridged request to fail; assert list persists. |
| P-5 | No writes of any kind from the poll path (`episodes`/`receipts` stay read-only; `jobs` sees only `select`). | Bridge log: 0 non-GET/`select` calls attributable to polling. |
| P-6 | `tsc --noEmit`, `npm test`, `npm run build` clean; no new deps; no migration. | CI + local. |
| P-7 | Quality floor unchanged: 412px no horizontal overflow; focus never stolen by a background refresh (focused element still focused across a poll that reorders). | Ratify mobile pass + focus assertion across a poll cycle. |

**Floor ≠ done:** P-1/P-3 must be shown on the **running app against the live DB**
(bridge-observed request counts), not inferred from unit tests alone.
