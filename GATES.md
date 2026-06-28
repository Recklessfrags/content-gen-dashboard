# GATES — the loop's sentinel

> Per `AGENTS.md` rule 4: **frozen before results exist.** These are the v1
> acceptance criteria from `dashboardbuildbrief.md`, restated with current status.
> All must reach **PASS** (independently judged) before the loop stops. **Error or
> "built but unverified-independently" is never a PASS.**
>
> Status legend: **PASS** (independently verified) · **SELF-ONLY** (verified by the
> builder that built it — not independent, rule 2) · **PENDING** (not done) ·
> **DEVIATED** (does not meet the criterion as written — needs ruling).

| # | Gate | Status | Evidence / note |
| --- | --- | --- | --- |
| 1 | Schema applied with **RLS on every table**; nothing readable/writable unauthenticated | **SELF-ONLY** | Live check: anon reads `[]` on `characters` + `episodes`; all 4 tables RLS-enabled. Re-confirm independently. |
| 2 | Characters CRUD persists across refresh; `bible` jsonb round-trips intact (edit→save→reload identical) | **SELF-ONLY** | Data-layer reads verified; **full edit→save→reload round-trip not exercised in-browser.** |
| 3 | Switching characters loads correct bible; no bleed | **SELF-ONLY** | Logic present (per-id local state); not browser-tested. |
| 4 | Idea quick-capture persists, tags to character + channel, status cycles + persists | **SELF-ONLY** | Insert verified at data layer; UI cycle/tag persistence not browser-tested. |
| 5 | Runs reads real `episodes` for the **active character** (seed one row) | **DEVIATED** | Reads real episodes **globally** — pipeline schema has no character link. Demo row seeded. See decision **D-1**. |
| 6 | Deploys clean on Vercel from a fresh clone; no secrets in repo; Supabase keys in env | **SELF-ONLY** | Deployed to Vercel (project `content-gen-dashboard`, team *canicode*); both commits auto-built **READY** in production. Server runtime verified (root→307 `/login`, `/login` 200 → server env present). No secrets tracked. **In-browser client data-load not independently observed** (sandbox blocks Chromium egress); behind Vercel Deployment Protection (currently private). |
| 7 | Quality floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected | **SELF-ONLY** | Implemented in `globals.css` (`:focus-visible`, reduced-motion block, `@media max-width:880px`); not independently audited. |

## Stop condition

The loop **may not declare done.** Gate 5 is DEVIATED (needs human ruling D-1),
gate 6 is PENDING (deploy), and gates 1–4, 7 are SELF-ONLY and require independent
ratification (Slice 1). Shipping any SELF-ONLY/PENDING/DEVIATED gate as a PASS is a
failure per rule 2.
