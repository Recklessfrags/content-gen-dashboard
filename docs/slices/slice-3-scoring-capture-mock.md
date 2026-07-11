# Slice #3 — scoring capture UI (led questionnaire) vs MOCK fixtures

_Author: Architect (Claude). Status: **BUILD (mock only, no real writes).** Problem-solver backlog
#3, green-lit un-paused against synthetic fixtures (reels#88 `4947103615`/`4948021348`); pre-gate
REAL renders stay excluded (owner ruling). Implements the owner-score half of
`docs/proposals/render-audition-scoring.md` as a drop-in shell — the REAL `render_reviews` write
path + MP4 playback + agreement view land only when a gate-passing MP4 exists (owner + live ratify
then). Merge nod from the problem-solver before prod._

## Why
Make the owner-scoring surface exist and be exercisable now, so it's drop-in the instant the first
gate-passing render lands — instead of still-a-spec. Against MOCK fixtures only; captures nowhere
real (local state), touches no known-bad renders.

## The design pin (problem-solver #139 `4930618397`) — non-negotiable
A **guided, LED questionnaire**: NOT a free-text box, NOT abstract sliders. The owner is asked
**one plain-language question at a time** with **structured tap input**; the flow **cannot complete
until every axis is answered** (no skip, no drift). Optional per-aspect free-text "why" — never the
primary capture. ≤2 min, thumb-driven.

## Axes → questions (8; each maps 1:1 to a rubric dimension)
Craft + hook (ordinal tap → 0/3/7/10, stored 0–10):
- `hook` — "Did the first 2 seconds grab you?"
- `visual_relevance` — "Did the visuals match what was being said?"
- `vo_delivery` — "Did the voice sound natural, or robotic?"
- `beat_pacing` — "Did it drag anywhere?"
- `script` — "Was the writing clear, and did it land?"
- `editing` — "Any rough cuts or awkward edits?"
- `rendering` — "Any visual glitches or render artifacts?"
Whole-video engagement (distinct axis, verdict tap):
- `engagement` — "Would you post this as-is?" → **ship | almost | reject**

Tap options for the ordinal axes carry endpoint-anchored labels, e.g. `Bad (0) · Weak (3) · Good
(7) · Great (10)` (the shared 0/3/7/10 anchors; final wording co-authored later — keep the values).

## Build (mock, read-only)
1. **`src/lib/renderReview.ts` (+ tests):**
   - `REVIEW_AXES`: ordered array of `{ key, dimension, question, kind: "ordinal" | "verdict" }`
     (7 ordinal + `engagement` verdict), in ask order (hook first).
   - `ORDINAL_OPTIONS` = `[{label:"Bad",value:0},{label:"Weak",value:3},{label:"Good",value:7},
     {label:"Great",value:10}]`; `VERDICT_OPTIONS` = `["ship","almost","reject"]`.
   - `type ReviewAnswer = { value: number | null; verdict: string | null; why?: string }` keyed by
     axis; helpers `firstUnansweredIndex(answers)`, `isReviewComplete(answers)` (every axis has a
     value/verdict), `summarizeReview(answers)` (per-dimension + verdict). Pure, fail-closed.
   - `MOCK_REVIEW_FIXTURES`: 2–3 synthetic eval episodes `{ id, title, channel, note }` — clearly
     labelled MOCK, no real `episode_id`, no MP4 (a placeholder "sample render" card).
2. **`src/components/aurora/ReviewHub.tsx`:** the surface (`?hub=review`):
   - Lists `MOCK_REVIEW_FIXTURES` with a clear **"MOCK — sample renders for building the review
     flow"** banner. A video placeholder (no real playback).
   - "Score this render" → the **led flow**: one question at a time, big tap targets, a progress
     indicator ("3 of 8"), Back/Next, an optional "why (optional)" text field per question; Next
     disabled until the current axis is answered; the flow can't finish until `isReviewComplete`.
   - On finish: a **read-only summary** (per-axis answers + verdict) and a disabled/mock "Save
     review" affordance labelled *"capture lands when a real render exists"* — **no DB write.**
3. **`src/lib/route.ts` (+ test):** add the `"review"` hub key (mirror `"runs"`/`"ideas"`).
4. **`ControlRoom.tsx`:** a `?hub=review` branch rendering `ReviewHub` (+ a "Review →" entry where
   the other hub links live); `reviewHubProps` = the mock fixtures. No supabase, no writes.
5. **aurora.css:** scoped `.review-hub` styles (question card, tap options, progress).

## Gates / review
`tsc` · full `vitest` (+ `renderReview` + `route` tests) · `next build`. Single cross-vendor
(Gemini) review (read-only, no writes). Commit + push to `claude/wire-aurora-home-5b-lleyyg`;
problem-solver merge nod before prod.

## Explicitly NOT in scope
Real `render_reviews`/`render_dimension_scores` writes + `dash_*` migration (need a gate-passing
MP4 + owner/live ratify), real MP4 playback, the machine-vs-owner agreement view (needs persisted
judge scores), final anchor wording (co-authored later), #1b, #4.
