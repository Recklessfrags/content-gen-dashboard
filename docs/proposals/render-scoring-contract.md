# Proposal — render-scoring contract: schema + per-beat join key

_2026-07-14. Dashboard architect. The #88 "first item to settle": dashboard #139 captures
the owner's render scores; the pipeline consumes them (QA-judge calibration, stage-directed
fixes, exemplar corpus). This is the PROPOSED contract for the pipeline architect to
counter/agree on HQ; problem-solver arbitrates; **owner ratifies before anything is built**.
Grounded in the LIVE receipt shapes (verified 2026-07-14 against
`acoustic-kitty-20260714-061326-f4143c`), not the docs._

## 1. The join key: `(episode_id, cut_id)`

- **`episode_id`** — already the universal correlation key (jobs/episodes/receipts/storage).
- **`cut_id`** — the assembly EDL unit. Verified live: assembly receipts carry
  `visual_relevance.per_cut[]` with stable `cut_id` ("cut1"…) + `shot_id` ("shot_hook"),
  `beat_type`, `relevance_score`, `below_floor` — i.e. **the machine's per-cut judgment
  already keys off `cut_id`**, so pairing the owner's score to the QA judge's score is a
  join on the same key, no translation layer.
- `shot_id` is recorded alongside as the semantic trace to the shot list (stage-directed
  fixes: sourcing/script route by shot), but is NOT part of the key.
- `cut_id = NULL` means a whole-render score (dimensions like rendering/editing often
  judge the whole piece).
- Script-beat labels/timecodes are display-layer only (prose, unstable across regens) —
  used to label the UI, never as the key.

**One pipeline ask (additive):** the assembly receipt's `per_cut[]` entries gain
`start_s`/`end_s` (or `duration_s`) so the dashboard can mark cut boundaries on the video
player timeline and tap-to-score a cut during playback. Today the per-cut entries carry no
timing. Shape-compatible additive keys, same class as `search_query`/`query_variant`.

## 2. The table: `render_reviews` (+ `render_review_scores`)

Dashboard-owned, owner-scoped, **append-only** — the exact `reveal_approvals` posture
(RLS on; SELECT + INSERT only, `owner default auth.uid()`; no UPDATE/DELETE — a re-review
is a new row; latest-wins by `decided_at`).

```sql
create table render_reviews (
  id          bigint generated always as identity primary key,
  owner       uuid not null default auth.uid(),
  episode_id  text not null,
  verdict     text not null check (verdict in ('publish','almost','reject')),
  note        text,                -- whole-render free-text "why"
  qa_snapshot jsonb,               -- machine scores at review time (see §3)
  decided_at  timestamptz not null default now()
);

create table render_review_scores (
  id          bigint generated always as identity primary key,
  review_id   bigint not null references render_reviews(id),
  cut_id      text,                -- NULL = whole-render score
  shot_id     text,                -- trace only
  dimension   text not null check (dimension in
                ('script','vo_delivery','beat_pacing','visual_relevance','editing','rendering')),
  score       int  not null check (score between 1 and 10),
  why         text                 -- the critique is the gold; free-text per low score
);
```

Normalized scores (not a jsonb blob) because the primary consumer is a SQL join:
owner-score vs machine-score per `(episode_id, cut_id, dimension)` for calibration
(correlation/κ). The six dimensions are the pipeline's QA dimensions verbatim — vocabulary
owned by the pipeline; when the machine-readable vocabulary contract ships, the CHECK
derives from it (rule-40 default-deny note: an unknown dimension is REJECTED by the CHECK,
not silently accepted).

## 3. The calibration pair

`render_reviews.qa_snapshot` freezes the machine's judgment AS SEEN AT REVIEW TIME:
`{ per_cut: [{cut_id, relevance_score, relevance_method, below_floor}], on_topic_ratio,
source_receipt_seq }` — copied from the max-seq assembly/QA receipt when the owner submits.
Rationale: receipts can grow/regenerate; the calibration pair must be immutable alongside
the human label (this is the labeled-example dataset). `source_receipt_seq` keeps the
provenance pointer back to the live receipt.

**Note the standing hold:** current `relevance_method: "generated_assumed"` / the old
caption-scored ratios are NOT calibration-grade (the `…034826` false pass). Capture stores
whatever the machine said — the pipeline decides which snapshots are trustworthy when it
consumes them (filter by `relevance_method`). Capture ≠ endorsement.

## 4. Flow + ownership

- **Dashboard writes** both tables (owner-scoped INSERT; the `?hub=review` surface —
  currently mock — captures per-cut scores while the shipped render player plays).
- **Pipeline reads** (service role): calibration set, stage-directed fix routing
  (`shot_id` → sourcing/script/VO/editing), exemplar corpus (`verdict='publish'` episodes).
- **Migrations:** dashboard lane (`dash_0012_render_reviews`), expand/contract, applied
  only after this contract is ratified — NOT before (the mock→real flip stays HELD until
  the validated relevance judge exists; the schema can land ratified-but-unused so the
  capture UI has a target).
- MVP per the #139 brief: plain per-cut/per-dimension form + the player; timecoded
  tap-to-score is v2 (needs the `start_s`/`end_s` ask above).

## 5. Open points for the pipeline architect

1. `cut_id` stability guarantee within an episode (assumed: EDL order, never reused).
2. The `start_s`/`end_s` additive receipt keys (v2 enabler — agree shape now, ship whenever).
3. Whether the exemplar-corpus consumer wants anything beyond `verdict='publish'` +
   `episode_id` (e.g. a minimum dimension floor).
4. Dimension vocabulary confirmation (the six above, verbatim, pipeline-owned).
