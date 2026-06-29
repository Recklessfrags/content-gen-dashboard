# Senior UX/UI Design Audit: Character Control Room

As a senior product designer, this audit reviews the shipped Next.js dashboard of the Character Control Room. Our core goal is to elevate visual hierarchy, task flows, accessibility, responsiveness, and aesthetic cohesion while rigorously respecting the "dossier/noir cockpit" theme and the product boundaries (e.g. dashboard owns inputs read-write, pipeline owns runs/costs read-only).

---

## Part 1: Flat List of Findings

### Finding 1: Typographic Jump Between Headings and Form Labels
* **Area:** Visual hierarchy & typography
* **Concrete Evidence:** In `src/app/globals.css`, the dossier title (`.dossier-head h1`) is styled at `font-size: 40px`, while form inputs use the `.eyebrow` class (`font-size: 10.5px`, uppercase, monospace). Sourced in `src/components/ControlRoom.tsx` line 131 (`Field` labels).
* **Proposed Improvement:** The typographic scale gap is too vast, making inputs look disjointed. Increase the `.eyebrow` field manual labels to `11.5px` and add `letter-spacing: 0.12em` to enhance legibility during high-volume manual drafting.
* **Impact:** Medium
* **Effort:** S

### Finding 2: Monolithic Visual Weight for Diverse Form Fields
* **Area:** Visual hierarchy & typography
* **Concrete Evidence:** In `src/components/ControlRoom.tsx` (lines 1802–1888), all Character Bible fields (e.g. "One-line concept," "Voice & identity," and "Runtime target") are rendered as full-width blocks with identical heights.
* **Proposed Improvement:** Form rhythm is flat and fatiguing. Convert short text fields like "One-line concept" and "Runtime target" into compact, single-row containers, reserving heavy vertical blocks for "Voice & identity" and "Gold-standard lines."
* **Impact:** Medium
* **Effort:** M

### Finding 3: Absolute Casting Stamp Crowding Header Elements
* **Area:** Visual hierarchy & typography
* **Concrete Evidence:** Sourced in `src/app/globals.css` (line 155), `.casting-stamp` is pinned absolute (`top: 22px; right: 30px`). In medium browser windows (880px to 1024px), it physically collides with the "History" trigger button.
* **Proposed Improvement:** Switch the stamp container to a relative element tucked neatly next to the codename heading or apply a media query that shifts or scales the stamp down to prevent overlapping interactive elements.
* **Impact:** Low
* **Effort:** S

### Finding 4: Global Context Lost on Sub-Page Switch
* **Area:** Information architecture & navigation
* **Concrete Evidence:** In `src/components/ControlRoom.tsx` (lines 1640–1678), switching navigation rail views clears the roster. When on "The Wire," "Runs," or "Cost," the operator has no indication of which character is currently active or selected.
* **Proposed Improvement:** Render a small "Current Operator" context indicator in the sidebar rail (e.g. under the brand tagline) displaying the codename and status dot of the active character.
* **Impact:** High
* **Effort:** S

### Finding 5: Loose Search/Assignment Flow in Idea Log
* **Area:** Information architecture & navigation
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 2021–2035), assigning a character to an idea on "The Wire" card is done through a long, unstructured `<select>` dropdown containing all characters sorted chronologically.
* **Proposed Improvement:** Group dropdown options by status (`Active` vs. `Draft`) and position the currently selected active operator at the absolute top of the select list to speed up triage.
* **Impact:** Medium
* **Effort:** S

### Finding 6: Missing Run-to-Character Direct Linkage Indicators
* **Area:** Information architecture & navigation
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 2073–2117), the "Runs" list displays completed episodes but never identifies which character bible was utilized to generate that run.
* **Proposed Improvement:** Though pipeline tables are read-only and lack a formal `character_id` link (per DIRECTION.md), the UI should parse and surface the character's codename from the run's metadata or prompt the operator with a warning that the run uses a manual not indexed to their dashboard.
* **Impact:** Medium
* **Effort:** S

### Finding 7: Silent Route/View Switch Data Loss on Unsaved Restores
* **Area:** Flow & task efficiency
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 1501–1512), clicking "Restore" loads a historical revision and displays a banner: "⚠ UNSAVED RESTORED DRAFT". However, switching views (e.g., clicking "The Wire") silently discards this state without a warning.
* **Proposed Improvement:** Block view switching when `isRestoredDraft` is active, prompting the user with a browser confirmation: *"You have an unsaved draft restored from history. Discard changes?"*
* **Impact:** High
* **Effort:** S

### Finding 8: Constrained Single-Line Logging Box for Ideas
* **Area:** Flow & task efficiency
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 1976–1991), logging an idea only accepts a single text string via `<input>` with no secondary note support. Any contextual notes must be added after insertion.
* **Proposed Improvement:** Upgrade the idea capture box to an expandable textarea that supports `Cmd+Enter` to submit, allowing operators to capture titles and deep notes simultaneously as inspiration strikes.
* **Impact:** High
* **Effort:** M

### Finding 9: Linear Status Cycling Fatigue on The Wire
* **Area:** Flow & task efficiency
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 1992–2059), cycling an idea status requires clicking `.statusbtn` to move through a fixed loop (`backlog` -> `active` -> `used`).
* **Proposed Improvement:** Provide a micro-dropdown menu on click or a quick split segmented button so the operator can jump directly to "Used" or "Active" without repeatedly clicking.
* **Impact:** Medium
* **Effort:** S

### Finding 10: Monospace Textareas Hard Guideline Contrast
* **Area:** Visual design & aesthetic cohesion
* **Concrete Evidence:** Sourced in `src/app/globals.css` (line 143) and `src/components/ControlRoom.tsx` (lines 1857, 1869), the code-like "Gold-standard lines" and "Beat template" boxes use JetBrains Mono, but lack distinct internal padding and word wrapping comfort.
* **Proposed Improvement:** Improve letter-spacing and increase line-height (`line-height: 1.6`) on monospace inputs to make parsing long script templates more comfortable under heavy contrast conditions.
* **Impact:** Low
* **Effort:** S

### Finding 11: Vibrant Background Vibrations in High-Contrast Mode
* **Area:** Visual design & aesthetic cohesion
* **Concrete Evidence:** Sourced in `src/app/globals.css` (lines 4–9), `--ink` (#15181E) and `--paper` (#E9E2D3) create a maximum contrast barrier that can strain the eyes of operators reading dense prose in low light.
* **Proposed Improvement:** Soften auxiliary body text inside textareas to a slightly warmer, dimmer value (`#D2C9B7`), while preserving high-contrast `#E9E2D3` exclusively for interactive buttons and headers.
* **Impact:** Medium
* **Effort:** S

### Finding 12: Transparent Savebar Scroll Overlap
* **Area:** Visual design & aesthetic cohesion
* **Concrete Evidence:** Sourced in `src/app/globals.css` (line 160), `.savebar` uses a sticky gradient (`linear-gradient(180deg, transparent, var(--ink) 36%)`) which causes text to scroll underneath it and look scrambled.
* **Proposed Improvement:** Make the savebar background fully opaque `#15181E` with a distinct, solid top border to block scrolling background noise cleanly.
* **Impact:** Low
* **Effort:** S

### Finding 13: Hard-Coded Run Retry Loop
* **Area:** States: empty, loading, error, zero-data, in-flight
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 895–905), if the receipts fetch fails, the panel prompts the operator to click "Retry Connection" manually with no automated recovery in place.
* **Proposed Improvement:** Implement automatic exponential-backoff retries (3 attempts over 5 seconds) upon loading failure, only displaying the manual error button once all retries fail.
* **Impact:** Low
* **Effort:** S

### Finding 14: Non-Standard Loading UI inside Save / Add Character Actions
* **Area:** States: empty, loading, error, zero-data, in-flight
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (line 1742), clicking "+ New character" triggers an `adding` state that replaces text with "Creating…" but has no spinner.
* **Proposed Improvement:** Nest the standardized CSS `.spin` element directly inside the active action button during API roundtrips to provide clear visual feedback.
* **Impact:** Low
* **Effort:** S

### Finding 15: Missing Cost Provider Skeletons
* **Area:** States: empty, loading, error, zero-data, in-flight
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 712–736), the cost breakdown loads as a blank panel while receipts are fetching, resulting in sudden layout shifting when data resolves.
* **Proposed Improvement:** Render simple animated greyed-out progress-bar mock blocks (skeleton UI) while `costReceiptsLoading` is true.
* **Impact:** Medium
* **Effort:** S

### Finding 16: Rigid Focus Trap Arrays in Modal Panels
* **Area:** Accessibility (WCAG 2.2 AA)
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 840–865) and (lines 1060–1090), modal focus traps rely on hard-coded DOM searches which fail if element trees change or become nested.
* **Proposed Improvement:** Extract and modularize the keyboard focus trap into a robust custom Hook (`useFocusTrap`) that dynamically calculates active interactive nodes.
* **Impact:** Medium
* **Effort:** M

### Finding 17: Interactive Focus State Clash on Roster Cards
* **Area:** Accessibility (WCAG 2.2 AA)
* **Concrete Evidence:** Sourced in `src/app/globals.css` (lines 34–35), focused roster cards(`.pcard`) draw the global brass outline (`var(--brass)`), which is visually identical to other active indicators, causing confusion for screen-reader/sighted keyboard users.
* **Proposed Improvement:** Style focused elements with a custom outline color (e.g. `--paper-dim`) or increase the outline offset to distinguish between active selection states and browser keyboard focus.
* **Impact:** High
* **Effort:** S

### Finding 18: Poor Low-Light Contrast of Secondary Rail Controls
* **Area:** Accessibility (WCAG 2.2 AA)
* **Concrete Evidence:** Sourced in `src/app/globals.css` (line 22), the exit button uses `--paper-dim` on top of `--ink-2`, yielding a text contrast of `3.41:1`, which violates WCAG AA's `4.5:1` minimum requirement for normal text.
* **Proposed Improvement:** Increase the lightness value of `--paper-dim` to at least `#BBB29D` or use `--paper` for all static text labels inside the rail navigation area.
* **Impact:** High
* **Effort:** S

### Finding 19: Roster Disappearing Act on Mobile Layouts (Critical Mobile Blocker)
* **Area:** Mobile / responsive (412px and 320px)
* **Concrete Evidence:** Sourced in `src/app/globals.css` (line 254), `@media (max-width:880px) { .roster { display:none } }` hides the Roster column entirely. Mobile users are physically unable to switch characters.
* **Proposed Improvement:** Rather than hiding the roster completely, render a mobile-only floating select dropdown at the top of the dossier or a slide-out bottom-sheet drawer to restore full roster navigation.
* **Impact:** High (Critical)
* **Effort:** M

### Finding 20: Preformatted Evidence JSON Overflows Mobile Boundaries
* **Area:** Mobile / responsive (412px and 320px)
* **Concrete Evidence:** Sourced in `src/app/globals.css` (line 482) and `src/components/ControlRoom.tsx` (lines 970–990), raw evidence blocks inside run details expand horizontally, pushing the parent layout on 320px devices.
* **Proposed Improvement:** Apply `word-break: break-all` and `max-width: 100vw` constraints to the `.receipt-json-content` pre tag to contain text wraps.
* **Impact:** Medium
* **Effort:** S

### Finding 21: Awkward Save Bar Wrapping on Thin Devices
* **Area:** Mobile / responsive (412px and 320px)
* **Concrete Evidence:** Sourced in `src/app/globals.css` (line 160), the `.savebar` flex container has no wrapping safety guidelines. At `320px`, buttons collapse into chaotic, misaligned vertical rows.
* **Proposed Improvement:** Define a CSS Grid with `grid-template-columns: repeat(2, 1fr)` for mobile layouts to guarantee clean, aligned tap grids under `480px`.
* **Impact:** Medium
* **Effort:** S

### Finding 22: High Risk of Accidental Override with Roster Click
* **Area:** Micro-interactions & feedback
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 1720–1736), clicking a character button in the roster list immediately updates `activeId` and switches characters, silently discarding unsaved edits in the active form.
* **Proposed Improvement:** Track dirty state on form inputs. If the current editor fields differ from the original database snapshot, intercept the click and display a browser `confirm()` modal before switching characters.
* **Impact:** High
* **Effort:** M

### Finding 23: Complete Lack of Optimistic Feedback on The Wire
* **Area:** Micro-interactions & feedback
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 1603–1620), clicking "Log it" triggers a raw database write, blocking the rendering engine until the API returns, which permits double-submits.
* **Proposed Improvement:** Inject an optimistic idea card containing the text and a "Draft/Saving" state into the UI instantly, disabling the submission box until the write resolves.
* **Impact:** High
* **Effort:** M

### Finding 24: Transient "Saved" Status Flash is Easy to Miss
* **Area:** Micro-interactions & feedback
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 1331–1335), `showFlash` presents a saved confirmation for exactly `2.2` seconds and then completely removes it.
* **Proposed Improvement:** Keep a permanent, small state badge ("✓ Saved to Ledger") beside the Save button that remains visible until the user types another character.
* **Impact:** Medium
* **Effort:** S

### Finding 25: Net-New Idea: Soft Local Budget Limits
* **Area:** Net-new IDEAS the owner may be missing
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 700–711), budget cap status is hard-parked because the backend lacks configuration APIs.
* **Proposed Improvement:** Give the operator a local-storage based budget target slider (e.g., $100 to $5,000 limit). If the running total spend exceeds the slider value, paint the hero cards red and show a warning badge.
* **Impact:** High
* **Effort:** S

### Finding 26: Net-New Idea: Comparative Split-Screen Bibles
* **Area:** Net-new IDEAS the owner may be missing
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 1120–1170), the History Drawer only permits previewing/restoring a full manual, leaving the operator blind to field-by-field differences.
* **Proposed Improvement:** Implement a comparative line-by-line diff or a side-by-side split screen view comparing active bibles with archived snapshots directly inside the History window.
* **Impact:** High
* **Effort:** L

### Finding 27: Net-New Idea: Markdown/JSON Dossier Export Button
* **Area:** Net-new IDEAS the owner may be missing
* **Concrete Evidence:** The "Character Control Room" acts as a secure repository, but lacks any capability to extract or back up fields offline.
* **Proposed Improvement:** Add an "Export Field Manual" action inside the savebar, enabling the developer to download their character bible instantly as a clean, offline-ready Markdown document.
* **Impact:** High
* **Effort:** S

### Finding 28: Net-New Idea: Mini Sparkline Trendlines in Overview Dashboard
* **Area:** Net-new IDEAS the owner may be missing
* **Concrete Evidence:** Sourced in `src/components/ControlRoom.tsx` (lines 291–561), the dashboard overview only presents single integers and percentages.
* **Proposed Improvement:** Implement simple inline SVG sparklines in the "Total Operational Spend" and "Runs" cards to display weekly transaction trends, giving it a true high-tech cockpit visual.
* **Impact:** Medium
* **Effort:** M

---

## Part 2: Top 5 if I could only do five

If the solo developer has a constrained schedule and can only pick five high-value, high-impact changes to build, they must be:

1. **Restore Mobile Roster Switching (Finding 19):** Currently, screens under 880px cannot navigate characters at all because the list is hidden. Swapping this out for a top dropdown/drawer on mobile is critical for basic accessibility.
2. **Prevent Accidental Edit Overrides (Finding 22):** It is extremely easy to lose 20 minutes of character bible updates by accidentally clicking a card on the left list. Adding a dirty-state check before switching active operators is a massive UX safety win.
3. **Double Action Alert on Unsaved History Restores (Finding 7):** Restoring a historical snapshot from history requires hitting "Save dossier" afterward to write it to Supabase. If the user accidentally navigates to "Runs" first, their restoration is quietly lost. Prompting them protects their history edits.
4. **Local Budget Guardrails (Finding 25):** Since the actual budget cap backend APIs are parked, letting the owner set local-storage limit slider values adds instant financial guardrails with zero backend effort.
5. **Optimistic Idea Submissions (Finding 23):** "The Wire" is built to capture rapid-fire ideas instantly. Removing roundtrip API blockages and stopping double clicks with an optimistic UI card makes the capture workflow feel lightning-fast.
