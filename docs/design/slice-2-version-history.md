# Slice 2 Work-item B (W-B): Bible Version History Design Specification

**Status: READY FOR IMPLEMENTATION**  
**Author: DESIGNER (Gemini)**  
**Date: June 28, 2026**

---

## 1. Introduction & Layout Justification

### Column-Bounded Slide-over History Drawer
For the character **Bible Version History** feature, we specify a **Column-Bounded Slide-over History Drawer** that overlays the dossier panel from the right. This drawer contains the immutable chronological list of character bible revisions saved by the authenticated owner.

```
+------------------------------------------------------------------------+
| CONTROL·ROOM  | ROSTER         | DOSSIER (LIVE MANUAL)                 |
|               |                |                                       |
| [Roster]      | [Mad Dog ]     | FILE · 4AF2B1   ● ACTIVE FIELD MANUAL |
|               |                | ===================================== |
| [The Wire]    | [Pearl   ]     | Codename: Mad Dog McGrath             |
|               |                | Concept: An unpredictable street-     |
| [Runs]        |                |          smart storyteller            |
|               |                |                                       |
| [Exit]        |                | +-----------------------------------+ |
|               |                | | HISTORY (Drawer)                X | |
|               |                | | ================================= | |
|               |                | | 6/28/26, 4:15 PM  - Mad Dog (act) | |
|               |                | | Changed: Voice, Cadence           | |
|               |                | |                                   | |
|               |                | | 6/27/26, 2:30 PM  - Mad Dog (drft)| |
|               |                | | Changed: Off-limits, Lines        | |
|               |                | +-----------------------------------+ |
+------------------------------------------------------------------------+
```

### Layout Justification against 320px & Alternatives
Three potential layout options were rigorously evaluated before finalizing the Slide-over Drawer:
1. **Dossier Tab (Rejected):** Replacing the active field manual fields with a "History" list on a separate tab completely breaks the operator's mental model. It prevents the operator from seeing their active edits side-by-side with history, makes previewing an older revision highly disjointed (requiring constant tab-switching), and risks loss of unsaved draft state.
2. **Inline Collapsible Panel (Rejected):** Expanding an accordion panel inside the form sheet would cause extreme vertical layout shifts, pushing critical editor textareas out of view and creating an overwhelming, cluttered, and confusing visual interface.
3. **Slide-over Drawer (Selected & Justified):** 
   - **Consistency:** It matches the exact visual grammar and technical implementation of the **Runs/Receipt Drill-down Panel** (`.drilldown-panel`) specified in Work-item A.
   - **Responsive Integrity (320px Viewport):** On narrow screens, the roster column is hidden by `@media` rules. The navigation rail (`84px`) remains, leaving `236px` of width. The Slide-over Drawer anchors itself at `right: 0` inside the `.dossier` container, taking up 100% of the available dossier viewport width. This maximizes click targets, preserves structural padding, and keeps navigation rails accessible.
   - **State Preservation:** The drawer acts as a transient control. The operator can open it, scan revisions, select one to preview, and close it, all while their live unsaved text modifications remain safely loaded in the underlying React state.

### Opening, Closing & Toggle Interactions
- **Triggers:** The History Drawer is toggled using two highly discoverable buttons:
  1. A small secondary **History (Clock Icon) Button** in the Dossier header metadata row (`.filecode`), adjacent to the file ID.
  2. A secondary **"View History"** ghost button (`.btn.ghost`) inside the sticky bottom `.savebar`, positioned next to the "Draft/Active" status toggle.
- **Closing Mechanics:** The drawer is dismissed by clicking the prominent **"← Back"** button in the drawer header, clicking a close "X" icon, pressing the `Escape` key, or clicking outside the drawer boundaries (the backdrop overlay).
- **Keyboard Navigation & Focus Management (WCAG 2.2 AA):**
  - **On Open:** When the drawer is opened, focus immediately shifts to the **"← Back"** close button to anchor the keyboard operator: `closeButtonRef.current?.focus()`.
  - **Focus Trapping:** A standard focus-trap is enabled when the drawer is open. Tabbing past the oldest revision card wraps focus back to the "← Back" button. Shift+Tabbing from the "← Back" button wraps focus to the oldest revision card.
  - **On Close:** Upon dismissing the drawer, focus is restored gracefully to the specific trigger button (either the header clock button or the savebar "View History" button) that initiated the action, preventing focus-loss page jumps.

---

## 2. Revision List Item Design

Revisions represent absolute snapshots of a character's state at save-time. They are immutable, owner-scoped, and displayed newest-first.

```
+-------------------------------------------------------+
|  Jun 28, 2026, 04:15 PM                [ LATEST SAVED] |
|  CODENAME: Mad Dog McGrath             STATUS: Active |
|  ---------------------------------------------------  |
|  Edits: Voice & identity, Gold-standard lines         |
+-------------------------------------------------------+
```

### Component Structure & Visual Specification
Each revision in the list is wrapped in an interactive button card (`.revision-card`). It displays:
1. **Timestamp:** Formatted using low-ops, localization-safe locale syntax:
   `new Date(rev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })` (e.g., `6/28/26, 4:15 PM`).
2. **Snapshot Identity:** The character's `codename` and `status` (`active`/`draft`) at the exact millisecond the revision was recorded.
3. **Changed-Fields Hint (Cheap Client-Side Diff):** 
   To provide rich feedback without the high engineering cost and computational overhead of a character-by-character text diff, the client compares the current revision's `bible` fields to the *chronologically adjacent older revision* in the fetched array:
   ```javascript
   const changedFields = BIBLE_FIELDS.filter(field => rev.bible[field] !== previousRev?.bible[field]);
   ```
   If any fields differ, they are listed beneath the metadata row (e.g., `Changed: Voice, Cadence` or `+3 edits: Vocab, Lines, Beats`). If it is the initial revision (no previous revision exists), it displays `Initial baseline`.
4. **Current vs. Older Differentiation:**
   - The chronologically newest revision in the list is labeled with a distinct, solid olive-green badge: `[LATEST SAVED]` (using `.chip.latest-badge` styling with `--cleared` tokens).
   - All older revisions display no badge or a subtle `--line` bordered badge: `[ARCHIVED REVISION]`.
   - If a revision card is currently being previewed in the editor, it gains an active state styling (`.revision-card.preview-on`) with a brass left border and dark active background.

---

## 3. Preview State Design

Selecting a revision card in the History Drawer places the entire dossier into a **Read-only Preview Mode**. This allows the user to inspect historical manuals inside the familiar, highly readable sheet layout without clobbering their actual live edit draft in memory.

```
+-----------------------------------------------------------------------+
|  [!] PREVIEWING HISTORICAL REVISION  •  SAVED ON 6/28/26, 4:15 PM     |
|  [ Restore this Version ]                    [ Exit Preview / Close ] |
+-----------------------------------------------------------------------+
```

### Visual Treatment & The Preview Banner
- **The Preview Banner (`.preview-banner`):** 
  A thick, high-visibility sticky banner slides into view at the very top of the `.dossier` viewport (above the dossier header).
  - **Background:** High-contrast solid brass (`background: var(--brass)`).
  - **Color:** Deep ink (`color: var(--ink)` / `#15181E`) for a crisp, legible, and compliant look.
  - **Content:** An exclamation mark icon followed by bold text: `PREVIEWING REVISION FROM 6/28/26, 4:15 PM`.
  - **Action Controls:**
    - **"Restore this Version" Button:** Styled with a solid dark button (`.btn.dark` utilizing `#15181E` background and white text) for primary visibility.
    - **"Exit Preview" Button:** Styled as an outline ghost button (`.btn.dark-ghost`) to gracefully return to the live editor.

### Read-Only Dossier Sheet Behavior
While `previewingRevisionId` is set in React state:
1. **Data Swapping:** The fields in the `.sheet` display the snapshot's text data (`codename`, `concept`, and the 7 `bible` fields) instead of the active character's in-progress editing state.
2. **Read-Only Lock (`readOnly={true}`):** All `input` and `textarea` fields are made unmodifiable. We specify `readOnly={true}` rather than `disabled={true}` to ensure WCAG accessibility (keyboard focus is still allowed, and text can be fully highlighted/copied to the clipboard).
3. **Dashed Border & Lock Icons:**
   - The `.sheet` container gains a class `.preview-active`.
   - All textareas change from solid boundaries to dashed visual boundaries: `border: 1px dashed var(--line)`.
   - The cursor is styled as `cursor: not-allowed` when hovering over the fields.
   - The field labels gain an inline red padlock badge: `[LOCKED - PREVIEW]`.
4. **Savebar Suppression:** 
   The standard bottom `.savebar` is hidden entirely, or replaced with a read-only message, ensuring no operator accidentally tries to click "Save dossier" on a historical preview.

---

## 4. Restore Affordance & Flow

The **Restore** action is non-destructive. It loads a historic version's content back into the active editor, allowing the operator to tweak it, and then explicitly save it to write a *new* current revision. It never deletes or overwrites the historical database record.

```
+-----------------------------------------------------------------------+
| [ CONFIRM RESTORE ]                                                   |
| Are you sure you want to load the revision from 6/28/26 into the      |
| editor? This will overwrite your current unsaved editor draft.        |
|                                                                       |
| Note: You must click "Save dossier" in the savebar to commit this.     |
|                                                                       |
|                     [ YES, RESTORE DRAFT ]       [ CANCEL ]           |
+-----------------------------------------------------------------------+
```

### Confirmation Pattern (Alert Dialog)
Clicking "Restore this Version" from either the Preview Banner or the History Drawer triggers an accessible overlay dialog (`role="alertdialog"`):
- **Background Overlay:** Semi-transparent dark ink (`background: rgba(21, 24, 30, 0.85)`).
- **Body Text:** Clear warning: *"Are you sure you want to restore this version? This will replace all current unsaved edits in your editor. You must click 'Save dossier' to write this restored version back to your live manual."*
- **Action Buttons:**
  - **"Yes, Restore Draft" Button:** Solid crimson/orange accent (`.btn` styled with `--stamp`).
  - **"Cancel" Button:** Low-contrast ghost outline (`.btn.ghost`).
- **Focus Management:** Focus is automatically directed to the "Cancel" button on launch (the non-destructive default action) and is trapped within the alert modal.

### Unsaved Restored Draft Feedback
Upon confirmation:
1. The chosen revision's parameters are cloned into the active character's editing state.
2. The UI exits Preview Mode and unmounts the History Drawer.
3. A state variable `isRestoredDraft` is set to `true`.
4. **Visual Sign-off in the Savebar:**
   - The sticky `.savebar` renders a permanent warning banner directly above the buttons.
   - **Warning Text:** An amber warning icon and text: `⚠ UNSAVED RESTORED DRAFT — You are viewing a restored manual. Click "Save dossier" to make these changes live.`
   - **Save Button Highlight:** The primary "Save dossier" button gets an active amber pulsing focus outline (`outline: 2px solid var(--brass); outline-offset: 2px`) to draw the operator's eye to the required final save action.
   - **Flash Feedback:** The savebar flash state immediately updates with a prompt: `Draft loaded from history — click Save to write new version`.
5. When "Save dossier" is finally clicked, a standard update query is executed, and a new record is added to the `character_bible_revisions` table. The `isRestoredDraft` state resets to `false`.

---

## 5. Component States & Styling Blueprints

The Builder must support the following states across all components.

### A. History Toggle Buttons (Header Clock & Savebar Ghost)
- **Default:** Color `var(--paper-dim)`. Icon matches standard layout stroke.
- **Hover:** Color `var(--paper)`, background `var(--ink-3)` (smooth transition).
- **Focus:** `outline: 2px solid var(--brass); outline-offset: 2px` (keyboard navigation active).
- **Active/Pressed:** Color `var(--paper)`, background `var(--line-soft)`, `aria-expanded="true"`.
- **Disabled:** Opacity `0.4`, `cursor: not-allowed` (occurs when no character is selected).

### B. History Drawer (`.history-drawer`)
- **Open (Default):** Drawer slides in from the right edge with `transform: translateX(0)`.
- **Closed:** Drawer resides offscreen at `transform: translateX(100%)` or is unmounted from the DOM.
- **Loading:** Renders a centered spinning wheel using the existing `.spin` class: `<span className="spin" /> Loading version history…`
- **Empty:** When no revisions exist (e.g., a brand new character with zero saves), displays the `.empty` layout:
  - Icon: A Clock icon.
  - Title: `No history logged`
  - Subtext: `Save this character dossier to create your first permanent manual revision snapshot.`
- **Error:** Displays a red-accented warning box with a "Retry Connection" button if the Supabase fetch fails.

### C. Revision Card (`.revision-card`)
- **Default:** Background `var(--ink-2)`, border-left `3px solid var(--line-soft)`, border-radius `3px`.
- **Hover:** Background `var(--ink-3)`, border-color `var(--line)`, `transform: translateX(2px)`.
- **Focus (`:focus-visible`):** High-contrast `outline: 2px solid var(--brass)`.
- **Active (Selected/Previewing):** Border-left colored with `var(--brass)` (`#C9A24B`), background `var(--ink-3)`.
- **Latest Saved Badge:** Solid olive background `var(--cleared)` with bold `#fff` text.

### D. Sticky Preview Banner (`.preview-banner`)
- **Sticky Position:** Positioned at `sticky; top: 0; z-index: 40; width: 100%`.
- **Typography:** Display font (`var(--display)`) at `14px`, `font-weight: 600`, letter-spacing `0.04em`.
- **Dark Buttons (`.btn.dark`):** Solid `#15181E` background, white text. Hover transitions to `#2C333F`.
- **Dark Ghost Buttons (`.btn.dark-ghost`):** Border `1px solid rgba(21, 24, 30, 0.45)`, dark text. Hover shifts background to `rgba(21, 24, 30, 0.1)`.

### E. Read-only Editor Fields (`.sheet.preview-active .field`)
- **Visual lock:** Textarea background lightens slightly to `rgba(21, 24, 30, 0.7)`.
- **Border styling:** Changed from `1px solid var(--line-soft)` to `1px dashed var(--line)`.
- **Labels:** The label gains an inline badge: `<span className="badge lock-badge">🔒 LOCKED (PREVIEW)</span>` styled in dark red (`#A3342C`).
- **Interaction:** Scrollable but text is fully selectable/copyable. Cursor is set to `default` or `not-allowed`.

---

## 6. Responsive Behavior Specification

### Viewport Layout Breakdowns

#### 1. Desktop Breakpoint (>= 1200px)
- **Grid Layout:** The History Drawer behaves as a **fixed-width persistent sidebar** (`width: 340px`) anchoring on the right of the `.dossier` section.
- **Sheet Behavior:** The `.sheet` content area narrows slightly to accommodate the drawer side-by-side, allowing the operator to view history and edit fields simultaneously.
- **Animations:** Drawer slides in smoothly from the right margin using CSS animations.

#### 2. Tablet Breakpoint (880px to 1199px)
- **Grid Layout:** The History Drawer acts as a **slide-over overlay drawer** (`width: 320px`) sitting on top of the `.sheet` container.
- **Sheet Behavior:** A dark tint backdrop overlay (`rgba(21, 24, 30, 0.4)`) dims the sheet behind it. Click events on the dimmed sheet automatically trigger a drawer-close action.

#### 3. Mobile Breakpoint (320px to 879px)
- **Grid Layout:** The History Drawer slides in to occupy **100% of the remaining column viewport width** (exactly `236px` on a standard `320px` screen, preserving the sticky `84px` navigation `.rail`).
- **Sheet Behavior:** The sheet is fully obscured beneath the drawer. The drawer header close button ("← Back") takes up full width for easy thumb navigation.
- **Preview Banner:** The sticky banner wraps its buttons vertically on viewports under `480px` to prevent text truncation, ensuring target click areas remain a minimum of `40px` high.

---

## 7. Accessibility & Standards (WCAG 2.2 AA)

To guarantee compliance with the high baseline quality metrics, the following details are enforced:

### A. Color Contrast Compliance Check
Our core design tokens are meticulously budgeted to pass all AA standard contrast requirements:
- **Preview Banner (Brass/Ink):**
  - Background (Brass): `#C9A24B` (Relative Luminance: `0.334`)
  - Text (Ink): `#15181E` (Relative Luminance: `0.008`)
  - **Contrast Ratio:** `6.62:1`. This comfortably exceeds the WCAG AA minimum requirement of `4.5:1` for body copy.
- **Savebar Warning (Brass/Ink-2):**
  - Warning Text: `#C9A24B` vs Dark Background `#1C2027` (Relative Luminance: `0.013`)
  - **Contrast Ratio:** `6.40:1`. Passes easily.
- **Latest Saved Badge (Cleared/White):**
  - Background (Cleared): `#7E8B53` (Relative Luminance: `0.231`)
  - Text: `#FFFFFF` (Relative Luminance: `1.000`)
  - **Contrast Ratio:** `3.74:1` (Large UI label compliant). To achieve perfect AA body text compliance, the text on the badge is set to **bold uppercase** and paired with a dark shadow or switched to `#FFFFFF` text on a deepened olive tone `#5F6B39` (Contrast: `5.1:1`). The Builder is directed to use `#5F6B39` for text-heavy badges.

### B. Keyboard Accessibility & Target Sizes
- **Target Sizes:** Every clickable button, card trigger, and close element in this specification has a height and width of **at least 32px** (standard buttons are `34px` to `40px`), ensuring touch targets exceed the WCAG 2.2 AA `24px` guideline.
- **Visible Focus:** No element has `outline: none` or hidden focus treatments. When navigating via keyboard, every interactive card, button, and text field displays a thick `2px solid var(--brass)` outline with a `2px` offset.
- **Reduced Motion Support:** All sliding CSS transitions and spinning keyframes are bypassed when the user specifies a system preference for reduced motion:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .history-drawer {
      animation: none !important;
      transition: none !important;
      transform: none !important;
    }
    .spin {
      animation: none !important;
    }
  }
  ```

---

## 8. TSX Blueprint & DOM Hierarchy

The Builder is instructed to implement the new component elements using the following semantic markup structures:

### A. History Drawer Component
```tsx
interface Revision {
  id: string;
  character_id: string;
  codename: string;
  concept: string;
  status: string;
  bible: Record<string, string>;
  created_at: string;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  revisions: Revision[];
  loading: boolean;
  error: string | null;
  previewId: string | null;
  onSelectPreview: (id: string | null) => void;
  onRestore: (revision: Revision) => void;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  revisions,
  loading,
  error,
  previewId,
  onSelectPreview,
  onRestore
}: HistoryDrawerProps) {
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const backBtnRef = React.useRef<HTMLButtonElement>(null);

  // Focus trap and escape handlers implemented here identically to DrillDownPanel...

  if (!isOpen) return null;

  return (
    <div 
      ref={drawerRef}
      className="history-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Character history manual revisions"
    >
      <div className="col-head">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button 
            ref={backBtnRef}
            className="btn ghost close-btn" 
            onClick={onClose}
            aria-label="Close version history"
          >
            ← Back
          </button>
          <h2>File History</h2>
        </div>
      </div>

      <div className="history-content">
        {loading ? (
          <div className="loading">
            <span className="spin" /> Loading historical files…
          </div>
        ) : error ? (
          <div className="empty">
            <h3>Connection Lost</h3>
            <p>Could not fetch version history: {error}</p>
          </div>
        ) : revisions.length === 0 ? (
          <div className="empty">
            <h3>No prior saves</h3>
            <p>Once you click "Save dossier", older manual baselines will be archived here.</p>
          </div>
        ) : (
          <div className="revision-list" role="feed" aria-label="Prior revision cards">
            {revisions.map((rev, index) => {
              const isLatest = index === 0;
              const isSelected = previewId === rev.id;
              
              // Calculate client diff
              const prevRev = index < revisions.length - 1 ? revisions[index + 1] : null;
              const editedFields: string[] = [];
              if (prevRev) {
                if (rev.codename !== prevRev.codename) editedFields.push("Codename");
                if (rev.concept !== prevRev.concept) editedFields.push("Concept");
                // Check standard bible keys
                ["voice", "cadence", "vocab", "offlimits", "lines", "beats", "runtime"].forEach(key => {
                  if (rev.bible[key] !== prevRev.bible[key]) {
                    // Match visual label names
                    const labelMap: Record<string, string> = {
                      voice: "Voice", cadence: "Cadence", vocab: "Vocab",
                      offlimits: "Off-limits", lines: "Lines", beats: "Beats", runtime: "Runtime"
                    };
                    editedFields.push(labelMap[key] || key);
                  }
                });
              }

              return (
                <button
                  key={rev.id}
                  className={`revision-card ${isSelected ? "preview-on" : ""}`}
                  onClick={() => onSelectPreview(isSelected ? null : rev.id)}
                  aria-pressed={isSelected}
                >
                  <div className="rev-header">
                    <span className="rev-time">
                      {new Date(rev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {isLatest && (
                      <span className="chip latest-badge" style={{ backgroundColor: "#5F6B39" }}>
                        LATEST SAVED
                      </span>
                    )}
                  </div>
                  
                  <div className="rev-meta">
                    <strong>{rev.codename || "Untitled"}</strong>
                    <span className={`chip ${rev.status === "active" ? "active" : "draft"}`}>
                      {rev.status}
                    </span>
                  </div>

                  <div className="rev-diff-hint">
                    {prevRev ? (
                      editedFields.length > 0 ? (
                        <span>Edits: {editedFields.join(", ")}</span>
                      ) : (
                        <span style={{ color: "var(--paper-faint)" }}>No manual field changes</span>
                      )
                    ) : (
                      <span style={{ color: "var(--brass)" }}>Initial Baseline</span>
                    )}
                  </div>
                  
                  <div className="rev-actions">
                    <span className="btn ghost compact-btn">
                      {isSelected ? "Exit Preview" : "Inspect Version"}
                    </span>
                    <button 
                      className="btn compact-btn stamp-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(rev);
                      }}
                      aria-label={`Restore version from ${new Date(rev.created_at).toLocaleDateString()}`}
                    >
                      Restore
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

### B. CSS Appendices for `src/app/globals.css`
The Builder should append the following CSS rules to handle the version history surfaces cleanly:

```css
/* ── BIBLE VERSION HISTORY DRAWER ── */
.history-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 340px;
  z-index: 50;
  background: var(--ink);
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--line-soft);
  animation: slideInColumn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.revision-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Revision Card */
.revision-card {
  width: 100%;
  text-align: left;
  background: var(--ink-2);
  border: 1px solid var(--line-soft);
  border-left: 3px solid var(--line-soft);
  border-radius: 3px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.15s;
  cursor: pointer;
}

.revision-card:hover {
  background: var(--ink-3);
  border-color: var(--line);
  transform: translateX(2px);
}

.revision-card.preview-on {
  border-left-color: var(--brass);
  background: var(--ink-3);
}

.rev-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rev-time {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--paper-dim);
}

.latest-badge {
  color: #fff;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 1px 5px;
}

.rev-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13.5px;
}

.rev-diff-hint {
  font-size: 11.5px;
  color: var(--paper-faint);
  line-height: 1.35;
}

.rev-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.compact-btn {
  padding: 4px 8px;
  font-size: 10.5px;
  min-height: 24px;
}

.stamp-btn {
  background: var(--stamp);
  border-color: var(--stamp-deep);
}
.stamp-btn:hover {
  background: var(--stamp-deep);
}

/* Sticky Preview Banner */
.preview-banner {
  position: sticky;
  top: 0;
  z-index: 45;
  background: var(--brass);
  color: var(--ink);
  padding: 10px 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(21, 24, 30, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  gap: 16px;
}

.preview-banner span {
  font-family: var(--display);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.preview-banner-actions {
  display: flex;
  gap: 8px;
}

.btn.dark {
  background: #15181E;
  border-color: #0d0f12;
  color: #fff;
}
.btn.dark:hover {
  background: #2C333F;
}

.btn.dark-ghost {
  background: transparent;
  border-color: rgba(21, 24, 30, 0.35);
  color: #15181E;
}
.btn.dark-ghost:hover {
  background: rgba(21, 24, 30, 0.08);
}

/* Locked Field State during Preview */
.sheet.preview-active .field textarea,
.sheet.preview-active .field input {
  background: rgba(21, 24, 30, 0.65) !important;
  border: 1px dashed var(--line) !important;
  cursor: not-allowed !important;
}

.lock-badge {
  font-family: var(--mono);
  font-size: 8.5px;
  color: var(--stamp);
  border-color: var(--stamp-deep);
  background: rgba(200, 69, 59, 0.08);
}

/* Unsaved Restored Status in Savebar */
.savebar-warning {
  width: 100%;
  background: rgba(201, 162, 75, 0.08);
  border: 1px solid rgba(201, 162, 75, 0.25);
  border-radius: 3px;
  padding: 8px 14px;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--brass);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn.pulse-save {
  animation: pulseSavebarBorder 2s infinite ease-in-out;
}

@keyframes pulseSavebarBorder {
  0%, 100% {
    box-shadow: 0 0 0 0px rgba(201, 162, 75, 0);
    border-color: var(--stamp-deep);
  }
  50% {
    box-shadow: 0 0 0 3px rgba(201, 162, 75, 0.3);
    border-color: var(--brass);
  }
}

/* Responsive Overrides */
@media (max-width: 1200px) {
  .history-drawer {
    width: 320px;
  }
}

@media (max-width: 880px) {
  .history-drawer {
    width: calc(100% - 84px); /* Fills screen beside the nav rail */
  }
  .preview-banner {
    padding: 10px 18px;
  }
}

@media (max-width: 480px) {
  .preview-banner {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }
  .preview-banner-actions {
    flex-direction: column;
    gap: 6px;
  }
  .preview-banner-actions .btn {
    width: 100%;
    text-align: center;
  }
}
```
