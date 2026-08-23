# Spec — Runs hub: lifecycle tabs + the step visualizer

**Status:** ready to build · **Designer:** Gemini · **Architect:** Claude · **Builder:** Codex · **Reviewer:** Gemini + L-2 suerta

**Operator ask, verbatim (2026-08-18):** *"I want to see current runs at the top, parked runs
aren't active and should be its own tab. I also want a wireframe a step visualizer, like if it
completes the script step, I can click the passed step and review the script. I want it
compacted and only what I click shows."*

Designed by Gemini against the real component and real data. **Three architect corrections
below** — each one a place the design as written would break against something it could not
see. Build the design *as corrected*.

---

## 1. Tabs — lifecycle, not "archive"

**⚠️ CORRECTION 1.** Gemini proposed three tabs: PARKED / IN FLIGHT / **ARCHIVE**, with archive
meaning terminal states (`done`, `no_op`, `error`, `stale`, `abandoned`). That collides with a
feature that shipped to production **today**: `RunsHub` already has an Active/Archived toggle
where *archived* is a **deliberate operator action** recorded in `public.job_archive`, not a job
state. The two are **orthogonal** — a `done` run may or may not be archived; an `error` run may
or may not be archived. Merging them would silently hide finished runs the operator never
archived, and lose the archive feature's meaning.

So:

**Tabs = lifecycle** (what the pipeline is doing):

| tab | statuses | note |
|---|---|---|
| **PARKED** | `ready_for_review` | waiting on the operator. **Default tab when count > 0** — it is the only tab that needs him. |
| **IN FLIGHT** | `queued`, `running` | actively consuming compute. Default when Parked is empty. |
| **FINISHED** | `done`, `no_op`, `error`, `stale`, `abandoned` | terminal. Failures are visually distinct within it, not a separate tab. |

**Archived stays a FILTER** across all three (the existing `showArchived` toggle), never a tab.
Archived rows are excluded from every tab's default view and from the counts.

Header: drop "Runs · 17 runs · 7 need attention" — the tab labels carry the counts, and the two
numbers currently disagree, which is the operator's original complaint.

## 2. The collapsed run row

Delete from the collapsed state: the "Waiting on you" box, "Stopped at", every action button
(`REVIEW APPROVALS`, `ARCHIVE`, `Watch render`), the "Technical details" disclosure, and the
status chip — the visualizer's node states replace all of it.

Keep: **topic** (`food` — the only thing that identifies a run), channel, `spend`, time, and the
step track.

**⚠️ CORRECTION 2 — the track needs its own full-width row.** Gemini put the 11-node track on the
same line as the timestamp and specified "44×44px touch targets". That is geometrically
impossible: 11 × 44px = **484px** against a 412px viewport (~380px after card padding, less the
timestamp). Overlapping touch targets on a money screen means taps landing on the wrong stage.

The track therefore gets its **own full-width row** beneath the identity line: ~380px ÷ 11 ≈
**34px per node**. Targets are **34px wide × 44px tall** — the tall axis recovers most of what
the narrow axis costs, and it is honest about the constraint instead of asserting a number that
does not fit. If a reviewer finds 34px still too tight in a real browser at 412px, the fallback
is grouping the 11 stages into 4 phases (research / script / visuals / ship) with a second level
on tap — do NOT silently shrink the target instead.

```
┌──────────────────────────────────────────────┐
│ Cottage cheese                       $0.29   │
│ ab_gen_forced · 17:46                        │
│ ●──●──●──④──◆──○──○──○──○──○──○               │
└──────────────────────────────────────────────┘
   res fc gate scr lex vr  vo ed asm vir dist
```

Node states: `○` not reached · `●` passed · `④` passed after N attempts · `◉` running ·
`◆` parked here (square — breaks the shape pattern so the eye finds it) · `✕` failed here.

## 3. The step visualizer drawer

The 11 stages, in order: `researcher · fact_check · gate · script_writer · lexicon ·
visual_router · voice_direction · editor · assembly · virality · distribution`.

Tapping a node opens a drawer inside the card. **Payload sizes span four orders of magnitude**
(measured in production), so a raw dump is forbidden and each stage needs its own view:

| stage | max result | view on tap |
|---|---|---|
| `script_writer` | 4,475 | **the script, rendered as readable text** — the operator named this one |
| `lexicon` | 4,475 | same |
| `gate` | 3,796 | allowed claims list |
| `distribution` | 3,330 | per-platform rows + issues |
| `virality` | 94 | the score |
| `researcher` | 12,358 | sources list, not the raw context |
| `fact_check` | 17,019 | claim ledger as GREEN/YELLOW/RED chips + sources |
| `editor` | 44,698 | cut count, density, retry reasons |
| `voice_direction` | 44,110 | segment count, energy, LUFS |
| `visual_router` | 53,540 | per-beat source classes + counts |
| `assembly` | **795,011** | **counts only** — scenes, cuts, duration, spend. Never the manifest. |

**⚠️ CORRECTION 3 — do not fetch the 795KB manifest at all.** Gemini's rule ("fetched only when
the operator taps assembly") still pulls 795KB to a phone to display three integers. Select the
specific jsonb paths server-side instead (PostgREST supports sub-path selection), or compute the
counts in the query. **No stage view may transfer more than a few KB to the client.** If a
summary cannot be produced without the whole payload, show what is available and say so — do not
download it.

**Retries.** A stage can hold several receipts; script_writer alone shows 16 `retry` against 11
`pass`. "Passed" often means "passed on attempt 3", which is diagnostic information not visible
anywhere today. The drawer header carries an attempt selector and the per-attempt spend, and the
node shows the attempt count when > 1.

**Auto-select on a parked run.** ⚠️ `park_kind` is `spend|fact|publish|reveal` — **not** a stage
name, so the mapping is approximate (`fact`→`fact_check`, `spend`→`assembly`'s cost guard,
`publish`→`distribution`, `reveal`→ no clean stage). **Prefer the exact signal:** the last
receipt whose verdict is not `pass`. Use `park_kind` only as a fallback when receipts are
unavailable, and never let a wrong guess auto-open a stage that is not where the run stopped.

## 4. Interaction — "only what I click shows"

1. One run expanded at a time; opening B collapses A.
2. One step drawer at a time within a run.
3. Tapping the open node closes it.
4. Opening a PARKED run auto-selects the stage it stopped at (§3).
5. Every payload is lazy — nothing is fetched until its node is tapped, and nothing is refetched
   while it is already open.

## 5. Components

Existing aurora system only (`.aurora-app`-scoped, in `src/app/aurora.css`): `glass-panel`,
`text-title`, `text-mono`, `cost-readout`, `status-chip`. New: `.au-step-track` (full-width flex
row), `.au-step-node` (+ `.is-passed` / `.is-parked` / `.is-running` / `.is-failed` /
`.is-pending`), `.au-step-drawer`, `.au-receipt-meta`. No new library, no new visual language.

## 6. Order if sliced

1. **The tabs.** Highest value, least risk — it fixes the operator's actual complaint that
   parked runs are counted as active.
2. The collapsed row + track, non-interactive. Reclaims the vertical space.
3. The drawer with `script_writer` and `fact_check` views — the two he reads.
4. The remaining stage views, `assembly` last since it needs the server-side summary.

## Acceptance
`npx tsc --noEmit` clean, `npm test` green with new tests, `npm run build` passes. Per **L-7**,
any test guarding a specific defect must be PROVEN by reverting the fix and watching it fail.
Per **L-8**, a real-browser check is required — the collapse bug that shipped was invisible to
jsdom. Do **not** commit.
