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

This is the ratified split from D-2 (focused tool) and the data contract
(`docs/contracts/data-contract.md`): dashboard-owned `characters`/`ideas`/
`character_bible_revisions`; pipeline-owned `episodes`/`receipts`/`jobs` read-only.

## Out of scope (and why) — deferred, not killed

- **External / SEO / social analytics** — would turn a focused cockpit into an
  analytics product; needs an integration that isn't built. Out for now.
- **Publishing / distribution** — the far end of the pipeline, gated behind
  approval; not the dashboard's job.
- **Multi-user teams** — premature for a solo operator. Owner-scoped RLS already
  supports "me now, scoped others later" (D-3), so no rework is owed when this comes.
- **Idea → pipeline linkage ("queue an idea as a run")** — the tempting one, but a
  **soft no today**: it requires **writing to the pipeline-owned `jobs` table** and
  the pipeline taking a character-aware idea as input. It belongs to the **same
  trigger as wiring the character bible into the pipeline** — a future **cross-repo
  contract change**, built then (with the pipeline owner's agreement), not before.

## Current scope = "done" for the dashboard

Characters + bibles (with immutable version history / preview / restore), ideas
(The Wire), Runs (read-only with run/receipt drill-down), and a read-only Overview.
That is the focused tool as ratified. **Further dashboard work waits on** either the
future character-bible ↔ pipeline integration trigger, or a new human ruling here.

## How changes to this file happen

This file is **human-owned**. The Architect may capture a human ruling here (as with
this entry) and log it in `docs/HANDOFF.md`; Builders/Designer treat it as read-only
direction. A change in product direction is a new dated entry + a HANDOFF note.
