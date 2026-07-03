# Visual-design brief — Channel-first Phase 1 (design system + screens)

> **✅ DIRECTION CHOSEN (2026-07-03): Finalist 3 "Aurora"** — `docs/design/finalists/finalist-3-aurora.html`.
> Spatial/aurora depth: luminous layered surfaces, ambient aurora backdrop, **cyan/blue signature**,
> mono numerics, inline approval chips in the Action Center; both light + dark first-class. **Step 2
> (§4) below now builds the full design system + all Phase-1 screens against Aurora** — extract its
> tokens (semantic color + `[data-theme]`, type, spacing, radius, elevation, the aurora treatment,
> motion) into the design system, and hold **WCAG AA on the aurora/gradient backgrounds** (the one
> real risk). Runners-up (Editorial, Night Ops, Risograph, Transmission) retained as fallbacks.

_Status: **BRIEF for the Designer (Gemini)** — L-4 cross-vendor reviewed 2026-07-02 (blockers +
improvements folded); **direction chosen 2026-07-03 = Aurora.** Author: Architect (Claude), 2026-07-02.
Direction: `DIRECTION.md` D-6 + `docs/design/channel-first-redefinition.md`. Structural spec
this pairs with: `docs/slices/slice-channel-first-phase1.md` (read it — the IA, re-parenting
map, routing, Action Center, and the channel-scoping DATA REALITY §4 are binding on the
visuals). Per `AGENTS.md`: the Designer produces UI/UX artifacts into `docs/design/` only —
no app code, no git. Codex builds against the chosen direction; the Architect commits._

---

## 0. The operator mandate (why this brief exists)

The current dashboard look — a "declassified dossier" theme (kraft-paper `--paper`, red-stamp
`--stamp`, Oswald/Inter, hand-rolled 2,420-line `globals.css`) — has been ruled by the operator
**not good enough**. Phase 1 is a **first-class visual/UI rebuild**, not a re-skin: a real
**design system** (type, color/neutrals, spacing, radius, elevation, components, states, motion),
WCAG 2.2 AA, that the re-parented surfaces are **rebuilt against**. Treat visual design as a
first-class deliverable, spec'd and reviewed like the IA.

**Operator process ruling (2026-07-02):** don't jump to one look. **Explore 2–3 distinct visual
directions first; the operator picks one; THEN produce the full system against the winner.** This
brief is in two steps accordingly.

---

## 1. Product & tone context (what you're dressing)

- **What it is:** the **Control Room** for a solo, non-technical founder running an automated
  agent workforce that produces faceless short-form video. A **focused control tool** (D-2) —
  NOT a kanban, NOT an analytics product. Dense but calm; the operator's daily job is an
  **approval/triage loop** plus configuring channels and characters.
- **Root object = Channel** (the show). Hierarchy: Channel → Character (its face) → Ideas →
  Run/episode → Cost. Plain vocabulary (fixes F6): **Channels, Character, Ideas, Production,
  Guidelines, Cost, Action Center** — no themed jargon ("The Wire", "Roster", "dossier" retire).
- **Tone target:** competent, trustworthy, low-noise operator tooling — think a calm mission-
  control / modern operational console. It manages **money approvals** and **brand/legal-sensitive
  content**, so the aesthetic should read **credible and precise**, not playful or gimmicky.
- **Environment:** desktop-primary but **must work at 412px mobile** (the operator approves jobs
  on a phone). Dark-first is fine (today is dark) but justify per direction. Single operator, so
  no multi-tenant chrome.

---

## 2. Hard technical constraints (the system must fit these)

- **Stack:** Next.js 15 (App Router) + React 19, **plain CSS** (CSS custom properties + regular
  stylesheets/CSS modules). **NO Tailwind, NO CSS-in-JS runtime, NO component library** (no MUI/
  Chakra/etc.) — the project has none and isn't adding one. Design tokens = **CSS custom
  properties**; components = plain semantic HTML + CSS.
- **No external assets at runtime** that break CSP/offline: prefer system-available or
  self-hostable fonts; if you specify a webfont, name a concrete fallback stack and keep it to
  1–2 families. No icon-font CDNs — inline SVG icons.
- **Deliverables are design artifacts** (docs/design/): written specs + **self-contained HTML/CSS
  mockups** (inline `<style>`, no build step, open-in-browser). Not wired app code.
- **WCAG 2.2 AA** is a floor, not a nice-to-have: contrast ratios stated, visible `:focus-visible`,
  keyboard-operable, `prefers-reduced-motion`, target sizes (24×24 AA; retain the project's 44px
  coarse-pointer floor).

---

## 3. STEP 1 — Direction exploration (do this first; operator picks before Step 2)

Produce **2–3 genuinely distinct visual directions.** They must differ in *feeling and system*,
not just accent color. Suggested (not mandatory) axes to span — pick 2–3 that are real
alternatives:
- **"Elevated editorial"** — keeps some of the current identity's confidence (strong display
  type, structured, print-influenced) but modernized, cleaner, higher-craft. For continuity fans.
- **"Clean modern control-room"** — neutral dark, systematic, restrained single accent, dense-
  but-calm; the safe, credible SaaS-console direction.
- **"High-contrast operator console"** — more utilitarian/instrument-panel: strong data density,
  status-driven color, monospace numerics, tactile controls.

**For EACH direction, deliver (as one self-contained `.html` file per direction + a short
written rationale):**
1. **Rationale** (3–5 sentences): the feeling, who it's for, why it fits a money/brand-sensitive
   control tool, and the biggest risk of the direction.
2. **Token sketch:** the palette (with **hex + intended role + AA contrast note** for text-on-bg
   pairs), type families + a rough scale, spacing rhythm, radius/elevation stance, one motion
   principle.
3. **One HERO SCREEN mock — the Channels hub** (grid of channel cards + a global Action Center
   entry + system-overview glance + "+ New channel"), rendered as **self-contained HTML/CSS** at
   **desktop width**, plus a note or second mock on how it reflows at **412px**. Use realistic
   placeholder channel data (e.g. "Weird Food", "Unusual Animal Facts"). Show at least one card in
   an **uncast** state and one **cast** (character thumbnail) state. _Data note: `channel_profiles`
   has no thumbnail column in Phase 1 — the cast avatar is resolved at runtime by a best-effort
   name match (`channel_profiles.character` → `characters` ref image); design the card for a
   thumbnail-or-placeholder, don't assume a guaranteed image._
   - **BOTH LIGHT AND DARK MODE (required):** each direction must ship **both** a light and a dark
     theme in the **same** mock, driven by **semantic color tokens with `[data-theme="light"]` /
     `[data-theme="dark"]` overrides** on `:root`/`<html>` — never hard-coded per-mode colors in
     components. Include a **visible toggle** (small inline `<script>` flipping `data-theme`) so
     the operator flips in place. Default to the direction's "native" mode but both must be
     first-class (not a bolted-on inversion). State the key contrast ratios **for both modes**.

Keep each direction's HTML **self-contained and openable** (no external fonts/scripts required to
read the layout; if a webfont is specified, degrade gracefully to the fallback). Label each file
clearly (e.g. `direction-a-editorial.html`). The operator will view all directions side by side
and pick one.

**Do NOT** build the full component set or all screens in Step 1 — just enough to make the
direction's feeling unmistakable and the hub legible.

---

## 4. STEP 2 — Full design system + Phase-1 screens (ONLY after the operator picks)

Against the chosen direction, produce:

**A. Design-system spec** (`docs/design/phase1-design-system.md` + a living HTML component
gallery):
- **Tokens** (CSS custom properties, named + valued): color (bg layers, surfaces, borders, text
  hierarchy, semantic success/warn/error/info, one accent + states), type scale (families,
  sizes, weights, line-heights), spacing scale, radius, elevation/shadow, border, motion
  (durations/easings + reduced-motion fallbacks), z-index layers, focus-ring token.
- **Light AND dark theming is part of the token layer:** color tokens are **semantic** (e.g.
  `--surface`, `--text`, `--accent`) and are re-valued under `[data-theme="light"]` /
  `[data-theme="dark"]` (with an optional `prefers-color-scheme` default). Components reference
  only semantic tokens — no per-mode hard-codes. Both modes are first-class.
- **Contrast:** every text/UI pair meets **AA** (≥4.5:1 body, ≥3:1 large/UI) **in BOTH modes**;
  state the ratios for both.
- **Primitives / components**, each with **all states** (default, hover, focus-visible, active,
  disabled, loading, empty, error) + responsive behavior:
  button (primary/secondary/danger/ghost), input/textarea/select, checkbox/radio/toggle, chip/
  tag/badge (incl. **status** badges — note these span two state families: **job** states
  parked/queued/running and **episode/run** states success/error; the Action Center's wait/park
  visual language keys off the **job** states — plus channel chips),
  card (channel card + generic), tabs / sub-nav, table & list rows, modal/dialog + bottom-sheet
  (mobile), toast/flash, empty-state block, loading skeleton, inline error/disclosure,
  cost/number readout, avatar/thumbnail (+ uncast placeholder), nav rail / top bar.

**B. Screen designs** (self-contained HTML/CSS mocks, desktop + 412px, at least one loading +
one empty + one error variant among them), covering the Phase-1 IA in
`slice-channel-first-phase1.md`:
1. **Channels hub** — grid + empty state (brand-new operator) + "+ New channel".
2. **Global Action Center** — cross-channel, time/wait/cost-sorted, **inline-actionable** rows
   (approve/reject/fact-approve/publish-gate in place), channel chip per row. This is the daily
   loop — make it fast, scannable, and unmistakably **inline: the operator acts in the row, NOT by
   opening a per-job modal** (the old `QueueActionDialog` chrome is discarded; only its logic is
   reused). A lightweight inline confirm for spend/destructive actions is fine (Correction 3).
3. **System overview** — global read-only roll-up (overview + global Cost + global Runs).
4. **Channel workspace shell** — header (channel identity) + sub-nav **Production · Character ·
   Guidelines · Cost**; show the mobile sub-nav treatment.
5. **Production** (workspace) — channel-scoped **Ideas** capture + **Queue**; and the **honest
   Runs state** per slice §4 (Runs are NOT channel-scopable in Phase 1 — design the **DEFERRED**
   state only: "per-channel runs arrive with the pipeline correlation key (Phase 3)" + a link to
   global Runs. Do **not** design a "matched approximately" per-channel run list — the heuristic is
   Phase 3, not Phase 1).
6. **Character** (workspace) — the channel's cast character: dossier + bible history/compare, and
   the **casting entry points** (voice + visual) as modals (de-modaling to split-screen is
   **Phase 2** — design the entry, not the split-screen yet). Include the **uncast** empty state.
7. **Guidelines** (workspace) — the channel config editor (today's `ChannelProfilesPanel`),
   including the "stored — not yet active" treatment for non-enforcing dials and the E1 persona
   advisory hint.
8. **Cost** (workspace) — Fork A: the same Cost component `channelId`-scoped, with the honest
   per-channel state (slice §4).

**C. Redlines for the build:** spacing/sizing on the key screens, focus order, and the exact
token → component mapping Codex needs so the build is unambiguous.

---

## 5. What "good" means here (review rubric — Gemini spec-review + suerta will check)

- **Not a re-skin:** the system is coherent (tokens drive everything; no one-off hex) and clearly
  first-class vs today.
- **Honest to the data:** no screen implies a capability the data can't back (esp. per-channel
  Runs/Cost — slice §4). The Action Center is genuinely inline (Correction 3).
- **Accessible by construction:** AA contrast stated, focus visible, keyboard paths, reduced-
  motion, mobile at 412px real (not a squished desktop).
- **Buildable in plain CSS** with no new deps; tokens map cleanly to CSS custom properties.
- **Nothing lost:** every re-parented capability (slice §7) has a designed home.

---

## 6. Anti-patterns (don't)

- Don't specify Tailwind classes, a component library, or CSS-in-JS.
- Don't require CDN fonts/icons to render the mockups.
- Don't design a per-channel Runs/Cost view that fabricates data the schema can't scope (slice §4).
- Don't carry the old "dossier/stamp/kraft" theme forward by default — it's the thing being
  replaced. (One direction *may* deliberately evolve its editorial confidence — that's Step-1's
  "elevated editorial" option — but as a rebuilt system, not the old CSS.)
- Don't gold-plate Step 1 — directions are for a fast operator pick, not finished screens.
```
