# Proposal — Render-audition / scoring surface (the human quality gate)

_Author: Architect (Claude). Status: **SPEC-READY — build PAUSED, no code yet.** Endorsed by the
problem-solver (issue #137 reframe) as the one new dashboard surface worth building; the owner
accepted the near-freeze on everything else. **Build trigger (owner ruling, 2026-07-10): the
pipeline must emit a GATE-PASSING complete MP4.** The 14 pre-gate renders that already reached
`final_stage=distribution` (06-29→07-08) are **explicitly excluded** — the owner ruled them
known-bad quality, not auditionable evaluation material (they carry the below-floor stock cuts the
new `stock_vision_gate` now blocks). So: spec-ready now, build the moment the escalation fix
(reels#82) lands the first gate-passing food/eval render._

## Why (this, and near-nothing else, right now)
The operation has produced **zero *gate-passing* videos** and has **one user (the owner)**. The
binding constraint is "can the pipeline make a good video," and **the owner is the final quality
gate**. There is also an open pipeline question: *does the Gemini QA judge agree with the owner's
eye?* The single highest-value dashboard contribution is to make it **fast for the owner to watch,
score, and compare** eval renders against the automated QA — i.e. build the human half of the
quality loop. Everything cost/quality-tier-shaped (estimator extensions, per-model reliability,
tier selector, A/B) is machinery for decisions that don't exist yet and stays frozen.

## The surface (MVP)
A read-mostly Aurora surface (e.g. `?hub=review`) listing recent **gate-passing eval episodes**:
- **Watch:** embed/stream the rendered MP4 (from `asset_ledger` `kind='render'`; json2video CDN
  URIs are public/playable, private-bucket URIs need a signed URL). When no gate-passing MP4 exists
  yet, show the run's real state (status · `final_stage` · park reason) so the owner sees *why*
  there's nothing to watch — no blank shell.
- **Automated QA, inline:** the per-stage `episodes.sentinels` (stage · verdict · reason) and, when
  the pipeline persists it, the holistic per-beat Gemini QA-judge scores.
- **Owner score — a GUIDED, LED questionnaire (design pin, problem-solver 2026-07-09):** NOT an
  open "what did you think?" box, and NOT abstract 0–10 sliders. The owner is **led one question at
  a time**, each a concrete plain-language ask with **structured tap/scale input**, and the flow
  **won't complete until every axis is answered** (can't skip or drift). Plain questions map 1:1 to
  the rubric dimensions, e.g.:
  - "Did the first 2 seconds grab you?" → `hook`
  - "Did the visuals match what was being said?" → `visual_relevance`
  - "Did the voice sound natural or robotic?" → `vo_delivery`
  - "Did it drag anywhere?" → `beat_pacing`
  - "Was the writing clear and did it land?" → `script`
  - "Any glitches / rough cuts / render errors?" → `editing` + `rendering`
  - **Engagement axis (owner-approved, distinct whole-video):** "Would you post this as-is?" /
    "Was it worth watching to the end?"
  - **Free text is optional per-aspect ("why") — never the primary capture.** Structure carries the
    grade; text adds color. ≤2 min, thumb-driven — *led ≠ heavy.*
- **Agreement view:** owner score vs QA-judge score per dimension, to answer "does the judge track
  the owner's eye" — **advisory only** (see contract) until an on-our-renders calibration study.

## The scoring contract (LOCKED on HQ reels#88, owner ratifies the anchors)
Both sides score **identical axes on identical beats** — the calibration precondition.
- **Axes:** the six pipeline `DIMS` — `script, vo_delivery, beat_pacing, visual_relevance,
  editing, rendering` — **plus `hook`** as a distinct first-3s axis (matches retention research;
  the pipeline already scores `hook:{first_3s_grade}` separately). Identical rubric both sides.
- **Engagement axis (distinct, whole-video — problem-solver #139 gate-review, owner-approved):**
  add **`engagement` / "earns-the-watch"** as its own axis, NOT folded into hook or pacing. Rationale:
  hook is only the *opening*; ~55% skip before the end; and the research (Track C) shows the four
  craft dims are *unproven* performance predictors — so we need one axis that is explicitly about
  *performance* ("worth watching to the end / would you post it"), not craft. Whole-video scope
  (not per-beat). Reconciled into both rubrics.
- **Anchors (GAP, owner ratifies):** the judge scores 0–10 with only "default to critical" as
  calibration — no per-dimension definition of 0 vs 5 vs 10. @pipeline drafts a 0/3/7/10 anchor
  strawman → dashboard reconciles → **owner ratifies** as standing precedent. Gated behind
  render-completion.
- **Join key:** `beat_ref = cut_id` (the deterministic per-beat ordinal in
  `RenderManifest.visual_relevance.per_cut`); episode handle = **`correlation_key`** (stable across
  re-renders; `episode_id` is not). This **folds into the single queued `episodes.correlation_key`
  migration** — one column serves both the scoring join and the episode linkage.
- **Advisory-only, always, until calibrated:** the machine judge never auto-gates until an
  on-our-renders study clears the human-likeness bar (r ≥ 0.80 + |z|<1 vs the owner's own
  test-retest). Every threshold in the literature is text-domain; a vision/video judge is unproven.
- **Calibration has a real owner-time cost (problem-solver #139 gate-review — surface it, don't
  hide it):** the two-step trust test requires the owner to score a batch of *gate-passing* renders
  **twice** (test-retest) to establish his own per-dimension baseline *before* the judge can be
  trusted on that dimension. This is a deliberate scoring study, not free. Minimum N is unresolved —
  set empirically from where owner↔owner self-agreement stabilizes. Owner attention is spent only on
  gate-passing renders (ADR-003: spent last and least), never on the pre-gate tier.
- **Sequencing:** `source=owner` capture lands first (advisory). The pipeline **machine-score
  emission** is quality-wave: `render_qa_video.py` is an out-of-band CLI today (prints JSON, nothing
  persisted, nothing in `src/` imports it) — store `source=owner` rows now, `source=machine` when
  wired.

## Write paths (dashboard-owned) — a `dash_*` migration
Langfuse-Scores shape; owner and machine rows distinguished by `source`:
- `render_reviews`: `episode_id · verdict(ship|almost|reject) · is_bar_setter(⭐) · reviewer ·
  review_ms · notes · created_at` — owner-scoped RLS, dashboard inserts.
- `render_dimension_scores` (the calibration pairs): `episode_id · dimension · source(owner|machine)
  · score(0–10 ordinal) · beat_ref? · rationale? · model_version(machine) · created_at`.
- `render_beat_flags` (owner tap-to-flag): `episode_id · beat_ref · why · created_at`.
- Provenance: every machine score + the render link back to the producing run via `receipts`.

The **owner-scoring half works standalone** — the led questionnaire → these tables needs no machine
feed. The *agreement view* is what waits on the machine emission.

## Data — what exists vs needed (verified live 2026-07-10)
**Exists (dashboard reads today):**
- `asset_ledger` (`key, episode_id, kind, uri, cost`) — final render is `kind='render'`.
- `episodes` (`status, final_stage, message, spend, sentinels, character_id, correlation_key`).

**Needed from the pipeline (why it's paused):**
1. **A gate-passing complete MP4** — the escalation fix (reels#82: below-floor beats regenerate to a
   passing visual in-run). Current renders (#70/#73/#74) park at `stock_vision_gate`. **Pre-gate
   renders are excluded by owner ruling.**
2. **Persisted per-beat × per-dimension judge scores** (for the agreement view only — owner half
   works without it).

## Sequence
1. **Now:** this spec + the locked contract (done). Schema reconcile — model `research_profile
   {anchor_type, source_hierarchy[], thesis}` + `sourcing` in the dashboard's typed schema; align
   `length_target` shape with the pipeline. No build.
2. **When the first GATE-PASSING eval MP4 lands:** build the MVP (list + watch + led owner-score +
   sentinels), `dash_*` migration for the three tables, gates + review + live ratify
   (intercept-and-abort the inserts, assert exactly-one).
3. **When the pipeline persists the judge scores:** add the agreement view.

## Explicitly NOT in scope (frozen)
Per-model reliability (#137), render-quality tier selector, variant A/B comparison, further design
generations. Revisit when there's a gate-passing publishable video **and** a real routing/tier
decision to inform.
