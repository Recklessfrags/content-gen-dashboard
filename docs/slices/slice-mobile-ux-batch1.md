# Slice — mobile-UX batch 1 (audit-driven, three parallel lanes)

_Author: Architect (Claude). Status: **FROZEN (v2)** — Gemini review REQUEST CHANGES,
verified findings folded: B1 re-mechanized (fixed bottom bar, view-scoped — the
shell-level `overflow:hidden` risked iOS keyboard/dvh fights, focus-scroll conflicts
in nested scroll containers, and clipping any view relying on document scroll); B5
gains the empty-string→null normalization mandate (`""` reaching a uuid FK column
throws); chip CSS pre-assigned to Lane A (protects lane isolation if existing
classes prove insufficient); G-B1/G-B5 gates made programmatic.
Source of truth for every finding: `docs/design/mobile-audit-2026-07-02.md`
(independent audit, evidence per item). Operator GO 2026-07-02: "get moving on
anything and everything we can parallel." Three isolated lanes (governance rule 25:
own worktree, declared files only, no overlap); each lane's diff is reviewed
per-lane, the merged aggregate is reviewed again before landing (rule 6). B4 (bottom
tab bar) and B9 are explicitly OUT (redesign-scale / low value)._

## Lane A — `src/app/globals.css` ONLY
- **A2:** relocate the dead `≤480px` Visual Identity media block (currently
  ~`:966-975`, declared before the base rules at `:1081+` that override it) to
  BELOW the base visual-studio rules so the intended bottom-sheet layer actually
  applies. No rule-content changes — a move.
- **B1 (v2 mechanism):** at `≤880px`, the dossier savebar becomes a **fixed bottom
  bar**: `.dossier .savebar{position:fixed;left:84px;right:0;bottom:0;z-index:…}`
  (left offset = the rail width; reuse the savebar's existing background/border so
  content never shows through) + `.dossier{padding-bottom:<savebar height + safe
  margin>}` so no content is hidden beneath it. **No app-shell/overflow changes**
  (the sticky-via-shell approach is rejected: iOS keyboard/dvh offsets, focus-scroll
  fights in nested scroll containers, and document-scroll views would clip). Desktop
  (>880px) unchanged (sticky still works there because `.dossier` is the scroll
  container on desktop).
- **B7:** add `input[type="range"]` to the `pointer:coarse` floor (taller track/hit
  area ≥ 32px effective).
- **B8:** add to the coarse floor: base `.btn`, `.ccr-tpl-save-btn`,
  `.ccr-tpl-trigger`, the History drawer back button's class, `.receipt-json-summary`
  — min 44px effective target height under coarse.
- **C2:** `.icard .tags select{max-width:100%}`.
- **Chip-filter CSS (support for Lane B):** add `.cap .filter-chips` row styles and
  an `.on` state for chip buttons (reusing the existing `.chip` look — Lane B's JSX
  uses exactly these class names; defining them here keeps `globals.css` single-lane).

## Lane B — `src/components/ControlRoom.tsx` ONLY
- **B2 (queue):** actionable-first ordering (ready_for_review, then error/stale,
  then the rest, newest-first within groups) + status filter chips in the queue
  `.cap` region (All / Needs review / Errors / Running / Done) as buttons using
  class names `.filter-chips` / `.chip` / `.on` EXACTLY (Lane A defines the styles —
  do not add CSS in this lane). Filter is client-side view state.
- **B3 (runs):** same chips for runs (All / Success / Running / Failed).
- **B5 (wire capture):** enable the currently-hardcoded-disabled character + channel
  selects at quick-capture time; captured idea carries the chosen values (defaults:
  current behavior — active dossier + first channel). No data-layer change (the
  insert already accepts them).
- **A3:** touch equivalents for hover-only info: the rail active-operator chip shows
  the codename (truncated with ellipsis is fine) as text; the Exit control gains
  visible/aria text with the signed-in email; the run-detail availability
  explanation renders as small text, not `title`-only.
- **C3:** clamp queue-card error text with the native `<details>` +
  `.receipt-json-summary` pattern already used in drill-downs (first line visible,
  disclosure for the rest).
- **C4:** wire note textarea `rows={2}` so the placeholder isn't clipped.

## Lane C — `src/components/controlroom/ChannelProfilesPanel.tsx` + `src/components/controlroom/EnqueueIdeaPanel.tsx` ONLY
- **B6:** channel Delete gains a confirmation (the `window.confirm` pattern
  established in 2a's Visual Identity remove; copy names the channel and states
  jobs already routed keep working via the default profile).
- **C1:** the enqueue "EXECUTION RECIPE" label row must not collide with the
  segmented control at 412px — structural fix inside the component (stack the label
  above the control), no CSS-file edits.

## Gates (aggregate, after lanes merge)
| # | Gate | How verified |
| --- | --- | --- |
| G-A2 | At 412px the Visual Identity modal renders the bottom-sheet layer (layer alignment/full-width assertions), desktop modal unchanged. | Walk, measured. |
| G-B1 | At 412px on the roster/dossier: the savebar's bounding rect bottom ≤ viewport height at scrollTop 0 (measured), no dossier content unreachable beneath it (last field scrollable above the bar), AND **programmatic per-view check**: on wire/queue/runs/overview/cost/channels the scroll container's `scrollHeight` is reachable (scroll to bottom, assert last element visible). Desktop savebar behavior unchanged. | Walk, all measured. |
| G-B2/3 | Queue defaults to actionable-first (first card is ready_for_review when any exists); chips filter correctly (counts match data); polling refresh preserves the active filter. | Walk vs live rows + a bridge-mocked filter case. |
| G-B5 | Intercepted capture payloads assert: explicit selections carried; "no character" selection yields `character_id === null` (never `""`); untouched selects preserve today's defaults. | Walk, intercept-and-abort. |
| G-B6 | Delete shows confirm; cancel = no request; confirm = delete request (intercept-and-abort). | Walk. |
| G-B7/8 | Under real coarse pointer emulation (fresh context, no fullPage screenshots — the audit's Playwright quirk), listed targets measure ≥ the floor. | Walk, measured. |
| G-A3/C1/C2/C3/C4 | Each rendered state asserted (text visible / no collision via bounding boxes / no bleed / clamp present). | Walk, measured. |
| G-ALL | `tsc`/tests/build clean; 412px + 1440px no overflow on every view; desktop behavior unchanged where not explicitly listed. | Local + walk both viewports. |

**Gate discipline (ledger lesson 2026-07-02): every UI gate above measures the
experienced property (position, size, collision, reachability) — presence-only
assertions are not acceptable evidence.**

## Post-review residuals (recorded 2026-07-02, follow-ups — not blockers)
- **481–620px coarse band under-reserve (MEDIUM residual, suerta re-verify):** the 240px
  dossier reserve assumes a 2-row savebar wrap; in the ~481–620px band the 7 buttons wrap
  to 4–5 rows (~254–310px) and up to ~70px can occlude. Follow-up: extend the 340px rule
  to ~640px or measure the bar. Mainstream phones (≤480) and tablets (≥768) verified clear.
- `.ccr-tpl-trigger` loses its flush text-link alignment by 12px on touch (newly-live
  coarse padding — intended tap-size fix, cosmetic side effect).
- Exit button label-in-name (WCAG 2.5.3): visible "Exit" not contained in aria-label
  "Sign out <email>" — voice-control "tap Exit" may miss; future pass.
- Filter chips were absent from the frozen B8 floor list; floored (44px) during the fix
  round — folded here so the spec matches shipped reality.
- **Reviewer-set note (corrected):** Gemini was never down — the orchestrator passed the
  prompt as the wrapper's MODEL argument instead of stdin, so calls 404'd to a fallback
  fed an EMPTY prompt (hence off-topic output) or hung on stdin. Reviews ran as
  Architect + independent suerta per lane + suerta fix-round re-verify + 53 measured
  gates; the retroactive Gemini aggregate pass (code + docs) ran post-merge with the
  corrected invocation — verdict recorded in the ledger/HQ.
