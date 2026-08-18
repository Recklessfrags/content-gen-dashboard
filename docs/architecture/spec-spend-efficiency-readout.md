# Spec — spend-efficiency readout (what no existing control can see)

**Status:** ready to build · **Architect:** Claude · **Builder:** Codex · **Reviewer:** Gemini
**Origin:** the operator, 2026-08-18: *"why do I have to catch the job restarting from scratch
instead of reworking it? why can't you catch things like that?"*

## The gap this closes

Every spend control in the system bounds **one attempt**: the cost-guard layers, `episode_cap`,
the $25 daily cap, per-stage receipts. Each of the 173 real-channel runs passed its cap and
looked healthy in isolation. **Nothing anywhere computes a ratio**, so buying the same work
sixteen times is invisible to every control that exists.

Measured 2026-08-18, excluding the deliberate `ab_*` A/B arms:

| | runs | distinct topics | spend | per topic |
|---|---|---|---|---|
| real channels | 173 | 11 | $143.71 | **$13.06** |
| A/B arms | 191 | 9 | $43.75 | $4.86 |

~16 runs per topic, nothing delivered. Computable since day one; never computed. The only
detector available was a human noticing a run start over — which is why the operator caught it
and the coordinator did not.

**A per-run metric cannot detect a per-topic waste.** That is the whole point of this readout.

## Requirements

### R1 — The numbers
Per channel, and overall, over a selectable window (default: all time, plus a 7-day view):

- **Spend per topic** — `sum(spend) / count(distinct food)`. The headline.
- **Runs per topic** — `count(*) / count(distinct food)`. The number that shows re-work.
- **Spend that never delivered** — `sum(spend)` on runs whose terminal state is not a delivered
  one, as a share of total spend.
- **Repeat lineages** — topics with more than N runs (default N=3), each showing run count,
  total spend, and how many distinct `episode_id`s it burned. This is the view that makes a
  case like "The Great Molasses Flood of 1919: 7 runs, 7 episodes, $13.36, none finished"
  visible at a glance.

### R2 — Separate deliberate experiments from waste
`ab_*` channels are intentional A/B arms and must be **excluded from the headline by default**,
with a toggle to include them. Counting a deliberate experiment as waste would discredit the
readout the first time someone checked it.

### R3 — There is NO delivered state today. Do not invent one. (AMENDED after round one)

The first draft said "define it from the data". Reviewing the build against the data showed the
data cannot define it, and both candidate definitions are actively misleading:

| candidate | runs it counts as delivered | why it is wrong |
|---|---|---|
| `status = 'done'` | **2**, both with null spend | Reads ~100% of all spend as waste. Discredits the readout on sight. |
| `episode_id is not null` | **308 of 364 — including 193 that ERRORED** | Counts failures as deliveries. Worse than the first. |

The cause is structural, not a data-quality problem: **publishing is disabled by S7**, so a
successful run today terminates at `ready_for_review` — waiting for a human, which is not
delivery. The concept has no referent yet.

So, while S7 holds:

- **Do not show a "spend that never delivered" figure at all.** A ratio whose denominator is
  undefined is worse than no ratio: it will be read as fact and it is not one.
- **The headline is spend-per-topic and runs-per-topic**, which need no notion of delivery and
  carry the whole finding on their own (~16 runs per topic).
- If a waste-shaped number is wanted, use one that is unambiguously true — e.g. **spend on runs
  that ended in `error`** — and name it exactly that, never "undelivered".
- Leave a note in the code that this becomes computable when publishing is enabled, so the next
  person does not re-derive the same dead end.

### R4 — Where it lives
The existing cost view (`CostBoxDashboard`). No new navigation. It is a readout, not a hub.

### R5 — Read-only
No writes, no actions, no thresholds that block anything. This exists to make an invisible
quantity visible; acting on it is a separate, operator-gated decision.

### R6 — Tests
Cover: the `ab_*` exclusion and its toggle; spend/runs-per-topic arithmetic on a fixture with a
known answer; the repeat-lineage threshold; and a null-spend row not corrupting a sum or an
average.

## Acceptance
`npx tsc --noEmit` clean, `npm test` green with new tests, `npm run build` passes.
Do **not** commit — the architect reviews and Gemini audits before anything lands.

## What this does NOT do
It does not fix the waste. **T56** (the approval re-enqueue that discards the run and pays
again) is the fix; this is the instrument that would have caught it, and will catch the next
one of its kind.
