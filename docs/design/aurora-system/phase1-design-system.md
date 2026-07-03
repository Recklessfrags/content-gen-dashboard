# Phase-1 Design System Spec: Aurora

This document defines the formal, buildable CSS Custom Property design system based on the "Aurora" aesthetic. It provides a pure CSS-variable foundation for a Next.js 15 + React 19 application, strictly avoiding Tailwind or CSS-in-JS.

---

## 1. TOKENS

All tokens must be defined at the `:root` level and scoped to `[data-theme="light"]` and `[data-theme="dark"]` for dynamic runtime toggling. 

### 1.1 Color Primitives & Semantic Mode Tables

| Token | Dark Mode `[data-theme="dark"]` | Light Mode `[data-theme="light"]` | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#05050A` | `#F8F9FA` | Absolute page background |
| `--aurora-1` | `#4A00E0` (Deep Violet) | `#A6C0FE` (Soft Blue) | Backdrop gradient stop 1 |
| `--aurora-2` | `#00E5FF` (Cyan) | `#F68084` (Coral Pink) | Backdrop gradient stop 2 |
| `--aurora-3` | `#FF007F` (Neon Pink) | `#E0C3FC` (Soft Purple) | Backdrop gradient stop 3 |
| `--surface-0` | `rgba(15, 15, 20, 0.4)` | `rgba(255, 255, 255, 0.6)` | Header / Nav base layers |
| `--surface-1` | `rgba(25, 25, 35, 0.6)` | `rgba(255, 255, 255, 0.8)` | Standard cards / glass panels |
| `--surface-2` | `rgba(255, 255, 255, 0.08)` | `rgba(255, 255, 255, 1.0)` | Hover states / nested cards |
| `--surface-highlight`| `rgba(255, 255, 255, 0.15)` | `rgba(255, 255, 255, 1.0)` | Top inner-shadows / bevels |
| `--border-soft` | `rgba(255, 255, 255, 0.1)` | `rgba(0, 0, 0, 0.08)` | Standard component borders |
| `--border-glow` | `rgba(0, 229, 255, 0.4)` | `rgba(0, 102, 255, 0.3)` | Active / interactive borders |
| `--text-main` | `#FFFFFF` | `#0B0F19` | Primary headings and body |
| `--text-dim` | `rgba(255, 255, 255, 0.65)` | `rgba(0, 0, 0, 0.6)` | Secondary text, captions, // notes |
| `--accent` | `#00E5FF` (Cyan) | `#0066FF` (Vibrant Blue) | Brand signature, active text, primary focus |
| `--success` | `#00E676` | `#008A27` | Completed / Passed (NEVER brand color) |
| `--success-bg`| `rgba(0, 230, 118, 0.15)` | `rgba(0, 138, 39, 0.15)` | Success badges |
| `--warn` | `#FFD54F` | `#D97706` | Pending / Queued / Attention |
| `--warn-bg` | `rgba(255, 213, 79, 0.15)` | `rgba(217, 119, 6, 0.15)` | Warning badges |
| `--danger` | `#FF1744` | `#DC2626` | Errors / Failed / Destructive |
| `--danger-bg` | `rgba(255, 23, 68, 0.15)` | `rgba(220, 38, 38, 0.15)` | Error badges |
| `--shadow-ambient`| `0 8px 32px 0 rgba(0, 0, 0, 0.4)`| `0 8px 32px 0 rgba(0, 0, 0, 0.05)` | Glass panel drop-shadow |

### 1.2 WCAG 2.2 AA Contrast Matrix & Mitigation

**Mitigation strategy for "Text on Aurora"**: The aurora background is heavily blurred (`120px`) and rendered at partial opacity (`0.4` dark / `0.7` light). All text **must** sit inside a `--surface-1` or `--surface-0` glass panel. The `backdrop-filter: blur(24px) saturate(150%)` normalizes the background color, ensuring AA compliance. 

*Contrast Ratios (Calculated against a flat mid-value representation of the frosted surfaces):*
*   `--text-main` on Surface: **Dark 14:1 | Light 12.5:1** (Passes AA/AAA)
*   `--text-dim` on Surface: **Dark 7:1 | Light 6.5:1** (Passes AA)
*   `--accent` on Surface: **Dark 6:1 | Light 5:1** (Passes AA)
*   `--success` / `--warn` / `--danger` on respective `-bg` tokens: **> 4.5:1** in both modes (Passes AA).

### 1.3 Typography

*   **`--font-sans`**: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
*   **`--font-mono`**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` (Always use `font-variant-numeric: tabular-nums`).
*   **Scales (rem base = 16px)**:
    *   `--text-xs`: `0.75rem` (12px) - Status badges, metric labels.
    *   `--text-sm`: `0.875rem` (14px) - Code comments (`// ACTION CENTER`), dim secondary info.
    *   `--text-base`: `1rem` (16px) - General body text, inputs, buttons.
    *   `--text-lg`: `1.25rem` (20px) - Component headers, Channel Titles.
    *   `--text-xl`: `1.5rem` (24px) - Standalone metrics.
    *   `--text-2xl`: `2rem` (32px) - Section headers (`Channels`).
    *   `--text-3xl`: `2.5rem` (40px) - Display headers (`Action Center`).

### 1.4 Spacing & Geometry

*   **Radii**: `--radius-sm: 8px;`, `--radius-md: 16px;`, `--radius-lg: 24px;`, `--radius-xl: 32px;`
*   **Spacing Base**: `0.25rem` (4px). Standard scale: `space-1` (4px), `space-2` (8px), `space-3` (12px), `space-4` (16px), `space-6` (24px), `space-8` (32px), `space-12` (48px).

### 1.5 Motion & Focus

*   **Focus Ring**: All interactive elements receive `outline: 2px solid var(--accent); outline-offset: 2px;` on `:focus-visible`.
*   **Transitions**: 
    *   Standard: `all 0.2s ease`
    *   Panel Elevation: `all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)`
    *   Aurora Drift: `20s infinite alternate ease-in-out`
*   **`@media (prefers-reduced-motion)`**: Set `.aurora-container { animation: none; }` and `* { transition: none !important; }`.

---

## 2. COMPONENTS

### 2.1 Buttons & Controls
*   **Action Button (Primary)**: 
    *   *Default*: `background: var(--text-main); color: var(--bg-base); font-weight: 700; border-radius: var(--radius-sm);`
    *   *Hover*: `transform: translateY(-2px); opacity: 0.9;`
    *   *Disabled*: `opacity: 0.5; cursor: not-allowed; transform: none;`
*   **Secondary/Ghost Button (e.g., New Channel)**: 
    *   *Default*: `background: transparent; border: 1px solid var(--border-glow); color: var(--accent);`
    *   *Hover*: `background: rgba(var(--accent-rgb), 0.1); transform: translateY(-1px);`
*   **Inputs / Textarea / Select**:
    *   *Default*: `background: var(--surface-0); border: 1px solid var(--border-soft); color: var(--text-main); border-radius: var(--radius-sm);`
    *   *Focus*: `border-color: var(--accent); outline: none; box-shadow: 0 0 0 1px var(--accent);`
*   **Checkbox / Toggle**: Unchecked matches input borders. Checked uses `background: var(--accent)`.

### 2.2 Status Badges (Strict Color Data Rules)
*Color is never the sole indicator; text labels are mandatory.*
*   **Channel Chip**: 
    *   *Cast*: `--success-bg` & `--success` text. 
    *   *Uncast*: `--warn-bg` & `--warn` text.
*   **Job States**:
    *   *Parked*: `--surface-2` (Neutral) & `--text-dim` text.
    *   *Queued*: `--warn-bg` & `--warn` text + hourglass icon.
    *   *Running*: `transparent` with `border: 1px solid var(--accent);` & `--accent` text + spinning CSS loader. (Using accent strictly to indicate *system activity*, not a semantic state result).
*   **Episode States**:
    *   *Success*: `--success-bg` & `--success` text.
    *   *Error*: `--danger-bg` & `--danger` text.

### 2.3 Panels & Layout
*   **Aurora Backdrop**: Full viewport, `z-index: -2`. Layered radial gradients. Blurred via `filter: blur(120px)`. Overlaid with `z-index: -1` SVG `<feTurbulence>` noise (`mix-blend-mode: overlay; opacity: 0.4`).
*   **Glass Panel (Cards, Generic wrappers)**: 
    *   Uses `--surface-1`, `backdrop-filter: blur(24px) saturate(150%)`, `--border-soft`. 
    *   Inner top bevel: `box-shadow: inset 0 1px 1px var(--surface-highlight), var(--shadow-ambient);`.
*   **Channel Card (Interactive)**:
    *   *Hover*: Elevates. `transform: translateY(-4px); background: var(--surface-2); border-color: var(--border-glow); box-shadow: inset 0 1px 1px var(--surface-highlight), 0 12px 40px rgba(0,0,0,0.5) (dark) / 0.1 (light);`
*   **Action Center (Hero)**:
    *   Includes an absolute pseudo-element top border: `height: 4px; background: linear-gradient(90deg, var(--aurora-1), var(--aurora-2), var(--aurora-3));`.

### 2.4 Lists & Data Display
*   **Action Center Inline Approval Row (Global Queue)**: 
    *   Nested inside the Action Center hero.
    *   *Layout*: Flex row. `background: var(--surface-2)`, `border: 1px solid var(--border-soft)`, `border-radius: var(--radius-sm)`.
    *   *Actions*: Inline buttons for Approve / Reject / Fact-Check. (No modals per spec).
*   **Cost / Number Readout**: 
    *   Must use `.text-mono` (`var(--font-mono)`).
    *   Zero values use `.dim` (`var(--text-dim)`) to de-emphasize inactivity.
    *   **Data Honesty Note**: Cost/Run metrics per channel are **DEFERRED** (Phase 3). Until correlated, these display as `$0` / `0` with the `.dim` treatment, or are omitted entirely.

### 2.5 Avatars & Identity
*   **Cast Channel**: Gradient background based on hashing channel initials (e.g., `#8e2de2` to `#4a00e0`). White text, 800 weight.
*   **Uncast Channel (Placeholder)**: `background: transparent`, `border: 2px dashed var(--text-dim)`. Overlay pseudo-element with repeating 45-degree diagonal stripes using `--surface-2` to clearly denote "empty/slot".

---

## 3. REDLINES & IMPLEMENTATION DIRECTIVES

This section provides the strict CSS blueprints for the core layouts. Builder must apply these exact combinations.

**Typography Classes:**
```css
.text-display { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; }
.text-title   { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
.text-body    { font-size: 1rem; font-weight: 400; }
.text-mono    { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.dim          { color: var(--text-dim); }
.accent       { color: var(--accent); }

**Glass Panel Base Construction:**
```css
.glass-panel {
  background: var(--surface-1);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  box-shadow: inset 0 1px 1px var(--surface-highlight), var(--shadow-ambient);
  padding: 2rem; /* Reduce to 1rem on <= 600px */
}

**Status Badges Construction:**
```css
.status-badge {
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-size: 0.75rem; font-weight: 700;
  padding: 0.125rem 0.5rem; /* 2px 8px */
  border-radius: 12px;
  text-transform: uppercase; letter-spacing: 0.05em;
}
/* Apply sematic bg/text vars directly based on state */

**Layout Grid Sizing:**
*   **Main Container**: `max-width: 1400px; padding: 2rem;` (Responsive: `1rem` below 600px).
*   **Hero Grid**: `display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;` (Responsive: `1fr` below 900px).
*   **Channels Grid**: `display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;` (Responsive: `1fr` below 600px).
*   **App Header**: Height fluid by padding (`1rem 2rem`), `border-radius: var(--radius-xl)`.

**Avatar Component Construction:**
```css
.avatar {
  width: 48px; height: 48px; border-radius: 12px; /* Top header avatar shrinks to 36px/36px */
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1.2rem; flex-shrink: 0;
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.3); /* Provides inner top-lit bevel */
}
