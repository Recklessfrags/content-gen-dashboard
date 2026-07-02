# Slice — Channel-first Phase 1 (design system + hub/workspace shell)

_Status: **SPEC — L-4 reviewed, ready to pair with the design** (Gemini cross-vendor review
2026-07-02 = REQUEST-CHANGES, all 5 blockers + improvements folded; not yet built).
Author: Architect (Claude), 2026-07-02. Direction source: `DIRECTION.md` D-6 +
`docs/design/channel-first-redefinition.md` (the ratified design + phased plan + review
trail). Visual track: `docs/design/phase1-visual-brief.md` (design-system + direction
exploration — build is GATED on the operator picking a direction). Process per `AGENTS.md`:
Architect specs → Gemini designs → Codex builds → Gemini + suerta review → browser-ratify._

_Operator scope calls (2026-07-02): visual identity = **explore 2–3 directions, operator
picks**; slice size = **full Phase 1 in ONE slice** (design system + hub + Action Center +
workspace shell + ALL re-parented surfaces rebuilt against the system). Phases 2 and 3 stay
separate (this answer sized Phase 0/1, not a collapse of 2/3 into it)._

---

## 1. Goal (what this slice delivers)

Replace today's **7 flat, disconnected nav tabs** (one 2,471-line `ControlRoom.tsx`) with the
ratified **hub-and-spoke** IA, **rebuilt against a first-class design system** — the operator
visual mandate. One slice delivers:

1. **Design system** (tokens + primitives) — the new look & feel; per `phase1-visual-brief.md`,
   built against the operator-chosen direction. WCAG 2.2 AA.
2. **Global Channels hub** — grid of channel cards, "+ New channel", empty state.
3. **Global Action Center** — the cross-channel, inline-actionable approval queue
   (Correction 3 — this is load-bearing; see §5).
4. **System overview** — global read-only roll-up (today's Overview + global Cost).
5. **Per-channel workspace shell** — sub-nav **Production · Character · Guidelines · Cost**,
   with today's data/logic seams **re-parented and rebuilt** against the design system.

**Kills:** F1 (no spine — for navigation/onboarding), F2 (no cross-view links), F6 (themed
vocabulary), the tab-hop tax, and the "not good enough" look.

**Explicitly NOT in this slice (stay Phase 2/3 — do not build here):**
- **Phase 2:** the `channel_profiles.character_id` FK (expand/contract), and casting **elevated
  out of its modal** into a split-screen Character surface. Phase 1 re-parents the Character
  surface and keeps casting reachable via its **existing modal entry points**, rebuilt visually.
- **Phase 3:** the **unified threaded** Production view and onboarding auto-routing. Phase 1
  re-homes Ideas/Queue/Runs into the Production surface **as channel-scoped sections**, but does
  NOT stitch idea→job→episode into one thread (that needs the idempotency map + the pipeline
  correlation key — §4).

---

## 2. Non-negotiable constraints

- **D-2 stands:** focused control tool, NOT a kanban/analytics board. This slice reshapes the
  **spine**, not the scope. No new capability beyond re-parenting + visual rebuild + the hub/
  Action Center shell.
- **Routing:** extend the **existing Next.js URL-state routing** (`?view=` +
  `history.pushState/replaceState`, `viewUrl()` in `ControlRoom.tsx`). **Do NOT add a router
  library.** New URL state must express hub-vs-workspace and the active channel + sub-nav.
- **Architect never writes app/design code.** Gemini designs (`docs/design/`), Codex builds,
  Architect commits.
- **Nothing lost:** every capability reachable today (character CRUD/bible history/preview/
  restore, ideas capture, channel CRUD, queue approvals, run/receipt drill-down, casting voice+
  visual, cost) must stay reachable after re-parenting.
- **Reduced-motion, focus-visible, keyboard nav, semantic structure, all component states**
  (default/hover/focus/active/disabled/loading/empty/error) per `AGENTS.md` UI baseline.

---

## 3. URL-state routing model (extend, don't replace)

Today: a single `?view=<roster|channels|wire|queue|runs|overview|cost>`. New model — two
scopes expressed in the query string, back/forward-safe, refresh-restoring:

| Scope | URL shape | Notes |
| --- | --- | --- |
| **Hub** (default landing) | `?hub=channels` \| `?hub=actions` \| `?hub=overview` | Global surfaces. Bare `/` → `?hub=channels`. |
| **Workspace** | `?channel=<codename>&tab=production\|character\|guidelines\|cost` | `channel` = `channel_profiles.channel` PK codename. Missing/unknown `channel` → redirect to `?hub=channels` (mirror today's stale-`?view=` guard at `ControlRoom.tsx:1119`). **Missing/invalid `tab` → default `tab=production`** (canonicalize via `replaceState`). |

- Keep the same `pushState` on user nav / `replaceState` on canonicalize pattern already proven.
- `viewUrl()` generalizes to `hubUrl()` / `workspaceUrl(channel, tab)` (Codex's call on exact
  helper shape — the requirement is: URL is the single source of truth for scope, refresh
  restores it, back/forward work, no router lib).
- **App-Router sync (buildability — reviewer BLOCKER):** in Next.js 15 App Router, a native
  `window.history.pushState` does **not** re-render the React tree or update `useSearchParams`.
  Today's `ControlRoom.tsx` already handles this correctly: it reads `window.location.search` into
  **local component state** and syncs via a **`popstate` listener** (NOT `useSearchParams`-driven
  rendering). **Extend THAT proven pattern** — active scope (hub/channel/tab) lives in local state,
  written to the URL via `pushState`/`replaceState` and re-read on `popstate`. Do **not** introduce
  `useSearchParams`-driven rendering that desyncs from the manual `pushState`.
- **Deep-link back-compat (Q3 RESOLVED):** any legacy `?view=<...>` link does a **one-time
  `replaceState` redirect to `?hub=channels`** (safest, lowest-effort, no 404s). No per-value
  mapping — the IA changed enough that a clean landing on the hub is correct.

---

## 4. Channel-scoping DATA REALITY (load-bearing — read before building any scoped view)

Verified against `docs/contracts/data-contract.md` 2026-07-02. **The design doc's "ideas/jobs/
episodes already carry a channel" is only true for ideas and jobs — NOT episodes.** This is the
same rule-24 trap suerta caught in Correction 1, resurfacing at the scoping layer. Build to THIS
table, not the prose:

| Surface | Channel-scopable in Phase 1? | Mechanism |
| --- | --- | --- |
| **Guidelines** (`channel_profiles`) | ✅ yes — it **is** the channel row | PK `channel` |
| **Ideas** (The Wire) | ✅ yes | `ideas.channel` (text NOT NULL, default 'Food') |
| **Queue** (`jobs`) | ✅ yes | `jobs.channel` (text; tolerant resolution) |
| **Runs** (`episodes`) | ❌ **no** | `episodes` has **no channel column**; `character_id` exists but is **unpopulated (0 rows linked)** |
| **Cost** (`receipts`→`episodes`) | ❌ **no reliable per-channel** | rides on `episodes`; no channel key |
| **Character** | loose free-text only | `channel_profiles.character` (text) — Phase-2 FK elevates this |

**Consequences the build MUST honor:**
- **Production surface** scopes **Ideas + Queue** by channel (real columns). ✅
- **Runs are NOT channel-scopable in Phase 1.** Do **not** build a channel-filtered Runs list
  that silently shows global or empty data. Instead:
  - Runs live in the **global System overview** (Fork A roll-up) as the source of truth.
  - The per-channel Production surface shows a Runs section in the **honest DEFERRED state only**:
    "Per-channel runs arrive with the pipeline correlation key (Phase 3)" with a link to global
    Runs. **The best-effort food+character+time heuristic is explicitly PHASE 3** (Correction 1) —
    **do NOT pull it into Phase 1** (reviewer ruling, L-4). No "matched approximately" list here.
- **Cost:** the **global** Cost roll-up is solid (Fork A). **Per-channel Cost** rides on the same
  missing key → in Phase 1 the channel `Cost` tab shows the global-scoped Cost Box with an
  honest "per-channel spend arrives with the correlation key (Phase 3)" note. **Do not fabricate
  a per-channel number and do not use the heuristic** (Phase 3).
- **Ideas capture (`ideas.character_id` on INSERT):** `ideas.character_id` is a **nullable** FK →
  `characters.id`. When capturing an idea inside a channel workspace, resolve it as: **pre-fill**
  from the channel's cast character (best-effort name match of `channel_profiles.character` →
  `characters`) when matched, and **retain the existing manual character-select** (today's
  wire-capture control, `""`→`null` for the uuid FK) as the fallback / override. Never block an
  idea insert on an unresolved character — null is valid.
- **Character surface** uses today's loose `channel_profiles.character` free-text to show the
  channel's cast character (best-effort name match to `characters`); the real FK + de-modaled
  casting is **Phase 2**. If unmatched/uncast, show the uncast empty state.

> **Cross-team note (already filed, verify status before Phase 3):** the pipeline ask
> "Dashboard → Pipeline — ASK: emit a job↔episode correlation key" (2026-07-02) is the unlock
> for real per-channel Runs/Cost. Phase 1 does not depend on it; Phase 3 does.

---

## 5. Global Action Center (Correction 3 — must be a true inline queue)

The operator's highest-frequency daily job is the **approval/park-triage loop** — inherently
**cross-channel and time-ordered.** If the operator must enter a channel spoke to approve each
parked job, the F1 "spine" **regresses the one loop that runs daily.**

- The Action Center is a **global** hub surface listing **all** parked/actionable jobs across
  **all** channels, **sorted by wait/cost** (reuse today's actionable-first queue sort).
- Actions (**approve spend / reject / fact-approve / publish-gate**, whatever the current
  `QueueActionDialog` supports) are performed **inline, in place** — the operator never has to
  "select a channel first" to clear the queue. This loop is **explicitly exempt** from the
  hub→workspace drill.
- Each row shows its channel (chip) and links to that channel's workspace for context, but the
  action itself completes without leaving the Action Center.
- Reuse the existing job-action logic/validation verbatim (this is a re-parent + rebuild, not a
  behavior change). Poll-surviving (today's 5s polling on active queue) must be preserved.
- **Discard the modal UI, keep only the logic (reviewer):** the actions come from today's
  `QueueActionDialog`. In the Action Center, **reuse its handlers/validation but NOT its modal
  chrome** — the operator acts **inline in the row**, not by popping the old dialog. (A confirm
  step for destructive/spend actions is fine as an inline affordance or a lightweight rebuilt
  confirm, but the "select-then-open-a-modal-per-job" pattern would fail Correction 3.)

---

## 6. Fork A — hybrid roll-up + drill-down (build each component once)

Cost and the job/approval queue are **built once** and take an **optional `channelId`
(channel codename)** prop that toggles **aggregate (global)** vs **scoped (channel)**:
- `channelId` absent → global roll-up (hub: Action Center, System overview, global Cost).
- `channelId` present → channel-scoped (workspace: Production Queue/Ideas, channel Cost).
- **State must be cleanly prop-driven** — no channel's data may leak into another's view
  (design-doc §6 risk). No hidden module-level channel state.

---

## 7. Re-parenting map (today → new home; **rebuild against the design system**)

"Reuse" = reuse the **data/logic seams** (hooks, queries, action handlers, dialogs' logic), NOT
the current CSS/markup. Every surface is **rebuilt visually** against the design system.

| Today (`ControlRoom.tsx` + `controlroom/*`) | New home | Phase-1 treatment |
| --- | --- | --- |
| `channels` view — `ChannelProfilesPanel` (channel CRUD, incl. E1 persona hint) | **Hub: Channels grid** (card per `channel_profiles` row) + **Workspace: Guidelines** tab (the editor) | Grid is new; editor re-parented + rebuilt. "+ New channel" = create a `channel_profiles` row. |
| `overview` view — `OverviewDashboard` | **Hub: System overview** | Re-parented + rebuilt (global). |
| `cost` view — `CostBoxDashboard` | **Hub: System overview / global Cost** + **Workspace: Cost** tab | Fork A: one component, `channelId` toggles. Per-channel = honest state (§4). |
| `queue` view — jobs + `QueueActionDialog` | **Hub: Action Center** (global inline) + **Workspace: Production** (channel Queue section) | Fork A. Action logic reused verbatim (§5). |
| `wire` view — ideas capture + `EnqueueIdeaPanel` | **Workspace: Production** (Ideas section) | Channel-scoped via `ideas.channel`. |
| `runs` view — `episodes` + `DrillDownPanel` | **Hub: System overview / global Runs** + **Workspace: Production** (Runs section = honest state per §4) | Runs NOT channel-scopable in P1 (§4). |
| `roster` view — character dossier + `HistoryDrawer` + `CompareDialog` | **Workspace: Character** | Re-parented + rebuilt: dossier, bible history/preview/restore, compare. |
| `CastingStudioPanel` + `VisualIdentityPanel` (modals) | **Workspace: Character** (entry points) | Reachable via rebuilt modal triggers. **De-modaling → split-screen = Phase 2.** |

- Character in Phase 1 is shown **inside the selected channel's workspace** via the loose
  `channel_profiles.character` link (best-effort name match of the free-text `character` →
  `characters`). **Channel card / Character-surface thumbnail:** `channel_profiles` has **no
  thumbnail column** in Phase 1 — the cast avatar is resolved by that same best-effort name match
  to the character's ref image (`character-refs` signed URL); uncast/unmatched → placeholder.
- **Global character reachability (Q1 RESOLVED — reviewer BLOCKER, "nothing lost"):** a character
  **not** matched to any channel would otherwise be unreachable. Phase 1 **must** provide a
  reachable global path to **all** characters' CRUD/bible/casting — e.g. an **"All characters"**
  entry from the hub or a "manage characters" affordance in the workspace Character tab. This is a
  reachable path, **not** the full Phase-2 character bench (which needs the FK). Uncast characters
  must stay editable.

---

## 8. Component states, responsive, a11y (per `AGENTS.md`)

- **Every** new component spec (in the visual brief / design system) enumerates: default, hover,
  focus, active, disabled, **loading**, **empty**, **error**. The new async surfaces (channel
  grid, Action Center, scoped Production) need **robust async loading/error states** (design-doc
  §6) — no layout shift on load, no silent empty-vs-error ambiguity.
- **Responsive from the start:** hub grid, workspace sub-nav, and Action Center must work at
  **412px (mobile), ~700–880px (coarse band — mind the mobile-batch-1 savebar residuals,
  §4.F of that slice), and 1440px (desktop).** The workspace sub-nav needs a mobile treatment
  (the existing mobile channels bar pattern is a reference, not a mandate).
- **WCAG 2.2 AA:** contrast, visible focus (`:focus-visible`), keyboard nav across hub↔workspace,
  `prefers-reduced-motion` honored by all motion, target sizes ≥ 24×24 (AA) with the established
  44px coarse-pointer floor retained.

---

## 9. Design-system dependency (build gate)

App-code build is **gated on the operator picking a visual direction** (`phase1-visual-brief.md`
step 1). Sequence: Gemini produces 2–3 directions → operator picks → Gemini produces the full
design-system spec + all Phase-1 screen designs against it → **then** Codex builds. Codex builds
the design-system primitives first (tokens + base components), then hub, then workspace shell,
then each re-parented surface. The 2,420-line `globals.css` dossier theme is **replaced/
superseded** by the new system (Codex's migration approach — likely a new token layer + scoped
component styles — is a build decision; the requirement is the new look, cleanly, with the old
theme not bleeding through).

---

## 10. Gates (falsifiable, MEASURED on the real artifact — "floor ≠ done")

Ratified via `npm run ratify` / bespoke Playwright at **412px + a mid-width spot-check + 1440px**,
against a production build (`next start`, dedicated port), Supabase bridged (QA creds from the
operator — not in the container). For each gate: _could this pass while the thing I care about is
broken?_

**Structure / IA**
1. Bare `/` lands on the **Channels hub**; grid renders one card per `channel_profiles` row (count == live REST count).
2. "+ New channel" creates a `channel_profiles` row (intercept-and-abort the write; assert payload) and the grid reflects it.
3. Clicking a channel card enters its **workspace** at `?channel=<codename>&tab=production`; URL is the source of truth (refresh restores exact surface; back returns to hub; forward re-enters).
4. Workspace sub-nav switches Production/Character/Guidelines/Cost via URL; each tab reachable by keyboard; `:focus-visible` ring present.
5. **No capability lost:** character CRUD, bible history/preview/restore, compare, ideas capture, channel editor, queue approvals, run/receipt drill-down, casting voice+visual modals, cost — each reachable from the new IA (enumerated reachability walk).

**Action Center (Correction 3)**
6. Action Center lists parked/actionable jobs **across ≥2 channels** in one view, sorted by wait/cost.
7. An approve/reject/fact-approve action **completes inline** without navigating into a channel workspace (assert URL unchanged + intercepted payload correct + row updates). Poll (5s) does not clobber an open action.

**Channel-scoping honesty (§4)**
8. Production Ideas + Queue for a channel show **only that channel's** rows (assert against `ideas.channel` / `jobs.channel` REST counts; a second channel shows a disjoint set — no leak, Fork A prop-driven). _`ideas` is owner-scoped → the assertion REST call must carry the authenticated operator's token (QA creds) or it falsely returns 0._
9. Per-channel **Runs** and **Cost** show the **honest deferred/heuristic state** (labeled) — NOT a silent global or empty list masquerading as channel-scoped.

**Visual / design system**
10. Design tokens applied (no raw hex in re-parented components where a token exists — spot-check); the old dossier `--paper/--stamp` theme is not visually bleeding into rebuilt surfaces.
11. All enumerated component states present on the new async surfaces (loading/empty/error demonstrably distinct).
12. Contrast AA on primary text/controls (sampled); `prefers-reduced-motion` disables non-essential motion; no horizontal-scroll/occlusion regressions at 412px.

**Regression**
13. Re-walk the merged result after any conflict resolution (ledger: #46/#47 shipped broken past green gates).

---

## 11. Open items

_Q1–Q3 RESOLVED in the L-4 Gemini review (2026-07-02) and folded above:_
- **Q1 — global character access: RESOLVED** → Phase 1 provides a reachable global path to all
  characters' CRUD/bible/casting ("All characters" / "manage characters"); not the full Phase-2
  bench. See §7.
- **Q2 — per-channel Runs/Cost state: RESOLVED** → **deferred honest state only**; the
  food+character+time heuristic is **Phase 3**, not Phase 1. See §4.
- **Q3 — legacy `?view=` deep links: RESOLVED** → one-time `replaceState` redirect to
  `?hub=channels`. See §3.

_Still open for the operator / next reviewer:_
- **Migration size:** the 2,471-line monolith is split incrementally (design-doc §5 "no
  big-bang"). Even though the operator chose "full Phase 1 in one slice," Codex should build in
  reviewable lanes (design system → hub → workspace shell → surfaces), not one mega-diff.
- **suerta (L-2) second lens:** this slice touches no migration/money-path write directly, but it
  re-parents the money-path approval surface (Action Center) and a shared-config editor —
  recommend a suerta pass on the aggregate build diff before landing (additive to the cross-vendor
  gate), per L-2/L-4.
```
