# Render-review / scoring surface — research report (5 tracks)

_Author: Dashboard Architect (Claude). Date: **2026-07-09**. Commissioned by the problem-solver
(issue #139) as the gate before any spec/build of the render-review "learning loop" surface.
Method: deep-research harness — 6 search angles, 29 sources fetched, 134 claims extracted,
**25 adversarially verified (25 confirmed, 0 refuted)**, synthesized at judgment tier. Every
quantitative threshold below is cited with source + date; **weak / contested / domain-mismatched
evidence is flagged inline.** Routed through the review gate — the problem-solver reviews this
before it drives the spec._

> **The one caveat that governs everything below:** every agreement figure, threshold, and
> calibration technique in Track B/D comes from **TEXT/NLG** LLM-judge studies (2025–2026 arXiv
> preprints, several not peer-reviewed). **None is from a vision/video judge.** Transfer to a
> **Gemini vision model scoring 60–90s vertical video is UNPROVEN** and must be re-measured on our
> own renders before any auto-gate goes live. Treat the specific numbers as **starting hypotheses
> to re-derive**, not constants to adopt.

## Executive summary
The evidence supports building the surface as a **calibration-first learning loop**, with two
corrections to the plan:
1. **UX must be built in-house.** Mature review tools (Frame.io) validate the "tap-to-flag a beat"
   model, but **none is a fast mobile scoring surface** — the ≤2-min phone flow (verdict + 6
   dimension scores + beat-flags) has no external template to copy.
2. **Calibration is the hard, well-evidenced core.** LLM/vision judges are simultaneously **highly
   self-consistent AND severely biased**, and agreement with humans **collapses precisely on the
   subjective dimensions this system scores.** So the loop cannot assume the judge is trustworthy;
   it has to **prove it, per dimension, against the owner's own repeated scores**, using
   chance-corrected ordinal metrics — never raw accuracy.

Build order the evidence supports: **(1) calibration store + active review-sampler → (2) known-good
exemplar corpus → (3) per-stage prompt optimization.** Ship the same minimal anchored rubric to
both the owner and the machine (that is what makes the comparison valid).

---

## Track A — Video review / annotation UX

**Findings.**
- **Frame.io's proven model = timecoded single-frame comments as the default, with range (I/O)
  comments as a layer** (drag bracket handles, or keyboard `I`/`O` for in/out points). Vendor
  primary docs (Frame.io V4 Knowledge Center, current). This validates our **"tap-to-flag the wrong
  beats"** interaction: anchor feedback to a beat's timecode by default, allow a range for a
  problem that spans beats. _(Confidence: high, 3-0.)_ Source: help.frame.io/en/articles/9105251 (Frame.io V4 docs).
- **Filestage** corroborates: click the video for frame-accurate timestamped comments + staged
  approval states. _(Secondary/blog.)_
- **Gap (flagged):** the surviving UX evidence is **Frame.io-only**; Wipster/Vimeo/Ziflow produced
  no verified claims, and **none of the studied tools is a fast mobile scoring surface** — they're
  desktop review-and-approval tools. **The ≤2-min phone flow is an in-house design with no external
  validation.**

**→ DELIVERABLE — recommended v1 interaction model (single scroll-free mobile card):**
1. **Play** the render inline (autoplay muted→tap-to-unmute), a scrubber underneath with **beat
   boundaries marked from the pipeline's EDL**.
2. **Verdict** — three big thumb targets: **Ship / Almost / Reject** (+ a long-press ⭐ on Ship to
   flag a bar-setter for the exemplar corpus). One tap.
3. **Six dimension scores** — six rows, each a coarse tap target (recommend a **3-point** low/ok/good
   or a 0–10 slider; 3-point is faster and, per Track B, endpoint-anchored coarse scales calibrate
   nearly as well as fine ones). Six taps.
4. **Tap-to-flag bad beats** — tap a beat marker on the scrubber → it reddens → optional one-line
   "why". Only for beats the owner thinks are wrong (the machine already scored every beat).
   Target: **~2 minutes, ≤ ~12 taps total**, thumb-only.
5. **Defer to v2:** rich per-beat × per-dimension **human** grid, range/spanning comments, drawing
   annotations, version-compare. Build these only if v1 shows the owner wants finer control.

---

## Track B — LLM-as-judge reliability + calibration (the core)

**Findings (all high-confidence, but text-domain — see governing caveat).**
- **Reliability ≠ validity.** A judge can be near-perfectly self-consistent while badly biased:
  **Gemini 2.5 Flash** (same family as the planned QA judge) showed **test-retest 0.988 yet position
  bias 0.125**; judges are otherwise widely self-inconsistent (Qwen-3 gave the same verdict on all 3
  runs only **61.3%** of the time; MT-Bench self-reliability α 0.265–0.563). A stable-looking Gemini
  judge is **not** evidence it agrees with the owner. Sources: arXiv 2606.19544 (Jun 2026); arXiv
  2510.27106 (Oct 2025). _(3-0.)_
- **Agreement collapses on subjective dimensions** — exactly the ones we score. On subjective metrics
  (fluency-like) LLM-vs-human agreement "**drops or even turns negative**" even when objective-metric
  consistency reached α 0.726. So **script, VO, visual-relevance must be validated individually** —
  they're where judges fail. Source: arXiv 2510.27106. _(3-0.)_
- **Use chance-corrected, ordinal-appropriate metrics — never raw accuracy.** Raw exact-match
  **overstates chance-corrected agreement by 33.8–41.3 percentage points.** For the per-dimension
  ordinal 0–10 scores use **Krippendorff's ordinal α + Spearman's ρ**; for the categorical
  **Ship/Almost/Reject** verdict use **Cohen's κ**. Realistic subjective-task baseline (five judge
  models): **κ 0.34–0.44, ordinal α 0.49–0.60, Spearman 0.50–0.63 — all below the 0.67 "acceptable"
  bar.** That is the floor our video judge must beat, not a guarantee it will. Sources: arXiv
  2606.19544; arXiv 2501.08167 (Jan 2025). _(3-0.)_
- **Anchored rubrics are the single largest reliability lever, and endpoint-only anchors ≈ full
  rubric.** Removing rubric + reference collapsed human-alignment correlation ~0.666→0.487 (GPT-4o)
  and ~0.641→0.346 (LLaMA-3.1-70B); describing **only the 0 and 10 anchors** matched full per-level
  rubrics. This is why we can ship **one minimal anchored rubric to BOTH owner and judge.** Source:
  arXiv 2506.13639 (Jun 2025). _(3-0 on endpoint sufficiency; 2-1 on "dominant driver".)_

**→ DELIVERABLE — when to trust the judge, and the calibration method.**
- **Metrics:** ordinal Krippendorff's α + Spearman ρ per dimension; Cohen's κ for the verdict.
- **Auto-gate rule = a two-step human-likeness test, NOT a single κ cutoff** (arXiv 2510.09738,
  "Judge's Verdict", Oct 2025): **Step 1 —** correlation filter **Pearson r ≥ 0.80** (judge tracks
  the owner's ranking). **Step 2 —** a human-likeness band **|z| < 1**, where
  `z = (κ_judge − μ_human)/σ_human` and `μ_human/σ_human` come from **the owner's own test-retest
  self-agreement.** |z|<1 = "agrees with the owner about as well as a second human would." **This
  requires measuring the owner's own repeat-scoring reliability FIRST** to set the achievable
  ceiling — human-human agreement is itself only modest.
- **Do NOT import published human baselines** (0.801 κ, 0.478 α) — they're from **objective** grading
  tasks and are the wrong ceiling for subjective video. _(Verifier flagged the 0.801 as
  domain-mismatched, 2-1.)_
- **Calibration method:** one **endpoint-anchored (0 & 10) rubric per dimension** (Track C below) +
  **known-good reference renders as few-shot exemplars**, given identically to owner and judge.
- **Policy:** judge stays **ADVISORY by default**; it **auto-gates only per-dimension**, and only
  where it has **passed both steps on ≥ N owner-scored renders** (N is an open cross-team question —
  studies report metrics at N=70–2000 items but give no principled minimum for a 6-dimension video
  rubric). **Flagged unproven:** all of the above is text-domain; re-measure on our renders.

---

## Track C — Short-form quality rubric (are the six dimensions right?)

**Findings.**
- **Retention is won/lost in the hook window** — the most important single event. On TikTok,
  **85.2% of viewers exit within the first 25%** of a short video ("death valley"), consistent
  across **all 12** creatives tested; and in an organic data-donation study **~55% of views were
  skipped before completion** (only ~45% watched to end). Sources: Salminen et al., ACM CIKM/HT 2024
  (DOI 10.1145/3648188.3677048); arXiv 2301.04945 (CHI '24). _(3-0 on death-valley; 2-1 on the 45/55
  completion figure — "watched to end" inferred, TikTok-only.)_
  **Caveat:** the 85.2% figure is from **paid ads** (skip behavior inflates early churn) — directional
  for organic faceless content, not proven identical.
- **Only hook/pacing has surviving retention evidence.** **Four of the six dimensions — VO/delivery,
  visual relevance, editing, rendering — have NO surviving evidence tying them to retention.** Keep
  them, but treat them as **hypotheses to validate against our own channel-retention data**, not
  established predictors. _(Flagged: open gap.)_

**→ DELIVERABLE — dimensions + anchored rubric.**
- **Recommendation: keep the six, but promote HOOK to first-class.** The evidence says the opening
  is dominant, yet "hook" is currently folded into script/beat-pacing. Either **split "hook" as a 7th
  dimension** or make **first-beat hook strength the dominant weight** within beat/pacing. **This is a
  joint call with the pipeline architect** — the rubric MUST match the pipeline's QA rubric exactly or
  calibration is invalid (and I could not find a literal six-dimension rubric in the pipeline code —
  see Cross-team items).
- **Endpoint-anchored (0 vs 10) rubric, one paragraph per dimension, shipped to BOTH human and
  machine** (draft — to reconcile with the pipeline's actual rubric):
  - **Script** — _0:_ incoherent, no thesis, or factually unsupported claims. _10:_ one clear thesis,
    every claim sourced/allowed, a reveal that reframes the topic, tight and quotable.
  - **VO / delivery** — _0:_ flat/robotic, wrong emphasis, mispronunciations, dead energy. _10:_
    natural prosody, emphasis lands on the reveal, register matches the character, no artifacts.
  - **Beat / pacing (hook-weighted)** — _0:_ slow cold-open, no hook in the first beat, dead air,
    monotone rhythm. _10:_ hook lands in the first ~2s, momentum builds, no beat overstays, a clean
    button at the end.
  - **Visual relevance** — _0:_ visuals unrelated/contradict the narration (the known failure mode).
    _10:_ every beat's visual literally depicts what's said at that moment; the reveal is shown.
  - **Editing** — _0:_ jarring/absent cuts, misaligned captions, timing drift vs VO. _10:_ cuts on
    the beat, captions legible + synced, motion purposeful, transitions invisible.
  - **Rendering** — _0:_ artifacts, wrong aspect/letterboxing, low res, audio clipping. _10:_ clean
    1080×1920, correct framing, no artifacts, broadcast-clean audio.

---

## Track D — Feedback → improvement loop

**Findings.**
- **Active/uncertainty selection provably beats reviewing at random.** Uniform (random) sampling of
  what to review has a proven **Ω(1) sub-optimality** under a fixed budget; active selection (by
  judge uncertainty, and by large predicted quality gaps) matches/beats baselines using **~1/6 of the
  labels** (5k–10k vs 60k). Sources: arXiv 2402.10500 (Active Preference Optimization, v3); arXiv
  2603.09692 (ActiveUltraFeedback, ETH 2026). _(3-0; the 1/6 and delta results are single-lab 2026
  preprints — medium robustness.)_
- **A single upfront round of owner scoring can drive per-stage prompt improvement** — PLHF has the
  owner score samples once, trains an Evaluator to mimic those preferences, then uses that evaluator
  (not a fixed metric) to optimize each stage's prompt. The **calibrated Gemini judge IS that
  evaluator.** Source: arXiv 2505.07886 (PLHF, May 2025). _(Medium — single source, describes the
  architecture, not a benchmarked win.)_
- **Cheap calibrated judge-uncertainty** is available via a Brier-loss linear probe on the judge's
  hidden states (arXiv 2512.22245, Dec 2025) — but **the hosted Gemini API may not expose
  activations**, so an alternative confidence signal (sampled-agreement / logprob) may be needed.
  _(Medium — recent, unreplicated; access unconfirmed.)_

**→ DELIVERABLE — the loop mechanism + build order.**
- **(a) Calibrate the QA judge:** store each owner score **beside** the machine score per render ×
  dimension; run the Track-B two-step test; each divergence is a labeled example.
- **(b) Direct per-stage fixes:** per-dimension owner scores → the failing stage (script/VO/sourcing/
  editing) → PLHF-style prompt optimization once enough labels exist.
- **(c) Grow the exemplar corpus:** ⭐ Ship renders become few-shot seeds + reference anchors.
- **Active sampler:** queue for owner review the renders where **(i) the judge is most uncertain** or
  **(ii) machine-vs-prior-owner scores diverge most** — highest-value labels for both calibration and
  fixes.
- **Build order (evidence-backed): (1) calibration store + active sampler → (2) exemplar corpus →
  (3) per-stage prompt optimization.** Do NOT build (3) before there are enough trustworthy labels.

---

## Track E — Schema / provenance

**Findings.** **ZERO research claims survived on schema/provenance** — this must be designed from
first principles and co-designed with the pipeline architect. The one usable primary reference is the
**Langfuse Scores data model** (langfuse.com/docs): a **Score** = `{name, value, dataType
(NUMERIC/CATEGORICAL/BOOLEAN/TEXT), comment, source (human|LLM|api)}` linked to a trace/observation —
i.e. **the same object shape holds a human score and a machine score, distinguished by `source`**,
which is exactly the calibration-pair pattern we need. _(Flagged: Track E is otherwise unsourced.)_

**→ DELIVERABLE — proposed minimal schema (dashboard-owned; join key to confirm with pipeline).**
- **`render_reviews`** (one row per owner review): `episode_id`, `verdict` (ship|almost|reject),
  `is_bar_setter` (⭐), `reviewer`, `created_at`, `duration_ms` (how long the review took — a UX
  metric), `notes`.
- **`render_dimension_scores`** (the calibration pairs): `episode_id`, `dimension` (the six/seven),
  `source` (owner|machine), `score` (0–10 ordinal), optional `beat_ref`, `rationale`, `created_at`,
  `model_version` (for machine rows). Owner and machine rows sit side by side → agreement computed
  directly.
- **`render_beat_flags`** (owner beat-flags): `episode_id`, `beat_ref`, `why`, `created_at`.
- **Provenance:** every machine score + the render itself links to the **producing run's config /
  prompt / model version** via the pipeline's existing `receipts` (which already record stage · model
  · provider per run). "Good renders came from config X" must be attributable.
- **Per-beat join key = `(episode_id, beat_index)`.** In the pipeline today, beats carry a `label` +
  `claim_ids` (scriptwriter output) but **I did not confirm a stable per-beat integer id/index** —
  this is the single most important cross-team contract item (below).

---

## Open questions / weakest evidence
1. **Domain transfer is the biggest unknown.** Do the text-domain thresholds (r≥0.80, |z|<1,
   endpoint-anchor sufficiency, the κ/α ranges) hold for a **Gemini vision judge on 60–90s vertical
   video**? No surviving evidence addresses video. **Requires an in-house calibration study on our own
   renders before auto-gating.**
2. **Minimum N** of owner-scored renders per dimension before agreement metrics are meaningful — no
   principled rule exists for a 6-dimension per-beat video rubric. Cross-team decision.
3. **Gemini API activations** — does it expose hidden states for the Brier-loss confidence probe? If
   not, fall back to sampled-agreement/logprob confidence.
4. **Four unvalidated dimensions** (VO, visual relevance, editing, rendering) — are they predictive of
   retention, or partly redundant? Only hook/pacing has evidence; validate against our own channel data.
5. **Track E is unsourced** — the schema + join key are engineering judgment, to be co-designed.

## Cross-team items to confirm with the pipeline architect (reels#82)
1. **The exact QA-judge rubric.** What six (or seven) dimensions does the pipeline's Gemini QA judge
   actually score, and with what anchors? **The dashboard rubric must match it byte-for-byte or
   calibration is invalid.** I found no literal dimension list in the pipeline code — confirm it exists
   and share it. Reconcile the **hook** question (split vs weight).
2. **The per-beat join key** — a stable `(episode_id, beat_index)` (or beat id) emitted in the
   pipeline's EDL/receipts, so owner flags and machine scores attach to the same beats.
3. **Where the machine's per-beat × per-dimension scores are written** (a table/column the dashboard
   can read) so we can store them beside the owner's.
4. **Provenance fields** — the config/prompt/model-version identifiers on each run (via receipts) to
   attribute "good renders came from config X".
5. **The re-measurement plan** — agree that no auto-gate ships until an owner self-agreement study +
   an on-our-renders judge-vs-owner calibration is run, and agree the minimum N.

---
_Verification: 25/25 claims confirmed (0 refuted) via 3-vote adversarial checking. Sources (29
fetched; primary weighted): Frame.io V4 docs; arXiv 2606.19544, 2510.27106, 2501.08167, 2510.09738,
2506.13639 (judge reliability/calibration); ACM 10.1145/3648188.3677048, arXiv 2301.04945 (retention);
arXiv 2402.10500, 2603.09692, 2505.07886, 2512.22245 (feedback loop/active learning); Langfuse docs
(schema). Full source list + per-claim votes in the workflow journal._
