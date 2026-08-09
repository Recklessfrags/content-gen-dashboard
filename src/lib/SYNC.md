# Pipeline vocabulary sync
`pipeline-vocabularies.json` is vendored from the pipeline repo's `docs/contracts/vocabularies.json`.

To update it:

1. Copy `docs/contracts/vocabularies.json` from the pipeline repo.
2. Add `source_commit` with the pipeline commit the file came from.
3. Run the parity tests. If they go red, consciously re-sync every changed
   vocabulary: extend the corresponding local tuple or consumption map where one
   exists, then update the pinned test snapshot.

A red parity test immediately after copying is the designed staleness tripwire,
not a sync failure.

## 🔴 What the tripwire does NOT catch — read this before trusting a green suite

The parity test compares the **vendored file** against a **pinned snapshot**, and
both live in this repo. Nothing in this repo can see the pipeline. So the guard
fires on *"someone edited the vendored copy"* and is **structurally blind to
*"the pipeline moved and nobody re-copied"*** — which is the drift that actually
happens.

Measured instance (2026-08-04): the pipeline renamed `craft_rhythm_band_sec` →
`craft_rhythm_band_ratio` (pipeline register P41 — the units were wrong, it was
seconds where a ratio was meant). The dashboard kept shipping the old name and
**every test stayed green**, because the vendored copy and the snapshot agreed
with each other while both disagreed with reality. It was found only by a manual
cross-repo comparison, not by the suite.

**Therefore:** step 1 is not optional and cannot be replaced by "the tests are
green." Re-copy from the pipeline whenever the pipeline merges anything touching
`SOURCING_KEYS` or the vocabularies, and treat a green suite as evidence about
this repo's internal consistency only.
