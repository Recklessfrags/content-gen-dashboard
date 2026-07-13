# Multi-user design — a select-few operators, owner pays

_Author: Architect (Claude). Status: **DESIGN / awaiting owner sign-off + one open decision.** Not a
build spec yet. Owner intent (2026-07-13 chat): a **select few** users; the **owner pays all spend**;
the others **create + test** (build channels/characters, enqueue, test); **each user's channels +
characters are private** to them (owner ruling: "channels private"). "Separate charges soon."_

## 0. Current state (verified live 2026-07-13)

Ownership is **already half-built** — the "me now, scoped others later" RLS (D-3) holds for the core
tables:

| Table | Per-user isolated today? | Mechanism |
| --- | --- | --- |
| `characters`, `ideas`, `character_bible_revisions` | ✅ yes | RLS `owner = auth.uid()` |
| `casting_usage` | ✅ yes | `user_id = auth.uid()` (the ElevenLabs daily cap is already per-user) |
| `channel_profiles` | ❌ **shared** | RLS `true` for all authenticated; **no `owner` column** |
| `jobs` (spend lives here) | ❌ **no owner** | `jobs_read = true` (all see all runs); spend not attributable per user |

So the gaps are exactly two: **channels** and **spend attribution**. Auth is the third prerequisite
(there are no other users yet).

## 1. The three pieces

### Piece A — Auth: Google login + email allowlist (PREREQUISITE, dashboard-owned)
Today: email/password, **public signup off** ("closed, trusted operator set"), no `/auth/callback`.
Build: a "Sign in with Google" button → `supabase.auth.signInWithOAuth({ provider: "google" })` + a new
`/auth/callback` route + an **email allowlist** so only sanctioned accounts get a session. **Mandatory
allowlist** — Supabase Google OAuth admits *any* Google account by default, and this app controls
spend/publishing; without an allowlist we'd convert a closed system into open signup.
- **Owner action required (config, not code):** enable the Google provider in the Supabase dashboard
  with a Google Cloud OAuth client id/secret + redirect URL. I can't flip that switch.
- Allowlist mechanism: a small `allowed_operators` table (or a Supabase auth hook / env allowlist) —
  the design doc's build spec picks one; a table read at sign-in is simplest and auditable.

### Piece B — Channel ownership (channels private — DECIDED) (dashboard-owned migration)
Bring `channel_profiles` to parity with `characters`:
- Add **`owner uuid`** (`default auth.uid()` → `auth.users(id)`).
- **Backfill** existing rows to the current owner's uuid (single-operator today, so all → owner).
- Owner-scoped **RLS** (SELECT/INSERT/UPDATE/DELETE `owner = auth.uid()`), replacing the current
  `true` policies. Dashboard-lane migration (`dash_NNNN_*`, expand/contract: add col + backfill +
  NOT VALID → VALIDATE, then swap RLS).
- **CROSS-TEAM — must coordinate before applying:**
  1. The **pipeline reads `channel_profiles`** (guidelines/sourcing) via the **service role**, which
     **bypasses RLS** — so owner-scoping the RLS should NOT break pipeline reads. **Verify, don't
     assume** (confirm the worker uses service role, not the anon key, for channel reads).
  2. The pipeline's **Channel-DNA object (§3 of the content-spine spec) also extends
     `channel_profiles`** — so this ownership migration and their DNA-field migration touch the same
     table. **Sequence with @pipeline on HQ** to avoid a migration collision (agree order + that DNA
     fields are additive alongside the new `owner` col).

### Piece C — Spend attribution + control (CROSS-TEAM — jobs is pipeline-owned)
`jobs` has no `owner`, so spend can't be attributed. To separate charges:
- Add **`owner uuid` to `jobs`**, stamped at **enqueue** (the dashboard is the enqueue surface;
  `jobs_enqueue` RLS would allow the owner field) and **preserved by the worker** through the
  lifecycle. `jobs` is **pipeline-owned** → this is the pipeline's migration + a cross-team contract
  (like the reveal-approval contract). Once stamped, per-user cost rollups + per-user caps are
  straightforward dashboard reads over `jobs.spend GROUP BY owner`.
- **Owner's model maps cleanly:** other users get private channels/characters + can enqueue; the
  **owner controls the money.** Which brings the one open decision:

## 2. OPEN DECISION — spend-control model (owner's call)
When another user enqueues a run, how is spend gated?
- **(A) Owner approves every run's spend** — nothing renders until the owner taps approve. Reuses the
  existing `ready_for_review` **spend-approval** gate (mostly already built). Max control; owner in the
  loop on every video. **Architect recommendation** — safest while learning how these users behave,
  cheapest to build, loosens later.
- **(B) Per-user budget cap** — each user may spend up to $X (per day/month) unassisted; only over-cap
  runs need the owner. Less friction; requires a per-user budget table + cap enforcement at enqueue/
  approve. More to build; needs the cap-tracking `jobs.owner` sum.

This decision changes Piece C's build surface (approval-gate reuse vs cap machinery). **The rest of the
design is decision-independent** — Auth and Channel ownership don't depend on it.

## 3. Sequencing (proposed)
1. **Piece A — Google login + allowlist** first (nothing else matters without other users able to sign
   in). Dashboard build + the owner's Supabase/Google config step.
2. **Piece B — channel ownership** (channels-private, decided) — dashboard migration, **after
   coordinating the `channel_profiles` change with @pipeline's DNA extension.**
3. **Piece C — spend attribution** — cross-team (`jobs.owner`), gated on the spend-model decision +
   a pipeline contract (`jobs.owner` stamped at enqueue, preserved by the worker) like the
   reveal-approval contract.

Each piece is its own slice through the normal loop. **Piece B (RLS on a shared surface) and Piece C
(money-path) are higher-stakes → two-lens review + owner GO to merge.** Piece A (auth) is
security-sensitive → careful review even though it's dashboard-only.

## 4. What needs the owner
1. **The spend-model decision (§2)** — A or B.
2. **Sign-off on this design** as a whole before any building.
3. **The Google OAuth config** in Supabase (Piece A) — a ~10-minute setup only the owner can do.

## 5. Explicitly NOT in this design
Roles/permissions beyond owner-vs-other (e.g. read-only viewers, admin tiers) — premature; revisit if
the "select few" grows. Team billing/invoicing. Anything touching the pipeline's tables beyond the
agreed `jobs.owner` contract.
