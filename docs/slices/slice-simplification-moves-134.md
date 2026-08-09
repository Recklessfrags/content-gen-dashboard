# Slice: Simplification redo — moves 1 + 3 + 4 + 6 (frozen spec)

From the 2026-08-07 close-out (SPEC A, operator-requested "make it easier to use").
Three moves, **each its own reviewed commit**. Dashboard-only; no migrations, no
shared-surface writes, no new spend paths. Builder = Codex; this doc is the contract.

## Diagnosis being fixed

12 destinations + ~8 overlays; approvals appear in 3 places; 3 hidden hubs
(`actions` / `overview` / `reveal`) the nav won't admit you're on; a 4-tab channel
workspace where 2 tabs are placeholders.

## Move 1 — ONE approval queue, on Home

Today: (a) `HubLanding` renders a teaser "ACTION CENTER" panel whose "Review All"
navigates to (b) the hidden `?hub=actions` hub rendering `ActionCenter`; (c)
`RunsHub` shows "Needs approval" verdicts with no path to the queue.

Target:
1. `HubLanding` hosts the **full** `ActionCenter` queue (the canonical one — real
   rows, `QueueActionDialog`/`FactClaimsReviewSection` confirm flow, errored/stuck
   section, `RenderPlayer`). Layout: the hero grid keeps the System Glance panel;
   the teaser article is **replaced** by the full `ActionCenter` section rendered
   before `ChannelsHub`. Empty queue renders ActionCenter's existing "All clear"
   state — keep it compact.
2. `ActionCenter` prop changes:
   - `onBack` becomes optional; when absent, no "Back to Channels" button (it now
     lives on Home).
   - `onOpenRevealPreview` is **removed** (reveal hub retired in move 3). A
     reveal-parked row keeps its park chip + explanation line but renders **no
     primary action button** (the reveal decision surface is a ruled-B,
     low-priority future build — see 2026-07-23 evening rulings).
   - "Preview reveal approvals" header button: removed.
3. `ControlRoom`: delete the `hub === "actions"` render block; pass the full
   queue props through `hubLandingProps` (replace the `actions` teaser prop shape);
   drop now-unused teaser plumbing (`hubActionItems`, `onReviewAll`).
4. `route.ts`: remove `"actions"` from `HubKey`/`HUB_KEYS`. Old `?hub=actions`
   deep links canonicalize to the default hub (Home) — which hosts the queue, so
   the destination is preserved.
5. `RunsHub`: cards whose terminal state is `approval_required` gain ONE compact
   affordance "Review approvals →" via a new optional prop `onReviewApprovals`
   (ControlRoom wires it to `navigate({ kind: "hub", hub: DEFAULT_HUB })`). No
   other RunsHub copy changes.

## Move 3 — retire dead rooms (Reveal out; Overview folds into Home)

1. `route.ts`: remove `"overview"` and `"reveal"` from `HubKey`/`HUB_KEYS`.
   Deep links canonicalize to default (already the parser's behavior).
2. `ControlRoom`: delete the `overview` and `reveal` render blocks; delete the
   reveal-fixtures state + loading effect + `submitRevealDecisions`; remove the
   now-unused `revealApproval` imports. **Keep** `src/lib/revealApproval.ts` and
   its test (they encode the ruled reveal-approval row contract for the future
   edge-function build); only the UI goes.
3. Delete `src/components/aurora/RevealHub.tsx`.
4. Delete `src/components/controlroom/OverviewDashboard.tsx` (its only render
   site was the retired hub; the aurora.css comment marks it chrome-only).
   Do NOT remove `.overview-hub__head` CSS — the Global cost center reuses it.
5. **Fold into Home:** the Global cost center overlay's only entry point today is
   the (dying, see move 4) Cost tab button. Add "View global cost center →" to
   Home's System Glance panel next to the 30-Day Spend readout, opening the same
   overlay (`setCostCenterOpen(true)` wired through a `HubLanding` prop).
6. Nav-highlight remap simplifies to:
   `activeKey = scope.kind === "workspace" ? "channels" : scope.hub` — every
   remaining hub is a real nav destination; the nav never points at a page it
   won't admit you're on.
7. Keep the `reveal` park-kind classification in ControlRoom (jobs may still park
   that way; the queue row explains it, actionless).
8. The `NEXT_PUBLIC_REVEAL_WRITE_ENABLED` flag check dies with
   `submitRevealDecisions`. `MOCK_REVIEW_FIXTURES` stays — it belongs to
   `ReviewHub` (the Review nav hub, mock→real HELD, not in scope).

## Move 4 — collapse the workspace tab strip to the 2 real tabs

1. `route.ts`: `WorkspaceTab` / `WORKSPACE_TABS` → `["character", "guidelines"]`;
   `DEFAULT_TAB` → `"guidelines"` (the channel's own config surface — also where
   "Assign Character" already lands). Old `?tab=production` / `?tab=cost` deep
   links canonicalize to the default tab automatically.
2. `ControlRoom`: remove the Production tab block (readiness checklist + deferred
   panel) and the Cost tab block (pure "coming soon" placeholder);
   remove `renderDeferredWorkspacePanel` and `WORKSPACE_TAB_LABELS` entries for
   the dropped tabs. Cast/readiness status stays visible via the workspace-header
   badges and the two remaining tabs.
3. The Cost tab's "View global cost center" affordance is replaced by the Home
   glance entry point added in move 3.5 (land move 3 before move 4, or note the
   temporary orphan inside the same session — both moves ship together here).

## Move 6 — retire the global Basic/Advanced toggle (added 2026-08-09)

One good default (basic), advanced controls behind the LOCAL "show advanced"
affordances that already exist — the global header toggle and its context go.

1. Delete `src/components/aurora/UiModeContext.tsx` + `src/lib/uiMode.ts`; remove
   `UiModeProvider` from `src/app/page.tsx`; remove the header mode-toggle block,
   `useUiMode` import, and `data-ui-mode` attribute from `AuroraShell.tsx` (no CSS
   references it).
2. `CastingStudioPanel` + `ChannelProfilesPanel`: replace the `basicMode` /
   `onShowAdvanced` props with internal `useState(false)` reveal state; the
   existing "show advanced" buttons flip it locally. `castingControlVisibility`
   keeps its signature (fed `!showAdvanced`). Remove the props at every call site.
3. ControlRoom dossier editor: `showAdvancedFields` becomes local state
   (default false); its "Show advanced settings" button and the
   CharacterGenerator `onGenerated` handler (which must keep revealing the
   generated bible detail) set it true.
4. The stored localStorage preference dies with the context — acceptable: basic
   is the ruled default; advanced is a per-visit, per-panel reveal.

## Acceptance gates (measured on the real artifact)

- `npx tsc --noEmit` clean · full vitest suite green (update `route.test.ts` and
  any test referencing removed hubs/tabs; do not delete unrelated assertions) ·
  `next build` green.
- `?hub=actions`, `?hub=overview`, `?hub=reveal`, `?tab=production`, `?tab=cost`
  all canonicalize (route tests assert this).
- Home renders the full queue: a parked job shows its real action button and the
  confirm flow; errored/stuck section present; empty state "All clear".
- Nav `aria-current` never lands on a removed key; workspace still maps to
  Channels.
- Cross-vendor (Gemini) review before merge; verify findings against reality.

## Explicitly out of scope

Move 5 (unify casting) — its own slice. Move 6 (Basic/Advanced toggle). The
ControlRoom.tsx god-component split. ReviewHub/scoring (HELD). Anything
touching `jobs`/`channel_profiles`/`characters` writes or migrations.
