# Build spec — Character bench SUB-LANE 2: Aurora dossier editor re-home

_Architect (Claude), 2026-07-04. Parent: `slice-character-bench-retire-legacy.md` §4 sub-lane 2. Builds on
sub-lane 1 (#92, the `?hub=characters` read bench). This is a **WRITE-PATH** lane (save + revision snapshot +
draft-create). Builder = Codex; reviewers = Fable-5 (cross-vendor) + suerta (L-2); Architect commits +
squash-merges after live-ratify. **Mandatory: live-ratify the create/save/revision path intercept-and-abort,
ZERO live writes.**_

## Goal

Re-home the character **dossier editor** out of the legacy `.cr` console into the Aurora `?hub=characters`
surface: selecting a bench card (or "Create New") opens the SAME dossier editor — reused verbatim — rendered
inside `AuroraShell`, re-skinned to Aurora. Then re-point every "edit a character" entry from the legacy roster
to this Aurora editor. No character capability lost.

## Strategy (decided — do NOT rewrite the form)

**Reuse the legacy dossier JSX + ALL its state/handlers VERBATIM under a scoped Aurora wrapper, and restyle via
a new `aurora.css` block** — exactly the ChannelProfilesPanel (`aurora.css:1264-1394`, `.channel-profiles.scoped`)
and casting-inline (`aurora.css:1752+`, `.casting-inline`) precedents. The chrome change is CSS + a re-parent,
NOT a `.form-*` rewrite. The write-path/dirty/history wiring is reused unchanged — that is the whole point and
the main regression guard.

## Non-negotiables (argue first if any is wrong — rule 14)

- **Reuse verbatim** (no new write path, no logic change): the `Field` bindings + `set()` (`ControlRoom.tsx:758`),
  `save()` (`:1375-1465`, incl. the `character_bible_revisions` insert on BOTH draft-persist and update branches),
  `dirty`/`useDirtyState`/`savedSnapshots`/`revertActiveEdits`, `guardDirtyAction` + `DiscardChangesDialog`,
  `createDraftCharacter`/`persistDraftCharacter`/`discardDraftCharacter`/`DRAFT_CHARACTER_ID` (dash #88 in-memory
  draft → first save persists), `toggleStatus`, `handleExport`, and the `HistoryDrawer`/`CompareDialog`/
  `RestoreDialog` triggers + state (`openHistory`, `previewRevision`, `compareWithRevision`, `requestRestore`,
  `historyOpen`, `compareRevision`, `pendingRestore`, `previewingRevisionId`). Sub-lane 3 re-skins those dialogs —
  keep them wired to the same handlers/state so it can.
- **Inline casting/visual reused**: embed `CastingStudioPanel` + `VisualIdentityPanel` with `variant="inline"`
  (the workspace precedent, `ControlRoom.tsx:2189-2213`) OR keep the existing savebar modal triggers
  (`castingOpen`/`visualCastingOpen`, panels at `:3529-3548`) — Codex's call; do NOT change the casting handlers,
  the audition lock-confirm gate, or the `voice_recipe` birth-certificate write. Casting stays draft-disabled
  (`activeIsDraft`) exactly as today.
- **No migration, no shared seam** (`characters`/`character_bible_revisions` schema unchanged; `casting-proxy`
  untouched). Dashboard-owned UI only.
- **No capability lost.** Everything reachable in the legacy roster editor (edit all fields, save, status toggle,
  history/compare/restore, export, casting/visual, "Log an idea →", draft-create) stays reachable in the Aurora
  editor. The legacy `.cr` roster path stays intact for now (sub-lane 5 deletes the shell) — this lane RE-POINTS
  the Aurora entry points but does not delete the legacy console.
- **AA measured** at 412/mid/1440 both themes; `:focus-visible`, keyboard nav, reduced-motion.

## IA / selection model (reuse `activeId`, no new route surface)

The legacy roster is NOT per-character URL-addressed (it is `?view=roster` + internal `activeId`); mirror that.
Add ONE piece of bench state, e.g. `charactersBenchMode: "grid" | "editor"` (or an equivalent
`benchEditorOpen` boolean). The `?hub=characters` branch renders:
- **grid** (sub-lane 1's `CharactersHub`) when mode = grid;
- **editor** (the re-homed dossier for `active`) when mode = editor.
`activeId` remains the selection (it already drives save/dirty/history/revert). Keep it URL-free like the legacy
roster; `?hub=characters` stays the address.

## Behavior / states (spec every state — rule 29)

**Enter the editor**
- Bench card activation — `handleOpenCharacter(id)` (`ControlRoom.tsx:926-934`): CHANGE it from
  `openLegacyConsoleUnguarded("roster")` to: under the SAME single `guardDirtyAction`, `setActiveId(id)` +
  set bench mode = editor (NO legacy console). Guard still fires exactly once (sub-lane 1's lesson — do not
  re-nest guards).
- Bench "Create New" — add an affordance on the grid (e.g. a "+ New character" card/button) that, dirty-guarded,
  runs `createDraftCharacter()` (reuse `guardedAddChar`'s body, `:1480-1484`) + bench mode = editor. First save
  persists (dash #88).

**The editor surface** (inside `AuroraShell`, wrapped `.characters-bench.scoped` or similar)
- Renders the reused dossier `<section>` (`ControlRoom.tsx:2525-2781`): header (codename/concept/status/
  casting-stamp + History trigger + `DossierVisualAttachment`), the `.sheet` of `Field`s (all 9: codename,
  concept, voice, cadence, vocab, offlimits, lines, beats, runtime), the `.savebar` (Save dossier / status
  toggle / View History / Casting Studio / Visual Cast / Export / Log an idea →), the preview banner, and the
  `HistoryDrawer`/`CompareDialog`/`RestoreDialog` mounts — all reused verbatim.
- **Back to grid** — a guarded control (dirty → `DiscardChangesDialog`) that sets bench mode = grid (discard an
  in-memory draft on leave, mirroring `navigate`/`openLegacyConsoleUnguarded`'s draft handling). Provide an
  Aurora breadcrumb ("Characters / <codename>") like the workspace header.
- **Empty/loading/error** — reuse the roster block's existing loading/error handling (`loading`, `loadError` with
  a Retry wired to `fetchCharacters`); a draft with empty fields shows the editor with empty inputs (normal).

**Re-point the other two legacy entry points → the Aurora bench**
- Workspace "Manage all characters →" (`ControlRoom.tsx:2137`, `openLegacyConsole("roster")`) →
  `navigate({kind:"hub",hub:"characters"})` (grid).
- Uncast "Create New" (`ControlRoom.tsx:2278`, `openLegacyConsole("roster")`) → navigate to the bench AND enter
  create mode (grid → new draft → editor), so the operator lands on a blank Aurora dossier, not the legacy console.
- Leave the HubLanding "Legacy console" action (`:1655`) as-is (that is the deliberate legacy escape hatch until
  sub-lane 5).

**Aurora restyle block** (`aurora.css`)
- Add a scoped block (mirror `.channel-profiles.scoped` at `aurora.css:1264-1394`) restyling the reused
  `.dossier`/`.dossier-head`/`.sheet`/`.field`/`.grid2`/`.savebar`/`.preview-banner`/`.restore-warning` under the
  new wrapper to Aurora tokens. Reuse existing tokens; measure AA on the field text, labels, savebar buttons, and
  the dirty/restore chips (dark + light). No new colors unless a measured AA fix requires one (document it).

## Files in scope (declare-and-touch-only)

1. `src/components/ControlRoom.tsx` — bench mode state; `?hub=characters` renders grid|editor; re-home the dossier
   editor render into the Aurora branch; change `handleOpenCharacter` to editor-mode (not legacy console); bench
   "Create New"; back-to-grid (guarded); re-point workspace "Manage all characters →" + uncast "Create New".
2. `src/components/aurora/CharactersHub.tsx` — add the "+ New character" affordance on the grid (calls a new
   `onCreateCharacter` prop); keep presentational.
3. `src/app/aurora.css` — the scoped `.characters-bench` restyle block.
4. (If cleaner) a small `src/components/aurora/*` wrapper for the editor surface — optional; keep logic in
   ControlRoom (the state lives there).
Do NOT edit the casting/visual panels, `useCharacters.ts`, `save()` logic, the history/compare/restore
components, or any migration.

## Acceptance gates (falsifiable; live-ratified before merge — intercept-and-abort, ZERO live writes)

- **C1** Bench card activation opens the Aurora dossier editor for that character inside `AuroraShell` (NOT the
  legacy `.cr` shell); `active.id === card.id`; all 9 fields render the character's values.
- **C2** Edit a field → `dirty` true → savebar "Save dossier" enabled; **Save intercepts exactly ONE**
  `characters` UPDATE (or draft INSERT) **and ONE `character_bible_revisions` INSERT**, payloads == the reused
  builders (`codename/concept/status/bible`); with the writes intercepted-and-aborted, ZERO live writes land
  (verify live `characters`/`character_bible_revisions` row counts unchanged before/after).
- **C3** "Create New" (bench + the re-pointed uncast path) → an in-memory draft editor (no DB row yet); first
  Save persists via `persistDraftCharacter` (intercepted). No stub row before save.
- **C4** Dirty-guard: editing then Back-to-grid / card-switch / nav fires `DiscardChangesDialog` exactly once;
  KEEP EDITING preserves the buffer; DISCARD reverts. No double-prompt, no bypass (sub-lane 1's lesson).
- **C5** History/Compare/Restore all open from the Aurora editor and function (preview is read-only; restore
  loads a draft preserving live casting; no write until Save). Casting Studio + Visual Cast open and are
  draft-disabled; the audition lock-confirm money gate is intact and intercepted (no live spend).
- **C6** Workspace "Manage all characters →" lands on the Aurora bench grid; uncast "Create New" lands on a blank
  Aurora dossier — neither opens the legacy `.cr` console.
- **C7** AA measured 412 + 1440 dark + light (field text, labels, savebar buttons, dirty/restore chips);
  `:focus-visible` + keyboard nav across the form; reduced-motion respected.
- **C8** `tsc` + `npm test` + `next build` clean.

## Out of scope

History/Compare/Restore Aurora RE-SKIN (sub-lane 3 — only keep them wired here); new-channel Aurora form
(sub-lane 4); deleting the legacy `.cr` shell (sub-lane 5). Do not change casting/voice logic or any schema.
