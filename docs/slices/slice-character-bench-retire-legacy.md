# Slice — Aurora character bench + retire the legacy roster shell

_Status: **SPEC — draft**, Architect (Claude), 2026-07-04. This is the big lane both UI/UX audits kept
pointing at: the legacy "field-manual" console is the last non-Aurora surface, and every create/manage
path still dumps the operator into it. Re-home character CRUD into an Aurora **character bench**, then
delete the dual shell — finishing what Lane 5 started (deep-link retirement) and closing audit findings
#2 (paradigm switch on every create path), #6 (duplicate casting/visual entry points), and the
create-flow jank._

---

## 0. Why now

- **Root cause of the most audit findings.** The route audit + the agentic newcomer journey both converged
  on one thing: two design languages coexist, and the legacy roster/editor (dark terminal, different IA,
  its own savebar with duplicate Casting/Visual buttons) is where all character + channel *creation* lives.
- **Lane 5 left this explicitly unfinished** — it retired the legacy shell for *deep links only*; the
  roster stays the reachable home for full character CRUD until a bench re-homes it.
- **Phase-2 already did the hard plumbing.** `character_id` FK (dash_0007) + de-modaled inline casting
  (Lane 2) + the persona-from-concept fix mean the Aurora Character tab already hosts casting/visual; the
  bench is mostly a re-home of the dossier editor + roster list + the create flow, not new logic.

## 1. Goal

An **Aurora-native character bench**: browse all characters, create a new one, edit the dossier/bible,
view history/restore, and cast (voice+visual) — entirely inside the Aurora shell — so the legacy `.cr`
console can be deleted. No character capability is lost; the data/logic seams are reused verbatim.

## 2. Scope (what re-homes)

Reuse the **data/logic seams**, rebuild the **chrome** against Aurora (same discipline as Lanes 2/3a):
- **Bench list** — a global "Characters" surface (Aurora hub-level or a workspace-adjacent route):
  cards for each character with cast/visual status, concept, and links into edit/cast.
- **Dossier editor** — the bible fields (codename, concept, voice/identity, cadence, off-limits,
  gold-standard lines, beat template, runtime). Reuse the existing field state, `save()`, the
  `character_bible_revisions` snapshot, dirty-guard, and the in-memory-draft create (dash #88 — no stub
  row). Rebuild the field layout against Aurora `form-*` primitives.
- **History / compare / restore** — reuse `HistoryDrawer` / `CompareDialog` / `RestoreDialog` logic;
  re-skin to Aurora.
- **Casting + visual** — already inline-Aurora on the Character tab (Lane 2 + re-theme). The bench's
  per-character editor embeds the same inline panels. **Kills finding #6** (the legacy savebar's
  duplicate Casting/Visual buttons go away with the shell).
- **Create flows** — "New character" (in-memory draft → first-save persist, dash #88) and "New channel"
  (the durable Aurora tier of `slice-newcomer-journey-fixes.md` #1) become Aurora surfaces; the hub
  "New Channel" no longer routes through the legacy console.

## 3. Routing / IA

- Add an Aurora route for the bench (e.g. `?hub=characters` or `?bench=characters`) via the existing
  `route.ts` model (no router lib). Character CRUD reachable from the hub AND from the workspace Character
  tab's "Manage all characters →" (which currently `openLegacyConsole("roster")` — re-point to the bench).
- Once every legacy surface (roster, dossier, history, wire/ideas, queue/runs, cost) is reachable in
  Aurora, **remove the dual shell**: delete the `.cr` legacy return + `openLegacyConsole` + the
  `legacyShellOpen` interim, and drop the `?view=` handling that Lane 5 already redirects. **Audit the
  reachability matrix first** — the wire/ideas capture, queue/runs drill-down, and global Cost Box must
  each have an Aurora home before deletion (some may already: Cost Box via `?hub`/legacy cost; ideas via
  the workspace Production tab once un-blocked). Anything without an Aurora home blocks deletion and gets
  its own sub-lane.

## 4. Sequencing (sub-lanes)

1. **Bench list + read** — Aurora Characters surface (cards, status, links). Read-only; low risk.
   **✅ SHIPPED (#92, squash `a845d5f`, 2026-07-04)** — `?hub=characters` read-only bench; build spec
   `build-character-bench-sublane1.md`; ratify `scripts/ratify-character-bench-sublane1.mjs` 22/22, zero writes.
2. **Dossier editor re-home** — the bible editor + save + revisions + draft-create in Aurora; re-point
   "Manage all characters →" and "Create New" to it.
   **✅ SHIPPED (#94, squash `b392a10`, 2026-07-04)** — reused the dossier JSX + write-path wiring verbatim under
   `.characters-bench.scoped` + aurora.css restyle; grid|editor via `charactersBenchMode`; casting/visual/history
   reachable on the Aurora editor; legacy `.cr` roster intact. Build spec `build-character-bench-sublane2.md`;
   ratify `scripts/ratify-character-bench-sublane2.mjs` 26/26, zero live writes.
3. **History/restore re-skin** — Aurora HistoryDrawer/Compare/Restore.
   **✅ SHIPPED (#96, squash `5cdcfb9`, 2026-07-05)** — scoped Aurora chrome re-skin under
   `.aurora-app .characters-bench.scoped` (frosted backdrops, `--surface-1` glass, revision cards,
   semantic latest/archive badges, diff spans, accent/ghost dialog buttons; reduced-motion + inherited
   `:focus-visible`). Components + handlers + refs + JSX reused verbatim; legacy `.cr` instances keep
   globals.css styling (deleted in sub-lane 5); `DiscardChangesDialog` deferred (shares `.restore-*`
   but mounts in `globalOverlays`, outside scope). `tsc` + 148 tests + `next build` clean; independent
   AA/scoping review no blockers (latest badge 8.5:1 dark / 5.8:1 light). **Live-artifact ratify closed
   (#98, `2685cfb`)** — `scripts/ratify-character-bench-sublane3.mjs` 24/24, zero live writes (AA on the
   real build 8.01 dark / 5.55 light).
4. **New-channel Aurora form** — the durable tier of #1 (removes the legacy channels console for create).
   **✅ SHIPPED (#99, squash `f57a75b`, 2026-07-05)** — hub "+ New Channel" now opens an Aurora create
   surface (`ChannelProfilesPanel` `createOnly` mode: blank form, no master list/picker/delete, reuses the
   Lane-3a `.channel-profiles.scoped` re-skin + the upsert/validation/persona wiring verbatim; defer-to-save,
   never touches `default`). `tsc` + 148 tests + build clean; review no blockers; ratify
   `scripts/ratify-newchannel-aurora.mjs` 20/20, zero live writes.
5. **Reachability sweep + delete the legacy shell** — only after 1–4 + confirming ideas/queue/runs/cost
   each have an Aurora home. This is the payoff: `.cr` and the dual-shell interim are deleted.

## 5. Non-negotiables / gates

- **No capability lost** — a reachability walk (every legacy action has an Aurora home) BEFORE any
  deletion; the character dirty-guard, `voice_recipe` birth-certificate write, upload→lock, and the
  bible revision-on-save all behavior-identical (re-ratify the casting money path).
- **Chrome only** — reuse `useCharacters`, `save()`, the revision insert, the draft-create, casting/visual
  handlers verbatim; rebuild layout against Aurora.
- **AA measured** at 412/mid/1440, both themes; `:focus-visible`, keyboard nav, reduced-motion.
- **Consensus review** (Fable-5 + suerta on the delete-the-shell step — it's a reachability-critical
  change); live-ratify the create/save/cast flows (intercept-and-abort, zero live writes).
- No migration, no shared seam (dashboard-owned UI only; `casting-proxy` untouched).

## 6. Open items

- **Q1 — bench placement:** a 4th hub tab (`Characters`) alongside Channels/Actions/Overview, vs. a
  character surface reached only from a channel workspace. Recommendation: a hub-level bench (characters
  are shared across channels; the 1-channel↔1-character norm is a current simplification, not a
  constraint — D-6 keeps the seam open).
- **Q2 — deletion readiness:** enumerate every legacy-only reachable action (wire/ideas, queue, runs,
  cost, restore, export) and confirm/each's Aurora home before the delete sub-lane. This audit is the
  gate; anything missing spawns a sub-lane.
- **Q3 — scope discipline:** this is several sub-lanes; ship 1→2→3 incrementally (each independently
  valuable) rather than one mega-PR. Governance rule 30 — measure by what ships.

## 7. Effort

**Large — the biggest remaining channel-first lane.** But de-risked by prior work (FK, inline casting,
draft-create, Aurora primitives all exist). Best delivered as the 5 sub-lanes in §4, each its own
build→review→ratify→merge. Sub-lane 1 (bench read) is a small, safe start.
