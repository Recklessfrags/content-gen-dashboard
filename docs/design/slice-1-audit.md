# Slice 1 — Design & Accessibility Audit

### Parity & visual notes

-   The overall dark-mode "dossier" aesthetic is strong and consistently applied. The layout is functional and responsive.
-   The use of `px` units for typography is less flexible than relative units like `rem`; switching would improve user-agent font size scaling.
-   The left rail navigation (`.navbtn`) correctly uses `aria-pressed` to indicate the active view.
-   The main dossier form lacks autocomplete attributes on fields like "Codename," which could aid data entry.

### State coverage

-   **Login:** Missing explicit `:active` state on buttons. The `pending` state could be enhanced with a spinner icon inside the button.
-   **Character status toggle:** Missing a `:disabled` state. Although the Save button has one, this control could also require it during save operations.
-   **Runs cards (`.runcard`):** Missing a `:hover` state. Adding a subtle `background` or `border-color` change would improve feedback.
-   **Main dossier form (`.field`):** Inputs lack an explicit error state style for potential validation feedback.
-   **Add Character button (`.addbtn`):** Missing `:focus` and `:active` states.
-   **Wire input (`.cap input`):** Missing `:disabled` state for when an idea is being logged.

### WCAG 2.2 AA findings

-   **[MAJOR] Text contrast:** The `paper-faint` color (#6E6A5F) over `ink` (#15181E) and `ink-2` (#1C2027) fails to meet the 4.5:1 ratio for normal text.
    -   **Fix:** Increase the lightness of `--paper-faint` to at least `#7E7970` to pass contrast checks for its use in UI text.
-   **[BLOCKER] Target size:** The `.statusbtn` and `.tag-select` controls in "The Wire" view are smaller than the required 24x24px minimum target size.
    -   **Fix:** Increase padding on `.statusbtn` and `.tag-select` to `padding: 6px 8px` to ensure their computed height meets the 24px minimum.
-   **[MINOR] Visible keyboard focus:** The global `:focus-visible` outline is excellent, but it is disabled on form inputs (`textarea:focus`, `input:focus`), creating an inconsistency.
    -   **Fix:** Remove the `outline: none` from the `.field textarea:focus, .field input:focus` rules to allow the global focus style to apply.
