# Slice 5g — delete the legacy `.cr` shell (+ the Aurora sign-out gap fix)

_2026-07-13. Architect (Claude). The migration payoff recorded since 2026-07-05 ("⭐ 5g is
still the migration payoff", SESSION-HANDOFF §NEXT). Preconditions re-verified this session
by a read-only reachability sweep of the live code (every claim cited file:line in the
sweep report; key findings restated here). **Consensus review required: Gemini cross-vendor
+ suerta (L-2)** — this deletes a whole UI surface and touches the approvals/casting host
component. No migration, no shared-seam change, no new write path._

## Why now

- 5b (The Wire Aurora home + EnqueueIdeaPanel) landed in #127 — the last buildable
  reachability gap named by the 5g plan.
- 5c (Runs) is superseded: the Runs hub (`?hub=runs`, shipped 2026-07-06) + channel filter
  (#144) + group-by-state (#147) give runs a richer Aurora home than the legacy view.
- The reachability sweep (2026-07-13) found **every legacy view has an Aurora equivalent**
  (table below), with exactly one entry-point drop (ruled, receipt below) and one genuine
  capability gap this slice must FIX before deleting: **Aurora has no sign-out**.

## Reachability verdicts (sweep, 2026-07-13)

| Legacy view | Aurora home | Verdict |
| --- | --- | --- |
| roster (dossier editor) | Characters hub bench — renders the **same** `renderDossierEditor` | equivalent |
| channels | Channels hub / new-channel surface / workspace Guidelines — same `ChannelProfilesPanel` | equivalent |
| wire (ideas) | Ideas hub — capture, status segments, same `openEnqueuePanel` | equivalent |
| queue (approvals) | Action Center — same `requestQueueAction`/`confirmQueueAction`, its own inline confirm (`au-inline-confirm`), NOT the legacy `QueueActionDialog` mount | equivalent, minus run-detail (receipt below) |
| runs | Runs hub — own per-worker diagnostics (`RunReceiptRow`/`RunDiagnostics`) | equivalent (superior) |
| overview | Aurora overview hub — same `OverviewDashboard` | equivalent |
| cost | Aurora global cost center — same `CostBoxDashboard` + `RunCostEstimate` | equivalent |
| rail Exit (sign-out) | **NONE — gap. Fixed by this slice (§Scope A).** | gap → fix here |

**Ruled drop (rule-19 receipt — operator may flag):** the legacy queue/runs views' "Open
Run Detail" receipts modal (`DrillDownPanel`) gets no Action Center port. Derivation: the
Runs hub's per-worker diagnostics view was purpose-built (2026-07-06) as the "why did it
fail / which worker" surface and supersedes the modal; the Action Center keeps its park/
error text; duplicating a receipts modal into the approvals surface contradicts the
declutter direction. Scope-limit: if the operator wants receipts visible at the approval
moment, that's a small follow-up (link or inline expand), not a blocker. Status: proceeding.

**Ruled deferral:** relocating `globalOverlays` (DiscardChangesDialog, casting/visual/
enqueue overlays) inside `AuroraShell` is NOT in this slice. The sweep verified the delete
does not orphan them — every Aurora branch already renders `{globalOverlays}` — and moving
live money-path overlays into a different stacking/theming context is separate risk for
zero 5g benefit. (The old "folds into 5g" note assumed the delete would force it; it
doesn't.) Recorded as deferred UI alongside the Advanced-mode regroup.

## Scope

### A. AuroraShell sign-out (build FIRST — the delete is blocked on it)

`src/components/aurora/AuroraShell.tsx` gains an optional sign-out slot rendered in
`header-actions` (by the operator avatar):

- **Slot, not data props (folded from the Gemini spec review):** AuroraShell takes a
  `signOutSlot?: ReactNode` (name is the builder's call) rendered in `header-actions`;
  **ControlRoom authors the `<form action="/auth/signout" method="post">` JSX itself**
  and passes it in — the form, its `exitFormRef`, and the `handleExitSubmit` dirty-guard
  interception (ControlRoom.tsx:2075–2081) stay in ControlRoom, exactly as the legacy rail
  form works today (3387–3404). No prop-drilling of auth concerns into the shell.
  (Verified 2026-07-13: `/auth/signout` is a plain Supabase `auth.signOut()` route handler
  with NO CSRF token or hidden inputs — the reviewer's csrfToken premise was wrong, the
  slot design is adopted on its own merits.)
- **The dirty-guard survives:** with unsaved dossier edits, submit is intercepted and
  `DiscardChangesDialog` shows; the form actually submits on confirm.
- Accessible name includes the account email (`Sign out <email>`), matching the legacy
  button's `aria-label`.
- Every `<AuroraShell …>` call site in ControlRoom passes the slot (all branches must have
  sign-out — it's the app's only logout once the legacy rail is gone).
- Styling: Aurora-native (aurora.css), correct in BOTH themes, ≥44px tap target, visible
  `:focus-visible` state, works at 412 / 700 / 1440 px. States: default, hover, focus,
  active. (No async state — it's a plain form POST; no disabled state exists today and
  none is added.)

### B. The delete (ControlRoom.tsx ~3317–4205 + plumbing)

Remove, verifying each against the sweep inventory:

1. The legacy shell JSX branch (`<div className="cr">`, ~3317–4205) including the
   legacy-only `QueueActionDialog` mount (~4189–4203) and BOTH `DrillDownPanel` mounts
   (~4038–4050, ~4149–4161).
2. Legacy-only state/plumbing: `view`/`setView`, `legacyShellOpen`/`setLegacyShellOpen`,
   `channelsAutoNew` (already dead — no `setChannelsAutoNew(true)` exists), `VIEW_KEYS`/
   `VIEW_NAV_ITEMS`/`viewTabId`/`isView`/`readViewFromUrl`/`viewUrl`/`PRIMARY_VIEW_PANEL_ID`,
   `viewTabRefs`, `openLegacyConsole`/`openLegacyConsoleUnguarded`, `guardedSetView`/
   `activateViewTab`/`handleViewTabKeyDown`/`focusViewTab`, the `popstate` `?view=` restore
   branch (~1170–1186), run-detail plumbing `openRunDetail`/`activeEpisode`/`closeRunDetail`,
   and every now-constant `!legacyShellOpen` guard term (render branches ~2508–3315,
   polling enables ~796/800, `showAdvancedFields` ~2200, scope effects ~1107–1226).
3. The `onOpenLegacyConsole` wiring (~2050) and the HubLanding "Legacy console" button
   (`aurora/HubLanding.tsx` — button + prop + type).
4. `src/components/controlroom/DrillDownPanel.tsx` — DELETE the file (sweep: zero
   non-legacy importers). **KEEP `QueueActionDialog.tsx`** — its `FactClaimsReviewSection`
   export is used by `ActionCenter` and `RevealHub`; only the ControlRoom import + mount go.
5. `src/app/globals.css` legacy-shell blocks — **grep-verified per selector before each
   deletion** (zero references left in `src/`): `.cr`, `.rail`, `.brand`, `.navbtn`,
   `.railspacer`, `.main`, `.roster*`, `.pcard`, `.wire*`, `.icard*`, `.queue-card-*`,
   `.status-badge`, `.col-head`, `.cap`, `.filter-chips`, `.status-segmented-control`,
   `.segment-btn`, `.stale-affordance`, `.job-review-panel`, `.runcard`,
   `.enqueue-trigger`, `.statusbtn`, and the DrillDownPanel styles.
   > **Correction (Architect ruling, 2026-07-13, post-freeze — logged, not silent):** the
   > sweep-inherited list above wrongly marked `.main`, `.roster`, `.pcard`, `.cap`,
   > `.col-head`, `.status-segmented-control`, `.segment-btn` as legacy-only. Build-time
   > grep proved all seven LIVE in surviving panels (ChannelProfilesPanel `.main`/`.roster`/
   > `.pcard` — `.pcard` via a composed className; Overview/CostBox `.cap`/`.col-head`;
   > EnqueueIdeaPanel/CastingStudio `.status-segmented-control`/`.segment-btn`). They are
   > KEPT. The "grep wins over the list" rule in this section is what caught it; the
   > cross-vendor reviewer's demand to delete them per the literal list was refuted
   > against reality. Genuinely dead residue (`.filter-chips`, `.statusbtn`, `.wire-list`
   > tokens, dead locals, a write-only focus ref) was removed in the cleanup pass.
   **DO NOT TOUCH** (Aurora's characters bench reuses `renderDossierEditor` /
   `renderMobileRoster`): `.dossier*`, `.dossier-visual-attachment*`, `.mobile-roster*`,
   `.preview-banner*`, `.filecode`, `.history-trigger` — and anything else a grep still
   finds referenced. When in doubt, KEEP the CSS (dead CSS is a follow-up nit; deleted
   live CSS is a regression).

### Keep (explicitly NOT in scope)

- `src/lib/route.ts` `?view=` canonicalization + its two tests — that's the redirect
  contract that lands old `?view=` bookmarks on Aurora. It stays.
- `globalOverlays` structure/placement (ruled deferral above).
- Any behavior change to approvals, casting, enqueue, polling semantics (beyond dropping
  the constant `legacyShellOpen` terms), or the dossier editor.

## Acceptance gates (falsifiable)

1. `npx tsc --noEmit` clean · `npx vitest run` all pass (229 baseline, none deleted except
   any that exercised legacy-only behavior — sweep found none) · `npx next build` clean.
2. `git grep -nE "legacyShellOpen|openLegacyConsole|channelsAutoNew|DrillDownPanel|readViewFromUrl|viewUrl|VIEW_NAV_ITEMS" src/` → **zero matches**.
3. `git grep -n 'className="cr"' src/` → zero matches; every deleted CSS selector greps to
   zero references in `src/`; `.dossier`, `.mobile-roster`, `.preview-banner`, `.filecode`,
   `.history-trigger` still present in globals.css AND still referenced.
4. route tests still assert `?view=queue` / `?view=runs` → canonicalize to the default hub.
5. Sign-out: present on every Aurora branch's header; form `action="/auth/signout"`
   `method="post"`; accessible name contains the email; **dirty-guard measured** — with
   unsaved dossier edits, activating sign-out shows DiscardChangesDialog and does NOT
   navigate; confirming discards then submits the form. **Keyboard-triggerable:** Enter on
   the focused button fires the same interception (measured, not inferred).
6. No-capability-lost walk (runtime, prod build): each row of the reachability table
   renders and its primary action works — channels hub, characters bench editor (+History/
   Compare/Casting/Visual), ideas capture + "Queue as run" panel opens, Action Center
   approve confirm appears (intercept-and-abort — zero live writes), Runs hub diagnostics
   expand, overview, cost center. At 412 AND 1440 px, both themes for the shell chrome.
   Plus: **a triggered global overlay renders correctly** (open the casting or enqueue
   overlay — visual check, since overlays render outside the shell), and **browser
   Back/Forward between two hubs** lands on the right hub with no legacy resurrect
   (the `?view=` popstate branch is gone).
7. `wc -l src/components/ControlRoom.tsx` shrinks by ≥800 lines (sanity: the legacy branch
   alone is ~890).

## Build notes (Codex)

- Declared files: `src/components/ControlRoom.tsx`, `src/components/aurora/AuroraShell.tsx`,
  `src/components/aurora/HubLanding.tsx`, `src/app/globals.css`, `src/app/aurora.css`
  (sign-out styles), DELETE `src/components/controlroom/DrillDownPanel.tsx`, plus test
  files if a new test is added for the sign-out slot. Nothing else.
- Argue with this spec BEFORE building (silent compliance = defect). In particular: if you
  find a legacy-only action the sweep missed, STOP and report — do not invent an Aurora
  home for it.
- Do not edit `docs/HANDOFF.md`.
