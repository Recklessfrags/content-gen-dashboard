# HANDOFF — repo memory

> Per `AGENTS.md` rule 1: **the repo is the memory.** Not written here = didn't
> happen. This file is the running state of the project.

_Last updated: 2026-06-28 — Architect (Claude)._

## Provenance caveat (read first)

The foundation in this repo was **built directly by a Claude Code session acting
as a solo builder**, not through the Architect→Designer→Builder loop in
`AGENTS.md`. This violates the separation of powers (Claude is Architect-only;
Codex builds and commits) and was not surfaced as a disagreement before building
(rule 3 miss). It is recorded here so the loop can decide how to treat it.

Consequence for the gates: the same actor **built and verified** the foundation,
which trips "no one grades their own work" (rule 2). The verification below is
real (live-DB checks genuinely pass) but is **not independent**. Slice 1 exists to
get that independent ratification.

From this point the Claude session operates **Architect-only**: judgment and
artifacts (specs, gates, contracts, briefs), no app code, no app-code commits.
(Docs/markdown are committed by the Architect as a deliberate, human-approved
exception so they survive the ephemeral container.)

## What exists in the repo

- Next.js (App Router, TS) port of the `character-control-room` prototype:
  `src/app`, `src/components/ControlRoom.tsx`, `src/app/globals.css` (design tokens
  ported verbatim).
- Supabase auth via `@supabase/ssr`: `src/lib/supabase/{client,server,middleware}.ts`,
  root `middleware.ts` (route gating), `src/app/login` (email/password).
- Data layer: characters CRUD, ideas quick-capture + tag + status cycle, Runs
  reads `episodes`.
- `supabase/migrations/0001_init.sql` — schema + RLS (see data contract).
- Stack verified: **Next.js 15.5.19, React 19, @supabase/ssr 0.5.x, supabase-js 2.x.**

## What exists in the live DB (`reels-content` / `tyeejhaknqkeftjykqog`)

- Dashboard tables `characters`, `ideas` created with owner-scoped RLS.
- Pipeline tables `episodes`, `receipts` were **already present** (pipeline-owned);
  read-only policies added. **Not altered.**
- Seed: 2 characters (Mad Dog McGrath = active, Grandma Pearl = draft), 4 ideas,
  1 **demo** episode (`episode_id = demo-cottage-cheese`, safe to delete) + 1 receipt.
- Auth user `cameronnicodemus@gmail.com` (temp password `ControlRoom2026!` — change
  it). Login verified via GoTrue password grant.

## Verification performed (NOT independent — see caveat)

- `npm run build` clean; production server smoke test: unauth `/` → 307 `/login`,
  `/login` renders.
- Live RLS checks: authenticated user reads exactly 2 characters / 4 ideas / 1
  episode; **anon reads `[]`** on `characters` and `episodes`.

## Pending / not done

- **P-1 Vercel deploy.** Not executed. The Vercel MCP can read the account (team
  *Cam's projects*) but cannot deploy or set env vars; the CLI has no token. Human
  is importing the repo via the Vercel dashboard and setting the two
  `NEXT_PUBLIC_*` env vars (values in `README.md` / `.env.example`). Only branch
  with code is `claude/new-session-3l99vs` — set it as the Vercel Production Branch
  or merge to `main`.
- **P-2 Independent review** of gates 2,3,4,7 in a real browser (Slice 1).

## Open decisions (human)

- **D-1 Runs ↔ character linkage.** The pipeline's `episodes` has no `character_id`,
  so Runs currently shows **all** pipeline episodes, not per-character (deviates from
  build-brief acceptance #5). Honoring "per active character" requires adding a
  column to the pipeline's table — a cross-repo change owned by the pipeline, out of
  scope here. **Needs a human ruling**: accept global Runs, or open a pipeline-side
  change request.
- **D-2 Product framing.** The uploaded `DIRECTION.md` draft describes a broader
  "Reels Content Creation" kanban/pipeline product; what was built is the
  **Character Control Room** per `dashboardbuildbrief.md`. These are not the same
  product. `DIRECTION.md` is product ground truth and is the human's to author —
  it is intentionally **not** committed by the Architect. Reconcile before the next
  feature slice.
- **D-3 Auth model** — RESOLVED: "me now, scoped others later" (owner column from
  day one, owner-scoped RLS).

## Git state

- Branch `claude/new-session-3l99vs`. One app-code commit (the foundation) + this
  docs commit. `main` does not yet exist.
