# Slice — enqueue carries `jobs.channel` (channel-profile routing)

_Author: Architect (Claude). Status: **FROZEN (v2)** — v1 Gemini review PASS (one
constraint folded: the canonical form **conditionally includes** `channel` — never
assign `undefined`; `stableStringify` throws on it and the legacy key-array must
stay byte-identical). v2 amendments from the consolidated post-build review round
(Gemini + suerta) are marked inline below and in §Residual._
Unblocked 2026-07-01/02: the pipeline's **`0018_jobs_channel` is APPLIED live**
(operator GO — HQ tracker + their ADR-005 page): `jobs.channel text NULL`, read
tolerantly by the worker (absent/null/unknown → the `default` profile). The
`jobs_enqueue` RLS WITH CHECK was **verified live** (2026-07-02, `pg_policies`): it
constrains only worker-owned lifecycle fields — `channel` is an unconstrained,
dashboard-settable INPUT field. Live `channel_profiles`: only the seeded `default`
row today; the select must therefore be driven by live profile rows, not hardcoded._

## What ships

When the operator enqueues an idea (or approves a parked job), the job can carry a
**channel** so the worker resolves that channel's profile (fact anchor, treatment,
engagement dials — now ADR-005-enforced) instead of always falling back to `default`.
The enqueue panel gains a **Channel profile** select sourced from live
`channel_profiles`; the queue view shows a job's channel. Approval re-enqueues
**preserve** the original job's channel.

Also rides along (repo health, found during setup): **`package-lock.json` sync** —
CI's `npm ci` has been failing since PR #33 (`fsevents` optional dep missing from
the lock); regenerated mechanically via `npm install`.

## Non-goals

- No `channel_profiles` schema/editor changes; no new profiles seeded.
- No migration (the column is pipeline-owned `0018`, already live). **Nothing in this
  slice creates or alters DB objects.**
- No free-text channel entry — the select offers exactly: "(default profile)" =
  send `null`, plus one option per live `channel_profiles` row **excluding the
  seeded `default` row** (amended v2, suerta finding + Architect ruling: offering
  `'default'` alongside the null option creates two hash-distinct representations of
  the same logical job — the partial unique index can't dedupe across them, so the
  same idea re-enqueued under the other form skips the 409 and double-spends. One
  representation only: `null`.) (Sending an unknown string is harmless worker-side
  but useless and confusing; don't allow it.)
- No change to park-kind logic, publish flow, or idempotency semantics for existing
  jobs (see the hash-stability rule below).

## Changes

### `src/lib/jobs.ts`
- `JobEnqueueInput` gains `channel?: string | null`.
- `buildJobInsert` includes `channel: input.channel ?? null`.
- **Idempotency-hash stability rule (critical):** `idempotencyKeyFor` canonicalizes
  the input — `channel` must be **omitted from the canonical form when
  null/undefined** so every pre-slice logical job keeps its exact existing hash
  (otherwise previously-enqueued jobs would stop matching their idempotency keys and
  could be silently re-enqueued as "new"). A non-null channel participates in the
  hash (same food on two channels = two distinct logical jobs — correct). Unit-test
  both directions: legacy input → byte-identical key vs the pre-slice
  implementation; channel set → different key.
- `jobInputFromRow` (moved to `src/lib/jobs.ts`, v2 — both reviewers converged: a
  pure builder doesn't belong exported from a component) carries
  `channel: job.channel ?? null` so spend/publish approval re-enqueues and re-runs
  keep the original routing.

### `src/lib/database.types.ts`
- `jobs` Row/Insert/Update gain `channel: string | null` (hand-add matching what
  `generate_typescript_types` emits; Architect verifies against a live regen before
  commit).

### UI — `src/components/controlroom/EnqueueIdeaPanel.tsx` (+ `ControlRoom.tsx` wiring)
- New **"CHANNEL PROFILE"** select (existing `.field`/eyebrow conventions, same
  visual weight as the other enqueue fields):
  - Options: `(default profile)` → sends `null`, then one option per live profile
    (`display_name` shown, `channel` codename sent), name-ordered.
  - **Default selection:** the idea's `channel` matched case-insensitively against
    profile `channel` OR `display_name`; no match → "(default profile)". (Today only
    `default` exists, so everything preselects default — correct.)
  - Profiles come from the already-loaded `useChannelProfiles` state in `ControlRoom`
    passed down as a prop — **no new fetch**.
  - Disabled with the rest of the form while submitting; keyboard/label/focus per
    the existing fields.
- **Queue view:** render a small channel chip on job cards when `job.channel` is
  non-null (omit entirely when null — no "default" noise on every existing row).

### Docs (Architect)
- `docs/contracts/data-contract.md`: add `channel` to the dashboard-settable INPUT
  fields table (mirror of pipeline `0018`), with the tolerant-resolution note.
- HANDOFF ruling + SESSION-HANDOFF/roadmap touch.

## Acceptance criteria (gates)

| # | Gate | How verified |
| --- | --- | --- |
| C-1 | `buildJobInsert` payload carries `channel` (null and set); all worker-owned fields still omitted. | Unit tests. |
| C-2 | **Idempotency keys are byte-stable for channel-less inputs** vs the pre-slice implementation; a set channel changes the key. | Unit test pinning a known pre-slice hash value. |
| C-3 | Approval re-enqueue (`jobInputFromRow` → spend/publish builders) preserves `channel`. | Unit test + code review. |
| C-4 | Enqueue panel: select renders the null-default option + live **non-default** profiles (v2 ruling); idea-channel preselection rule (never resolves to `'default'`); submitting sends the codename (or null). | Ratify walk (UI state + outgoing request body via the bridge — **no submit against the live queue**; intercept and assert the payload, then abort the request). |
| C-5 | Queue chip shows only for non-null channels. | Ratify walk (existing rows are null → zero new chips). |
| C-6 | `tsc --noEmit`, `npm test`, `npm run build` clean; **`npm ci` from a clean state succeeds** (the lockfile fix). | Local + CI on the PR. |
| C-7 | 412px no overflow with the enqueue panel open; select keyboard-operable. | Ratify mobile. |

**Residual UPGRADED to a proven gate (v2, suerta finding 3):** the PostgREST-accepts-
`channel` hop IS provable with zero queue impact — a probe INSERT carrying
`channel` plus a **deliberately rejected** field (`episode_cap: 0` fails the RLS
WITH CHECK) cannot persist a leasable row, and the response discriminates cleanly:
`PGRST204` ("could not find the 'channel' column") = schema-cache failure vs
`42501` = column accepted, row rejected by policy. Gate **C-8**: run the probe,
expect 42501, expect no `PGRST204`, and verify the queue row-count is unchanged.

Other v2 amendments (consolidated review round, rulings logged in HANDOFF):
`jobInputFromRow` moves to `src/lib/jobs.ts` (both reviewers converged: a pure
builder doesn't belong exported from a component); the panel's selection re-sync
`useEffect` is removed (the panel provably remounts per open — initializer
suffices; kills the PR-#27 clobber shape); chip gating is `!= null`; the
`database.types.ts` hand-add gains the live `jobs.fact_approved` column (pipeline-
side drift discovered during live verification — queried on HQ) with `channel` in
the generator's alphabetical position. DECLINED (with rationale): null-guarding
`idea.channel` in the preselect helper — the column is `NOT NULL default 'Food'`
and typed `string`; the guarded state is unreachable.
