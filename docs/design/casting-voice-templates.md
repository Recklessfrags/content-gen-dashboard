<!-- Designer: Gemini (via scripts/gemini.sh, 2026-07-01). Reviewed by the Architect; binds as written. -->
# UI/UX Design Spec: Casting Studio - Voice Template Library
**File Path:** `docs/design/casting-voice-templates.md`
**Aesthetic:** Paper/Brass Dossier (`--ink`, `--paper`, `--brass`, `--stamp`, etc.)

## 1. Architecture & Placement
The Voice Template Library operates within the existing **Casting Studio** modal. It utilizes a **Drawer Sub-view** pattern to preserve the user's context without requiring a full page navigation or cluttering the main slider view.

*   **Trigger (Browse):** A secondary button labeled `[ BROWSE RECORDS ]` positioned in the top-right of the Casting Studio header.
*   **Trigger (Save):** A secondary action button labeled `[ FILE AS TEMPLATE ]` located directly below the 4 design sliders (Age/Grit/Tone/Delivery) and Gender select, adjacent to the primary `[ AUDITION ]` button.
*   **Location:** When "Browse Records" is clicked, the Template Library slides in from the right over the design sliders (a paper sheet overlapping another), covering the sliders but leaving the Casting Studio header and preview bracket visible underneath.

## 2. Token & Typography Mapping
*   **Backgrounds:** `--paper` (Primary library surface), `--paper-dim` (Template Cards), `--paper-faint` (Hover states / Inputs).
*   **Text/Icons:** `--ink` (Primary labels/data), `--ink-2` (Descriptions/Metadata), `--ink-3` (Disabled states).
*   **Borders:** `--line` (Card outlines, headers), `--line-soft` (Internal dividers).
*   **Accents:** `--brass` (Icons/Highlights), `--stamp` (Primary actions), `--stamp-deep` (Destructive/Warnings), `--cleared` (Success/Applied states).
*   **Typography:** `--display` (Headers/Card Titles), `--body` (Descriptions/Standard text), `--mono` (Slider values, breadcrumbs, tags).
*   **Focus:** `--focus-ring` (Keyboard navigation outline).

## 3. Component Breakdown

### 3.1 Main View Additions (Casting Studio)
*   **Browse Button:** Top right of the Casting Studio header.
    *   *Microcopy:* `[ BROWSE RECORDS (X) ]` (X = count).
    *   *Style:* `--mono`, borderless, `--ink-2` on rest, `--ink` on hover.
*   **Save Button:** Below the sliders.
    *   *Microcopy:* `[ FILE AS TEMPLATE ]`
    *   *Style:* Outlined button, `--line` border, `--ink` text.
*   **Apply Confirmation Toast:** Temporary visual feedback when a template is applied. The sliders briefly outline in `--cleared`, and an inline message `[ PARAMETERS LOADED ]` flashes above the sliders in `--mono` and `--cleared`.

### 3.2 Template Library Sub-View (The "Drawer")
*   **Container:** `ccr-template-drawer`
    *   *Layout:* Flex column, 100% height, slides in from right. Box-shadow uses a heavy `--ink` drop to simulate stacked paper.
*   **Header:** `ccr-template-header`
    *   *Title:* "STANDARDIZED VOICE PROFILES" (`--display`, `--ink`).
    *   *Close Action:* `[X] RETURN` (`--mono`, closes drawer).
    *   *Warning Notice:* "NOTICE: PREVIEWS UNAVAILABLE IN ARCHIVE. LOAD PROFILE TO AUDITION." (`--mono`, `--ink-2`, 10px).

### 3.3 Template List Item (The "Card")
*   **Container:** `ccr-template-card`
    *   *Style:* Background `--paper-dim`, border `--line`, 2px solid. No rounded corners (dossier style). Padding 16px.
*   **Header Row:**
    *   *Title:* 2-60 chars (`--display`, `--ink`, uppercase).
    *   *Breadcrumb:* `SRC: <source_codename>` (`--mono`, `--ink-2`).
*   **Description:** `ccr-template-desc` (`--body`, `--ink-2`).
*   **Recipe Tags (Visualizing the Sliders):** `ccr-template-recipe`
    *   Grid of 5 tags: `[GEN: F]`, `[AGE: 45]`, `[GRT: 80]`, `[TON: 20]`, `[DEL: 90]`.
    *   *Style:* Border `--line-soft`, Text `--mono` `--ink`.
*   **Actions:** `ccr-template-actions`
    *   *Load (Apply):* `[ LOAD PROFILE ]` (Solid `--paper`, border `--line`, text `--stamp`).
    *   *Discard (Delete):* `[ PURGE ]` (Borderless, text `--ink-3`, hover `--stamp-deep`).

### 3.4 Empty State
*   *Visual:* A centered, dashed outline box (`--line-soft`) resembling an empty physical file folder.
*   *Microcopy:* "NO PROFILES ON RECORD." (`--display`, `--ink-2`).
*   *Instructions:* "The archive is barren. To establish a standardized profile, calibrate the parameters in the Casting Studio and execute the [ FILE AS TEMPLATE ] directive. Hypothetical entries are strictly prohibited; only tested configurations may be filed." (`--body`, `--ink-2`).

### 3.5 Save Template Dialog
*   *Trigger:* Clicking `[ FILE AS TEMPLATE ]` on the main view.
*   *Layout:* Inline popover overlapping the sliders. Background `--paper`, heavy `--line` border.
*   *Inputs:*
    *   **Name:** `<input type="text">` (Required, 2-60 chars). Label: "DESIGNATION".
    *   **Description:** `<textarea>` (Optional). Label: "REMARKS".
*   *Actions:* `[ CANCEL ]` and `[ STAMP RECORD ]` (Primary action, uses `--stamp` text/border).
*   *Error State (Duplicate Name):* Inline text below Name input: `ERROR: DESIGNATION ALREADY CLASSIFIED.` (Text `--stamp-deep`). The input border turns `--stamp-deep`.

## 4. Flows & Interactions

### 4.1 Apply Flow (Prefill)
1.  Operator clicks `[ LOAD PROFILE ]` on a Template Card.
2.  Template Library drawer instantly slides out (closes).
3.  Casting Studio design sliders (Gender, Age, Grit, Tone, Delivery) instantly snap to the template's saved values.
4.  The slider tracks flash `--cleared` (green/success color) for 400ms.
5.  An inline badge `[ PARAMETERS LOADED: <Template Name> ]` appears above the sliders.
6.  Operator proceeds to click `[ AUDITION ]` normally. No credits are burned during the load.

### 4.2 Delete Flow (Destructive)
*(No edit-in-place is permitted. Modifications require deleting and recreating.)*
1.  Operator clicks `[ PURGE ]` on a Template Card.
2.  Card enters **Confirm State**:
    *   Card background shifts to `--paper`. Border shifts to `--stamp-deep`.
    *   Actions replace with: `[ CANCEL ]` and `[ CONFIRM PURGE ]` (`--stamp-deep` background/text, depending on token application).
3.  Operator clicks `[ CONFIRM PURGE ]`.
4.  Card shrinks (height -> 0) and fades out (if reduced motion allows). Template is deleted.

## 5. Component States

| State | Treatment |
| :--- | :--- |
| **Default** | `--paper-dim` bg, `--line` borders, `--ink` text. |
| **Hover (Interactive)** | Background shifts to `--paper-faint`. Cursor changes to pointer. |
| **Focus (Keyboard)** | Element receives `--focus-ring` (2px solid outline, 2px offset). |
| **Active (Click)** | Element translates `1px` down. Background shifts to `--paper`. |
| **Disabled** | Opacity 50%, text `--ink-3`, cursor `not-allowed`. |
| **Loading** | `[ STAMP RECORD ]` button text replaces with `[ PROCESSING... ]`. A pulsing opacity animation (100% -> 60%) applies to the button if motion enabled. |
| **Error (Validation)** | Form input border turns `--stamp-deep`. Error text uses `--stamp-deep` and `--mono`. |

## 6. Accessibility (WCAG 2.2 AA)
*   **Keyboard Operability:** 
    *   Drawer toggle, Save button, Inputs, Load, Purge, and Confirm buttons are fully reachable via `Tab`.
    *   `Escape` key closes the Drawer and the Save Dialog.
    *   Focus trap is implemented when the Save Template Dialog is open (preventing interaction with sliders behind it).
*   **Contrast:** All text (`--ink`, `--ink-2`, `--stamp`, `--cleared`, `--stamp-deep`) tested against `--paper`, `--paper-dim`, and `--paper-faint` to exceed 4.5:1 ratio.
*   **Reduced Motion (`@media (prefers-reduced-motion: reduce)`):**
    *   Drawer slide-in animation is replaced with an instant `display: block` / `opacity` toggle.
    *   Apply flash (`--cleared`) duration extended to 800ms to ensure visibility without relying on quick pulsing.
    *   Delete shrink animation is disabled; card disappears instantly.

## 7. Responsive Breakpoints
*   **320px / 412px (Mobile):** Drawer takes up 100% of viewport width (overlay). Template card tags (`[AGE: 45]`, etc.) wrap into 2 rows. Action buttons stack vertically (`LOAD` on top, `PURGE` on bottom).
*   **768px (Tablet):** Drawer takes up 60% of viewport width, sliding over the right side of the Casting Studio. Template card tags stay in a single horizontally scrolling or flex-wrapped row. Actions are inline.
*   **1120px (Desktop):** Drawer takes up 40% (max 450px) of viewport width. Layout is spacious, dossier aesthetic is highly visible (larger typography for `--display`).

## 8. Classname Dictionary (BEM/Semantic)
*   `ccr-tpl-trigger` (Browse Records header button)
*   `ccr-tpl-save-btn` (File as Template button)
*   `ccr-tpl-drawer` (Main sliding container)
*   `ccr-tpl-header` (Drawer header row)
*   `ccr-tpl-card` (Individual template record)
*   `ccr-tpl-card__title` / `ccr-tpl-card__desc` / `ccr-tpl-card__meta`
*   `ccr-tpl-recipe` (Container for slider values)
*   `ccr-tpl-recipe__tag` (Individual value, e.g., AGE: 45)
*   `ccr-tpl-actions` (Card action row)
*   `ccr-btn-stamp` (Primary apply button)
*   `ccr-btn-purge` (Destructive action button)
*   `ccr-tpl-empty` (Empty state container)
*   `ccr-tpl-dialog` (Save form modal)
