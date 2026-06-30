# UX/UI Audit — Synthesis & Ranked Backlog (2026-06-28)

Source audits (raw, full): `ux-audit-2026-06-28-gemini-designer.md` (Designer/Gemini, 28
findings) + `ux-audit-2026-06-28-codex-builder.md` (Builder/Codex, 28 findings). This file
is the de-duplicated, ranked backlog. **⭐ = both auditors independently flagged it
(highest confidence).** Each item: *Impact / Effort*. Primary files throughout are
`src/components/ControlRoom.tsx` and `src/app/globals.css`.

---

## 🔴 TIER 1 — Fix now (bugs, data-loss, broken flows)

- **T1-1 ⭐ Mobile: can't switch characters below 880px.** Roster sidebar is `display:none`
  (`globals.css:254`) but selection + "New character" live only inside it
  (`ControlRoom.tsx:1719`). Fix: compact character dropdown/bottom-sheet at top of the
  dossier on mobile. *High / M*
- **T1-2 ⭐ Silent data loss on unsaved edits.** Bible edits are local until Save; clicking
  another roster card, switching views, or previewing history discards them with no warning
  (`ControlRoom.tsx:1407, 1486, 1726`). Fix: dirty-state tracking + discard confirm +
  "Unsaved changes" savebar label. *High / M*
- **T1-3 ⭐ Idea logging double-submits, no feedback.** No pending state, button stays
  enabled, Enter also fires (`ControlRoom.tsx:1622, 1979`). Fix: disable while saving +
  optimistic card + ignore duplicate trimmed text. *High / S*
- **T1-4 Errors from The Wire are invisible.** Flash is mounted only in the roster savebar,
  no live-region role (`ControlRoom.tsx:1576, 1920`). Fix: top-level `role="alert"/"status"`
  toast mounted across all views. *High / S*
- **T1-5 One failed read blanks the whole app.** Initial `Promise.all` of
  characters+ideas+episodes → any failure shows only "Comms down", no retry
  (`ControlRoom.tsx:1341`). Fix: load roster first, fetch rest independently, per-view error
  + retry. *High / M*

## 🟠 TIER 2 — High-value (visual / flow / accessibility)

- **T2-1 ⭐ Contrast failures.** Rail sign-out text ≈ 3.41:1 (fails AA 4.5:1); dim 9–11px
  uppercase microcopy borderline (`globals.css:22, 3–9`). Fix: lighten `--paper-dim`, bump
  tiny labels to 12px. *High / S*
- **T2-2 Static cards are keyboard traps.** Overview/Cost metric cards have `tabIndex={0}`
  but no action (`ControlRoom.tsx:387–577, 727`). Fix: remove tabIndex from non-interactive
  cards. *High / S*
- **T2-3 Focus vs selection look identical** on roster cards (both brass outline)
  (Gemini #17). Fix: distinct focus color/offset. *High / S*
- **T2-4 No "current character" context** once you leave the roster (Gemini #4). Fix: active-
  operator chip in the rail. *High / S*
- **T2-5 Touch targets too small** — status btns/selects/close 24–28px (`globals.css:196,
  319`). Fix: ≥44px on coarse pointers. *High / M*
- **T2-6 ⭐ Spinners cause layout shift → use skeletons** (Cost/history/run-detail). Fix:
  view-shaped skeletons, reduced-motion aware. *Med / M*
- **T2-7 Richer idea capture** — single-line only (Gemini #8). Fix: expandable textarea +
  Cmd+Enter, optional note. *High / M*
- **T2-8 Two placeholders read as broken controls** — parked Budget Cap bar + "Providers /
  Characters Deferred" pseudo-toggle (`ControlRoom.tsx:741, 755`). Fix: demote to plain
  disclosure notes. *Med / S*
- **T2-9 Form polish** — shared `Field` always renders `<textarea>` even for one-line values;
  labels not tied via `htmlFor` (`ControlRoom.tsx:159`). Fix: input-vs-textarea + label
  association. *Med / M*
- **T2-10 ⭐ Extract a `useFocusTrap` hook** — same trap copied in 3 overlays. *Med / M*

## 🟢 TIER 3 — New feature ideas (opt-in)

- **T3-1 Local budget guardrail** (standout: high value, zero backend) — localStorage spend
  target; hero cards turn red when exceeded (Gemini #25). *High / S*
- **T3-2 Export dossier to Markdown/JSON** — one-click bible backup (Gemini #27). *High / S*
- **T3-3 Side-by-side bible diff** in the history drawer (Gemini #26). *High / L*
- **T3-4 Sparkline trends** on Overview spend/runs cards (Gemini #28). *Med / M (needs
  time-series)*
- **T3-5 Status quick-jump** (vs click-cycling) + **group idea→character dropdown** by status
  with active on top (Gemini #9/#5). *Med / S each*

## ⚪ TIER 4 — Defer (polish / low-impact / premature)

- **T4-1** Casting-stamp overlap at 880–1024px (Gemini #3). *Low / S*
- **T4-2** Typographic scale tweaks: eyebrow size/letter-spacing, field rhythm, mono
  line-height (Gemini #1/#2/#10). *Low–Med / S*
- **T4-3** Savebar opacity/scroll overlap (Gemini #12). *Low / S*
- **T4-4** Rail overflow at short viewport heights (Codex). *Med / S*
- **T4-5** Auto-retry with backoff on run receipts (Gemini #13; debatable UX). *Low / S*
- **T4-6** Login error not announced + stale error on mode switch (Codex). *Low / S*
- **T4-7** `aria-pressed` → `role="tablist"` nav semantics (Codex). *Med / M*
- **T4-8** Inline styles → named classes (Codex). *Low / S*
- **T4-9** `.wire`/`.wire-list` shared by Wire+Runs → extract ViewShell (Codex). *Med / M*
- **T4-10** List virtualization (Codex). **DEFER** — 2 chars / 4 ideas / 3 episodes; premature
  until lists grow. *Med / M*

## ⚠️ Sanity-check before building
- **Run→character codename on Run cards** (Gemini #6) — NOT feasible yet: `episodes.character_id`
  is null on every row (Acoustic Kitty run hasn't populated it). Park with Tier-2/asset-spend.
- **Cost vs Run-detail spend can disagree** (Codex; receipt `max(spend_so_far)` vs
  `episode.spend`) — fold into the same cleanup as the status-vocabulary task.
