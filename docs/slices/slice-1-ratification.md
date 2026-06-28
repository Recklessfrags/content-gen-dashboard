# Slice 1 — Ratify the foundation + resolve Runs linkage

_Author: Architect (Claude). Status: spec frozen, awaiting human ratification of
scope. This slice intentionally adds **no new product surface** — it makes the
existing foundation trustworthy and resolves the one open product decision._

## Why this slice

The foundation was built and self-verified by the same actor (see
`docs/HANDOFF.md` provenance caveat). Before building anything on top of it, the
loop needs (a) **independent** verification of gates 1–4 and 7, and (b) a human
**ruling on D-1** (Runs ↔ character). Cheap to do now, expensive to discover later.

## Inputs (read-only)

- `GATES.md`, `docs/contracts/data-contract.md`, `docs/HANDOFF.md`
- The prototype `character-control-room.jsx` (visual + interaction spec of record)

## Frozen gates for this slice

The seven gates in `GATES.md`. Target: every gate at **PASS** or an explicit
human-ratified exception. No gate may be marked PASS by the actor that wrote the
code under test.

---

## Designer brief (Gemini → `docs/design/`)

Produce design artifacts only; no app code, no git.

1. **Parity audit** of the ported UI vs the prototype: confirm tokens, spacing,
   type scale, and the three views (Roster/Dossier, The Wire, Runs) match. List any
   drift as a delta table.
2. **State coverage** for the surfaces added beyond the prototype (these had no
   prototype reference and need specs): `login` (default/focus/error/pending),
   global `loading`, `loadError`, the character **status toggle**, the **Runs
   card** (real pipeline fields: topic=`food`, `status`, `final_stage`, gate from
   `sentinels`, `spend`), and all empty states. For each: default, hover, focus,
   active, disabled, loading, empty, error.
3. **Accessibility pass (WCAG 2.2 AA)**: contrast on the dark palette
   (`--paper`/`--paper-dim`/`--paper-faint` on `--ink*`), focus visibility, target
   sizes for the small `tag-select`/`statusbtn` controls, and reduced-motion
   behavior. Flag any failing contrast pairs with measured ratios.

Output: `docs/design/slice-1-audit.md` (+ any redline images). Deltas become Builder
work items; do not assume they are approved until the Architect rules.

## Builder block (Codex — all app code + commits)

Argue with this spec first (silent compliance = defect). Then:

1. **Exercise the gates in a real browser** against the live Supabase (or a local
   Supabase) and record raw results:
   - G2: edit every bible field on Mad Dog, Save, hard-reload → values identical
     (jsonb round-trip). Repeat for `codename/concept/status`.
   - G3: switch Mad Dog ↔ Grandma Pearl repeatedly while editing → no field bleed.
   - G4: capture an idea (Enter), retag character + channel, cycle status
     backlog→active→used→backlog, reload → all persisted.
   - G7: 320px-wide viewport usable; keyboard-only tab traversal shows focus on
     every control; `prefers-reduced-motion` kills transitions/spinner.
   - G1: from an anon (signed-out) browser session, confirm no data leaks and all
     mutations are rejected.
2. **Fix only the defects those tests surface.** No new features. No schema changes
   to pipeline-owned tables (`episodes`, `receipts`) — contract is frozen.
3. **D-1 implementation** — only after the human ruling is logged in `HANDOFF.md`:
   - If *accept global Runs*: add a one-line in-app note clarifying Runs is
     operation-wide pipeline output (not per-character), and close G5 as a ratified
     exception.
   - If *link to characters*: do **not** alter the pipeline table here — open a
     cross-repo change request in `HANDOFF.md` and leave G5 DEVIATED.
4. Update `HANDOFF.md` with raw results and flip gates only to the status the
   evidence supports.

Builder declares its files before editing; does not touch Designer artifacts or
this spec.

## Architect (judge) + human (ratify)

- Architect judges raw Builder/Designer results against `GATES.md`; flips gates to
  PASS only on independent evidence; logs rulings (incl. D-1) in `HANDOFF.md`.
- Human ratifies the final pass and owns D-1 and D-2 (`DIRECTION.md` reconciliation).

## Out of scope

Deferred items from the build brief (run/receipt drill-down, bible version history,
multi-user teams, analytics, publishing). Pipeline logic. Any write to pipeline
tables.
