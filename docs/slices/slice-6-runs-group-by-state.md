# Slice #6 — RunsHub group-by-state (collapse the wall of cards)

_Author: Architect (Claude). Status: **BUILD (read-only, no writes).** The remaining Sol-audit item
("Runs is an endless wall of cards — group by actionable state and collapse completed/parked runs"),
owner-approved ("proceed with all"). Read-only/design class — no money/brand path. Gemini review +
problem-solver merge nod before prod._

## Why
After #4 (channel filter), Runs is still a flat vertical stream. The audit's fix: group runs by
actionable state, attention first and expanded, finished runs collapsed — so the operator scans
what needs them, not everything at once.

## Scope (one pure helper + RunsHub, read-only)
`RunCardVM` already carries `status: JobStatus` and `needsAttention: boolean`. No data-layer change.

### 1. `src/lib/runsGrouping.ts` (+ `__tests__/runsGrouping.test.ts`) — pure, total, fail-closed
- `export type RunGroupKey = "attention" | "in_progress" | "done";`
- `export type RunGroup = { key: RunGroupKey; label: string; defaultOpen: boolean; cards: T[] }`
  (generic over the card shape, or typed to `Pick<RunCardVM,"status"|"needsAttention">` plus
  passthrough — keep it typed to a minimal `{ status: JobStatus; needsAttention: boolean }` shape so
  it's unit-testable without the full VM; `groupRunCards<T extends {status;needsAttention}>`).
- `export function runGroupKeyFor(card): RunGroupKey`:
  - `needsAttention === true` → `"attention"` (covers error / stale / ready_for_review).
  - else `isInFlightStatus(status)` (queued / running) → `"in_progress"`.
  - else → `"done"` (done / no_op — and any future/unknown status, since classifyJobStatus already
    maps unknowns to queued upstream; this branch is the total fallback). **Every JobStatus maps to
    exactly one group** — assert this in a test that iterates `JOB_STATUSES`.
- `export function groupRunCards(cards): RunGroup[]` — returns the groups in fixed order
  **[attention, in_progress, done]**, each with its `label` ("Needs attention" / "In progress" /
  "Done"), `defaultOpen` (attention: true, in_progress: true, done: **false**), and the cards that
  fall in it **preserving input order**. **Omit any empty group.** Empty input → `[]`.

### 2. `src/components/aurora/RunsHub.tsx`
- **Remove** the `attention` / `all` filter toggle (`RunFilter` state + the two buttons) — the
  grouping supersedes it (attention is now its own always-visible, expanded-first group). Keep the
  header summary line (`N runs · M need attention`).
- Keep the **channel filter** (from #4) exactly as is. Filtering order: apply the channel filter to
  `cards` first (as today, minus the attention predicate), then `groupRunCards(channelFiltered)`.
- Render each non-empty group as a **collapsible section**: a `<button>` header
  (`aria-expanded` / `aria-controls`) showing the group label + count (e.g. "Needs attention · 3"),
  and the group's `RunCard`s in a region below. Open state seeded from `group.defaultOpen`, held in
  local state keyed by group key (a `Record<RunGroupKey, boolean>` or a `Set`), toggled on click.
  Reuse the existing `runs-hub__reliability` disclosure pattern (▸/▾ + `aria-expanded`) for
  consistency. The "Done" group starts collapsed.
- **Empty states:** if after channel-filtering there are zero cards, show the existing
  "No runs in this channel…" affordance (generalise it — no longer tied to the removed attention
  filter). The existing top-level empty state (`showEmpty`, zero cards total) is unchanged.
- Do not change `RunCard`, diagnostics, the reliability panel, or the channel-filter logic.

### 3. aurora.css
- Scoped `.runs-hub__group` styles: the group header (full-width tap target ≥ existing chips, ▸/▾
  affordance, label + count), and the collapsible body. Reuse existing disclosure/border tokens; no
  new colors. Must not overflow 393px.

## Gates / review
`tsc` · full `vitest` (+ `runsGrouping` tests) · `next build`. Single cross-vendor (Gemini) review.
Commit + push to `claude/wire-aurora-home-5b-lleyyg`; problem-solver merge nod before prod.

## Explicitly NOT in scope
Per-group sort controls, virtualization, persisting open/closed across reloads, changing the channel
filter, any RunCard content change, any write path.

## States enumerated (rule 29)
- 0 cards total → existing top empty state.
- Only attention cards → one "Needs attention" group (open), no others.
- All three groups present → attention (open) + in_progress (open) + done (collapsed).
- Only done cards → one "Done" group, collapsed by default (user can expand).
- Channel filter active + a group empties → that group omitted; if all empty → generalised
  "no runs in this channel" affordance.
- Toggling a group header flips only that group; keyboard-operable (button + aria-expanded).
- Every JobStatus (queued/running/done/no_op/ready_for_review/error/stale) lands in exactly one group.
