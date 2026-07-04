# Build spec — Character bench SUB-LANE 1: Aurora "Characters" read surface

_Architect (Claude), 2026-07-04. Parent slice: `slice-character-bench-retire-legacy.md` §4 sub-lane 1
("Bench list + read"). This is the small, safe, READ-ONLY foothold. No migration, no shared seam, no
new write path. Builder = Codex; reviewers = Fable-5 (cross-vendor) + suerta (same-vendor L-2);
Architect commits + squash-merges after live-ratify._

## Goal

An Aurora-native, **read-only** global "Characters" surface: a grid of cards, one per character, showing
cast/visual status + concept, reachable at `?hub=characters`, with each card linking into the EXISTING edit
surface. Retires nothing yet — purely additive. It makes the character roster visible in Aurora so
sub-lanes 2–5 can progressively re-home CRUD and delete the legacy shell.

## Non-negotiables (argue first if any is wrong — rule 14)

- **Read-only.** No `characters` writes, no casting calls, no migration, `casting-proxy` untouched.
- **Reuse the data/logic seams VERBATIM — rebuild only chrome:**
  - `useCharacters(supabase)` → `chars`, `loading`, `loadError`, `refetch` (`src/lib/hooks/useCharacters.ts:23`).
    ControlRoom already consumes it (`ControlRoom.tsx:481`); do NOT add a second fetch.
  - Voice-cast = `isCast(character)` (`src/lib/casting.ts:390`). Visual-cast = `isVisuallyCast(character)`
    (`src/lib/castingVisual.ts:24`). Use these functions; do NOT re-derive status from raw columns.
  - Initials = `characterInitials(...)` (`ControlRoom.tsx:225`).
- **No capability lost / additive only.** Do NOT re-point the workspace "Manage all characters →" or the
  uncast "Create New" (those belong to sub-lane 2). Leave `openLegacyConsole("roster")` call sites at
  `ControlRoom.tsx:2077` and `:2218` UNCHANGED.
- **No new colors/tokens.** Reuse existing Aurora primitives (`.glass-panel`, `.channels-grid`,
  `.channel-card`, `.avatar*`, `.status-chip`/`.status-cast`/`.status-uncast`, `.badge*`, `.section-header`,
  `.au-empty`) — all already AA-measured. A `.characters-grid`/`.character-card` alias is fine if it only
  re-declares layout already present for channels; prefer reusing the existing classes directly.

## Files in scope (declare-and-touch-only)

1. `src/lib/route.ts` — add `"characters"` to `HubKey` (`route.ts:1`) and `HUB_KEYS` (`route.ts:7`). Nothing
   else changes — `isHubKey`, `scopeToSearch`, `parseScope` all handle it for free.
2. `src/lib/__tests__/route.test.ts` — add a case: `?hub=characters` parses to
   `{kind:"hub",hub:"characters"}` with no canonicalize; keep existing cases green.
3. `src/components/aurora/CharactersHub.tsx` — NEW. Presentational, props-driven, cloned from
   `ChannelsHub.tsx` structure (loading/error/empty/cards + card component + avatar).
4. `src/components/ControlRoom.tsx` — (a) build the `characterCards` view-model from `chars`; (b) add the
   `hub === "characters"` dispatch branch (mirror the `overview` block at `:1747-1771`, render
   `<CharactersHub/>` inside `<AuroraShell>`); (c) a read handler `onOpenCharacter(id)` (see below);
   (d) an additive "Characters →" entry button in the ChannelsHub section header path.
5. `src/components/aurora/ChannelsHub.tsx` — add an optional `onOpenCharacters?: () => void` prop; when
   present, render the "Characters →" secondary button in the `section-header` (beside "New Channel").
   Keep it presentational/props-driven (no navigation logic inside the component).
6. `src/components/aurora/HubLanding.tsx` — thread the `onOpenCharacters` prop through to `ChannelsHub`
   (add it to `channels` / `HubLandingProps` as appropriate).
7. `src/app/aurora.css` — ONLY if a new class alias is genuinely needed; otherwise no change.

## Behavior / states (spec every state — rule 29)

**Route + dispatch**
- `?hub=characters` → renders the bench inside `AuroraShell` (NOT the legacy `.cr` shell, NOT a redirect to
  channels). Guard identically to the other hub branches (`!legacyShellOpen && scope.kind==="hub" && scope.hub==="characters"`).

**Entry point (additive)**
- Add a secondary, discoverable control to reach the bench: a ghost/secondary button labelled
  **"Characters →"** in the Channels hub `section-header` (beside "New Channel", `ChannelsHub.tsx:60`),
  wired to `navigate({kind:"hub",hub:"characters"})`. Additive only; the existing "New Channel" button and
  every other path stay identical. (Plumb an `onOpenCharacters` prop through `HubLanding`→`ChannelsHub`, or
  add it in the ChannelsHub header — Codex's call; keep ChannelsHub presentational/props-driven.)
- The bench must offer a "Back to Channels" affordance (mirror the overview/actions branches:
  `navigate({kind:"hub",hub:DEFAULT_HUB})`).

**Card grid**
- One card per character in `chars`, in the hook's existing order.
- Each card shows: avatar (cast gradient `avatar--cast` when `isCast`, else `avatar-uncast` hatch),
  **codename**, **concept** (fallback "No concept logged yet." to match the legacy roster copy at
  `ControlRoom.tsx:2446`), and TWO status chips:
  - **Voice** — `status-chip status-cast` "Voice: Cast" when `isCast`, else `status-chip status-uncast` "Voice: Uncast".
  - **Visual** — `status-chip status-cast` "Visual: Cast" when `isVisuallyCast`, else `status-uncast` "Visual: Uncast".
- Optionally surface `status === "draft"` as a `badge badge-neutral` "Draft" (matches roster's Draft chip);
  keep it subordinate to the cast chips.
- Card is activatable (mirror `ChannelCard`: `role="button"`, `tabIndex=0`, `onClick` + Enter/Space via the
  existing `isActivationKey` helper). Activation → `onOpenCharacter(card.id)`.

**Card activation → open in the existing editor (the one new wire)**
- `onOpenCharacter(id)` opens the character in the EXISTING legacy roster dossier editor with that character
  pre-selected. Reuse the existing dirty-guard + legacy-console bridge; set the active character via the
  existing guarded setter (the same one the roster list uses, `guardedSetActiveId`, `ControlRoom.tsx:2439`)
  and open `openLegacyConsole("roster")`. Do NOT duplicate guard logic — compose the existing pieces so the
  dirty-guard fires exactly once and the console opens with `activeId === id`. No new edit/write logic.

**Non-happy states (all required)**
- **loading** — skeleton grid (clone `ChannelsHub`'s `LoadingGrid`, character-flavoured labels).
- **error** — `loadError` present → error panel with a Retry that calls `refetch()`/`fetchCharacters()`
  (clone `ChannelsHub`'s `ErrorState`; give it the retry the channels one lacks, wired to the hook).
- **empty** — `chars.length === 0` → an `au-empty` state ("No characters yet"). (Won't occur live — 3 rows —
  but must render.)

## Responsive / a11y (rule 29 + AGENTS.md baseline)

- Grid = `.channels-grid` (`auto-fill minmax(300px,1fr)`) → responsive by construction; verify 412 / ~800 / 1440.
- `:focus-visible` ring on every card and the entry button; full keyboard reach + Enter/Space activation.
- WCAG 2.2 AA both themes — reuses AA-measured primitives; confirm card text + both chips + avatar at 412
  dark AND light at the ratify gate.
- `prefers-reduced-motion` — card hover lift already respects the existing reduced-motion rules; add no new motion.

## Acceptance gates (falsifiable; live-ratified before merge)

- **B1** `?hub=characters` renders the bench in AuroraShell (not legacy, not redirected).
- **B2** card count === live `characters` row count; each card's codename + concept match the row.
- **B3** each card's Voice chip === `isCast(char)` and Visual chip === `isVisuallyCast(char)` (cross-checked
  against the live DB; current live truth: 3 chars, all Voice-Cast, all Visual-Uncast).
- **B4** activation (click + Enter + Space) opens the legacy roster with `activeId === card.id`; the
  dirty-guard still fires (edit-in-progress → guarded, not bypassed).
- **B5** the ChannelsHub "Characters →" button navigates to `?hub=characters`; Back returns to `?hub=channels`.
- **B6** `npm test` (route tests incl. the new case) green; `tsc` + `next build` clean.
- **B7** AA measured at 412 + 1440 in dark + light (card text, both chips, avatar); focus-visible + keyboard
  nav verified; reduced-motion respected.
- **B8** loading, error (with working Retry), and empty states all render.

## Out of scope (do NOT build here)

Dossier editor re-home, re-pointing existing "Manage all characters →"/"Create New", history/restore
re-skin, new-channel Aurora form, any legacy-shell deletion — all later sub-lanes. No deep character detail
route (cards link into the existing legacy editor for now).
