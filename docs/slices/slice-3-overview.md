# Slice 3 — Overview (read-only operations summary)

_Author: Architect (Claude). Status: spec frozen. Chosen as the next increment
because it is the one remaining step squarely inside the **ratified** product
framing (D-2: "dashboard owns inputs + surfaces outputs") that needs **no new
product-direction decision** and **no schema change**._

> Roles: Architect (Claude) wrote this; Designer (Gemini) → `docs/design/`; Builder
> (Codex) → app code + commits; independent reviewer agent + Architect ratify.

## Why this slice (and what it is NOT)

Slice 2 delivered the concrete deferred build-brief features (run/receipt drill-down,
bible version history). The other named deferrals — **multi-user teams, publishing,
external/SEO analytics** — each require a product-direction call the human owns
(**D-2 / `DIRECTION.md`**), so they are **out of scope here** (see "Deferred").

Slice 3 is a **read-only Overview**: a single new view that aggregates signals from
data **already in the database** so the founder sees the state of the operation at a
glance. It is **inspection only** — no controls, no orchestration, no writes. This is
**not** the deferred production/kanban board (D-2): it shows numbers, not per-run
actions.

## Inputs (read-only)

- `GATES.md`, `docs/contracts/data-contract.md`, `docs/HANDOFF.md`, `AGENTS.md`
- `src/components/ControlRoom.tsx` (nav rail, view switch, existing reads + tokens)
- Live `reels-content` DB for real shapes (read-only)

## Scope

A 4th nav item **"Overview"** (rail, after Runs) rendering read-only summary cards
from the existing reads (no new queries to pipeline-owned tables beyond the `select`s
already permitted; `receipts` may be aggregated client-side from a read):

1. **Roster** — total characters; active vs draft counts.
2. **The Wire** — total ideas; counts by status (backlog / active / used).
3. **Pipeline output (Runs)** — total episodes; counts by status; **total spend** and
   **avg spend/episode**; **gate pass-rate** (share of episodes whose last sentinel
   verdict is a pass) and/or receipt-level verdict tally; most-recent-activity date.

All derived from `characters`, `ideas`, `episodes`, and (optionally) `receipts`
reads. No writes anywhere; pipeline tables stay read-only.

## Frozen gates (acceptance — read-only after freeze)

| # | Gate |
| --- | --- |
| S3-1 | An "Overview" view is reachable from the rail; it renders summary cards for Roster, The Wire, and Runs from real data. |
| S3-2 | Aggregates are **correct** against the live data (counts/sums/rates match the source rows). |
| S3-3 | **Read-only**: no control mutates anything; **zero writes** to any table (esp. pipeline-owned). |
| S3-4 | Sensible **empty/zero states** (no characters / no ideas / no episodes) and a **loading** + **error** state consistent with the existing app. |
| S3-5 | Quality floor: responsive incl. 320px, visible `:focus-visible`, reduced-motion; reuse existing tokens/classes. |
| S3-6 | `next build` clean; no schema/migration changes; no new dependencies. |

No gate may be marked PASS by the actor that wrote the code under test; independent
reviewer agent + Architect in-browser ratification as in Slice 2.

## Designer brief (Gemini → `docs/design/slice-3-overview.md`)

Design artifacts only. Specify the Overview layout (a responsive card grid reusing
`.col-head`/card styles), each metric card (label, big number, supporting breakdown),
the empty/zero state per card, loading + error states, the rail nav item (icon +
`aria-pressed` like existing `.navbtn`), and 320/tablet/desktop behavior. All states
(default/hover/focus/active/disabled/loading/empty/error) and WCAG 2.2 AA. **No
operational controls** (inspection only — not the deferred board).

## Builder block (Codex → app code + commits)

Argue with the spec first. Then add the Overview view to `ControlRoom.tsx`:
- New `"overview"` value in the view union + rail button.
- Compute aggregates from the already-loaded `chars`/`ideas`/`episodes` where possible
  (avoid extra round-trips); if receipt-level stats are shown, read `receipts`
  read-only. **No writes; no pipeline-table mutations; no schema/migration.**
- Append Overview CSS to `globals.css` using existing tokens. Empty/loading/error
  states per the design.
- Run `npm run build`; report files changed; STOP (no git). Architect commits.

## Architect (judge) + independent review

Architect reviews vs S3 gates, build-verifies, merges as a Codex-authored commit;
an independent reviewer agent audits the diff; Architect ratifies in-browser against
the live DB (verifies aggregate correctness + zero writes). Human does final sign-off.

## Deferred (need D-2 / `DIRECTION.md` — human-owned)

- **Multi-user teams** — premature for a solo founder; needs auth/role model decisions.
- **Publishing** — output/distribution is pipeline territory (D-2); cross-repo.
- **External/SEO/social analytics** (e.g. Ahrefs) — integration + product-direction call.
- **Idea → pipeline linkage** (queue an idea as a run) — would require writing to the
  pipeline-owned `jobs` table (currently RLS deny-all); needs a cross-repo contract
  change and the pipeline owner's blessing. Open a cross-repo request when prioritized.
