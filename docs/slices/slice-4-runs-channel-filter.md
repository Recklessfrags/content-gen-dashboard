# Slice #4 (lane 1) — RunsHub channel filter (empty → "Unassigned" bucket)

_Author: Architect (Claude). Status: **BUILD (read-only, no writes).** Problem-solver backlog #4,
lane 1 green-lit (HQ reels#88 `4948982475`): "Build the RunsHub channel filter/grouping now, empty →
explicit Unassigned/default bucket. Read-only, no dependency… Go." Lanes 2 (legacy backfill) and 3
(enqueue guard) are NOT in this slice — (2) is the pipeline's `jobs` write; (3) is held/folded into
future C3 default-deny work. Merge nod from the problem-solver before prod._

## Why
#4's diagnosis showed channel-tagging is healthy on the enqueue path (~97% since ~07-04), so the
actual deliverable is the **dashboard feature the tag was for**: let the owner filter Runs by channel.
The legacy nulls + by-design "default" empties mean the filter must treat missing channel as an
explicit, first-class **"Unassigned"** bucket — never hide those runs.

## Scope (read-only, one component + one pure helper + tests)
`RunCardVM.channel` already carries `job.channel ?? null` (ControlRoom.tsx). No data-layer change.
This slice adds a channel filter that **composes with the existing `attention` / `all` filter** in
`RunsHub.tsx` — both filters apply together (AND).

### 1. `src/lib/runsChannelFilter.ts` (+ `__tests__/runsChannelFilter.test.ts`) — pure, fail-closed
- `export const ALL_CHANNELS_KEY = "__all__";`
- `export const UNASSIGNED_CHANNEL_KEY = "__unassigned__";`
- `export type ChannelFacet = { key: string; label: string; count: number };`
- `export function isUnassignedChannel(channel: string | null | undefined): boolean` — true when
  null/undefined **or** empty-after-trim (so `""`, `"   "`, and the by-design "default" empty all
  bucket together). This is the single source of truth for "counts as Unassigned."
- `export function channelFacets(cards: ReadonlyArray<{ channel: string | null }>): ChannelFacet[]`
  - Always leads with `{ key: ALL_CHANNELS_KEY, label: "All channels", count: cards.length }`.
  - Then one facet per **distinct assigned channel**, keyed and labelled by the trimmed channel
    string, sorted case-insensitively by label (`localeCompare`), each with its card count.
  - Then, **only if any card is unassigned**, a trailing
    `{ key: UNASSIGNED_CHANNEL_KEY, label: "Unassigned", count: <n> }`.
  - Distinctness is on the **trimmed** value (so `"weird_food"` and `"weird_food "` are one facet);
    the label/key use the trimmed form. Pure, deterministic, no dependence on input order beyond the
    sort. Empty input → just the `All channels` facet with count 0.
- `export function cardMatchesChannel(card: { channel: string | null }, facetKey: string): boolean`
  - `ALL_CHANNELS_KEY` → always true.
  - `UNASSIGNED_CHANNEL_KEY` → `isUnassignedChannel(card.channel)`.
  - any other key → `!isUnassignedChannel(card.channel) && card.channel.trim() === facetKey`.
  - An **unknown** facet key (not present in the current facets) → **false** (fail-closed).

### 2. `src/components/aurora/RunsHub.tsx`
- New state `channelKey: string` defaulting to `ALL_CHANNELS_KEY`.
- Compute `facets = channelFacets(cards)` (memoize with `useMemo` on `cards`).
- **Reset guard:** if the selected `channelKey` is no longer among `facets` (data changed, e.g. the
  only run in a channel left the list), fall back to `ALL_CHANNELS_KEY` for display (compute an
  `effectiveChannelKey` — do not trust stale state; do not need a `useEffect`, derive it).
- `visible` now = cards filtered by **both** the attention filter **and**
  `cardMatchesChannel(card, effectiveChannelKey)`.
- **UI — a channel facet row**, rendered only when `showList` **and** there is more than one facet
  beyond "All" (i.e. `facets.length > 2`; a single-channel operation shows no channel chips — no
  noise). Placed directly below the existing attention/all filter row, mirroring its markup:
  - a `role="group"` with `aria-label="Filter by channel"`;
  - one chip per facet: `label` + a count, e.g. `All channels`, `weird_food (18)`, `Unassigned (51)`;
  - `aria-pressed` on the active chip; reuse the existing `runs-hub__filter` chip classes (add a
    `runs-hub__filter--channel` modifier only if needed for wrapping — keep tap targets ≥ existing).
- **Empty interaction state:** if the active channel filter yields zero visible cards (can happen when
  it composes with "Needs attention"), show the existing empty affordance pattern — a `glass-panel
  au-empty` with a plain line like `No runs in this channel need attention right now.` Reuse the
  existing "no runs need attention" block; generalise its copy so it covers the channel case.
- The per-card channel display (`card.channel` in `run-card__meta`) stays as-is. For unassigned cards
  it currently renders nothing there — that's fine (the filter is the channel surface).

### 3. aurora.css
- Only if the channel chip row needs wrap/scroll handling at 393px: allow the filter row to wrap
  (`flex-wrap: wrap`) or scroll-x, so many channels never overflow the viewport horizontally. No new
  color tokens; reuse existing chip styling.

## Gates / review
`tsc` · full `vitest` (+ the new `runsChannelFilter` tests) · `next build`. Single cross-vendor
(Gemini) review (read-only, no writes). Commit + push to `claude/wire-aurora-home-5b-lleyyg`;
problem-solver merge nod before prod.

## Explicitly NOT in scope
Lane 2 legacy backfill (pipeline's `jobs` write), lane 3 enqueue required-channel guard (held →
C3 default-deny), grouping-with-collapsible-section-headers (the sol-audit "collapse the wall of
cards" idea — a separate follow-up; this slice is a filter, not a regroup), any write path.

## States enumerated (rule 29)
- 0 cards → no filter rows (existing empty state).
- 1 distinct channel, no unassigned → no channel chip row (facets.length == 2).
- N channels + unassigned → full chip row incl. Unassigned.
- all cards unassigned → chips = [All channels, Unassigned].
- channel filter × attention filter both active, zero matches → generalised empty affordance.
- selected channel disappears from data → effectiveChannelKey falls back to All.
- whitespace-only / "default"-empty channel → bucketed as Unassigned (via isUnassignedChannel).
- unknown facet key → cardMatchesChannel returns false (fail-closed).
