# GATES — the loop's sentinel

> Per `AGENTS.md` rule 4: **frozen before results exist.** These are the v1
> acceptance criteria from the original product brief (now superseded by
> `DIRECTION.md`; `dashboardbuildbrief.md` is no longer in the repo), restated with
> current status.
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

---

# Slice 4 gates (frozen 2026-06-28) — CLOSED

Read-only **Cost Box** (Tier 1 spend governance). Full loop: Designer (Gemini) →
Builder (Codex) → Architect review/merge → independent reviewer agent → Architect
in-browser ratification vs SQL ground truth. All gates **PASS**.

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| S4-1 | Running total from `max(spend_so_far)` per episode, USD-labeled | **PASS** | Hero shows **$0.17 USD**; == SQL grandTotal `$0.1656`. |
| S4-2 | Per-episode live/in-flight cost (not `episodes.spend`) | **PASS** | Log shows $0.10 / **$0.02 (IN-FLIGHT, running)** / $0.04 from `max(spend_so_far)`. |
| S4-3 | By-provider from per-row deltas; deterministic bucketed | **PASS** | anthropic $0.165 (100%), google $0.001 (0%), Deterministic/None $0 — matches SQL delta-sum (`Math.max(0,Δ)`, never sums cumulative). |
| S4-4 | USD explicit; no cross-unit summing; asset-gap note | **PASS** | "Asset spend not yet reported by the pipeline … LLM provider spend only, in USD." No fabricated asset/cap numbers (cap parked with an empty seam). |
| S4-5 | Read-only; zero writes | **PASS** | In-browser: **0 writes**; receipts/episodes only `select`. |
| S4-6 | Reconciles a known completed run | **PASS** | Completed episodes: `max(spend_so_far)` == `episodes.spend` (verified). |
| S4-7 | Tier 1 only — no character grouping / ROI / analytics | **PASS** | Per-character is a disabled "CHARACTERS DEFERRED" seam (`aria-disabled`); nothing character-keyed computed. |
| S4-8 | Quality floor; build clean; no schema/deps | **PASS** | `next build` clean; 320px responsive; `:focus-visible`; reduced-motion disables the in-flight pulse; existing tokens; no `any`/deps/migration. |
| S4-9 | Overview total == Cost Box total | **PASS** | `runsStats.totalSpend = costStats.grandTotal` — both surfaces share one source; Overview now also reads `$0.166`. |

Independent reviewer agent: **APPROVE WITH NITS** (9/9 PASS, no constraint violations).
Accepted cosmetic nits (no action this tier): B1 — provider %s rounded independently
may not total exactly 100% (exact USD shown alongside); B2 — Overview avg uses a
no-suffix money format vs the Cost view's "USD" suffix (totals still agree).

**Slice 4 is CLOSED.** Tier 2 (per-character cost) unblocks at the Acoustic Kitty /
D-1 `character_id` landing; Tier 3 (ROI) waits on publishing + analytics ingestion.

---

# Slice E1 gates (§4.E — channel persona auto-suggest) — RATIFIED on branch

Frozen spec: `docs/slices/slice-channel-onboarding.md`. Full loop: Architect spec →
Gemini spec-review (REQUEST CHANGES → 5 findings folded → PASS) → Codex build →
Gemini build-review + Architect review → in-browser ratification vs the live DB
(Node-fetch bridge, QA login). All 10 measured gates **PASS** on the rendered artifact
(prod build + `next start`, Chromium/Playwright, 1440px + 412px). Ratified on the branch
against a local production build; not yet merged to production.

| # | Gate | Status | Evidence (measured) |
| --- | --- | --- | --- |
| E1-1 | Pure suggester: all rows / null / precedence / tie / word-boundary / null-safety | **PASS** | 29/29 vitest (`suggestPersona.test.ts`). |
| E1-2 | Every returned id ∈ `PERSONA_BANK` | **PASS** | Module-load membership guard + test asserts membership per row. |
| E1-3 | Hint appears on a confident match; no-match → no hint (not empty box) | **PASS** | New-form default → "Wry regulatory insider" (matched niche `fda`); keyword-free channel → `p.hint` count **0**. |
| E1-4 | Recomputes live; `voice_archetype` beats niche | **PASS** | `drill` → "Drill-sergeant historian" (voice), clear → reverts to niche; fact_anchor=none+treatment=motion_graphic+"Wildlife Weekly" → "Hushed naturalist". |
| E1-5 | Advisory only: save payload unchanged, zero live writes | **PASS** | Upsert POST intercepted+aborted (503, 0 real writes); captured payload keys = real channel fields only, **no persona/suggested key**. |
| E1-6 | States: default/no-match/label lookup | **PASS** | Covered by E1-3/E1-4; persona **label** (not id) rendered. |
| E1-7 | Responsive 412/1440; hint non-interactive, no overflow | **PASS** | scrollWidth==clientWidth at 1440 and 412; hint is a non-focusable `<p>`; no page errors. |
| E1-8 | Build clean; no migration/deps/network/`any` | **PASS** | `tsc --noEmit` clean; `next build` clean; pure function, no deps/migration. |
| E1-9 | Independent review + runtime ratification | **PASS** | Gemini build-review (its lone BLOCKER a verified false positive — refuted by compilation; NIT folded) + Architect PASS + 10/10 browser gates. |

Residual/deferred: **E1.b** (pre-selecting the persona chip in the Casting Studio for a
channel-linked character) deferred to phase-2 (loose character↔channel link); **E2**
(guideline auto-fill editor) blocked on the channel-researcher + cast-brief storage
(spec §5). Mapping content (`suggestPersona.ts` table) is operator-redlinable data.

---

# Phase-1 Channel-first — Lane 1 gates (Aurora design-system FOUNDATION) — on branch

Branch `claude/channel-first-phase1-build-gji3vi` (fresh from production, carries all Phase-1
specs + the Aurora package). First lane of the one-slice build (`docs/slices/slice-channel-first-phase1.md`
§9: primitives first). Delivers the Aurora token layer (light+dark) + primitive component classes +
theme wiring — **additive, scoped under `.aurora-app`**; the legacy `.cr` dossier app is untouched
and still builds/renders. NOT in this lane: hub, workspace, Action Center, any re-parenting.

Files: `src/app/aurora.css` (new), `src/app/layout.tsx` (imports + `data-theme="dark"` default +
pre-hydration theme script + theme-aware `themeColor`), `src/lib/theme.ts` (new; theme seam +
live `<meta name=theme-color>` sync). No new deps, no migration, plain CSS.

Full loop: Codex build → Architect commit → **Gemini + suerta (Opus)** review (per
`docs/design/channel-first-review-plan.md` §4 — design-system/non-money = G + S(Opus)) →
build + visual smoke (Chromium, dark+light @1440 + 412) + measured contrast proof.

Review trail:
- **Gemini** = REQUEST-CHANGES → **all folded**: (1) class-name collision (legacy globals
  `.btn`/`.status-badge` → renamed `.au-btn*`/`.au-badge`); (2) stacking-context bug (fixed
  `z:-2` backdrop hidden behind `.aurora-app` opaque bg → `isolation:isolate`); (3) `outline:none`
  killed keyboard focus ring on inputs → removed; (4) light warn/success AA; (5) missing states
  (button loading, input `aria-invalid`, toggle disabled, `.au-empty`); (6) `.channel-card`
  self-contained glass (no text on raw aurora); (7) theme-aware `themeColor`; (8) SVG noise
  desaturate.
- **suerta (Opus)** = REQUEST-CHANGES → **folded**: caught a real AA BLOCKER both prior lenses
  missed — light-mode **`--danger` badge text `#DC2626` ≈3.85:1** and **`--warn` `#B45309`
  ≈4.28:1** on their own 15% tints (not pure white) FAIL 4.5:1. Corrected to `--danger:#B91C1C`,
  `--warn:#92400E` (light only). Scope-isolation, collision-avoidance, hydration, reduced-motion,
  noise-URI all verified clean by suerta greps.

| # | Gate | Status | Evidence (measured) |
| --- | --- | --- | --- |
| L1-1 | Build clean; no new deps / migration | **PASS** | `next build` clean (Next 15.5.19); only `aurora.css`/`layout.tsx`/`theme.ts` touched; `package.json` unchanged. |
| L1-2 | Tokens light+dark match spec §1.1 (exact) | **PASS** | Values diffed vs `phase1-design-system.md` §1.1; only AA-corrections deviate (danger/warn/success light), commented in-file. |
| L1-3 | No collision / bleed into legacy `.cr` | **PASS** | Colliding names renamed to `.au-*`; suerta grep-verified legacy `globals.css` defines none of Aurora's classes/tokens; `data-theme` absent from legacy → no legacy re-render. |
| L1-4 | Aurora backdrop actually renders (not hidden) | **PASS** | `isolation:isolate` on `.aurora-app`; Chromium computed `appIsolation:isolate`, backdrop opacity .4 dark/.7 light; visible in both-theme screenshots. |
| L1-5 | Badge text AA ≥4.5:1 (light, on own tint) | **PASS** | Measured: danger **5.10**, warn **6.05**, success **5.82** (was 3.85/4.28/…). |
| L1-6 | Focus-visible ring present, not suppressed | **PASS** | `.aurora-app :focus-visible{outline:2px accent}` retained; input `outline:none` removed. |
| L1-7 | Reduced-motion disables backdrop drift + spinners + transitions | **PASS** | suerta-verified `@media (prefers-reduced-motion)` block covers `.aurora-backdrop`, running/loading spinners, and all `.aurora-app` transitions. |
| L1-8 | Component states present (default/hover/focus/active/disabled/loading/empty/error) | **PASS** | `.au-btn.is-loading`/`[aria-busy]`, input `[aria-invalid]`, toggle disabled, `.au-empty`; rendered in smoke harness. |
| L1-9 | SSR/hydration safe | **PASS** | `suppressHydrationWarning` on `<html>`; pre-hydration script only upgrades to a stored pref; `theme.ts` window-guarded, SSR-defaults "dark" == SSR `data-theme`. |
| L1-10 | Checkbox/radio target ≥24×24 (WCAG 2.5.8) | **PASS** | Bumped 1.25rem→1.5rem. |

**OPEN (verify on the real artifact at the Lane-2+ browser-ratification gate, §10 gate 12):**
dark-mode `--danger` badge text (`#FF1744`) is **borderline** (~4.3:1 by static estimate; true
value depends on the composited surface stack + aurora bleed-through) → **pixel-sample it on the
rendered dark screens**; if <4.5, darken/lighten the dark danger text or raise `--danger-bg`
opacity. Not fixed by guess now (locked dark token; approximate math).

**Lane 1 = reviewed + build-green + visually smoked (not yet browser-ratified against the live DB —
that gate needs the built screens + QA creds, arrives in the interactive lanes).** Next: Lane 2
(URL-routing extension + global Channels hub).
