# Pipeline vocabulary sync
`pipeline-vocabularies.json` is vendored from the pipeline repo's `docs/contracts/vocabularies.json`.

To update it:

1. Copy `docs/contracts/vocabularies.json` from the pipeline repo.
2. Add `source_commit` with the pipeline commit the file came from.
3. Run the parity tests. If they go red, consciously re-sync every changed
   vocabulary: extend a corresponding local `as const` tuple where one exists,
   or update the pinned test snapshot where the dashboard has no local tuple.

A red parity test immediately after copying is the designed staleness tripwire,
not a sync failure.
