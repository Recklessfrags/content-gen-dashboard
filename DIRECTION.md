# DIRECTION — what this product is

> **Product-direction source of record** for the dashboard repo. Per `AGENTS.md`
> §Notion→repo sync, Builders and the Designer read **this repo copy**, not Notion.
> Authored by the Architect capturing the **human ruling D-2**.
> **Last decided: 2026-06-28.**

## The product

The dashboard is a **focused control tool** — the **Character Control Room**. It is
**not** an analytics product and **not** a production/kanban board.

- **The dashboard owns inputs:** characters + their bibles (with version history),
  and ideas (The Wire).
- **The dashboard surfaces outputs:** Runs (pipeline episodes) **read-only**, plus a
  **read-only Overview**.
- **The pipeline owns the middle:** research → script → assembly. The dashboard
  never runs pipeline logic and never writes pipeline-owned tables.

## Division of labor

| Concern | Owner |
| --- | --- |
| Characters, bibles, bible version history, ideas | **dashboard** (this repo) |
| research → script → assembly (production) | **the content pipeline** |
| Runs / episodes / receipts (output) | pipeline **writes**; dashboard **reads** (read-only) |
| `jobs` work queue | pipeline **owns lifecycle**; dashboard **enqueues** (input fields only) + reads |

This is the ratified split from D-2 (focused tool) and the data contract
(`docs/contracts/data-contract.md`): dashboard-owned `characters`/`ideas`/
`character_bible_revisions`; pipeline-owned `episodes`/`receipts` read-only; pipeline-owned
`jobs` **read + enqueue-only** (the dashboard is the enqueue/approval surface, but the
worker owns every lifecycle transition — see the `jobs` section of the data contract).

## Out of scope (and why) — deferred, not killed

- **External / SEO / social analytics** — would turn a focused cockpit into an
  analytics product; needs an integration that isn't built. Out for now.
- **Publishing / distribution** — the far end of the pipeline, gated behind
  approval; not the dashboard's job.
- **Multi-user teams** — premature for a solo operator. Owner-scoped RLS already
  supports "me now, scoped others later" (D-3), so no rework is owed when this comes.
- **Idea → pipeline linkage ("queue an idea as a run")** — **NOW SHIPPED (2026-06-29),
  the way the old "soft no" said it should be: with the pipeline owner's agreement and a
  sanctioned write path.** The earlier fear was that this meant the dashboard writing
  pipeline-owned tables. It is resolved cleanly: the dashboard enqueues into the
  pipeline-owned **`jobs`** table via the pipeline's own **enqueue-only RLS policy**
  (`jobs_enqueue`, input fields only — never a lifecycle column), and the worker picks
  the job up. No `episodes` write by the dashboard; the cross-repo contract was agreed on
  the HQ. Per-character linkage on output (`episodes.character_id`, D-1 / Acoustic Kitty)
  is still pending pipeline-side and remains the trigger for per-character cost (Tier 2).

## Current scope = "done" for the dashboard

Characters + bibles (with immutable version history / preview / restore), ideas
(The Wire), Runs (read-only with run/receipt drill-down), a read-only Overview, and a
read-only **Cost Box** (spend governance). Since the original ratification the focused
tool has grown two sanctioned additions, both agreed cross-repo on the HQ:

- **Jobs (enqueue + run-queue + approvals)** — idea→`jobs` enqueue, the run-queue view,
  and the `ready_for_review` **spend** / **publish** approval surface. Publish is
  double-gated (nothing posts without a wired Buffer adapter), so it is safe to ship
  ahead of real publishing.
- **Casting Studio** — ElevenLabs voice casting (design → preview → create → audition)
  behind a session-gated Supabase Edge Function proxy (the dashboard never holds the
  secret), with a soft per-user/day cap.

**Further dashboard work waits on** either the future character-bible ↔ pipeline
integration trigger, a pending pipeline-side field (e.g. `episodes.character_id` for
per-character cost, resume-to-distribution for safe real publishing), or a new human
ruling here.

## How changes to this file happen

This file is **human-owned**. The Architect may capture a human ruling here (as with
this entry) and log it in `docs/HANDOFF.md`; Builders/Designer treat it as read-only
direction. A change in product direction is a new dated entry + a HANDOFF note.
