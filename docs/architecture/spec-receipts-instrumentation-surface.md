# Spec — surface `requeue_fallback` and `provider_errors` in the receipts UI

**Status:** ready to build · **Architect:** Claude · **Builder:** Codex · **Reviewer:** Gemini
**Standing:** dashboard queue item 2 (small). Cross-repo contract note in
`docs/contracts/data-contract.md`.

## Why

The pipeline added two pieces of instrumentation the dashboard never surfaced, so the only way
to read them is SQL:

- **`retrieval.requeue_fallback`** — fires when a fact-check requeue falls back to the
  already-fetched source bundle because retrieval was starved. It is the receipt for T45, whose
  firing was previously *inferred from behaviour* rather than read.
- **`archival_sourcing.provider_errors`** (and `provider_order`) — which archival providers
  failed and why, and in what order they were consulted. This is P69's containment evidence:
  the proof that one provider's outage no longer aborts the whole consult.

## Ground truth before building (checked 2026-08-18)

- `provider_errors` is present on **4 assembly receipts in the last 3 days**. Real data exists.
- `requeue_fallback` appears on **no receipt at all** — it has not re-fired since the P70
  steering revert removed the starvation that triggered it.

**Consequence, and the thing not to get wrong:** build both to render *when present* and to be
invisible when absent. Do **not** fabricate placeholder values, and do not add an empty panel
that implies the mechanism is broken because it has nothing to show. An absent
`requeue_fallback` means "the starvation did not happen", which is the healthy state.

## Requirements

### R1 — Render where receipts are already read
The run diagnostics surface (`loadDiagnostics` / `RunsHub`, and the park context in
`ActionCenter`). No new navigation, no new hub.

### R2 — `provider_errors`
Show, per provider: the failure reason and count, and the consult order. The operator's question
is *"did a provider outage cost me this run, or were the queries bad?"* — the display should
answer that without SQL. Keep it compact; this sits inside an already-dense disclosure.

### R3 — `requeue_fallback`
When present, state plainly that the fact-check requeue reused the already-fetched sources
because retrieval was starved, rather than showing a raw flag.

### R4 — Additive and defensive
Both fields are additive to a shared contract and may be missing on any receipt, including every
historical one. Missing must render as absent, never as an error, an empty box, or a zero that
reads as a measurement.

### R5 — Tests
A receipt carrying `provider_errors` renders them; a receipt without either field renders
neither and throws nothing; a malformed/unexpected shape does not break the surrounding
diagnostics panel.

## Acceptance
`npx tsc --noEmit` clean, `npm test` green with new tests, `npm run build` passes. Do not commit.
