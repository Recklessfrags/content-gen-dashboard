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

**RESOLVED — dark `--danger` badge AA (PR #65, 2026-07-03).** The open item was a **real FAIL**,
not borderline: `#FF1744` text on `--danger-bg` composited over the glass panel (`--surface-1`
`rgba(25,25,35,0.6)` over `#05050A` → opaque `rgb(17,17,25)`; tint over that → `rgb(53,18,31)`) =
**4.34:1**. The old token comment's 5.2:1 measured pure `#05050A`, not the panel the badge sits on.
The suggested "raise `--danger-bg` opacity" remedy was proven *wrong* (redder tint → 4.01/3.65).
Fix = dark-only on-tint text token **`--danger-fg #FF6B81`** (**6.10:1**), routed to the text uses of
`--danger`; solid fills/borders/dots untouched. Verified by compositing calc **and** a Chromium
pixel-sample (rendered `rgb(255,107,129)` on `rgb(53,18,31)` = 6.10:1). Fable-5 APPROVE-WITH-NITS.
| L1-AA1 | Dark danger badge/on-tint text AA ≥4.5:1 | **PASS** | 4.34→**6.10:1**, calc + Chromium pixel-sample; PR #65. |

**RESOLVED — `.btn-danger:hover` white-on-solid AA (PR #66, 2026-07-03).** Fable-surfaced during the
#65 review: dark hover put white on solid `#FF1744` = **3.85:1** (14px/600 = normal text, fails AA).
Distinct from the tint case. Fix = dark-only **`--danger-solid #CC0033`** (white-on = **5.81:1**);
light keeps `#B91C1C` (6.47:1). Verified by forced-`:hover` Chromium render **after the 0.3s
transition settled** (the un-settled tween misread 4.23 — a measurement artifact). Fable-5 APPROVE.
| L1-AA2 | Dark `.btn-danger:hover` white-on-solid AA ≥4.5:1 | **PASS** | 3.85→**5.81:1**, settled-state Chromium sample; PR #66. |

**Remaining OPEN AA note (ticketed):** none known in the danger family after #65/#66. Fable's residual
sweep found no other white-on-solid-danger or on-tint-danger failures. Extended audit (this session):
the OTHER dark status-badge text tokens all pass on the *composited* panel (success 8.46, warn 9.51,
running 5.63, parked 5.84, accent 10.02) — danger was the sole real failure; the imprecise "vs #05050A"
comments elsewhere are harmless (large luminance margins).

## IMMEDIATE #1 — deployed foundation RATIFIED on the live artifact (2026-07-03)

QA creds provided by operator → gitignored `.env.local`. Ratified a local **prod build** (`next build`
clean + `next start :4311`) driven by Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
with browser→`*.supabase.co` **bridged through Node fetch** (forwarding the browser JWT so RLS applies;
**28 supabase reads proxied, 0 failed, 0 websockets** — confirms polling-only). QA login = `cameronnicodemus@…`.

| Gate | Result | Evidence |
| --- | --- | --- |
| I1-1 Bare `/` lands on the hub | **PASS** | After login `/` renders HubLanding (`.hero-grid` + `#channels-hub-title`=Channels); URL canonicalizes to `?hub=channels` (route.ts `canonicalize`, by design — the hub IS the landing). |
| I1-2 Channel grid == live `channel_profiles` | **PASS** | Exactly **1** `.channel-card` rendered; System-Glance "Active Channels" = **1**; matches live count (Supabase MCP). |
| I1-3 Per-card Active Jobs scoped to `jobs.channel` | **PASS (honest 0)** | Card shows **0** active jobs — correct: 0/46 live jobs carry a channel slug, so the scope filter honestly yields 0. |
| I1-4 No per-channel cost rendered | **PASS** | Card shows only the "Runs & cost — Phase 3" deferred label; no `$` value in-card (§4 honesty). |
| I1-5 Open channel → workspace | **PASS** | Card click → `?channel=default&tab=production`. |
| I1-6 Back → hub | **PASS** | "Back to Channels" → hub landing (`?hub=channels`, hero renders). |
| I1-7 Legacy console reachable + capabilities | **PASS** | "Legacy console" → `.cr` shell; rail = Roster·Channels·The Wire·Queue·Runs·Overview·Cost·Exit (Casting/Editor are Roster sub-surfaces). |
| I1-8 "+ New Channel" reachable | **PASS** | Hub "New Channel" → opens the legacy channels console. |
| I1-9 Dual-shell dirty-guard | **PASS** | In legacy Roster: edit a Field → dirty (savebar label + rail `*`) → nav "THE WIRE" → **"UNSAVED CHANGES IN BUFFER"** dialog, nav blocked; "KEEP EDITING" dismisses + preserves edits. |
| I1-10 Dark `--danger` badge pixel-sample | **PASS** | Resolved in #65 (6.10:1), see L1-AA1. |
| I1-console | **PASS (env-only)** | 2 console errors are environmental, not app defects: `fonts.googleapis.com` reset (external CDN blocked in-sandbox; loads on real Vercel) + `POST /login` ERR_ABORTED (redirect superseding the action). No data request failed. |

**IMMEDIATE #1 = RATIFIED.** The un-ratified `#64` merge is now closed out on the real artifact against the live DB.

## Lane 4 — global inline Action Center (`?hub=actions`) — MONEY PATH, ratified live

Replaces the `?hub=actions` placeholder. New presentational `ActionCenter.tsx` lists `actionableJobs`
and approves **in-row**, reusing the existing money-path handlers **verbatim** (`requestQueueAction` →
inline confirm → `confirmQueueAction`; `build{Fact,Spend,Publish}ApprovalReenqueue` + the sole
`jobs` insert untouched). Publish double-gate preserved (`buildPublishApprovalReenqueue` resume-from-
episode; button disabled when `publishSourceEpisodeId` null; no Buffer → nothing posts). Fable-5
round-1 REQUEST-CHANGES (F1: nav left an invisible armed confirm freezing polling globally + stale-
snapshot fire risk) → folded (clear `pendingQueueAction` on scope change; +a11y Esc/focus-restore;
+submitting-guard) → round-2 re-review. Ratified live against the DB with **all `jobs` writes
intercepted-and-aborted (0 live writes)**.

| Gate | Result | Evidence |
| --- | --- | --- |
| L4-1 Rows render for actionable jobs | **PASS** | 10 rows (8 `ready_for_review` + 2 `stale`) rendered in the Action Center. |
| L4-2 Correct action per park | **PASS** | Publish rows show "Approve & publish"; stale rows "Re-run Job"; null/unknown parks fall to "Approve spend & continue" (matches legacy). |
| L4-3 Double-gate step 1 (request, no write) | **PASS** | Clicking a row action opens the inline confirm and writes **0** rows. |
| L4-4 Poll-survival | **PASS** | With a confirm open, it persists across a >5s poll interval with **0** writes (polling paused via `overlayOpen`). |
| L4-5 Double-gate step 2 (confirm → exactly one write) | **PASS** | The distinct inline Confirm click produces **exactly 1** intercepted `jobs` POST. |
| L4-6 Publish payload identity | **PASS** | Intercepted publish POST = `{publish_only:true, publish_approved:true, source_episode_id:set, idempotency_key:null}` (== `buildPublishApprovalReenqueue`). |
| L4-7 Spend payload identity + double-gate | **PASS** | Intercepted spend POST = `{spend_approved:true, publish_only:false}`; step-1 no write, step-2 one write. |
| L4-8 F1 fix — nav clears the armed confirm | **PASS** | Open confirm → "Back to Channels" → return to `?hub=actions` → **0** armed confirms (polling not frozen). |
| L4-9 Zero live writes | **PASS** | Every `jobs` POST intercepted-and-fulfilled 201, never forwarded — **0** rows written to the live DB during ratify. |
| L4-a11y Esc + focus (rule 29) | **PASS** | Inline confirm auto-focuses Cancel; Escape cancels; focus restores to the triggering row button on close. |

**Lane 1 = reviewed + build-green + visually smoked (not yet browser-ratified against the live DB —
that gate needs the built screens + QA creds, arrives in the interactive lanes).** Next: Lane 2
(URL-routing extension + global Channels hub).

---

# Phase-1 Channel-first — Lane 2 (part 1): URL-routing MODEL (pure, tested) — on branch

`src/lib/route.ts` (+ `src/lib/__tests__/route.test.ts`). Pure TS implementation of slice §3's
hub/channel/tab scope model — the single source of truth the ControlRoom wiring (next lane) will
use. No React, no `window`, no deps. `parseScope` / `scopeToSearch` / `scopeToUrl` / `scopesEqual`
/ `isSameScope`. Gate = spec-fidelity (§3) + unit tests; this is non-money/non-migration pure logic,
so the full Gemini+suerta+browser-ratify gate applies to the *wiring* lane, not this module.

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| L2r-1 | Legacy `?view=*` → one-time redirect to hub channels (§3 Q3) | **PASS** | `parseScope("?view=queue") = {hub:channels, canonicalize:true}` (test). |
| L2r-2 | Bare `/` and unknown params → hub channels | **PASS** | `""`, `"?"`, `"?foo=bar"` → hub channels, canonicalize:true (tests). |
| L2r-3 | Unknown/missing `channel` → hub channels | **PASS** | `?channel=ghost` w/ knownChannels=['weird_food'] → hub, canonicalize:true. |
| L2r-4 | Missing/invalid `tab` → production, canonicalized | **PASS** | `?channel=weird_food` and `&tab=bogus` → workspace production, canonicalize:true. |
| L2r-5 | Valid scopes not re-canonicalized | **PASS** | `?hub=channels`, `?channel=weird_food&tab=cost` → canonicalize:false. |
| L2r-6 | Round-trip idempotency parseScope∘scopeToSearch | **PASS** | asserted for hub + workspace scopes; codename w/ special char round-trips. |
| L2r-7 | Build clean; no deps | **PASS** | `next build` clean; `vitest run` 12/12. |

Next: Lane 2 (part 2) = wire this into ControlRoom.tsx (extend the existing local-state +
`pushState`/`popstate` pattern — NOT `useSearchParams`-driven, per slice §3 App-Router note) +
mount the global Channels hub in `.aurora-app`. That lane is the full review + ratify gate.

---

# Phase-1 Lane 1 — FIDELITY REBUILD (aurora.css lifted from the mock CSS) — on branch

Operator feedback (2026-07-03): builds were drifting from the design renders because aurora.css was
hand-ported from the markdown summary, not the mock's real CSS. Fix per operator's guidance: **lift
the mock component CSS verbatim; the HTML mock is the source of truth; measure fidelity with an
image-diff (rule 35), not vibes.**

- `aurora.css` rewritten to lift the mock's tokens + component rules VERBATIM from
  `finalist-3-aurora.html` + `aurora-system/*.html` (595→~1465 lines: hub, action-center, overview,
  workspace, gallery components, overlays, skeletons), scoped under `.aurora-app`. Only 3 classes
  renamed for legacy-global collisions (`.status-badge`→`.status-chip`, `.metric-value`→
  `.au-metric-value`, `.pulse-dot`→`.au-pulse-dot`). Preserved a11y/correctness deltas: light-mode AA
  badge tokens, `isolation:isolate`, focus-visible, reduced-motion, monochrome grain. One real bug
  found + fixed: the scoped reset had `box-sizing` but not `margin:0;padding:0`, so default UA
  `<h1>`/`<p>` margins inflated every text block (~100px accumulated).

| # | Gate | Status | Evidence (MEASURED) |
| --- | --- | --- | --- |
| L1F-1 | Tokens identical to the mock | **PASS** | `:root`/`[data-theme]` diffed byte-for-byte vs mock (bg-base #05050A, aurora stops, surfaces, radii, system fonts). |
| L1F-2 | Shared component rules lifted verbatim | **PASS** | `.glass-panel`/`.hero-grid`/`.action-center` byte-identical to mock; component set restored. |
| L1F-3 | Rendered hub == mock (image-diff, rule 35) | **PASS** | Content-only pixel-diff mock vs built (Chromium 1440, backdrop frozen, real-app body reset): **dark 0.52% / light 0.65%** changed pixels (>60 threshold) — residual is text anti-aliasing. |
| L1F-4 | Layout metrics match | **PASS** | action-center h=326 (mock 326), channels-grid h=201 (mock 201) after the reset fix (were 428/228). |
| L1F-5 | Build clean; a11y deltas preserved | **PASS** | `next build` clean; light AA tokens, isolation, focus-visible, reduced-motion all present. |

Note: raw (unmasked) pixel-diff is ~14–32% because the full-page **animated translucent aurora
backdrop** covers every pixel and is non-deterministic frame-to-frame — that is expected and is NOT a
fidelity miss; the content-only measured gate (L1F-3) is the meaningful one. **Intentional honest
deviation from the mock:** the mock shows a per-channel "30D COST" figure; the build OMITS it
(episodes have no channel key — §4 DATA REALITY). Method (build-from-mock-CSS + image-diff gate) is
now the standard for every re-parented surface.

---

# Phase-1 Lane 2b — routing wiring + Channels hub — FABLE-APPROVED on branch

`ControlRoom.tsx` wired to the `route.ts` AppScope model; `HubLanding`/`ChannelsHub`/`AuroraShell`
mounted as the `?hub=channels` landing. Interim **dual-shell**: the new Aurora hub is the landing;
the legacy `.cr` shell stays fully reachable (valid `?view=` deep links open it + a "Legacy console"
button on the hub) so NO capability is dark while surfaces are re-parented.

Review gate = **Fable-5** (operator: "only fable before merge"). Round-1 = REQUEST-CHANGES (4
blockers: dueling popstate desync; scope effect not mount-only → ejected the operator on any profile
refetch; "+ New channel" couldn't create a 2nd channel; "nothing lost" violated — legacy shell
unreachable with ≥1 channel). All folded → **Round-2 = APPROVE-WITH-NITS** (Fable traced every fix in
code: single legacy-aware popstate handler; `didInitScopeRef`-gated one-time restore; new-channel →
legacy panel; dual-shell reachability of queue/wire/runs/roster/casting/cost/editor; global-only
system-glance; tolerant `jobs.channel` match; hash preserved; hoisted dialog/toast; scope-based poll).

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| L2b-1 | App-Router rule: manual pushState/popstate + local state, no useSearchParams desync | **PASS** | Fable-traced; one popstate handler; deterministic first render (hub) → hydration-safe. |
| L2b-2 | Bare / + legacy ?view= behave (hub landing; legacy opens, not dark) | **PASS** | dual-shell; valid ?view= opens legacy; Legacy-console button; Back returns to hub. |
| L2b-3 | Nothing lost (§2, gate 5) — every legacy capability reachable | **PASS** | Fable reachability trace: queue/wire/runs/roster/casting/cost/channel-editor all reachable. |
| L2b-4 | Data honesty (§4): no per-channel cost; glance is global | **PASS** | cards = Active Jobs only + "Runs & cost · Phase 3"; activeRuns/spend30d global. |
| L2b-5 | No state leak (Fork-A §6) | **PASS** | per-card counts pure per-row from props; tolerant channel compare. |
| L2b-6 | Build + route tests | **PASS** | `next build` clean; `vitest` 12/12. |

**Accepted nits (non-blocking; Fable round-2):** dirty-cancel `replaceState` is mildly lossy on
history (standard revert-without-`history.go()` tradeoff); `cancelUrl` uses post-pop hash (cosmetic);
one-frame hub flash on deep links (SSR-safe design); **no in-rail hub link from the legacy console →
add one in the next lane (N11).**

**NOT yet done:** LIVE browser ratification (needs QA creds — production-merge gate; the interactive
Back/dual-shell/dirty-guard behavior is code-verified by Fable but not yet exercised against the live
DB). **Next lanes:** Lane 4 = global inline Action Center (money path → Fable gate, keep the publish
double-gate); Lane 3 = re-parent workspace surfaces (Production/Character/Guidelines/Cost) replacing
the placeholders + fold N11; then retire the legacy shell + reinstate §3 Q3's legacy→hub redirect.

---

## Lane 3a — channel WORKSPACE shell + Guidelines + Cost tabs + N11 (channel-first Phase 1)

Codex built → Architect committed → **Fable-5 = APPROVE-WITH-NITS** (no blockers; correctness,
routing §3, Fork-A no-leak §6, the `.tab-panel` display:none trap, and savebar-specificity all
code-verified) → all nits folded → **measured live-artifact ratify = 24/24 substantive gates** on a
prod build (`next start :4312`) + Chromium + Supabase bridged (QA creds; live DB truth =
`channel_profiles` 1 row `default`, uncast). Fable's flagged gate-10 theme-bleed was folded (scoped
Aurora re-skin of the legacy editor) then **measured clean** (G10a–e). Script:
`scripts/ratify-lane3a.mjs`.

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| L3a-1..12 | Workspace shell + scoped Guidelines editor (hub 1 card; header + uncast badge; 4 role=tab nav; roving tabindex; guidelines aria-selected; active tab-panel visible; editor bound to `default` read-only; no roster/Delete/+New in scoped mode; Save retained) | **PASS** | 12/12 in Chromium vs the live DB. |
| L3a-G10a..e | **Gate 10 measured** — no legacy paper/stamp bleed: Save button not stamp-red (`rgb(255,255,255)` bg, AA 20.34:1 dark / 18.17:1 light), savebar transparent (not `--ink`) in dark AND light, inputs Aurora-surface (not paper), no h-scroll @1440 | **PASS** | computed-style samples both themes. |
| L3a-13 | Keyboard: ArrowRight moves roving focus across the workspace tablist | **PASS** | focus → "Cost". |
| L3a-14/15 | Cost tab = honest DEFERRED panel (§4) — no fabricated per-channel $, "View Global Cost Center →" to real global cost | **PASS** | deferred panel present, 0 `$` blocks. |
| L3a-16 | Production/Character honest placeholders under the new shell (Lane 3b/3c) | **PASS** | active panel renders. |
| L3a-17 | Breadcrumb "Channels" returns to hub (URL is source of truth) | **PASS** | → `?hub=channels`. |
| L3a-18/19 | **N11** — legacy rail "Hub" button exits the legacy shell to the Aurora hub | **PASS** | rail gone; `?hub=channels`. |
| L3a-20 | Console errors | **ENV-ONLY** | 3× `ERR_CONNECTION_RESET` = sandbox-blocked Google Fonts CDN (`globals.css:1` `@import fonts.googleapis`); all data gates passed → not an app defect (same class as #68). |

**Accepted nits (non-blocking, Fable round-1, deferred to the re-skin/Phase-2 polish):** a one-frame
"Channel profile unavailable" flash on scoped mount before hydration (cosmetic); Guideline edits are
not dirty-guarded on tab-switch/breadcrumb (pre-existing legacy behavior, not a regression); minor
mock-fidelity deltas (breadcrumb in `main` not top-bar; cast badge lacks the mock dot glyph).

**Scope note:** the Guidelines editor is a functional re-parent — legacy markup, now Aurora-skinned via
a `.channel-profiles.scoped` override block (theme-aware, AA-proven). A full field-by-field Aurora
rebuild (`form-input`/`form-label`) is a later polish.

---

## Lane 3c — channel workspace CHARACTER tab (channel-first Phase 1)

Codex built (ControlRoom.tsx only) → **Fable-5 APPROVE-WITH-NITS** (no blockers; correctness, §6 no-leak,
Q1 reachability, a11y one-`h1`, CSS combos all code-verified; 3 nits folded — chars loading/error gate,
inert read-only label→span, dev-facing copy reworded) → **live-artifact ratify 9/9 gates** (re-run clean
after the fold; `scripts/ratify-lane3c.mjs`). Resolves the cast character by best-effort name match of the loose
free-text `channel_profiles.character` → `chars[].codename` (no FK — Phase 2). Live truth: `default` is
uncast → the uncast state is the ratified live state.

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| L3c-1/2 | Character tab is the active panel + nav-tab aria-selected | **PASS** | `#workspace-panel-character.tab-panel.active` visible; "Character" selected. |
| L3c-3/4 | UNCAST state shown for the live uncast `default` (No Character Assigned + uncast avatar) | **PASS** | text + `.avatar-uncast-large` present. |
| L3c-5 | Uncast CTAs present (Assign Character + Create New) | **PASS** | both buttons render. |
| L3c-6 | a11y heading order — exactly one `<h1>` on the workspace page (panel uses h2/h3/h4) | **PASS** | `main h1` == 1. |
| L3c-7 | "Assign Character" routes to the Guidelines tab (free-text `character` field) | **PASS** | → `?channel=default&tab=guidelines`. |
| L3c-8 | **Q1 no-capability-lost** — "Create New" opens the legacy roster (full character CRUD/bible/history/casting reachable) | **PASS** | legacy `.cr .rail` renders. |
| L3c-9 | No app-level console errors | **PASS** | (env-only fonts CDN excluded). |

**Note:** the CAST-state markup (avatar + read-only bible + Casting Configuration → legacy roster,
"Manage all characters →") is built + build-verified but not live-demonstrable (no cast channel exists
yet); it ratifies live once a channel is cast. No inline Casting/Visual modals (Phase 2 de-modaling);
no new write path.

**Lane 3b (Production) is DEFERRED** — data reality: `ideas.channel` ∈ {"Food","Dark history"} (not the
`default` codename) and all `jobs.channel` are NULL, so the channel-scoped Ideas/Queue are empty and the
mandatory money-path live-ratify has no channel-tagged parked job to exercise. Build when channel-tagged
ideas/jobs exist. **Next: Lane 5 (retire legacy shell + reinstate the `?view=`→hub redirect).**

---

## Lane 5 — reinstate the legacy `?view=`→hub deep-link redirect (channel-first Phase 1)

Codex built (ControlRoom.tsx only) → **Fable-5 REQUEST-CHANGES** (1 real BLOCKER: the deleted `?view=`
branch was silently load-bearing — a legacy console opened via a CTA *during the `channelProfilesLoading`
window* got clobbered/snapped-shut when the cold-mount init effect re-ran on load-resolve; code-verified
against `HubLanding`/`ChannelsHub` CTAs being live during load + the loading-guard returning before
`didInitScopeRef` commits) → Option A fold (`navigate`/`openLegacyConsole` set `didInitScopeRef.current =
true`, so an explicit user nav settles the initial scope and the init effect no-ops) → **Fable-5 re-audit
APPROVE-WITH-NITS** (Blocker closed, no new regression; redirect/popstate/money-path double-gate/dep-array
invariants re-verified) → **live-artifact ratify 12/12** (`scripts/ratify-lane5.mjs`; PR #73, squash
`78d03f0`). What landed: cold-mount init effect no longer intercepts legacy `?view=` links; they fall
through to `parseScope`'s canonicalize → one-time `replaceState` to `?hub=channels` (slice §3-Q3). The warm
`openLegacyConsole` path + the `popstate` legacy-reopen branch are preserved, so every legacy-homed
capability (character CRUD/bible/history/casting via roster, new-channel creation, ideas capture, runs
drill-down) stays reachable — the dual shell is retired for **deep links only**, not reachability (gate 5).
Lane-4 popstate nits folded (`pendingQueueAction` cleared synchronously in `navigate`/`openLegacyConsole`/
both popstate success callbacks).

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| L5-10 | **Blocker-1 regression** — legacy console opened during the `channel_profiles` loading window survives load-resolve | **PASS** | delayed channel_profiles GET ~3s, clicked New Channel during it → `railAfterResolve=1 url=?view=channels` (pre-fix would snap back to `?hub=channels`). |
| L5-1..4 | Every cold legacy `?view=` (channels/queue/cost/roster) → `?hub=channels`, no legacy shell | **PASS** | all four: `url=?hub=channels legacyRail=0`. |
| L5-5 | Redirect lands on the working hub (1 card == live `channel_profiles`) | **PASS** | `cards=1`. |
| L5-6 | **Gate 5 no-capability-lost** — legacy roster reachable via warm Character-tab "Create New" CTA | **PASS** | `legacyRail=1 url=?view=roster`. |
| L5-7 | N11 — legacy rail Hub button still exits to the Aurora hub | **PASS** | `?hub=channels railNodes=0`. |
| L5-8 | Warm back-nav — Back from warm legacy exits to prior Aurora scope (popstate, dirty-guard intact) | **PASS** | `railBack=0 url=?channel=default&tab=character`. |
| L5-9 | No app-level console errors | **PASS** | (env-only fonts CDN excluded). |

**Accepted nits (non-blocking, Fable re-audit):** (1) a cold `?view=` entry buried behind an in-load
navigation is canonicalized only on Back, not eagerly (`parseScope` decides the `view` case without
`knownChannels`, so the redirect could fire before the fetch resolves); (2) no machine-checked regression
test for the warm-open-during-load path — deferred, repo has no jsdom/RTL infra (`environment: "node"`),
and the behavior is covered by the live L5-10 gate; ESLint has no config wired (`next lint` is interactive)
so dep-arrays are tsc-checked only.

**Scope note:** Lane 5 does NOT delete the legacy shell — the legacy roster remains the reachable home for
full character CRUD/bible/history/casting until the Phase-2 character bench re-homes it (else gate 5 breaks).
"Retire the legacy shell" completes in Phase 2.

---

## Phase-3 Lane 1 — non-null re-enqueue keys + `idea_job_map` provenance (money path) — ratified live 15/15

**Trigger:** the pipeline shipped `episodes.correlation_key` (worker echoes the job `idempotency_key` at
`begin_episode`; 7 episodes carry it live), which made the dashboard's null-key bug **active** — the three
approval re-enqueue builders forced `idempotency_key:null` → null-in-null-out → money-spending re-runs
un-threadable. Scoped per Fable (`SCOPED-MIDDLE`): shipped §3.1 (non-null keys) + §3.2 (`dash_0006
idea_job_map`) + §3.3 (provenance recovery, ordered writes); **deferred** §3.4 `enqueue_job_with_map` RPC +
Lane 2 resolver + Lane 3 per-channel Runs/Cost UI (data-blocked consumers). Loop: Codex build → Architect
commit → **Fable-5 REQUEST-CHANGES** (one real diff-introduced money-path BLOCKER — a double-submit →
double-spend race: `setQueueActionSubmitting(false)` fired before the awaited `idea_job_map` lookup closed the
dialog, so a 2nd confirm click inserted a duplicate fresh-key spend job) → fold (hold `submitting` true across
the lookup; release with `setPendingQueueAction(null)`) → **Fable-5 re-audit APPROVE** → live money-path
ratify (`scripts/ratify-lane1.mjs`, intercept-and-abort). Commits `3ef5b5d` + `5f2f4c9`.

| # | Gate | Status | Evidence |
| --- | --- | --- | --- |
| L1-1/2 | Spend double-gate — step1 (request) writes 0 jobs; step2 (confirm) writes exactly 1 | **PASS** | `step1Writes=0`; `jobsWrites=1`. |
| L1-3/7/11 | Every re-enqueue (spend/publish/stale) carries a fresh non-null `job_rerun_<id>_<ts>` key | **PASS** | `job_rerun_28_…`, `job_rerun_51_…`, `job_rerun_47_…` (regex-matched). |
| L1-4 | Spend payload flags identical — `spend_approved:true`, `publish_only:false` | **PASS** | measured on the intercepted POST. |
| L1-8 | Publish payload identity — `publish_approved:true` + `publish_only:true` + `source_episode_id` set; spend NOT forced | **PASS** | `src=cottage-cheese-20260703-185756-22ed68`; `spend_approved` unchanged. |
| L1-5/9 | Each re-enqueue writes exactly one `idea_job_map` row under the fresh key | **PASS** | `mapKey == jobs key`. |
| L1-12 | All exercised re-enqueue keys are unique | **PASS** | 3/3 distinct. |
| L1-13 | **Double-submit race closed** (Fable blocker) — rapid triple-confirm → exactly one jobs write | **PASS** | `jobsWrites=1` (button disabled while `submitting`). |
| L1-14 | Re-enqueue provenance recovery — the map row carries the recovered `idea_id` (seeded positive) | **PASS** | `idea_id == 667a22e3-…` (recovered from the parked row's key). |
| L1-15 | No app-level console errors (env fonts CDN excluded) | **PASS** | 0 app errors. |
| L1-16 | **Zero live writes** — every `jobs`/`idea_job_map` POST intercepted-and-fulfilled, none forwarded | **PASS** | live `jobs` == 50 before/after; `idea_job_map` == 0 after seed cleanup. |
| L1-17 | Migration `dash_0006` — nullable `idea_id` FK **ON DELETE SET NULL**, owner-scoped ownership-integrity RLS | **PASS** | structure via `list_tables`/`pg_policies` (5 cols, 4 policies, RLS on, `idea_id` FK confdeltype `n`, `owner` `c`); **SET NULL proven** by an MCP seed→delete-idea→assert round-trip (map row survives with `idea_id` null, `channel`/`owner` kept — channel-level cost preserved). |

Unit layer: `jobs.test.ts` 32/32 (key preservation + distinctness pinned; publish-not-forcing-spend preserved);
`tsc --noEmit` + `next build` clean. HQ heads-up posted (Coordination Log, 2026-07-04) — the non-null
idempotency-key seam change (one grep ask: does any pipeline tooling treat a null key as "approval re-run"?)
+ the `dash_0006` announce.

**Deferred (sequenced for when channel-tagged threaded data exists):** §3.4 RPC (ordered writes with a
surfaced non-blocking failure ship now instead — a map-orphaned job is recoverable; a null key / unmapped
enqueue is not); Lane 2 `thread.ts` resolver; Lane 3 threaded Production + per-channel Runs/Cost UI.
