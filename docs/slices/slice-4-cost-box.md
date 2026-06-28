# Slice 4 — Cost Box (Tier 1: spend visibility / governance)

_Author: Architect (Claude). Status: spec frozen. From the human's "Cost Box (Tier 1)"
brief + the Notion "Cost monitoring — LOCKED (tiered build)" entry. Read-only; the
only dashboard slice with zero pipeline dependencies._

> Roles: Architect (this spec) → Designer (Gemini, `docs/design/`) → Builder (Codex,
> app code + commits) → independent reviewer agent → Architect in-browser ratification.

## Goal

A **governance surface** for spend: a running total across all episodes, per‑episode
cost, and a **by‑API (provider) breakdown**, so the operator can watch a job approach
its budget cap. Inspection only — no controls, no writes.

## Confirmed data facts (verified against the live DB 2026-06-28 — do NOT re-derive)

- **`receipts` has no `spend` column.** It has **`spend_so_far`** (numeric, **cumulative
  per episode**), plus `provider`, `model`, `stage`, `seq`, `cache_*_tokens`.
- **Per‑episode cost = `max(spend_so_far)` for that `episode_id`.** Do **NOT** sum
  `spend_so_far` across rows — it's cumulative; summing overcounts.
- **Per‑stage cost = the delta**: `spend_so_far - lag(spend_so_far) over (partition by
  episode_id order by seq)`; first row's delta = its `spend_so_far`.
- **Per‑API/provider spend = sum of those per‑row deltas grouped by `provider`.**
  Empty‑string provider = deterministic stages (e.g. `gate`), $0 increment → bucket as
  "deterministic / none".
- **Running grand total = sum over episodes of `max(spend_so_far)`** (== sum of all deltas).
- **Use `spend_so_far`, not `episodes.spend`, for the Cost Box.** Reason: for a
  **running** episode `episodes.spend = 0` until it finalizes, but `max(spend_so_far)`
  shows **in‑flight** spend — which is the whole point (catch a runaway before it ends).
  For **completed** episodes the two are equal (verified: `episodes.spend == max(spend_so_far)`).
- **Units are uniform USD, LLM‑only today** (anthropic, google). **No asset/voice/music/
  render providers exist in receipts yet** → asset spend is NOT logged.
- **No cap config** is readable in any dashboard‑reachable table.

## Scope

- **IN (Tier 1):** running total (USD), per‑episode cost (live, in‑flight aware), and
  **by‑provider/API breakdown** (the human asked for "by api"; it's attribution, not
  ROI/analytics, and surfaces the unit split when assets land).
- **PARK (flag, don't build/fake):**
  - **Asset/credit spend** — not in receipts. Ship LLM‑USD‑only; show a clear
    "asset spend not yet reported by the pipeline" note (the flagged pipeline gap).
  - **Cap context** — no cap config readable; cap display is a fast‑follow.
- **DEFERRED (Tier 2/3 — out of scope, do not build):**
  - **Per‑character / per‑idea cost** — needs `character_id` on `episodes` (D‑1 / the
    Acoustic Kitty run). **Design the by‑API aggregation so a `group by character`
    drops in** once the key exists, but build nothing character‑keyed now.
  - **ROI** (cost ÷ views/revenue) — Tier 3, needs publishing + analytics ingestion.

## Frozen gates (acceptance — all PASS to stop)

| # | Gate |
| --- | --- |
| S4-1 | Running spend total across all episodes, from `max(spend_so_far)` per episode (USD), explicitly labeled USD. |
| S4-2 | Per‑episode cost shown (live / in‑flight aware via `spend_so_far`), reconciling with `episodes.spend` for completed episodes. |
| S4-3 | **By‑API/provider breakdown** computed from per‑row deltas (never from raw cumulative sums); deterministic/empty provider bucketed sanely. |
| S4-4 | Unit is explicit and correct — USD only today; **no silent summing across units**; an "asset spend not yet logged by pipeline" note is shown (flagged gap). |
| S4-5 | Reads live from Supabase; **zero writes** (no mutations to any table). |
| S4-6 | Numbers reconcile against a known run (completed cottage‑cheese episode: `max(spend_so_far)` == `episodes.spend`). |
| S4-7 | Stays Tier 1 — **no `character_id` grouping, no ROI, no analytics**; cap display only if cap config is exposed (else parked). |
| S4-8 | Quality floor (responsive incl. 320px, `:focus-visible`, reduced‑motion, existing tokens); `next build` clean; no schema/migration; no new deps. |
| S4-9 | No contradictory spend numbers across surfaces — the existing Overview total and the Cost Box must agree (align Overview to the same live `spend_so_far` source, or clearly label the difference). |

No gate may be marked PASS by the actor that wrote the code under test.

## Designer brief (Gemini → `docs/design/slice-4-cost-box.md`)

Design artifacts only. Decide placement (recommend one, justify): a dedicated **"Cost"**
rail view vs. a prominent panel — note the Slice‑3 Overview already shows a spend card,
so avoid duplication/contradiction (S4‑9). Specify: the running‑total hero, the
by‑provider breakdown (label, amount, share), per‑episode cost in the Runs context
(live/in‑flight indicator for `running` episodes), the **"asset spend not yet reported"**
note, and where a future cap bar would sit (parked). All component states
(default/hover/focus/active/disabled/loading/empty/error), 320/tablet/desktop, WCAG 2.2
AA, existing tokens only. **No operational controls.** Leave a visible seam for
per‑character grouping (Tier 2) without building it.

## Builder block (Codex → app code + commits)

Argue with the spec first. Then implement per the approved design:
- Compute aggregates from `receipts` (read‑only): per‑episode `max(spend_so_far)`,
  per‑stage **deltas**, per‑provider totals from deltas, running grand total. Reuse
  the already‑loaded `episodes`; you MAY add a single read of `receipts` for the
  cost view (read‑only) — no writes anywhere.
- USD labeling; the asset‑gap note; reconcile/align the Overview spend figure (S4‑9).
- Empty/loading/error states; responsive + reduced‑motion; existing tokens.
- No schema/migration, no new deps, no `any`. Run `npm run build`; report; STOP (no git).

## Architect (judge) + independent review

Architect reviews vs S4 gates, build‑verifies, merges as a Codex‑authored commit;
independent reviewer agent audits; Architect ratifies in‑browser against the live DB
(verifies totals/by‑provider math vs SQL ground truth, in‑flight behavior, zero writes).
Human does final sign‑off.

## Boundary — what this is NOT

Spend visibility only. Per‑character cost = Tier 2 (D‑1 trigger). ROI = Tier 3
(publishing + analytics ingestion). Building either here is building ahead of its
dependency — hold the line at Tier 1.
