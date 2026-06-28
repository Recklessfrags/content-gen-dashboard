# GATES — the loop's sentinel

> Per `AGENTS.md` rule 4: **frozen before results exist.** These are the v1
> acceptance criteria from `dashboardbuildbrief.md`, restated with current status.
> All must reach **PASS** (independently judged) before the loop stops.
>
> Status legend: **PASS** (independently verified / human-ratified) ·
> **RATIFIED EXCEPTION** (does not meet the literal criterion but the human ruled it
> acceptable).

**v1 ACCEPTANCE: MET — ratified by the human on 2026-06-28 (live in-browser check).**

| # | Gate | Status | Evidence / note |
| --- | --- | --- | --- |
| 1 | Schema applied with **RLS on every table**; nothing readable/writable unauthenticated | **PASS** | Anon reads `[]` on every table; all 4 tables RLS-enabled; app requires login (verified live). |
| 2 | Characters CRUD persists across refresh; `bible` jsonb round-trips intact (edit→save→reload identical) | **PASS** | Human verified edit → Save dossier → refresh → values intact. |
| 3 | Switching characters loads correct bible; no bleed | **PASS** | Human verified switching Mad Dog ↔ Grandma Pearl; each shows its own bible. |
| 4 | Idea quick-capture persists, tags to character + channel, status cycles + persists | **PASS** | Human verified capture (Enter), status cycle, persistence across refresh. |
| 5 | Runs reads real `episodes` for the **active character** (seed one row) | **RATIFIED EXCEPTION** | Reads real episodes **globally** (pipeline schema has no character link). Human ruling D-1: accept global Runs + "operation-wide" note, defer the board. Demo row + note confirmed live. |
| 6 | Deploys clean on Vercel from a fresh clone; no secrets in repo; Supabase keys in env | **PASS** | Live on Vercel (project `content-gen-dashboard`); Deployment Protection off; human logged in and used the app. No secrets in repo; keys in env. |
| 7 | Quality floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected | **PASS** | Gemini-audited (`docs/design/slice-1-audit.md`) + remediated in Slice 1; human confirmed responsive layout live. |

## Stop condition

**Reached.** All seven gates are PASS (gate 5 as a human-ratified exception). The
human ratified v1 with a live in-browser check on 2026-06-28. Slice 1 is closed.
The loop is at a clean stopping point; the next slice is written only when new work
is chosen (see `docs/HANDOFF.md` → "Next").
