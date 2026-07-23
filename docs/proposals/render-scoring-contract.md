# Proposal — render-scoring contract: schema + per-beat join key

_2026-07-14, rev 3.1 (suerta review folded rev 2; Gemini cross-vendor consumer-lens review
folded rev 3 — 2 structural blockers: reviews bind to a RENDER not an episode; the cut_id
stability ask corrected to within-generation; rev 3.1 2026-07-23 — the PS-arbitrated
`mastered.mp4` overwrite read semantic folded, wording only, per reels#88 `5060237883`). Dashboard architect. The #88 "first item to settle": dashboard #139 captures
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
- `cut_id = NULL` means a whole-render score. **Per-dimension level expectations (pinned):**
  `visual_relevance` is per-cut ONLY (a whole-render row could never join the per-cut
  machine scores); `rendering`/`editing` are whole-render ONLY; `script`/`vo_delivery`/
  `beat_pacing` may be either.
- Script-beat labels/timecodes are display-layer only (prose, unstable across regens) —
  used to label the UI, never as the key.

**Generation binding (rev 3 — replaces the rev-2 "stability across resume/repair"
precondition, which the cross-vendor consumer-lens review showed is physically impossible
for edit-altering repairs: an editing fix legitimately re-cuts the video).** The model is:
`cut_id`s are stable **within one assembly generation** (one EDL), and every review binds
to the exact generation the owner watched via a **NOT NULL top-level
`render_reviews.source_receipt_seq`** (§2) — so scores can never misattribute across
re-renders, and the pipeline owes no impossible cross-render stability. **Ratification
precondition (narrowed):** the pipeline confirms (a) `cut_id`s are stable and never reused
WITHIN a generation, and (b) `receipts.seq` uniquely identifies the generation whose EDL
produced the `mastered.mp4` the dashboard plays.

**Overwrite read semantic (rev 3.1 — binding, PS arbitration reels#88 `5060237883`;
pipeline confirmation `5060187458`):** `render-assets/<episode_id>/mastered.mp4` is ONE
storage object per episode, overwritten by a repair/re-render — the played file is always
the **max-seq** assembly generation, and earlier generations' MP4s are not retained. A
`render_reviews` row whose `source_receipt_seq` < the episode's current max therefore
refers to a **no-longer-playable artifact**: stale-generation scores stay valid as labels
(never deleted) but must never be presented as reviews of the currently-playable file.
The capture surface resolves the max-seq assembly receipt **at score-time** and binds it.

**One pipeline ask (additive, v2 enabler):** per-cut timing (`start_s`/`end_s`) readable by
the dashboard — EITHER as additive `per_cut[]` keys OR by pointing the dashboard at the
render manifest/EDL if timing already lives there (your call where it belongs; we just need
a documented read path) — so the player timeline can mark cut boundaries for tap-to-score.

## 2. The table: `render_reviews` (+ `render_review_scores`)

Dashboard-owned, owner-scoped, **append-only** — the exact `reveal_approvals` posture
(RLS on; SELECT + INSERT only, `owner default auth.uid()`; no UPDATE/DELETE — a re-review
is a new row; latest-wins by `decided_at`).

```sql
create table render_reviews (
  id                 bigint generated always as identity primary key,
  owner              uuid not null default auth.uid(),
  episode_id         text not null,
  source_receipt_seq bigint not null, -- THE render generation reviewed (rev 3: load-bearing,
                                      -- promoted from the snapshot; fix-routing + exemplar
                                      -- queries key on (episode_id, source_receipt_seq))
  verdict            text not null check (verdict in ('publish','almost','reject')),
  note               text,            -- whole-render free-text "why"
  qa_snapshot        jsonb,           -- machine scores + judge identity at review time (§3)
  decided_at         timestamptz not null default now()
);

create table render_review_scores (
  id          bigint generated always as identity primary key,
  review_id   bigint not null references render_reviews(id) on delete cascade,
  owner       uuid not null default auth.uid(),  -- denormalized: RLS must be expressible HERE
  cut_id      text,                -- NULL = whole-render score
  shot_ids    jsonb,               -- trace only; ARRAY — cut→shot cardinality unconfirmed (§5)
  dimension   text not null,      -- pipeline-owned vocabulary; soft-validated (below)
  score       int  not null check (score between 1 and 10),
  why         text                 -- the critique is the gold; free-text per low score
);
-- one score per cut×dimension per review; whole-render (NULL cut) dedupes too:
create unique index render_review_scores_natural_key
  on render_review_scores (review_id, coalesce(cut_id, ''), dimension);
```

**RLS (both tables, the full reveal_approvals posture spelled out):** enable RLS; exactly
SELECT + INSERT policies, both `owner = auth.uid()`; no UPDATE/DELETE. The `owner` column
is DENORMALIZED onto the scores table precisely so its policy is expressible without a
cross-table subquery (review folded: the child table previously had no stated access
control at all). `on delete cascade` is stated for honesty; deletes are impossible under
the policy.

Normalized scores (not a jsonb blob) because the primary consumer is a SQL join:
owner-score vs machine-score per `(episode_id, cut_id, dimension)` for calibration.
`dimension` is deliberately **text with a soft-validated vocabulary, NOT a CHECK** (house
style: enum-ish fields are text, forward-compatible — a new pipeline QA dimension must not
require a dashboard migration or be rejected as invalid data). The dashboard UI writes only
the six agreed values (`script`,`vo_delivery`,`beat_pacing`,`visual_relevance`,`editing`,
`rendering`); when the pipeline's machine-readable vocabulary contract ships, validation
derives from it. **Calibration methodology note:** owner scores are 1–10 ints; machine
relevance is a 0–1 float — consumers must bin before κ (proposed: machine deciles ↔ owner
score, or a 3-band agree/partial/disagree mapping); document the chosen transform with the
calibration code, not here.

## 3. The calibration pair

`render_reviews.qa_snapshot` freezes the machine's judgment AS SEEN AT REVIEW TIME,
**including the judge's identity** (review folded — a re-versioned judge makes mixed-
snapshot correlations meaningless, and a pointer into regenerating receipts cannot recover
it):
`{ judge: { model, provider, method, rubric_version? }, per_cut: [{cut_id,
relevance_score, relevance_method, below_floor}], on_topic_ratio }` — judge fields copied
INTO the snapshot from the source receipt (`receipts.model`/`provider` exist today;
`rubric_version` when the pipeline emits it). (rev 3: `source_receipt_seq` moved OUT of
the snapshot to a load-bearing top-level column — the review IS a review of that
generation.) **Scope honesty (review folded): the calibration pair exists today for
`visual_relevance` ONLY** — the machine emits no per-cut scores for the other five
dimensions; those are human-only labels until it does (the snapshot shape is
forward-compatible when it does).

**Note the standing hold:** current `relevance_method: "generated_assumed"` / the old
caption-scored ratios are NOT calibration-grade (the `…034826` false pass). Capture stores
whatever the machine said — the pipeline decides which snapshots are trustworthy when it
consumes them (filter by `relevance_method`). Capture ≠ endorsement.

## 4. Coupling posture (explicit): ZERO pipeline coupling at capture time

Unlike the reveal contract (which owns a `park_kind`, `jobs` write-back columns, and a
worker resume), render scoring is **post-hoc, asynchronous capture**: no gate, no park, no
`jobs` write, no worker behavior change, nothing the conductor waits on. The pipeline's
only obligations are the `cut_id` stability guarantee (§1) and, whenever convenient, the
timing read path + per-dimension machine scores. Everything else is dashboard-side.

## 4b. Flow + ownership

- **Dashboard writes** both tables (owner-scoped INSERT; the `?hub=review` surface —
  currently mock — captures per-cut scores while the shipped render player plays).
  Latest-wins reads order by `(decided_at, id)` — `id` tiebreaks same-timestamp resubmits.
- **Pipeline reads** (service role): calibration set, stage-directed fix routing
  (`shot_ids` → sourcing/script/VO/editing — applied only to the generation named by
  `source_receipt_seq`, never to a newer re-cut), exemplar corpus — conceptually
  "episodes whose LATEST review OF the LATEST generation has `verdict='publish'`".
- **Omission semantics (pinned, rev 3):** a cut×dimension with NO score row means "no
  critique" — the owner skipping a cut is implicit adequacy for routing purposes, not
  missing data. The UI never forces exhaustive scoring; low scores + why are the signal.
- **Migrations:** dashboard lane (`dash_0012_render_reviews`), expand/contract, applied
  only after this contract is ratified — NOT before (the mock→real flip stays HELD until
  the validated relevance judge exists; the schema can land ratified-but-unused so the
  capture UI has a target).
- MVP per the #139 brief: plain per-cut/per-dimension form + the player; timecoded
  tap-to-score is v2 (needs the `start_s`/`end_s` ask above).

## 5. Open points for the pipeline architect

1. Confirm the narrowed §1 precondition: within-generation `cut_id` stability + `seq`
   identifies the generation behind the played `mastered.mp4`.
2. Per-cut timing read path — the cross-vendor consumer-lens review PREDICTED you'd prefer
   additive `start_s`/`end_s` floats in `per_cut[]` (trivially mapped from the EDL at
   assembly); please confirm or name the manifest read instead. (Prediction, not your
   commitment — confirm explicitly.)
3. **Cut→shot cardinality** — same caveat: the consumer-lens review predicted composite
   cuts (b-roll over a-roll), which is why `shot_ids` is an array. Confirm.
4. Exemplar-corpus criteria beyond the §4b conceptual query (e.g. a minimum dimension
   floor)?
5. Dimension vocabulary confirmation (the six, verbatim, pipeline-owned; text +
   soft-validation dashboard-side, per §2).
6. Per-dimension machine scores beyond `visual_relevance` — timeline/appetite (§3 scope
   honesty).

## 6. Verification honesty

The live `per_cut[]`/`cut_id` shapes were verified by the dashboard architect via direct
SQL against the shared DB (2026-07-14, episode `acoustic-kitty-20260714-061326-f4143c`) —
the pipeline repo clone available to reviewers does not contain the assembly stage, so the
independent reviewer could not re-verify them and flagged that honestly. Pipeline
architect: please confirm the shapes match your writer at ratify time. Review trail:
suerta (independent, adversarial — 3 blockers + 6 shoulds, folded rev 2); Gemini
cross-vendor consumer-lens (seat restored — 2 structural blockers folded rev 3: render
binding + the corrected stability model). Where the cross-vendor reviewer ANSWERED open
points while roleplaying the consumer, those are marked as predictions in §5 — only the
real pipeline architect's #88 reply commits the pipeline.
