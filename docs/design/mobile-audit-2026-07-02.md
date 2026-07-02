# Mobile-UX audit — 2026-07-02 (412×915, prod build, all views + overlays)

_Independent auditor agent, triggered by operator feedback ("clunky, flow isn't
designed great"). Full catalog preserved per rule 1; A1 was fixed same-day. The
remaining items are the backlog for a future mobile-UX slice (channel work is ON
HOLD; voice is the priority — these wait unless the operator pulls one forward)._

## (a) FUNCTIONAL GAPS
- **A1 — Channels mobile bar mounted in the flex-row `.main`, crushing the form to
  67px.** ✅ FIXED same day (bar moved inside `.dossier`, PR pending merge with this
  doc). **Process lesson (ledgered):** the first fix's ratification gates checked
  *visibility*, not *usability* — gates must measure the property that matters
  (widths/reachability), not proxies.
- **A2 — the ≤480px Visual Identity mobile block is dead CSS** (declared before the
  base rules it overrides; base wins). Modal works but the intended bottom-sheet
  layer never ships. Fix: move the media block below `globals.css:1133`.
- **A3 — hover-only info has no touch equivalent** (rail active-operator chip
  `title`, Exit email `title`, run-detail availability `title`). Fix: visible
  text/aria equivalents.

## (b) FRICTION
- **B1 — dossier savebar never sticks on mobile** (`.dossier` grows; document
  scrolls; sticky never engages) — Casting Studio/Visual Identity buttons ~2,100px
  down. Fix: at ≤880px, `.cr{height:100dvh;overflow:hidden}` so `.dossier` scrolls
  internally.
- **B2 — Queue: 34 cards, ~15,000px, no filter/sort** — finding the actionable card
  is archaeology. Fix: status filter chips or actionable-first sort.
- **B3 — Runs: same class, milder** (no filter/search).
- **B4 — the 84px rail eats 20% of a phone screen**; no bottom-tab variant. Fix:
  bottom bar at ≤880px.
- **B5 — Wire quick-capture: character/channel selects hardcoded-disabled** — ideas
  silently land on active dossier + first channel, causing later mismatch warnings.
  Fix: enable at capture.
- **B6 — Channel Delete has no confirm dialog** (unlike every other destructive
  action). Fix: reuse the confirm-dialog pattern.
- **B7 — Casting sliders 16px tall, not in the `pointer:coarse` floor.**
- **B8 — targets missing from the coarse floor:** base `.btn` 38-39px, template
  save/trigger 29-35px, drawer Back 29px, receipt summary 32px, rail chip 30px.
- **B9 — mobile selects lose the desktop roster's context** (concept line, chips,
  unsaved marker). Minor.

## (c) COSMETIC
- **C1** enqueue "EXECUTION RECIPE" label collides with the segmented control at
  412px. **C2** wire card selects can bleed past the card border (`max-width:100%`
  missing). **C3** queue cards dump raw uppercase error JSON (clamp + disclosure).
  **C4** wire note textarea collapses to 1 row, clipping its placeholder.

## Verified-good
No horizontal overflow anywhere; roster editing, Wire, Queue cards, drill-down,
enqueue, Casting Studio, Visual Identity, Overview, Cost all lay out correctly at
412px; the `pointer:coarse` block fixes most targets.

## Audit caveats (honesty)
Playwright fullPage screenshots reset pointer emulation to `fine` — all tap-target
numbers were re-measured in verified coarse sessions. Write flows opened+cancelled
only. Compare/Restore/QueueAction/Discard dialogs unverified visually. 412px
portrait only; ≤340px, landscape, tablet range analyzed statically.
