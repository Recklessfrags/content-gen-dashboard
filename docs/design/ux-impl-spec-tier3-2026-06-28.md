# UX Improvements Design Specification (Tier-3) — Character Control Room

**Document Version:** 2026-06-28  
**Target File Audience:** Dashboard Builder  
**Impact Areas:** `src/components/ControlRoom.tsx` & `src/app/globals.css`  
**Product Mandate Context (`DIRECTION.md`):** Focused control room cockpit (noir/dossier aesthetic). Strict compliance with read-only/write separation; no writing to pipeline-owned schema tables. Quality-floor focus: keyboard navigable, accessible screen reader support, responsive design, and exact microcopy.

---

## 1. STATUS QUICK-JUMP (T3-5)

### Context & Design Goal
Currently, logged ideas in "The Wire" view are cycled through status updates (`backlog` -> `active` -> `used`) via sequential clicking of the single status button. This is slow and prone to accidental over-clicking. 

This spec replaces the sequential click-cycle with a **Segmented Control** on each idea card (`.icard`), enabling operators to jump directly to any status in exactly **one action** while preserving full accessibility, responsive behavior, and keyboard navigation.

```
+─────────────────────────────────────────────────────────────+
| [CARD TITLE]                                                |
| [Card Note description text...]                            |
|                                                             |
| +------------------------------------+  [Character] [Channel]
| | Backlog |  Active  |      Used     |                      |
| +------------------------------------+                      |
+─────────────────────────────────────────────────────────────+
```

### Layout & Placement
- Located at the bottom-left of each Idea card (`.icard`), inside the `.tags` row.
- Replaces the existing `<button className={"statusbtn s-" + i.status}>` elements.
- Stays inline and compact to co-exist with the character assignment and channel selection dropdowns.

### States & Behavior
1. **Active Selected (Current Status):**
   - The button segment matching the idea's current status is styled as "active".
   - Active styling uses a solid colored border, active status color text, a matching low-opacity background fill, and `aria-pressed="true"`.
2. **Inactive (Available Transitions):**
   - Inactive segments are styled as neutral, low-contrast buttons (`aria-pressed="false"`) with a dim border.
   - On hover or focus, inactive segments light up with full text color and a medium-contrast border, inviting selection.
3. **Optimistic Loading State:**
   - On segment click, the UI instantly updates the local `ideas` state array to make the selected segment active (and update the card's left-border color) before the network response completes.
   - If the network request fails, the state automatically reverts, and the system triggers the standard dashboard flash notification: `"Status update failed"`.
4. **Transmission Blocked / Disabled:**
   - If an idea is currently transmitting/saving (`isWriteBlocked === true`), all segments are set to `disabled`, styled with `opacity: 0.5`, and mouse events are ignored.
   - If an idea is in a failed write state (`clientWriteState === "failed"`), the segmented control is hidden. The card instead shows the standard `[TRANSMISSION FAILED - RETRY]` and `Dismiss` actions.

### Exact Microcopy & ARIA Attributes
- **Segment Labels:**
  - `backlog`: `Backlog`
  - `active`: `Active`
  - `used`: `Used`
- **Segment Group Container:**
  - Must have `role="group"`
  - Must have `aria-label="Update idea status"`
- **Individual Segments:**
  - Active segment: `aria-pressed="true"`
  - Inactive segments: `aria-pressed="false"`
  - Focused segment: Standard visual focus indicator.

### Interaction & Keyboard Accessibility
- **Click Handling:** Direct assignment of status. Click triggers `setIdeaStatus(idea.id, targetStatus)` where `targetStatus` is `"backlog" | "active" | "used"`.
- **Keyboard Navigation:** Because each segment is built as a native `<button>`, each segment is naturally focusable in the tab sequence (`tabIndex={0}`). Focus transitions logically from left to right: `Backlog` -> `Active` -> `Used`.
- **Space/Enter Activation:** Normal button triggers are activated instantly with the `Space` or `Enter` keys.

### CSS & Reuse Tokens
Add the following classes to `src/app/globals.css`:
```css
/* Segmented Control wrapper */
.status-segmented-control {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--line-soft);
  background: var(--ink-3);
  padding: 2px;
  gap: 2px;
}

/* Individual segment buttons */
.segment-btn {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .04em;
  text-transform: uppercase;
  padding: 4px 8px;
  min-height: 22px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--paper-faint);
  transition: all .12s ease;
}

.segment-btn:hover:not(:disabled) {
  color: var(--paper);
  border-color: var(--line);
}

.segment-btn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}

/* Status-specific active states */
.segment-btn.active-segment {
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.segment-btn.active-segment.s-backlog {
  color: var(--paper);
  border-color: var(--line);
  background: var(--ink-2);
}

.segment-btn.active-segment.s-active {
  color: var(--brass);
  border-color: #6e5a26;
  background: rgba(201, 162, 75, 0.12);
}

.segment-btn.active-segment.s-used {
  color: var(--cleared);
  border-color: #4d5635;
  background: rgba(126, 139, 83, 0.12);
}

.segment-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 2. GROUPED IDEA->CHARACTER DROPDOWN (T3-5)

### Context & Design Goal
Inside each card on "The Wire", operators can assign an idea to a specific character dossier. Currently, this selection dropdown is a flat chronological list of characters. As the roster grows, finding active vs. draft characters gets confusing, and unassigning an idea is impossible because there is no null option (even though `character_id` is nullable in the DB).

This spec implements grouping by status, displays the currently active operator prominently at the top, inserts an explicit "Unassigned" option, and handles the no-character empty state gracefully.

```
[ -- Unassigned -- ]              <-- Explicit unassigned option (persists null)
[ ⚡ Active Operator: CODENAME ]   <-- Active operator quick-selection (if selected)
[=== ACTIVE DOSSIERS ===]         <-- optgroup label
  ● CODENAME 1
  ● CODENAME 2
[=== DRAFT DOSSIERS ===]          <-- optgroup label
  ○ CODENAME 3
```

### Layout & Placement
- Replaces the flat character map inside `<select className="tag-select" value={i.character_id ?? ""} ...>` on the idea card.
- Native `<select>` is retained to maintain browser accessibility, custom themes, and mobile-friendly selection menus.

### States & Behavior
1. **Default Grouped State:**
   - Lists "Unassigned" as the top option.
   - If a character is currently active in the workspace editing pane (`activeId !== null`), they are listed second with a quick-jump indicator.
   - Standard characters are grouped into two separate `optgroup` sections: "Active Field Manuals" and "Draft Field Manuals".
2. **Empty State (No Characters):**
   - If the `chars` array is empty, the select element displays a single option: `[ NO DOSSIERS ON FILE ]` and is marked `disabled`.
3. **Database Null-Handling:**
   - The "Unassigned" option has a value of `""` (empty string).
   - In the `setIdeaField(id, "character_id", targetValue)` function, the string must be evaluated. If `targetValue === ""`, the query sends `null` to Supabase to clear the reference.

### Exact Microcopy
- **Unassigned Option:** `[ -- Unassigned -- ]` (value `""`)
- **Active Operator Quick-Access (if `activeId` is set):** `⚡ Current Dossier: [CODENAME]` (value: `activeId`)
- **Active Group Header:** `Active Field Manuals`
- **Draft Group Header:** `Draft Field Manuals`
- **Option Prefixes:**
  - Active: `● [CODENAME]`
  - Draft: `○ [CODENAME]`
- **Empty State Option:** `[ No characters on file ]`

### Interaction & Keyboard Accessibility
- **Selection Event:** Choosing an option fires `setIdeaField(idea.id, "character_id", selectedValue)`.
- **Keyboard Access:** Fully accessible. Standard arrow keys scroll options; screen readers automatically announce group transitions and option status prefixes (`●` and `○`).

### Code Integration Detail (For Builder)
To clear an idea's character assignment to `null`, the `setIdeaField` helper must be modified to check for empty strings:
```typescript
const setIdeaField = async (id: string, f: "character_id" | "channel", v: string) => {
  const prev = ideas.find((x) => x.id === id);
  if (!prev || prev.clientWriteState) return;
  
  // Clean empty strings to null for nullable character_id field
  const valueToPersist = f === "character_id" && v === "" ? null : v;
  
  setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, [f]: valueToPersist } : x)));
  
  const { error } = await supabase
    .from("ideas")
    .update({ [f]: valueToPersist })
    .eq("id", id);
  // ... revert and show flash warning on error ...
};
```

---

## 3. BIBLE SIDE-BY-SIDE DIFF (T3-3, Effort L)

### Context & Design Goal
The Bible history drawer (`HistoryDrawer`) allows operators to browse past snapshots of a character manual, previewing them in-place or restoring them. However, it does not let the operator compare changes directly. 

This spec introduces a dedicated **Dossier Comparison Mode**. Clicking "Compare" on an archive revision launches an immersive, side-by-side / inline diffing overlay that visualizes changes field-by-field, preserving full keyboard focus and adapting fluidly to mobile.

```
+─────────────────────────────────────────────────────────────────────────────+
| BIBLE REVISION COMPARISON                                               [X] |
| Current Dossier (Codename) vs. Revision from June 28, 2026, 14:32:01        |
| Layout: [ Side-by-Side ]  ( Inline )                                        |
+─────────────────────────────────────────────────────────────────────────────+
| VOICE                                                                       |
| [ Current Value ]                    | [ Revision Value ]                   |
| "Whisper-quiet cadence, gritty"      | "Booming announcer cadence, gritty"  |
|                                      | (Diff: Booming announcer)            |
+─────────────────────────────────────────────────────────────────────────────+
| CADENCE (UNCHANGED)                                                         |
| "Deliberate, pauses after questions."                                        |
+─────────────────────────────────────────────────────────────────────────────+
|                      [ RESTORE THIS REVISION ]  [ BACK TO HISTORY ]         |
+─────────────────────────────────────────────────────────────────────────────+
```

### Layout & Placement
- **Trigger Button:** Placed inside the `.revision-card` next to the existing `Preview` and `Restore` buttons. Label: `Compare`.
- **Comparison Pane:** Triggering "Compare" opens a full-viewport, high-focus overlay (`.compare-overlay`). It darkens the background and places a styled compare sheet front-and-center.
- **Layout Modes:** A toggle bar at the top of the comparison overlay allows the operator to swap between:
  1. **Side-by-Side View (Default on Desktop):** Splits each field into two columns (Left: Current, Right: Revision).
  2. **Inline Diff View (Fallback on Mobile):** Shows a single unified column per field. Removed characters are wrapped in red strike-throughs; added characters are wrapped in green underlines.

### States & Behavior
1. **Launch State:**
   - Opens when the user clicks `Compare` on a revision.
   - Fetches the active character’s current values (local edited buffer) and overlays them against the selected history revision object's `bible` fields.
2. **Diff Field Valuation:**
   - **Unchanged Fields:** If a field has identical text in both versions, it is marked with an `.unchanged` tag, and the text is rendered in a low-opacity gray font to let the user scroll past it quickly.
   - **Modified Fields:** Highlighted with bright borders and status chips indicating the difference.
3. **Responsive Mobile Mode:**
   - On screen widths `<=` `768px`, the side-by-side dual-column mode is automatically disabled and forced to the stacked **Inline Diff View** to prevent squeezed, unreadable columns.
4. **Action Integration:**
   - Bottom action bar provides clear next steps:
     - `Restore Draft`: Instantly restores this revision to the main workspace (delegating to the standard `onRestore(revision)` function) and closes the compare overlay.
     - `Return`: Closes the comparison view and returns the operator to the History Drawer without losing drawer scroll positioning.

### Exact Microcopy
- **Compare Trigger Button:** `Compare` (Aria-label: `Compare current bible to revision from [formatted date]`)
- **Overlay Header:** `Dossier Revision Comparison`
- **Overlay Subhead:** `Comparing live manual draft of [CODENAME] against archive snapshot from [DATE_TIME]`
- **Layout Toggle Labels:** `Side-by-Side Layout` & `Inline Diff Layout`
- **Field State Chips:** `[ UNCHANGED ]` & `[ MODIFIED ]`
- **Actions:**
  - Restoring: `[ RESTORE THIS VERSION ]`
  - Backing out: `[ BACK TO HISTORY ]`

### Interaction & Keyboard Accessibility
- **Focus Lock (useFocusTrap):** The overlay container uses the existing `useFocusTrap` hook when mounted. Initial focus is placed on the `BACK TO HISTORY` action button. Pressing `Escape` or clicking the backdrop closes the overlay.
- **Aria Roles:**
  - Overlay container marked with `role="dialog"` and `aria-modal="true"`.
  - Toggle buttons marked with `role="tab"` inside a `role="tablist"` element, with `aria-selected` denoting the active view mode.

### CSS & Reuse Tokens
Add the following classes to `src/app/globals.css`:
```css
/* Fullscreen overlay wrapper */
.compare-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(21, 24, 30, 0.94);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* Compare sheet container */
.compare-dialog {
  width: min(1000px, 100%);
  height: min(780px, 90vh);
  background: var(--ink);
  border: 1px solid var(--line);
  border-top: 4px solid var(--brass);
  border-radius: 4px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
}

/* Compare Header */
.compare-head {
  padding: 20px 24px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--ink-2);
}

.compare-head h2 {
  font-family: var(--display);
  font-size: 24px;
  letter-spacing: .03em;
  text-transform: uppercase;
  margin: 0;
}

.compare-head p {
  font-size: 13px;
  color: var(--paper-dim);
  margin: 6px 0 0;
}

/* Layout switcher bar */
.compare-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--ink-3);
  gap: 16px;
  flex-wrap: wrap;
}

/* Compare body container */
.compare-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Field comparison block */
.compare-field {
  border: 1px solid var(--line-soft);
  border-radius: 3px;
  background: var(--ink-2);
  overflow: hidden;
}

.compare-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: var(--ink-3);
  border-bottom: 1px solid var(--line-soft);
}

.compare-field-header label {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--paper-dim);
}

/* Split Columns */
.compare-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--line-soft);
}

.compare-column {
  padding: 14px;
  background: var(--ink-2);
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  min-height: 60px;
}

.compare-column.removed {
  background: rgba(200, 69, 59, 0.04);
}

.compare-column.added {
  background: rgba(126, 139, 83, 0.04);
}

/* Diff highlights */
.diff-del {
  background: rgba(200, 69, 59, 0.22);
  text-decoration: line-through;
  color: #ff9e96;
  padding: 1px 3px;
  border-radius: 2px;
}

.diff-ins {
  background: rgba(126, 139, 83, 0.22);
  text-decoration: underline;
  color: #c9e2b0;
  padding: 1px 3px;
  border-radius: 2px;
}

.compare-field.unchanged {
  opacity: 0.55;
}

/* Action Footer */
.compare-foot {
  padding: 18px 24px;
  border-top: 1px solid var(--line-soft);
  background: var(--ink-2);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

/* Mobile responsive collapse */
@media (max-width: 768px) {
  .compare-split {
    grid-template-columns: 1fr;
  }
}
```

---

## 4. OVERVIEW SPARKLINES — FEASIBILITY + SPEC (T3-4)

### Feasibility Assessment
**Is it buildable?** **YES, absolutely.** 

* **Available Data Source:** The `episodes` array already contains high-fidelity temporal and budget data:
  - `created_at` (ISO string timestamp representing when the run executed).
  - `spend` (decimal number representing the computational/pipeline cost).
* **Derivable Time Series:** By sorting the `episodes` array chronologically (`created_at` ascending), we can instantly build two distinct analytical trends on the client without writing any new API endpoints, schema modifications, or installing chart libraries:
  1. **Cumulative Spend Trend (For "Total Operational Spend"):** A running cumulative sum of values plotted over time. This generates a beautifully smooth, monotonically increasing line that maps perfectly to total operational cost growth.
  2. **Activity and Run Frequency (For "Total Pipeline Runs"):** Raw individual `spend` spikes plotted over time, showing the cost variance per individual run, or raw run frequency.
* **Non-Derivable Data (Explicit Disclosures):**
  - We *cannot* map smooth hourly/daily buckets if execution history is sparse (e.g., long intervals of inactivity). 
  - Sub-penny cost transitions on in-flight runs cannot be derived from `costReceipts` because the query fetching receipts does not select `ts` or `created_at`.
  - **Solution:** We plot sequential runs on the X-axis chronologically by run sequence (Run 1, Run 2, Run 3...) instead of absolute calendar-grid spacing. This completely mitigates data-sparsity issues and ensures a beautiful, meaningful trendline on any dataset size.

```
Total Operational Spend                [Cost]
$324.81
                  /\__/\_.-.
                 /          \
                /            \●
Avg. Cost: $4.01 / episode
```

### Layout & Placement
- Nested directly inside the standard `metric-card` on the "Overview" page.
- Placed on the right-hand side of the metric value (as a side-car widget) or centered as a full-width block directly below the large metric number.
- Spec implements the **Side-car Sparkline** (compact inline layout aligning next to the value) for maximum screen economy and a professional, dense noir-cockpit design.

### States & Fallbacks
1. **Pristine State (Data >= 2 runs):**
   - Renders a small, inline, high-performance SVG graphic using raw coordinate interpolation.
2. **Minimal Data Fallback (Data == 1 run):**
   - Since a trendline cannot be drawn with a single point, the SVG falls back to rendering a flat, static dashed horizontal line across the center of the viewBox using `var(--line-soft)`.
3. **Empty State (Data == 0 runs):**
   - The sparkline is omitted, and the card's standard `.metric-empty` subtext handles the placeholder.
4. **Reduced-Motion Compliance:**
   - SVG vectors are rendered statically with no interactive hover tooltips or drawing animations, satisfying `@media (prefers-reduced-motion)` constraints natively.

### Exact Microcopy
- **Visual element label (for screen readers):**
  - Card `aria-label` is updated to summarize the visual trend, ensuring screen readers announce the metric clearly.
  - Spend card: `[Value] with a rising cumulative expenditure curve.`
  - Runs card: `[Value] with a chart illustrating computational spikes.`

### SVG Coordinate Generation Spec (For Builder)
To draw a cumulative spend sparkline within an SVG container of `width="120" height="34"`:
1. **Sort & Compute:**
   ```typescript
   const sortedRuns = [...episodes].sort((a, b) => 
     new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
   );
   
   let cumulativeSum = 0;
   const trendPoints = sortedRuns.map((r) => {
     cumulativeSum += r.spend || 0;
     return cumulativeSum;
   });
   ```
2. **Map to Grid:**
   - Map index `i` (X) to SVG viewBox width `[2, 118]`: 
     `x = (i / (trendPoints.length - 1)) * 116 + 2`
   - Map value `v` (Y) to SVG viewBox height `[4, 30]` (providing 4px vertical padding to avoid clipping line strokes):
     `y = 30 - ((v - minVal) / (maxVal - minVal || 1)) * 26`
3. **Draft the Path:**
   - Construct path string `d`: `M x0 y0 L x1 y1 L x2 y2 ...`
   - Construct area path `areaD`: `M x0 34 L x0 y0 ... L xn yn L xn 34 Z` to apply a beautiful fading background gradient fill.
4. **Highlights:**
   - Render a small circular dot `<circle cx={xn} cy={yn} r="3" />` at the final data point (far right) to signify the current live metric.

### CSS & Reuse Tokens
Add the following classes to `src/app/globals.css`:
```css
/* Inline container on metric card */
.metric-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-top: 4px;
}

/* Sparkline SVG Styles */
.sparkline-svg {
  flex-shrink: 0;
  width: 120px;
  height: 34px;
  pointer-events: none;
  overflow: visible;
}

/* Line stroke styling */
.sparkline-stroke {
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sparkline-stroke.s-spend {
  stroke: var(--brass);
}

.sparkline-stroke.s-runs {
  stroke: var(--stamp);
}

/* Area fill gradient under-stroke */
.sparkline-area {
  stroke: none;
}

/* Endpoint pulse dot highlight */
.sparkline-dot {
  stroke-width: 1;
}

.sparkline-dot.s-spend {
  fill: var(--cleared);
  stroke: var(--ink);
}

.sparkline-dot.s-runs {
  fill: var(--stamp);
  stroke: var(--ink);
}
```

#### SVG Markup Template
```html
<svg class="sparkline-svg" viewBox="0 0 120 34" aria-hidden="true">
  <defs>
    <!-- Beautiful gradient fading down to zero opacity -->
    <linearGradient id="spend-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--brass)" stop-opacity="0.16" />
      <stop offset="100%" stop-color="var(--brass)" stop-opacity="0.00" />
    </linearGradient>
    <linearGradient id="runs-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--stamp)" stop-opacity="0.16" />
      <stop offset="100%" stop-color="var(--stamp)" stop-opacity="0.00" />
    </linearGradient>
  </defs>
  
  <!-- Area gradient under-stroke -->
  <path class="sparkline-area" fill="url(#spend-grad)" d="[GENERATED_AREA_PATH]" />
  
  <!-- Main stroke curve -->
  <path class="sparkline-stroke s-spend" d="[GENERATED_STROKE_PATH]" />
  
  <!-- Endpoint dot highlight -->
  <circle class="sparkline-dot s-spend" cx="[LAST_X]" cy="[LAST_Y]" r="3" />
</svg>
```

---

## 5. DESIGN QUALITY ASSURANCE (QA) CHECKLIST

When the Builder implements this specification, they must verify the following items:

- [ ] **Accessibility:** All new `<button>` elements inside the segmented control are keyboard-navigable and have distinct focus outlines (`:focus-visible`).
- [ ] **Keyboard Traps:** The Dossier Comparison Overlay uses `useFocusTrap` correctly and releases focus cleanly when dismissed.
- [ ] **HTML Validity:** The grouped character dropdown uses valid `<optgroup>` and nullable options to ensure error-free parsing.
- [ ] **Mobile Responsiveness:** Comparison mode columns collapse to inline diff layout below `768px` viewport width.
- [ ] **No Dependency Leakage:** The SVG sparkline is drawn entirely with native React mathematical interpolation and standard HTML/CSS, with no third-party libraries installed.
- [ ] **Performance:** Sparkline calculations are wrapped in React `useMemo` to prevent redundant recalculations on unrelated state modifications.
