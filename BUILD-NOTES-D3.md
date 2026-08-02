# D3 integration build notes

## What was wrong

- `ChannelProfilesPanel` passed `creating` and `selectedProfile` to `resolvePipelineMerge`, but the helper had regressed to create-only duplicate detection and no longer declared or handled those edit-path inputs.
- The edit save path built pipeline JSON from the client snapshot and went directly to `upsert`, bypassing the landed `merge_channel_profile_patch` RPC. That reintroduced the stale-snapshot overwrite risk and broke the RPC failure/empty-result guards.

## What changed

- Restored create-versus-edit semantics in `resolvePipelineMerge`. Create checks for duplicate channel names and starts with empty pipeline JSON; edit requires a selected profile. The optional `creating` default preserves the helper's existing create-oriented callers/tests.
- On edit, build a normalized patch containing only changed pipeline keys and send it through `merge_channel_profile_patch` before the ordinary profile upsert.
- Abort the save and surface the backend message when the RPC fails; abort with a stale-row message when it returns no row.
- Keep `sourcing` and `research_profile` out of the edit upsert. Create still inserts the full create-time payload, including edited pipeline fields.

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 28 files and 324 tests passed.
- Work remains uncommitted.

Voice archetype suggestions now use the JSON-derived readonly string list without a literal cast.
Research-anchor vocabulary parity has a documented exact-set tripwire for future pipeline additions.
FACT_ANCHOR and TREATMENT have no matching JSON vocabulary keys, so no unrelated parity tests were added.
Edit merge resolution now returns the selected profile's actual stored pipeline JSON, covered by a focused test.
Verification: `npx tsc --noEmit` clean; `npx vitest run` green (28 files, 325 tests); work uncommitted.

## Two-lens review dispositions

- Fixed the tautological vocabulary checks: escalation tiers, archival providers,
  anchor types, and voice archetypes now have local `as const` tuples as their
  TypeScript source, with exact set-and-length parity checks against the vendored
  runtime JSON. Neither library retains an `as unknown as` cast.
- Added `source_commit: 4610e9b`, a commit-format test, and the explicit copy →
  stamp → parity-tripwire procedure to `src/lib/SYNC.md`.
- Made merge resolution a `creating`-discriminated union. Edit success has no
  `stored` field, so forwarding a stale stored snapshot is type-illegal.
- Built and validated the ordinary upsert payload before the edit merge RPC.
- Added an edit identity guard that rejects a form/selected-channel mismatch
  before RPC or upsert, with both helper and panel coverage.
- Added create-path assertions that `sourcing` and `research_profile` are absent
  when the operator has not edited those fields.
- Final verification: `npx tsc --noEmit` clean; `npx vitest run` green (28 files,
  328 tests). Work remains uncommitted.
