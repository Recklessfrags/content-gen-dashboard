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
| 1 | Schema applied with **RLS on every table**; nothing readable/writable unauthenticated | **PASS** | Independent REST checks (anon key, no browser): anon `select` → `[]` on `characters`/`ideas`/`episodes`; anon `insert characters` → **401** `42501 RLS violation`; anon `patch episodes` → 204 but **row unchanged** (RLS hid it — status still `success`/`running`, not the injected value). Authed (live login) reads exactly 2 characters / 4 ideas / 2 episodes. All 5 public tables RLS-enabled (`jobs` is pipeline-owned, RLS-on/no-policy = deny-all). |
| 2 | Characters CRUD persists across refresh; `bible` jsonb round-trips intact (edit→save→reload identical) | **PASS** | In-browser (prod build, live DB): edited `codename`+`concept`+all 7 bible fields on Mad Dog with adversarial content (`"escapes"`, `{jsonb:true}`, emoji, newlines), Save → flash "✓ Saved", **hard reload → all 9 fields byte-identical** (0 mismatches). Originals restored + seed re-verified after the test. |
| 3 | Switching characters loads correct bible; no bleed | **PASS** | In-browser: Mad Dog vs Pearl show distinct codenames/bibles; an unsaved edit on Pearl did **not** appear on Mad Dog (no bleed) and Pearl retained its own unsaved edit on return (correct per-id local state). |
| 4 | Idea quick-capture persists, tags to character + channel, status cycles + persists | **PASS** | In-browser: captured idea via Enter, tagged character→Grandma Pearl + channel→Animals, cycled status Backlog→In progress→Used; **hard reload → idea present with tag + channel + status persisted.** Test idea deleted after. |
| 5 | Runs reads real `episodes` for the **active character** (seed one row) | **RATIFIED EXCEPTION** | Reads real episodes **globally** (pipeline schema has no character link). Human ruling D-1 (2026-06-28): accept global Runs, defer the board. In-app "operation-wide pipeline output" note present (`ControlRoom.tsx:545`). Runs now reads 2 real pipeline episodes. |
| 6 | Deploys clean on Vercel from a fresh clone; no secrets in repo; Supabase keys in env | **PASS** | `next build` clean; no secrets tracked (keys via `NEXT_PUBLIC_*` env). **Public Vercel URL now verified end-to-end** (2026-06-28, after Deployment Protection lifted): `content-gen-dashboard.vercel.app` root→307 `/login`, `/login` 200; real server-action **login succeeds** and the **Roster loads Mad Dog + Pearl** with Runs showing real pipeline episodes — browser hit the live `characters`/`ideas`/`episodes` REST endpoints (env vars confirmed applied to the production build). Screenshot captured. No remaining caveat. |
| 7 | Quality floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected | **PASS** | In-browser: 320px viewport → **no horizontal overflow** (scrollWidth == clientWidth), rail visible; keyboard Tab → every control matches `:focus-visible` with a settled **2px solid brass outline** (initial 0px reads were mid-`.15s`-transition artifacts); `prefers-reduced-motion: reduce` → button `transition-duration: 0s`; small controls meet target size (`.statusbtn` 47×25, `.tag-select` 144×27 ≥ 24px). Backs Gemini's earlier code-level audit (`docs/design/slice-1-audit.md`) with rendered pixels. |

### Independent verification method (2026-06-28, Architect session)

Run by a **separate Claude session acting Architect-only** (not the foundation's
solo-builder, not Codex) — this is the independent ratification rule 2 asks for;
the human still owns final sign-off. Setup: `next build` + `next start` against
the **live `reels-content` DB**, driven by Playwright/Chromium. Headless Chromium
**cannot complete TLS egress through the sandbox agent proxy** (the original blocker;
confirmed again here — CONNECT tunnels open but the MITM-CA TLS handshake aborts),
so browser→Supabase calls were bridged through Node's proxy-aware `fetch` via
`page.route` interception: **the real client code in `ControlRoom.tsx` executed
unmodified; only the transport hop was forwarded**, carrying the user's real JWT so
RLS applied normally. G1 was additionally verified **directly at the REST layer**
(anon key, no browser). Raw results: `scratchpad/results.json` (ephemeral).

Residual (non-blocking, → Slice 2 polish): `.login-card input:focus` still uses
`outline:none` (focus shown only via border-color change) — weaker than the app's
`:focus-visible`; the Slice 1 audit fixed the dossier `.field` inputs but not the
login inputs.

## Stop condition

All seven gates are **PASS** or a human-ratified exception (G5), now including the
**public Vercel URL** end-to-end (Deployment Protection lifted 2026-06-28). The loop
has produced the independent evidence rule 2 requires; the human owns final sign-off.
Slice 1 is **closed**. Next work is specified in `docs/slices/slice-2-deferred-features.md`.

---

# Slice 2 gates (frozen 2026-06-28) — CLOSED

Full loop ran for real: **Designer (Gemini)** → **Builder (Codex)** → **Architect
(Claude)** review/merge → **independent reviewer agent** → **Architect in-browser
ratification** against the live DB (Node-fetch bridge). All gates **PASS**.

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| S2-1 | Clicking a run opens a drill-down showing every receipt in `seq` order (stage/provider/model/effort+clamped/verdict/reason/spend/ts); jsonb viewable | **PASS** | In-browser: 3 run cards (buttons) → `role=dialog` with receipts in seq order (researcher→fact_check→gate→script_writer), verdict color-coded, 8 evidence/result JSON disclosures that expand. |
| S2-2 | Drill-down read-only; closing returns with no state loss; empty state | **PASS** | Esc closes + focus returns to the run card; **0 mutations to pipeline tables** observed across the session (only reads). |
| S2-3 | Saving a character creates an immutable revision without altering Slice-1 save | **PASS** | Save updates `characters` first (G2 preserved), then an additive non-fatal revision insert. DB confirmed 2 saves → 2 immutable revisions. |
| S2-4 | History newest-first; preview read-only; restore→unsaved draft→save persists; non-destructive | **PASS** | Empty→2 revisions ("Latest saved" first); preview shows older value read-only without clobbering the live draft; restore loads it editable with an "unsaved restored draft" warning; save → 3 revisions persist after reload; restored value is current. |
| S2-5 | Revisions owner-scoped (RLS); immutable | **PASS** | Migration: `select`+`insert` policies gated by `owner=auth.uid()`, **no update/delete** (immutable). Anon REST: read → `[]`, insert → 401 RLS violation. |
| S2-6 | Quality floor (responsive 320px, visible focus, reduced-motion); login-input focus residual fixed | **PASS** | W-A drill-down 320px ~no overflow, `:focus-visible` brass outline, reduced-motion block; `--paper-faint` contrast bump (#8F897B); login `:focus-visible` fix applied. |
| S2-7 | Build clean; migration idempotent and dashboard-only | **PASS** | `next build` clean; `0002_bible_revisions.sql` idempotent (`if not exists` / `drop policy if exists`); touches only `character_bible_revisions` — **no episodes/receipts/jobs**. Applied to live DB. |

Independent reviewer agent verdict: **APPROVE WITH NITS** on both W-A and W-B; the
one MAJOR finding (dual focus-trap when restoring from the open drawer) was fixed
(commit `9801462`) and re-verified (drawer closes when the restore dialog opens).
Test data created during ratification was deleted; the seed (2 characters / 4 ideas)
is restored.

**Slice 2 is CLOSED.** Remaining: optional human final sign-off (independent agent
review stood in per the human's authorization).

---

# Slice 3 gates (frozen 2026-06-28) — CLOSED

Read-only **Overview** view. Full loop: Designer (Gemini) → Builder (Codex) →
Architect review/merge → independent reviewer agent → Architect in-browser
ratification (aggregate correctness vs live DB + zero writes). All gates **PASS**.

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| S3-1 | "Overview" reachable from rail; renders Roster/Wire/Runs summary cards from real data | **PASS** | 4th rail nav item; three-column dashboard renders live aggregates. |
| S3-2 | Aggregates correct vs live data | **PASS** | UI vs DB matched exactly: chars 2 (1 active/1 draft, 50%); ideas 4 (3 backlog/1 active/0 used, 0%); episodes 3 (success 2/running 1), spend $0.14, avg $0.05, **pass-rate 67% (2 of 3)**, last run Cottage cheese. |
| S3-3 | Read-only; zero writes | **PASS** | In-browser: **0 writes** to any table AND **0 new reads** during Overview (derives purely from already-loaded state). No mutating controls. |
| S3-4 | Empty/zero + loading/error states | **PASS** | Per-card `is-empty` states; top-level loading/error guards wrap the view (code-reviewed). |
| S3-5 | Responsive (320px), visible focus, reduced-motion | **PASS** | Independent review verified breakpoints (3-col→1-col @1120px, compact @480px), `.metric-card` `:focus-visible`, reduced-motion block; existing tokens only. |
| S3-6 | Build clean; no schema/migration; no new deps | **PASS** | `next build` clean; additive component only; no migration; no dependencies. |

Independent reviewer agent: **APPROVE WITH NITS** (all 6 gates PASS, no
hard-constraint violations). Its two LOW findings — unguarded `episode.sentinels`
and case-sensitive status grouping — were fixed (commit `b46f27e`) and build-verified.

**Slice 3 is CLOSED.** Direction-dependent deferrals (multi-user teams, publishing,
external/SEO analytics, idea→pipeline linkage) await a human D-2 / `DIRECTION.md`
ruling (`docs/slices/slice-3-overview.md` → "Deferred").
