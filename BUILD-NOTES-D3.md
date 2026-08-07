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

## Google OAuth + beta allowlist

### Build notes

- Added the Supabase PKCE callback with same-origin relative `next` validation and
  friendly failure routing.
- Added Google sign-in using the forwarded request origin, preserving the existing
  email/password form.
- Added a case-insensitive email allowlist after authenticated user validation. A
  blank or unset `DASHBOARD_ALLOWED_EMAILS` deliberately fails open so configuration
  order cannot lock out the operator; closed project signup remains the primary gate.
- Added focused coverage for parsing, callback redirects, and middleware enforcement.

### Mutation plan

- Route mutation: exchange the callback code, reject absent/failed exchanges, and
  constrain the post-auth destination to this origin.
- Login mutation: begin Google OAuth from a server action using Vercel-aware forwarded
  host/protocol headers and send provider/setup failures back as `error=auth`.
- Session mutation: after `getUser`, sign out authenticated users excluded by an
  enabled allowlist and redirect them to `error=not_invited`; preserve pass-through for
  listed users and for a disabled allowlist.
- No database, RLS, migration, edge-function, dependency, or signout-route mutation.

### Verification status

- `git diff --check` is clean.
- The required TypeScript and Vitest commands were attempted, but this workspace had
  no installed dependencies. The locked install could not be restored in the network-
  restricted sandbox because required npm tarballs were absent from its cache. No test
  pass is asserted from that incomplete environment: Vitest ran 0 test files / 0 tests.

### OAuth allowlist hardening (supersedes the fail-open notes above)

- The beta allowlist now fails closed: an unset or blank
  `DASHBOARD_ALLOWED_EMAILS` admits only the operator floor. The floor comes from
  `DASHBOARD_OPERATOR_EMAIL` and falls back to
  `cameronnicodemus@gmail.com` so an incomplete deploy cannot lock out the operator.
- Authenticated users must have a confirmed email. Allowlist entries are trimmed and
  compared case-insensitively, while user emails are deliberately not trimmed so a
  padded identity cannot inherit access.
- Google OAuth prefers `NEXT_PUBLIC_SITE_URL` for its callback origin and only uses
  forwarded request headers when that variable is unset. Supabase's Redirect URL
  allowlist remains the authoritative callback restriction.

### Operator configuration

- In Vercel, set `DASHBOARD_OPERATOR_EMAIL` to the operator's Google email, set
  `DASHBOARD_ALLOWED_EMAILS` to a comma-separated list of any additional invited beta
  users (blank means operator-only), and set `NEXT_PUBLIC_SITE_URL` to the production
  dashboard origin, for example `https://dashboard.example.com`.
- In Supabase Auth, enable/configure the Google provider and add the exact production
  callback URL (`<NEXT_PUBLIC_SITE_URL>/auth/callback`) to Redirect URLs. Keep the
  deployed Vercel URL and Supabase entry in sync.

### Hardened verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 31 files and 356 tests passed, including all 6 callback
  next-path sanitization tests.
- `git diff --check` — clean.

## Dashboard Slice A — render progress + plain language

### Build notes

- Added the fixed nine-step receipt-stage ladder and a deterministic progress helper. Setup stages show `Starting…`; unknown stages show `Working…`; no percentage or ETA is exposed.
- Added one batched receipt query per mounted run surface. It reduces by maximum `seq`, skips `entertainment_judge`, avoids empty-id queries, and falls back to an empty map on read errors.
- Added an accessible, theme-token progress bar to queued/running cards and the landing-page System Glance. Terminal runs do not render it, and reduced-motion users get no shimmer animation.
- Centralized operator-facing jargon labels and applied them to Runs, Action Center, Reveal, Cost, stage labels, and waiting explanations. Technical stop text remains available behind a closed details disclosure.
- Added focused ladder, hook, plain-language, and RunsHub render coverage.

### Mutation plan

- Read-only data path: select `episode_id,seq,stage` from `receipts` for the current in-flight episode IDs; do not write or change schema/RLS.
- Presentation path: derive the latest honest ladder step per episode and render it only while the job status is `queued` or `running`.
- Copy path: translate display labels only; preserve database fields, payloads, generated types, and pipeline vocabulary unchanged.
- Scope guard: no auth/OAuth, signout, migration, edge-function, dependency, or pipeline changes.

### Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 35 files and 390 tests passed.
- `git diff --check` — clean.
- Work remains uncommitted for independent review.

### Reviewed-finding fixes

- Progress now uses the furthest known step in the nine-stage ladder across every
  receipt for an episode, independent of receipt sequence. Unknown/setup stages and
  `entertainment_judge` are ignored, so retries or interleaved stages cannot move the
  bar backward; step zero consistently reads `Starting…`.
- In-flight receipt progress refreshes every 5 seconds by default (overridable for
  tests), avoids overlapping refreshes, preserves stale-request protection, and
  clears its interval when IDs empty or the consumer unmounts.
- Receipt reads are chunked into batches of at most 100 episode IDs and merged before
  reduction.
- `final_stage` now displays as `Stopped at`; reason fields (`terminal_state` and
  `failure_class`) remain `Why it stopped`.
- Added regression coverage for researcher → assembly → voice direction resolving to
  `Step 8 of 9 · Assembling the video`, live refresh, query chunking, interval cleanup,
  and the corrected stop-stage wording.

### Reviewed-finding verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 35 files and 397 tests passed.
- Work remains uncommitted for independent review.
