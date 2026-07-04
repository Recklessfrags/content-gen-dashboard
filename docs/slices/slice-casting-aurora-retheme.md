# Slice — Casting Studio + Visual Identity: Aurora re-theme (inline surfaces)

_Status: **SPEC — draft**, authored by the Architect (Claude), 2026-07-04. Source: the full-surface
UI/UX audit (2026-07-04) — finding **#1 (High)**: the de-modaled casting panels carry the legacy
dark-terminal / parchment styling into the Aurora workspace Character tab, with section labels
measuring ~1.8:1 (dim, borderline-illegible). This slice re-skins the **inline** casting chrome to
Aurora; it does **not** touch casting logic, the money path, or the legacy modal._

---

## 1. Goal

Make the inline Casting Studio (voice) and Visual Identity panels look and read like first-class Aurora
surfaces on the workspace **Character** tab — legible (WCAG AA), tonally consistent with the glass
system, and visually finished — **without changing any behavior**. This is the visual half that Phase-2
Lane 2 deliberately deferred (`slice-channel-first-phase2.md` §7) and that the audit surfaced as the top
polish debt.

## 2. Non-negotiable constraints (same discipline as Lane 2)

- **Chrome only, never logic.** Reuse every handler verbatim. The audition lock-confirm gate,
  cancel = no-write / no-spend, the `voice_recipe` birth-certificate write, the daily cap, and the
  visual upload→lock flow must stay behavior-identical. This is a CSS/markup re-skin, not a rewrite.
- **Inline only.** The re-theme is scoped to the inline variant (`.casting-inline` / `.visual-inline`,
  rendered under `.aurora-app`). The legacy modal path (rendered under `.cr` from the roster savebar)
  stays untouched — it retires with the legacy shell (a later slice), not here.
- **Architect never writes app/design code.** Build via Codex; Fable-5 + suerta review; live-ratify.
- **No regression to the ratified money path.** Re-run the Lane 2 ratify (`scripts/ratify-phase2-lane2.mjs`)
  after the re-skin — all 15 gates must still pass (generate wired-and-aborted, lock-confirm
  birth-certificate write, zero live writes/spend, E1.b, legibility).

## 3. Approach — a scoped Aurora override block (Lane 3a precedent)

Follow the pattern that re-skinned the Guidelines panel in Lane 3a (`.channel-profiles.scoped`): add a
**scoped override stylesheet block in `aurora.css`** that restyles the legacy casting/visual descendant
classes **only when they render inside `.casting-inline` / `.visual-inline`**, mapping them onto Aurora
tokens. Prefer pure CSS; touch component markup only where a class hook is genuinely missing.

Descendant classes to re-token (non-exhaustive; confirm against the rendered DOM at build):
- **Surfaces:** `.casting-inline` / `.casting-content` / `.casting-section` / `.casting-card` /
  `.detail-cap` / `.col-head` → Aurora `--surface-*`, `--border-soft`, `--radius-md` instead of legacy
  `--ink` / parchment. Visual panel `.visual-studio-*` likewise.
- **Labels:** `.eyebrow`, `.casting-section-title`, `.field-label-side`, `.hint` → Aurora text tokens at
  **≥4.5:1** (the audit's 1.8:1 dim eyebrows are the headline fix). This is the single most important
  measured outcome.
- **Inputs:** `.field textarea` / `.field input` / `.casting-other-input` → Aurora input surface + text
  (already legible after the Lane 2 fix — verify contrast holds under the new surfaces).
- **Chips:** `.casting-choice-chip` (+ `.is-selected`, `:focus-visible`) → Aurora chip styling; keep the
  ≥44px mobile tap floor (landed as an audit quick-win).
- **Sliders / segmented controls:** `.casting-slider input[type=range]`, `.status-segmented-control` →
  Aurora accent.
- **Buttons + sub-dialogs:** `.btn` / `.ccr-btn-*` / `.ccr-tpl-*` / `.casting-lock-dialog` and the
  inline backdrop → Aurora primary/ghost + glass dialog. (The inline sub-dialog backdrop + viewport
  positioning already landed in Lane 2; restyle, don't re-plumb.)
- **Info banner:** the "Currently cast" notice must not read as danger (neutral treatment landed as an
  audit quick-win; confirm it fits the re-skin).

## 4. Folded-in audit items (from the 2026-07-04 UX audit)

- **#1 (High)** — the theme clash + ~1.8:1 labels → resolved by §3.
- **Med** — mobile Casting Studio is one long fully-expanded scroll (spec Q2). Add a **disclosure**:
  collapse the Voice Design chip-bank card behind a summary/expander at ≤412px so the assembled
  description + Generate stay reachable without a long scroll. (This one needs a small component
  change — a collapsible section — not just CSS.)
- Quick-wins already shipped separately (chip tap floor, neutral info banner) — verify they survive.

## 5. Gates (falsifiable, MEASURED; QA creds required)

1. **AA measured** on the re-themed inline casting + visual surfaces at 412 / mid / 1440 — every text
   token (labels, chips, hints, buttons, banner) ≥ 4.5:1 (≥3:1 for large). Pixel-sampled on the
   rendered screens, not estimated. The audit's ~1.8:1 eyebrows specifically must clear 4.5:1.
2. **Behavior-identical:** re-run `scripts/ratify-phase2-lane2.mjs` → 15/15, zero live writes/spend;
   the generate → audition → lock birth-certificate cycle + E1.b unchanged.
3. **Mobile disclosure** (if built): the Voice Design bank collapses at ≤412px; the assembled
   description + Generate are reachable without scrolling past the full chip bank; keyboard + a11y
   (`aria-expanded`, focus) intact.
4. **Visual parity / no legacy bleed:** the Character tab reads as one Aurora surface (the audit's
   before/after); the legacy modal (roster savebar) is byte-identical (screenshot diff).
5. `:focus-visible`, reduced-motion, keyboard nav preserved. Consensus review (Fable-5 + suerta) on the
   build; re-walk the merged result.

## 6. Open items

- **Q1 — depth:** full Aurora re-theme of every casting control vs. a targeted contrast + surface pass.
  Recommendation: do the full scoped re-skin (it's the visible debt and it's mostly CSS), but treat the
  mobile disclosure (§4) as optional if effort runs long (governance rule 30 — ship what's sound).
- **Q2 — mobile disclosure treatment:** accordion per chip-bank vs. a single "Voice Design" collapse.
  Default: single collapse of the chip-bank card, description + Generate always visible.
- **Q3 — retire vs. re-skin:** this re-skin makes the inline casting Aurora-native; the legacy modal
  still exists until the character-bench slice retires the roster shell. Confirm we're not double-paying
  (the re-skin is inline-scoped, so the modal work is genuinely separate and deferred).

## 7. Effort

**Medium.** Mostly a scoped CSS block (build → measure AA → review → ratify), plus one small component
change if the mobile disclosure is included. One Codex build cycle + Fable/suerta + a Lane-2 ratify
re-run. No migration, no shared seam, no pipeline impact.
