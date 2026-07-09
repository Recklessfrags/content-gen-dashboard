# Proposal — Render-audition / scoring surface (the human quality gate)

_Author: Architect (Claude). Status: **PROPOSAL — spec only, no build yet.** Endorsed by the
problem-solver (issue #137 reframe, 2026-07-09) as the **one new dashboard surface worth
building** right now; the owner accepted the near-freeze on the rest (per-model reliability
#137, render-quality tier selector, variant A/B view — all parked). This surface builds the
moment the pipeline emits a real MP4; until then it is spec-ready, not built._

## Why (this, and near-nothing else, right now)
The operation has produced **zero publishable videos** and has **one user (the owner)**. The
binding constraint is "can the pipeline make a good video," and **the owner is the final quality
gate**. There is also an open pipeline question: *does the Gemini QA judge agree with the owner's
eye?* The single highest-value dashboard contribution is to make it **fast for the owner to watch,
score, and compare** the eval renders against the automated QA — i.e. build the human half of the
quality loop. Everything cost/quality-tier-shaped (estimator extensions, per-model reliability,
tier selector, A/B) is machinery for decisions that don't exist yet and stays frozen.

## The surface (MVP)
A read-mostly Aurora surface (e.g. `?hub=review`) listing recent **eval episodes** per channel:
- **Watch:** embed/stream the rendered MP4 for the episode (from `asset_ledger`, see data below).
  When no final MP4 exists yet, show the run's real state instead (status · `final_stage` · park
  reason) so the owner sees *why* there's nothing to watch — no blank shell.
- **Automated QA, inline:** the per-stage `episodes.sentinels` (stage · verdict · reason) and, when
  the pipeline surfaces it, the **holistic Gemini QA-judge score** for the whole video.
- **Owner score:** a small rubric (e.g. 1–5 or pass/revise/kill + a notes field) the owner assigns
  after watching. This is the **one new write path** → a dashboard-owned table (below).
- **Agreement view:** owner score vs QA-judge score side by side, to answer "does the judge track
  the owner's eye" across the eval set.

## Data — what exists vs what's needed (verified live 2026-07-09)
**Exists (dashboard can read today):**
- `asset_ledger` (`key, episode_id, kind, uri, cost`) — the per-episode artifact pointer; the
  final render is a row here (`kind` = video/final, `uri` = the artifact). Private-bucket URIs
  will need a **signed URL** to play (same pattern as the character reference-image render).
- `episodes` (`status, final_stage, message, spend, sentinels, character_id, correlation_key`) —
  run state + per-stage QA verdicts.

**Needed from the pipeline (dependencies — this is why it's spec-only now):**
1. **An addressable final MP4.** The eval renders run today (`acoustic-kitty`=dark_history,
   `proverbs-3-5-6`=grandma, `cottage-cheese`=weird_food) but **park before emitting a final MP4**
   (Step-2 bug, reels#82). Nothing to audition until a render completes and lands an
   `asset_ledger` video row with a playable `uri`. Confirm the `kind` value + whether the bucket
   needs signed-URL access.
2. **A surfaced QA-judge score.** The holistic "does this video hold up" Gemini review is ad-hoc
   today, not a structured field. For the agreement view, the pipeline needs to write the judge's
   score/verdict somewhere the dashboard reads (a `sentinels` entry with a known stage, or a small
   column). The **owner-scoring half works standalone** without this; the *comparison* needs it.

## One new write path (dashboard-owned)
`render_reviews` (or similar): `episode_id · score · verdict · notes · reviewer · created_at`,
owner-scoped RLS, dashboard inserts (owner action, no episode-side write). A `dash_*` migration —
the only schema change this surface needs. Everything else is reads.

## Sequence
1. **Now:** this spec + confirm the two pipeline dependencies (MP4 addressability + judge-score
   field) via the repo. No build.
2. **When the first real eval MP4 lands:** build the MVP (list + watch + owner-score + sentinels),
   `dash_*` migration for `render_reviews`, gates + review + live ratify (the one write path =
   intercept-and-abort the `render_reviews` insert, assert exactly-one).
3. **When the pipeline surfaces the judge score:** add the agreement view.

## Explicitly NOT in scope (frozen)
Per-model reliability (#137), render-quality tier selector, variant A/B comparison, further design
generations. Revisit when there's a publishable video **and** a real routing/tier decision to inform.
