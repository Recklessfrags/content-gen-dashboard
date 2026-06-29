# UX Improvements Design Specification — Character Control Room

**Document Version:** 2026-06-28  
**Target File Audience:** Dashboard Builder  
**Impact Areas:** `src/components/ControlRoom.tsx` & `src/app/globals.css`  
**Product Mandate Context (`DIRECTION.md`):** Focused control tool (not a kanban/analytics board). No pipeline-owned table writes. Core focus on polish, responsive accessibility, and honest read-only disclosures.

---

## 1. Mobile Character Switcher (Viewport <= 880px)

### Layout & Placement
- Prepended at the very top of `<section className="dossier">` (above `<header className="dossier-head">`).
- Enclosed in a responsive wrapper `<div className="mobile-switcher">` that renders as a full-width row on mobile.
- **Media Queries (CSS):** Visible only on viewports `max-width: 880px` (utilizing `display: flex`); hidden on desktop (`display: none`).

### States & Behavior
- **Default (Clean):** Shows the currently selected character’s codename. Dropdown is populated with all characters, grouped into distinct `optgroup` sections.
- **Empty (No Characters on File):** If the character array is empty, the select element displays the text `"NO DOSSIERS ON FILE"`, is grayed out, and is marked `disabled`. The `+ New` button remains enabled.
- **Loading:** Grayed out and marked `disabled` with placeholder text `"ESTABLISHING COMMS COM LINK..."`.
- **Saving:** Remains interactive, but is disabled if the parent form is in an active database save operation.

### Exact Microcopy
- **Section Label (CSS eyebrow style):** `SELECT DOSSIER`
- **Active Manuals Group:** `ACTIVE FIELD MANUALS`
- **Draft Manuals Group:** `DRAFT FIELD MANUALS`
- **Option Codename Indicators:**
  - Active: `● [CODENAME]`
  - Draft: `○ [CODENAME]`
- **"+ New" Button Copy:** `+ NEW`

### Interaction Details
- **Trigger:** Changing the select dropdown value instantly updates the `activeId` state, refreshing the dossier view.
- **Form Discard Check:** If the current character is *dirty* (contains unsaved changes), changing the select dropdown blocks the switch and opens the confirmation dialog (see Section 2).
- **"+ New" Affordance:** Clicking the `+ NEW` button fires `addChar` to create a draft character on Supabase and automatically select it.
- **Accessibility:** Select and button include explicit `aria-label` tags, support full keyboard focus, and use standard focus indicator outlines (`:focus-visible`).

### CSS & Reuse Tokens
- **Container Class (`.mobile-switcher`):**
  ```css
  .mobile-switcher {
    display: none;
    gap: 10px;
    align-items: center;
    padding: 12px 18px;
    background: var(--ink-2);
    border-bottom: 1px solid var(--line-soft);
  }
  @media (max-width: 880px) {
    .mobile-switcher { display: flex; }
  }
  ```
- **Select Element:** Use class `.cr select` with custom styling:
  ```css
  .mobile-switcher select {
    flex: 1;
    background: var(--ink-3);
    border: 1px solid var(--line-soft);
    border-radius: 3px;
    padding: 8px 12px;
    font-size: 13px;
    font-family: var(--mono);
    text-transform: uppercase;
    color: var(--paper);
  }
  ```
- **New Button:** Reuse `.btn.ghost` class with compact padding: `padding: 8px 12px; height: 36px; font-size: 11px;`.

---

## 2. Dirty-State & Unsaved-Edits Protection

### Layout & Placement
- **Savebar Warning:** Placed in the sticky `.savebar` directly to the left of the main Save button.
- **Roster List Warning:** Placed on the active character’s `.pcard` in the sidebar roster.
- **Global Context Chip:** Positioned permanently at the top of the left navigation `.rail`, below the vertical `CONTROL·ROOM` branding.

### States & Behavior
- **Pristine (Clean):** State matches database records. Savebar warnings are hidden. Rail context chip shows a solid clean status.
- **Dirty (Unsaved Edits):** Triggers when any character manual text field (e.g., `codename`, `concept`, `voice`, `cadence`, `vocab`, `offlimits`, `lines`, `beats`, `runtime`) diverges from its database-loaded pristine values.
  - Displays a persistent status warning inside the savebar.
  - Appends an asterisk or subtle indicator on the roster sidebar list item.
  - Displays an unsaved asterisk on the global `.rail` active operator chip.
  - Blocks any view change, character change, or history drawer interaction, triggering an interrupt confirmation modal.

### Exact Microcopy
- **Savebar Alert Label:** `• UNPERSISTED CHANGES IN BUFFER`
- **Rail Active Operator Chip:** `ACTIVE: [CODENAME]` (appends `*` if dirty)
- **Roster Sidebar Card:** `[CODENAME]*` (appends `*` if dirty)
- **Interrupt Modal (Confirmation Dialog):**
  - **Header (Title):** `UNSAVED CHANGES IN BUFFER`
  - **Body (Subtext):** `You have uncommitted modifications in the field manual for [CODENAME]. Leaving this screen will erase these changes permanently.`
  - **Negative Action Button:** `DISCARD CHANGES`
  - **Positive Action Button:** `KEEP EDITING`

### Interaction Details
- **Dirty Evaluation:** On character load, shallow copy the pristine manual fields into a state variable `pristineActiveChar`. On every keystroke, compare current `chars` state against `pristineActiveChar` to determine `isDirty`.
- **Interrupt Interceptor:** If `isDirty === true`, clicking any of the following blocks the navigation event:
  - Any `.pcard` button in the roster list.
  - Any mobile switcher dropdown option.
  - Any rail navigation button (`.navbtn` for Roster, The Wire, Runs, Overview, Cost, or Exit).
  - Any history preview or restore triggers.
- **Confirmation Handling:**
  - Clicking **"KEEP EDITING"** closes the modal, aborts the transition, and returns focus to the last active textarea.
  - Clicking **"DISCARD CHANGES"** rolls back the active character state in `chars` to match the pristine copy, closes the modal, clears the dirty flags, and executes the blocked transition.
- **Rail Context Chip:** Displays current active character name even when navigating away to other views (e.g., Cost, Runs, The Wire). Clicking it instantly returns the operator to the Roster view focusing on that active character's manual.

### CSS & Reuse Tokens
- **Savebar Warning Text:** Styled in mono text with a gold/warning hue:
  ```css
  .savebar-dirty-label {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .06em;
    color: var(--brass);
    animation: pulseMuted 1.5s ease-in-out infinite;
  }
  @keyframes pulseMuted {
    50% { opacity: 0.6; }
  }
  ```
- **Rail Context Chip:**
  ```css
  .rail-context-chip {
    margin-top: 10px;
    padding: 4px 8px;
    background: var(--ink-3);
    border: 1px solid var(--line-soft);
    border-radius: 2px;
    font-family: var(--mono);
    font-size: 9px;
    text-transform: uppercase;
    color: var(--paper-dim);
    text-align: center;
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
  .rail-context-chip.dirty {
    color: var(--brass);
    border-color: var(--brass);
  }
  ```
- **Modal Wrapper:** Reuse existing `.restore-layer` and `.restore-dialog` classes for dialog markup, setting a warning border: `border-left: 4px solid var(--brass);`.

---

## 3. Idea Capture Upgrade (The Wire)

### Layout & Placement
- Replaces the single `.cap` text input with an expandable, double-field form panel in the top area of "The Wire" view (`view === "wire"`).
- Contains two dedicated inputs: a Title field and a Note field, plus tactical submission actions.

### States & Behavior
- **Default (Idle):** Title field is active. Note field is collapsed to a single line (`rows={1}`). Submit button is enabled if Title has content.
- **Focused/Expanded:** Note textarea transitions smoothly to an expanded state (`rows={4}` or `rows={5}`), showing auxiliary capture options.
- **Saving (Optimistic Insert):** Instantly inserts a temporary placeholder card at index 0 of the ideas array. Controls inside this card are disabled. The main form inputs are cleared instantly to prevent lockouts.
- **Failed:** If Supabase fails, the optimistic card's border turns red, displaying an explicit error/retry prompt.
- **Saved:** The card resolves back to normal opacity with an active status cycle button.

### Exact Microcopy
- **Capture Form Helper (Eyebrow):** `TRANSMITTING FREQUENCY · LOG NEW BEAT`
- **Title Input Placeholder:** `Dossier title (e.g. "Acoustic Kitty target extraction")...`
- **Note Textarea Placeholder:** `Tactical notes, dialogue fragments, or scene beats (optional)...`
- **Form Submit Button:** `LOG IT`
- **State Labels on Optimistic Card:**
  - Optimistic/Saving: `[TRANSMITTING...]`
  - Failed Write: `[TRANSMISSION FAILED - RETRY]`

### Interaction Details
- **Textarea Expansion:** Selecting the Note textarea transitions its height smoothly.
- **Hotkey Submission:** Pressing `Cmd + Enter` (macOS) or `Ctrl + Enter` (Windows/Linux) inside either input immediately submits the form.
- **Optimistic Workflow:**
  1. Local validation ensures Title is not empty.
  2. Generates a temporary ID (e.g., `temp-178239281`).
  3. Inserts an optimistic item into `ideas` state: `status: "backlog"`, `title`, `note`, `character_id: activeId`.
  4. Immediately resets `draftIdea` and `draftNote` text states, refocusing the Title field.
  5. Fires the actual async Supabase insert.
  6. **On Success:** Replaces the temporary local ID with the database-returned ID and activates standard card controls.
  7. **On Failure:** Preserves the card, highlights it with a red border (`var(--stamp)`), disables normal actions, and displays a red `RETRY` button.
- **Duplicate Prevention:** The submit button `LOG IT` is disabled if the same title is actively in an optimistic transmission flight.

### CSS & Reuse Tokens
- **Expandable Note Textarea:**
  ```css
  .cap textarea.note-input {
    width: 100%;
    background: var(--ink-3);
    border: 1px solid var(--line-soft);
    border-radius: 3px;
    padding: 10px 12px;
    font-size: 13.5px;
    color: var(--paper);
    transition: height 0.15s ease-in-out;
    resize: none;
  }
  ```
- **Optimistic Card State (`.icard.optimistic`):**
  ```css
  .icard.optimistic {
    border-left-style: dashed;
    border-left-color: var(--line-soft);
    opacity: 0.6;
    pointer-events: none; /* locks all selects and buttons during transmission */
  }
  .icard.write-failed {
    border-left-color: var(--stamp);
    border-color: var(--stamp-deep);
  }
  ```

---

## 4. Loading Skeletons

### Layout & Placement
- Replaces standard centered spinners in these three locations:
  1. **Cost View:** Replaces `.loading.cost-loading` centered spinner under the `.cost-content` body.
  2. **History Drawer:** Replaces `.history-loading` centered spinner under the `.history-body`.
  3. **Run Detail (Drilldown Panel):** Replaces the centered spinner inside `.drilldown-content`.

### States & Behavior
- **Default (Loading):** Displays structured grey outlines and bars pulsing in opacity. No text is rendered. Matches the exact width, height, and alignment of the final loaded cards to eliminate layout shifts.
- **Motion Gating:** A CSS keyframe animation controls the pulsing glow. On systems with `prefers-reduced-motion: reduce`, the pulse is entirely deactivated, rendering the skeletons as static placeholders.

### Exact Microcopy
- Skeletons do not render microcopy. Skeletons contain empty, block-styled divs with the `aria-hidden="true"` and `role="progressbar"` attributes.

### Interaction Details
- Completely non-interactive. All focus indices are omitted (`tabIndex={-1}`).

### CSS & Reuse Tokens
- **Glow Keyframes and Classes (`globals.css`):**
  ```css
  .skeleton {
    background: var(--ink-3);
    border-radius: 3px;
    display: inline-block;
    position: relative;
    overflow: hidden;
  }
  .skeleton-pulse {
    animation: skeletonGlow 1.4s ease-in-out infinite;
  }
  @keyframes skeletonGlow {
    0% { background-color: var(--ink-3); }
    50% { background-color: var(--line-soft); }
    100% { background-color: var(--ink-3); }
  }
  @media (prefers-reduced-motion: reduce) {
    .skeleton-pulse { animation: none !important; }
  }
  ```
- **Cost View Skeleton Layout:**
  - Renders a left column containing three placeholder cards: a large metric card block (matching `.hero-card`), a cap card block (matching `.parked-card`), and a provider card block (matching `.provider-card`).
  - Renders a right column containing a stack of four empty log rows (matching the `.audit-card` height).
- **History Drawer Skeleton Layout:**
  - Renders a vertical list of three skeleton revision cards inside `.history-body`. Each card contains a top-aligned meta row bar, an identity block, a content line, and two tiny bottom-aligned action buttons.
- **Run Detail Skeleton Layout:**
  - Renders a vertical line mimicking `.timeline::before`.
  - Renders three skeleton nodes (`.timeline-node` placeholders) and three empty `.receipt-card` outlines, complete with header bars and collapsed accordion summaries.

---

## 5. Toast / Status Feedback Live-Region

### Layout & Placement
- Positioned in the top-right corner of the viewport.
- **Floating Container:** `position: fixed; top: 24px; right: 24px; z-index: 100; display: flex; flex-direction: column; gap: 8px; pointer-events: none;`.

### States & Behavior
- **Success Toast:** Slides in from the right. Green accent border on the left side. Accessible `role="status"` with `aria-live="polite"` configuration.
- **Error Toast:** Slides in from the right. Red accent border on the left side. Accessible `role="alert"` with `aria-live="assertive"` configuration.
- **Persistent Affordance (Near Save Button):** Invisible during dirty state. Activates immediately after a successful save. Remains statically visible in the savebar.

### Exact Microcopy
- **Dossier Save Success Toast:** `✓ LEDGER UPDATED · SNAPSHOT SECURED`
- **Dossier Save Failure Toast:** `⚠ TRANSMISSION FAILED · DATABASE UNREACHABLE`
- **Idea Logged Success Toast:** `✓ FREQUENCY CAPTURED · THE WIRE UPDATED`
- **Idea Logged Failure Toast:** `⚠ ACCESS DENIED · TRANSMISSION INTERRUPTED`
- **Persistent Savebar Label:** `✓ SECURED TO LEDGER`

### Interaction Details
- **Floating Stack:** Supports rendering multiple toasts simultaneously in a top-down stacked order.
- **Auto-Dismiss:** Toasts automatically fade out, slide off-screen, and are deleted from state after exactly `4.5 seconds` (`4500ms`).
- **Manual Close:** Each toast features an `'×'` close button on its far right edge. Hovering highlights the button. Clicking it instantly unmounts the individual toast.
- **Saved Affordance:** The static `✓ SECURED TO LEDGER` label near the Save button is persistent. If the operator edits any field in the editor, this label instantly unmounts and is replaced by the `• UNPERSISTED CHANGES IN BUFFER` warning.

### CSS & Reuse Tokens
- **Toast Element Classes:**
  ```css
  .toast-item {
    pointer-events: auto;
    background: var(--ink-2);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 14px 18px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--paper);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes toastSlideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .toast-item.success { border-left: 3px solid var(--cleared); }
  .toast-item.error { border-left: 3px solid var(--stamp); }
  ```
- **Toast Close Button:**
  ```css
  .toast-close {
    background: none;
    border: none;
    font-size: 14px;
    color: var(--paper-faint);
    cursor: pointer;
    line-height: 1;
    padding: 0;
  }
  .toast-close:hover { color: var(--paper); }
  ```
- **Persistent Affordance Label:** Styled with `color: var(--cleared); font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;`.

---

## 6. Read-Only Cost Controls Redesign

### Layout & Placement
- Positioned inside the Cost view summary section (`view === "cost"`), replacing the empty budget progress bar and fake grouping toggle.

### States & Behavior
- Both cards are fully static, non-interactive information blocks. Hover mouse states (pointer cursor), button borders, and focus rings (`tabIndex`) are completely removed to prevent confusion.

### Exact Microcopy
- **Budget Cap Card Redesign:**
  - **Eyebrow:** `SYSTEM REGULATION`
  - **Title:** `BUDGET CAP ENFORCEMENT`
  - **Status Badge:** `[AWAITING PIPELINE UPGRADE]`
  - **Main Description Text:** `Spend capping is enforced directly at the content pipeline level (research → assembly). Live dashboard threshold monitoring is currently parked, awaiting schema exposure of the pipeline's internal threshold tables.`
- **API Provider Breakdown Card Redesign:**
  - **Header Title:** `API PROVIDER BREAKDOWN`
  - **Attribution Disclosure Footnote:** `SYSTEM NOTE: Character attribution is currently deferred. LLM token expenses are grouped by provider. Mapping specific costs to individual manuals requires upgrading the pipeline's execution schemas.`

### Interaction Details
- **Fake Toggle Elimination:** The `Providers / Characters Deferred` pseudo-toggle button is deleted. The breakdown section header renders as static text: `"API PROVIDER BREAKDOWN"`.
- **Progress Bar Polish:** The parked Cap status card removes the empty horizontal progress bar container (`.budget-seam-bar`) completely. It is styled with a dashed border to denote its deferred/parked status.

### CSS & Reuse Tokens
- **Dashed Parked Card:**
  ```css
  .parked-card.redesigned {
    border: 1px dashed var(--line-soft);
    background: rgba(21, 24, 30, 0.2);
    cursor: default;
  }
  .parked-card.redesigned:hover {
    background: rgba(21, 24, 30, 0.2); /* disables the hover highlights */
    border-color: var(--line-soft);
  }
  ```
- **Attribution Disclosure Footnote:** Styled with monospaced metadata settings:
  ```css
  .cost-attribution-disclosure {
    font-family: var(--mono);
    font-size: 10px;
    line-height: 1.45;
    color: var(--paper-faint);
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px dashed var(--line-soft);
  }
  ```

---

## 7. Local Budget Guardrail (Net-New)

### Layout & Placement
- Rendered as an independent settings card placed inside the left column of the Cost view summary (`view === "cost"`), directly below the primary "Running Total Operational Spend" card.

### States & Behavior
- **Default (Unset):** The localStorage item is empty. The input field displays empty with a tactical placeholder.
- **Set (Active Target):** Displays the validated numeric value saved in `localStorage`.
- **Breached/Over-Budget:** Triggers when the total spend (`costStats.grandTotal`) exceeds the numerical value saved in `localStorage`.
  - Appends a prominent warning badge and text label inside the hero spend card.
  - Switches the hero spend card's left-accent border color.
  - Alarms the live pulse dot (`.pulse-dot`), causing it to flash red.

### Exact Microcopy
- **Guardrail Card Eyebrow:** `LOCAL SPEND GOVERNANCE`
- **Guardrail Card Input Label:** `SET TARGET GOAL (USD)`
- **Guardrail Card Input Placeholder:** `No local target set...`
- **Spend Breach Alarm Badge:** `[LIMIT EXCEEDED]`
- **Spend Breach Card Warning Description:** `Operational spend has breached your local target of $[target].`

### Interaction Details
- **Local Storage Persistency:** Typing a numeric value (e.g., `150`) auto-saves the target into browser storage on `change` or `blur`:
  `localStorage.setItem('content_gen_budget_target', validatedNumber)`.
- **Target Deletion:** Clearing the input field deletes the item:
  `localStorage.removeItem('content_gen_budget_target')`.
- **Target Evaluation:** On cost view mount and target input change, compare `costStats.grandTotal` with the saved target.
- **Visual Breach Warning System:**
  - **Border Shift:** The main hero spend card (`.metric-card.hero-card`) transitions its left border from green (`var(--cleared)`) to alert red (`var(--stamp)`).
  - **Alarm Badge:** An explicit red badge `[LIMIT EXCEEDED]` is shown in the upper-right corner of the hero card.
  - **Alarm Pulse:** The live pulse indicator dot (`.pulse-dot`) switches color to red (`var(--stamp)`) and flashes continuously.

### CSS & Reuse Tokens
- **Breached Hero Card Accent:**
  ```css
  .hero-card.breached {
    border-left-color: var(--stamp) !important;
  }
  ```
- **Flashing Red Pulse Indicator:**
  ```css
  .pulse-dot.breached {
    background: var(--stamp);
    box-shadow: 0 0 0 0 rgba(200, 69, 59, 0.5);
    animation: alertRedPulse 1.4s ease-out infinite;
  }
  @keyframes alertRedPulse {
    70% { box-shadow: 0 0 0 7px rgba(200, 69, 59, 0); }
    100% { box-shadow: 0 0 0 0 rgba(200, 69, 59, 0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse-dot.breached { animation: none !important; }
  }
  ```
- **Limit Exceeded Badge:** Styled using `.badge` tokens with alert-colored border: `border-color: var(--stamp-deep); color: var(--stamp); background: rgba(200, 69, 59, 0.08);`.

---

## 8. Export Dossier to Markdown (Net-New)

### Layout & Placement
- Located inside the savebar at the bottom of the dossier editing view (`view === "roster"`), positioned directly to the right of the `View History` button.

### States & Behavior
- **Default:** Visible and active as long as an active character manual is successfully loaded.
- **Disabled:** Grayed out and marked `disabled` during active save operations or while the interface is loading.

### Exact Microcopy
- **Button Copy:** `EXPORT MANUAL (MD)`

### Interaction Details
- **Trigger:** Clicking the button compiles the active character manual fields from state into a valid Markdown document format.
- **Trigger Download:** Uses a browser-native text-file download flow:
  ```javascript
  const blob = new Blob([markdownContent], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${activeCharacter.codename.toLowerCase().replace(/\s+/g, "_")}_field_manual.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  ```

### Compiled Markdown File Template
```markdown
# FIELD MANUAL: [CODENAME]

**System Identifier:** [CHARACTER_ID]
**Operating Status:** [ACTIVE / DRAFT]
**Registry Timestamp:** [CREATED_AT]

---

## ONE-LINE CONCEPT
[concept]

## VOICE & IDENTITY
[voice]

## CADENCE & DELIVERY
[cadence]

## VOCABULARY & CATCHPHRASES
[vocab]

## OFF-LIMITS (HARD RULES)
[offlimits]

## GOLD-STANDARD LINES
```
[lines]
```

## BEAT TEMPLATE
```
[beats]
```

## RUNTIME TARGET
[runtime]
```

### CSS & Reuse Tokens
- **Savebar Button:** Reuse `.btn.ghost` class to maintain layout proportions:
  ```html
  <button className="btn ghost" onClick={handleExport} disabled={saving}>
    Export Manual (MD)
  </button>
  ```
