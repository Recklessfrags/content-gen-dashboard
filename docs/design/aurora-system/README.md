# Aurora — Phase-1 design package (for the build session)

_The operator chose **Aurora** (2026-07-03) as the Phase-1 design language. This folder is the
**design package a fresh session builds from** (per the operator: brief Gemini → a fresh session
builds). Designer = Gemini; artifacts extracted + sanity-checked by the Architect against the specs.
Nothing here is app code — it's the design source the builder (Codex) implements, through the
**Gemini + suerta (Fable-5 on the money-path) review gate**._

## What's here
- **`phase1-design-system.md`** — the buildable design system: all CSS-custom-property tokens with
  **light + dark** `[data-theme]` value tables (color incl. the aurora backdrop stops, type, spacing,
  radius, elevation, motion + reduced-motion, focus ring, z-layers), every component's states, and
  token→component redlines. **AA both modes** stated; text-on-aurora is the flagged risk to verify.
- **`aurora-component-gallery.html`** — living gallery of every component in Aurora, both modes
  (toggle), self-contained. The visual source of truth for component look/states.
- **`aurora-screens-hub-actioncenter-overview.html`** — the two global hub screens: the **Action
  Center** (cross-channel, **inline-actionable** approval rows incl. inline spend-confirm — no
  per-job modal, Correction 3) + **System Overview** (global roll-up + the global Runs table).
- **`aurora-screens-channel-workspace.html`** — the per-channel workspace: header + sub-nav
  (Production · Character · Guidelines · Cost) with each tab; Production shows channel-scoped Ideas +
  Queue and the **honest deferred Runs state** (Phase 3 / correlation key), not a fake per-channel
  list. Includes the mobile sub-nav treatment.
- The **Channels hub** itself = `../finalists/finalist-3-aurora.html` (the chosen mock).

## Build brief (what the fresh session does)
1. Read `../../slices/slice-channel-first-phase1.md` (IA, URL-state routing, re-parenting map,
   channel-scoping DATA REALITY §4, Action Center §5, Fork-A `channelId` §6, gates §10) +
   `../phase1-visual-brief.md` §4 + this package + `../channel-first-review-plan.md` (review tiers).
2. Codex builds against the design system: tokens/primitives first, then hub → workspace shell →
   surfaces. Extend the existing `?view=` URL-state routing (no router lib). Plain CSS, no new deps.
3. Review gate: **Gemini + suerta**, with **suerta escalated to Fable-5 on the Action Center
   (money path)**. Browser-ratify on measured gates at 412 / mid / 1440px (QA creds from the
   operator — not in the container). Re-walk after any merge.

## Honesty carried into the design (must survive the build)
- Per-channel **Runs & Cost are DEFERRED** (episodes have no channel key; correlation key = Phase 3,
  ANSWERED+QUEUED by pipeline) — deferred state only, no heuristic, no fake per-channel numbers.
- Action Center is a **true global inline queue**; the money-path double-gate stays intact.
- `channel_profiles` has no thumbnail → avatar is best-effort/placeholder.
- WCAG 2.2 AA in both modes, incl. **text/controls on the aurora gradient** (the one real risk).

_Provenance: Gemini design pass against `finalist-3-aurora.html` + the slice spec; all four artifacts
self-contained (zero external refs), both modes, rendered + sanity-checked @1440 by the Architect._
