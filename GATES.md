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
