# Dashboard Health Audit — 2026-06-29

Independent architecture/health/risk audit of `content-gen-dashboard`, run by **two
independent auditors (Codex + a Claude agent)** over the full codebase, then
synthesized. Read-only. This is the dashboard counterpart to the pipeline-side
architecture review on the HQ.

**Verdict (both auditors agree):** genuinely disciplined engineering — an
excellent, well-documented, side-effect-light `lib/*` pure-logic layer; correct
owner-scoped RLS; race-safe casting cap; request-id/unmount guards throughout;
above-average a11y; clean `tsc` under strict mode — **undermined by one
structural elephant (a 5,308-line component) and a zero-test posture.** No
correctness blockers; the risks are maintainability, test-safety, and a few
latent security/contract edges that bite if the operator set ever broadens.

## Top risks (severity × likelihood)

| # | Risk | Where | Why it matters | Fix | Effort |
|---|------|-------|----------------|-----|--------|
| 1 | **`ControlRoom.tsx` monolith** | `src/components/ControlRoom.tsx` (5,308 lines; root at ~L3168 with ~60 hooks) | One component = all views + every dialog + all state + data + mutations. Whole-tree re-render scope (a flash timer or a keystroke re-renders cost box, sparklines, every list); every UI change touches one file (merge-conflict magnet, unreviewable diffs, high onboarding); no test seam. | Phase 1 (M, mechanical): extract the already-separated sub-components (`EnqueueIdeaPanel`, `OverviewDashboard`, `CostBoxDashboard`, `DrillDownPanel`, `HistoryDrawer`, `CompareDialog`, `CastingStudioPanel`, `QueueActionDialog`) to their own files verbatim. Phase 2 (L): lift server state into feature hooks (`useCharacters`/`useIdeas`/`useJobs`/`useReceipts`) so views subscribe to slices. | L (staged) |
| 2 | **Zero automated tests on spend-gating logic** | no test files; only `scripts/verify-modal.mjs` | `jobs.ts` idempotency hash, re-enqueue builders, `detectParkKind` regex; `casting.ts` `clampVoiceSettings` (the documented "worker does not clamp" safety boundary). A silent regression → duplicate jobs / out-of-range ElevenLabs calls = **real spend**. | Vitest unit layer for the pure fns (they were written to be testable): `idempotencyKeyFor` (key/array-order stability), `detectParkKind` (the `post` vs `post_`/`post-`/`post.` edges), `clampVoiceSettings`, `composeVoiceDescription`, `budgetStatus`, `bibleToMarkdown`. Then one Playwright happy-path E2E. | S (units) / M (e2e) |
| 3 | **No realtime/polling → stale operator view** | initial fetch `ControlRoom.tsx` ~L3408; refetch only after the dashboard's own mutations | The pipeline worker writes `jobs`/`episodes`/`receipts` continuously; the operator sees a point-in-time snapshot. You can approve spend/publish against a job whose real status already changed, or watch a "running" job that finished. No refresh affordance or "last updated". | Supabase Realtime on `jobs`/`episodes`/`receipts` (read-only, cheap) or a polling interval for Queue/Runs + a visible refresh + "last updated". | M |
| 4 | **Trusted-operator security model is load-bearing; signup UI still present** | `episodes`/`receipts` RLS `using(true)` (`0001_init.sql` L94/99); `login/page.tsx` L75 + `login/actions.ts` L23 signup; `casting-proxy` delete L195 | Whole model assumes `authenticated` = trusted operator. If public signup ever opens, any account reads ALL pipeline output, burns the shared ElevenLabs cap, and can delete ANY voice. Signups are disabled at the Supabase project level today, but the UI still offers "create account" (misleading + a latent footgun). | Remove/hide the signup UI + action; document the trusted-operator boundary. If multi-user ever opens: per-owner scoping for pipeline reads + per-resource auth for casting delete. | S (lockdown) / L (multi-tenant) |
| 5 | **`casting-proxy`: CORS reflects any Origin; `delete` unauthorized-by-design** | `supabase/functions/casting-proxy/index.ts` L32 (CORS), L195 (delete) | Session validation + race-safe cap are good, but reflecting any `Origin` removes a defense layer, and `delete` (the most destructive action) has no per-voice ownership check — any session deletes any voice in the shared account. | Env-driven Origin allowlist; track `voice_id → character/owner` and enforce before delete (or defer with the multi-user work). | S (CORS) / M (ownership) |
| 6 | **`compat.ts` supabase-js workaround is fragile + load-bearing** | `src/lib/supabase/compat.ts`; `as unknown as` at `client.ts` L14 / `server.ts` L39 | A homomorphic-identity mapped type defeating a real supabase-js `never`-inference bug. Correct today (tsc clean) but the `as unknown as` erases any future shape divergence, and it's pinned to a floating `^2.x` caret — an upgrade could break or obsolete it. Blast radius = every typed query. | Pin `@supabase/supabase-js`/`postgrest-js` exact versions; add a CI `tsc` (+ a `satisfies`/`expectTypeOf` probe on one insert) so divergence surfaces; track the upstream issue and delete when fixed. | S |
| 7 | **Queue park-kind is inferred, not contracted** | `jobs.ts` `detectParkKind` L275; UI L5020 | The dashboard regex-infers spend-vs-publish park from the latest receipt stage because `jobs` lacks a park-type field. Misclassifies if the pipeline renames stages. | Cross-team: pipeline exposes `review_kind`/`park_reason` on `jobs` (or receipts); dashboard stops inferring. | M (cross-repo) |
| 8 | **Casting tournament state localStorage-only; desyncs from `voice_id`** | `casting.ts` L419–513; `CastingStudioPanel` L2672/2714 | Bracket (favorites/pool/winner + base64 audio) is per-browser, no cross-device sync, and never reconciled against `characters.voice_id` on mount — a re-cast/deleted voice leaves a stale "winner". Base64 audio risks localStorage quota. | On mount, reconcile: if `voice_id` set, show a DB-sourced "currently cast" banner; keep preview audio in-memory (not localStorage); persist only metadata. `casting_candidates` table if cross-device matters. | S–M |
| 9 | **In-repo `jobs` contract docs are stale** | `DIRECTION.md`, `docs/contracts/data-contract.md`; no `*jobs*.sql` migration of record in-repo | Repo docs still say "dashboard never writes pipeline-owned tables", but the app reads/inserts `jobs`. Only generated live types + a design doc describe the write contract → fragile handoff. | Freeze the real `jobs` write-contract in `data-contract.md`; reference the pipeline's RLS migration; log the DIRECTION/HANDOFF ruling. | S–M |
| 10 | **`characters.runtime` editable-vs-measured contract conflict** | `types.ts` L83; editor `ControlRoom.tsx` L4538 | `runtime` is a FROZEN bible key the operator edits ("Runtime target"), but the pipeline says it's measured (voice-dependent) + unstable — operator edits get overwritten/ignored. | Make `runtime` display-only/advisory in the editor (or pipeline-owned); pending pipeline ruling (raised on HQ). | S |
| 11 | **Large-list re-render jank (latent)** | `chars`/`ideas`/`jobs`/receipt `.map` in `ControlRoom.tsx` | Fine at today's volume; whole-tree state churn + unmemoized cards will jank as data grows. | Falls out of #1 (extraction + memo); add pagination/limits before volume grows. | M |
| 12 | **`globals.css` ~2,170 lines** | `src/app/globals.css` | Large + appended-per-slice, some duplicated reduced-motion blocks → global-selector collision risk. BUT both auditors agree it's variable-driven + disciplined (only 14 `!important`) — **lower severity than the TSX**. | Split per-feature alongside component extraction (opportunistic, not a standalone priority). | M (opportunistic) |

## Quick wins (high value, low effort)
- Vitest unit layer for `lib/*` pure logic (#2) — half a day, protects everything during refactor.
- Pin Supabase deps + CI `tsc`/test gate (#6).
- Origin allowlist on `casting-proxy` + remove/hide signup UI (#4, #5).
- `runtime` "pipeline-measured, not authored" UI note (#10).
- Mechanical extraction of the already-separated sub-components (#1 phase 1).

## What's solid (credit)
- `lib/*` pure-logic layer: documented, testable, careful (byte-comparison idempotency, not `localeCompare`; clamping as the documented safety boundary).
- Owner-scoped RLS on all four dashboard-write tables; read-only policies for pipeline tables; **race-safe** casting cap (`on conflict … where count < limit`, least-privilege grants).
- Edge function hygiene: validates inputs before consuming a cap unit; never leaks the key; clean error mapping.
- Client discipline: monotonic request-id guards on every fetch; `aliveRef` unmount guards; optimistic writes with rollback + a `clientWriteState` machine preventing local/remote duplication.
- A11y above average (focus trap, scroll lock, ARIA dialogs, keyboard tab-nav) + the new runtime/mobile verification gate.
- Auth flow correct (middleware refresh + gate, server-component redirect backstop); `tsc` clean under strict.

## Recommended remediation order
1. **Safety net:** Vitest units on `lib/*` + pin Supabase deps + CI `tsc`/test gate (#2, #6) — cheap, protects refactors.
2. **Security hardening:** `casting-proxy` Origin allowlist + remove signup UI + document the trusted-operator boundary (#4, #5).
3. **Contract hygiene:** freeze the in-repo `jobs` contract (#9) + the `runtime` label/ownership fix (#10).
4. **Mechanical component extraction** from `ControlRoom.tsx` (#1 phase 1) — unblocks reviewable diffs + a home for component tests.
5. **State decomposition** into feature hooks (#1 phase 2) — cuts re-render scope.
6. **Realtime/polling + casting bracket↔`voice_id` reconcile** (#3, #8) — lands cleanly on the refactored state.

## Cross-team items (for the HQ / pipeline)
- #7 `review_kind`/`park_reason` field so the dashboard stops inferring park kind.
- #10 `characters.runtime` ownership ruling (editable vs pipeline-measured).
- #9 mirror the frozen `jobs` write-contract both sides reference.
