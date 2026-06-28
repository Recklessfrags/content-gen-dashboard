# Slice 2 Work-item A (W-A): Run/Receipt Drill-down Design Specification

**Status: READY FOR IMPLEMENTATION**
**Author: DESIGNER (Gemini)**
**Date: June 28, 2026**

---

## 1. Introduction & Layout Justification

### Column-Bounded Slide-over Detail Panel
For the Run/Receipt Drill-down interface, we specify a **Column-Bounded Slide-over Detail Panel** that overlays the list of runs inside the **Runs view** (`.wire` component). 

This design is selected and justified against alternative layout patterns (centered modal or inline accordion expansion) based on the following UX and technical parameters:
1. **Responsive Integrity at 320px Viewport:** 
   In the mobile view, the sticky navigation rail (`.rail`) remains visible at `84px` wide, leaving exactly `236px` of width for the runs column. A standard modal on a screen this narrow is extremely cramped and prone to absolute positioning clipping or scroll-trapping bugs. 
   By contrast, a column-bounded panel with `position: absolute` sits perfectly inside the `.wire` element (which must be styled with `position: relative`), expanding to exactly `100%` width of the runs viewport. It respects the boundaries of the navigation rail, ensuring that the navigation buttons and the "Exit" action remain completely functional, and matches the layout pattern of our existing dashboard columns.
2. **Infinite receipts / vertical height protection:**
   An individual content-pipeline run can contain dozens of chronological step-by-step receipts. An inline accordion expand would balloon the height of the runs list, causing major loss of scroll context and creating an extremely tedious scroll experience. The slide-over panel provides its own dedicated scroll container (`overflow-y: auto`), isolating chronological step scroll from the main runs list.
3. **Scroll state preservation:**
   Closing the slide-over panel unmounts it from the React state (setting `activeEpisodeId` to `null`), immediately returning the operator to their exact scroll position in the runs list. There is zero scroll state loss.

---

## 2. Keyboard Navigation & Focus Behavior

To meet the **WCAG 2.2 AA** baseline, we specify the following precise keyboard and focus management rules:

1. **Trigger Element Accessibility:**
   The run cards inside the `.wire-list` are currently represented as static `div` elements. The Builder must refactor these elements into interactive `<button>` tags (or elements with `role="button"` and `tabIndex={0}`):
   ```html
   <button key={e.episode_id} className="runcard" onClick={() => handleOpen(e.episode_id)} aria-haspopup="dialog" aria-expanded={activeEpisodeId === e.episode_id}>
     <!-- content -->
   </button>
   ```
2. **Opening Transition & Focus Shift:**
   When the operator activates a run card using `Enter` or `Space`:
   - State `activeEpisodeId` is set, and the `.drilldown-panel` is mounted.
   - Focus is shifted immediately to the **"← Back" (Close) Button** inside the drill-down header.
   - The Close Button is initialized with a React `useRef` to facilitate this focus shift: `closeButtonRef.current?.focus()`.
3. **Focus Trapping:**
   While the drill-down panel is open, keyboard `Tab` navigation must be trapped within the panel to prevent focus from escaping to hidden list cards underneath.
   - When the operator tabs past the final JSON disclosure summary inside the scrollable timeline, focus wraps back to the header "← Back" button.
   - When the operator tabs backward (`Shift + Tab`) from the "← Back" button, focus wraps to the last interactive element (the last open JSON disclosure summary or retry button).
4. **Escape to Close:**
   Pressing the `Esc` key at any point while the drill-down panel is open triggers the close action, unmounting the panel.
5. **Focus Restoration:**
   Upon closing, focus must be returned directly to the specific `.runcard` button that triggered the drill-down, ensuring the keyboard operator does not lose their location in the list.

---

## 3. Component Structures & JSX Blueprints

The following TSX snippet outlines the exact React component structure that the Builder should implement. It utilizes existing design tokens, CSS classes, and semantic structural tags:

```tsx
interface Receipt {
  id: string;
  episode_id: string;
  seq: number;
  stage: string;
  provider: string;
  model: string;
  effort_requested: string;
  effort_used: string;
  verdict: string;
  reason: string;
  clamped: boolean;
  evidence: any;
  result: any;
  spend_so_far: number;
  ts: string;
}

interface Episode {
  episode_id: string;
  food: string;
  status: string;
  final_stage: string;
  spend: number;
  created_at: string;
}

interface DrillDownProps {
  episode: Episode;
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export function DrillDownPanel({ episode, receipts, loading, error, onClose, onRetry }: DrillDownProps) {
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // Focus shift on mount
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [loading]);

  // Escape key close handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="drilldown-panel" role="dialog" aria-modal="true" aria-label={`Detail for run ${episode.food}`}>
      
      {/* HEADER SECTION */}
      <div className="col-head">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button 
            ref={closeButtonRef}
            className="btn ghost close-btn" 
            onClick={onClose} 
            aria-label="Close run detail"
          >
            ← Back
          </button>
          <h2>Run Detail</h2>
        </div>
        <span className="count">ID: {episode.episode_id.slice(0, 8).toUpperCase()}</span>
      </div>

      {/* METADATA SUMMARY BAR */}
      <div className="detail-cap">
        <div className="topic-title">{episode.food}</div>
        <div className="detail-meta">
          <span className="rmeta stat">{episode.status}</span>
          {episode.final_stage && (
            <span className="rmeta">stage · {episode.final_stage}</span>
          )}
          {typeof episode.spend === "number" && episode.spend > 0 && (
            <span className="rmeta spend-total">Total Spend: ${episode.spend.toFixed(2)}</span>
          )}
          <span className="rmeta">
            {new Date(episode.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* CONTENT SCROLLCONTAINER */}
      <div className="drilldown-content">
        {loading ? (
          <div className="loading">
            <span className="spin" /> Loading run receipts…
          </div>
        ) : error ? (
          <div className="empty">
            <h3>Comms Down</h3>
            <p>Couldn't reach the pipeline receipts database: {error}</p>
            <button className="btn" onClick={onRetry} style={{ marginTop: "12px" }}>
              Retry Connection
            </button>
          </div>
        ) : receipts.length === 0 ? (
          <div className="empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: "34px", height: "34px", opacity: 0.5 }}>
              <path d="M5 12l4 4 10-10" />
            </svg>
            <h3>No receipts logged</h3>
            <p>This episode finished without producing step-by-step pipeline receipts.</p>
          </div>
        ) : (
          <div className="timeline">
            {receipts.map((receipt) => {
              // Map verdict to lowercase for style classes
              const verdictClass = (receipt.verdict || "").toLowerCase();
              let resolvedClass = "none";
              if (["pass", "cleared", "approved", "success"].includes(verdictClass)) resolvedClass = "pass";
              if (["warning", "pass_with_warning"].includes(verdictClass)) resolvedClass = "warning";
              if (["fail", "rejected", "error", "failed"].includes(verdictClass)) resolvedClass = "fail";

              return (
                <div key={receipt.id} className="timeline-item">
                  {/* Visual timeline connection node */}
                  <div className={`timeline-node ${resolvedClass}`} aria-hidden="true" />
                  
                  {/* Step Receipt Card */}
                  <div className={`receipt-card ${resolvedClass}`}>
                    
                    {/* Card Header row */}
                    <div className="receipt-card-header">
                      <div className="receipt-stage-title">
                        {receipt.stage || "unknown-stage"}
                        <span className="receipt-seq">seq · {receipt.seq}</span>
                      </div>
                      <span className="receipt-timestamp">
                        {new Date(receipt.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    {/* Meta Indicators Grid */}
                    <div className="receipt-meta-row">
                      <span className="rmeta model-badge">
                        {receipt.provider || "unknown"} · {receipt.model || "no-model"}
                      </span>
                      
                      {receipt.effort_requested && (
                        <span className="rmeta effort-badge">
                          Effort: {receipt.effort_used || "0"}/{receipt.effort_requested}
                          {receipt.clamped && (
                            <span className="clamped-text"> (clamped)</span>
                          )}
                        </span>
                      )}

                      {typeof receipt.spend_so_far === "number" && (
                        <span className="rmeta spend-so-far-badge">
                          Accumulated Spend: ${receipt.spend_so_far.toFixed(3)}
                        </span>
                      )}
                    </div>

                    {/* Verdict & Reason Block */}
                    <div className="receipt-verdict-banner">
                      <span className={`receipt-verdict-label ${resolvedClass}`}>
                        {receipt.verdict || "UNKNOWN"}
                      </span>
                      <p className="receipt-reason-text">
                        {receipt.reason || "No written justification logged."}
                      </p>
                    </div>

                    {/* JSON Evidence Accordion Disclosures */}
                    <div className="receipt-json-disclosures">
                      {receipt.evidence && (
                        <details className="receipt-json-details">
                          <summary className="receipt-json-summary" role="button" aria-label="Toggle raw evidence JSON">
                            Evidence JSON
                          </summary>
                          <pre className="receipt-json-content">
                            <code>{JSON.stringify(receipt.evidence, null, 2)}</code>
                          </pre>
                        </details>
                      )}

                      {receipt.result && (
                        <details className="receipt-json-details">
                          <summary className="receipt-json-summary" role="button" aria-label="Toggle raw result JSON">
                            Result JSON
                          </summary>
                          <pre className="receipt-json-content">
                            <code>{JSON.stringify(receipt.result, null, 2)}</code>
                          </pre>
                        </details>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
```

---

## 4. Visual Layout & CSS Specifications

The Builder must append the following declarations to `src/app/globals.css`. These classes reuse the existing token system (`--ink`, `--ink-2`, `--ink-3`, `--line`, `--line-soft`, `--paper`, `--paper-dim`, `--paper-faint`, `--brass`, `--cleared`, `--stamp`) to guarantee aesthetic alignment:

```css
/* ── RUN DRILL-DOWN PANEL ── */
.drilldown-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  background: var(--ink);
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--line-soft);
  animation: slideInColumn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInColumn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Detail Subheader Panel */
.detail-cap {
  padding: 16px 34px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--ink-2);
}

.detail-cap .topic-title {
  font-family: var(--display);
  font-weight: 700;
  font-size: 26px;
  letter-spacing: .02em;
  text-transform: uppercase;
  color: var(--paper);
  line-height: 1.1;
  margin-bottom: 8px;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.detail-meta .rmeta.spend-total {
  color: var(--cleared);
  border-color: #4d5635;
  font-weight: 600;
}

/* Close Button Padding adjustment for WCAG Target Size */
.close-btn {
  padding: 6px 12px;
  min-height: 28px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .08em;
}

/* Content Area */
.drilldown-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 34px 60px;
}

/* ── TIMELINE TRACK AND NODES ── */
.timeline {
  position: relative;
  padding-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* The vertical thread line */
.timeline::before {
  content: '';
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 5px;
  width: 2px;
  background: var(--line-soft);
}

.timeline-item {
  position: relative;
}

/* Timeline node bullets */
.timeline-node {
  position: absolute;
  left: -24px;
  top: 20px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--line);
  background: var(--ink);
  z-index: 2;
  transition: transform 0.15s, border-color 0.15s, background-color 0.15s;
}

.timeline-node.pass {
  border-color: var(--cleared);
  background: var(--cleared);
}

.timeline-node.warning {
  border-color: var(--brass);
  background: var(--brass);
}

.timeline-node.fail {
  border-color: var(--stamp);
  background: var(--stamp);
}

/* ── RECEIPT CARD STYLES ── */
.receipt-card {
  background: var(--ink-2);
  border: 1px solid var(--line-soft);
  border-left: 3px solid var(--line);
  border-radius: 3px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s, background-color 0.15s;
}

.receipt-card:hover {
  background: var(--ink-3);
  border-color: var(--line);
}

.receipt-card:hover .timeline-node {
  transform: scale(1.15);
}

.receipt-card.pass { border-left-color: var(--cleared); }
.receipt-card.warning { border-left-color: var(--brass); }
.receipt-card.fail { border-left-color: var(--stamp); }

/* Card Header Components */
.receipt-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.receipt-stage-title {
  font-family: var(--display);
  font-weight: 600;
  font-size: 17px;
  letter-spacing: .03em;
  text-transform: uppercase;
  color: var(--paper);
}

.receipt-seq {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--paper-faint);
  margin-left: 8px;
  letter-spacing: normal;
}

.receipt-timestamp {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--paper-faint);
}

/* Metadata Badges row */
.receipt-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.receipt-meta-row .clamped-text {
  color: var(--brass);
  font-weight: bold;
}

/* Verdict and Reason Banner */
.receipt-verdict-banner {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgba(21, 24, 30, 0.45);
  padding: 10px 14px;
  border-radius: 3px;
  border: 1px solid var(--line-soft);
}

.receipt-verdict-label {
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: bold;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 2px;
  flex-shrink: 0;
  border: 1px solid transparent;
}

.receipt-verdict-label.pass {
  color: var(--cleared);
  background: rgba(126, 139, 83, 0.08);
  border-color: rgba(126, 139, 83, 0.25);
}

.receipt-verdict-label.warning {
  color: var(--brass);
  background: rgba(201, 162, 75, 0.07);
  border-color: rgba(201, 162, 75, 0.22);
}

.receipt-verdict-label.fail {
  color: var(--stamp);
  background: rgba(200, 69, 59, 0.08);
  border-color: rgba(200, 69, 59, 0.25);
}

.receipt-reason-text {
  font-size: 13px;
  color: var(--paper-dim);
  margin: 0;
  line-height: 1.45;
}

/* ── JSON DISCLOSURES ── */
.receipt-json-disclosures {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.receipt-json-details {
  display: block;
}

.receipt-json-summary {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--paper-dim);
  cursor: pointer;
  background: var(--ink-3);
  border: 1px solid var(--line-soft);
  border-radius: 2px;
  padding: 6px 10px;
  user-select: none;
  transition: background-color 0.12s, color 0.12s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px; /* WCAG 2.2 target size minimum height */
}

.receipt-json-summary:hover {
  background: var(--line-soft);
  color: var(--paper);
}

/* Custom list-style bullet formatting */
.receipt-json-summary::-webkit-details-marker {
  display: none;
}
.receipt-json-summary {
  list-style: none;
}
.receipt-json-summary::before {
  content: '▸';
  color: var(--paper-faint);
  font-size: 10px;
  display: inline-block;
  transition: transform 0.12s;
}

.receipt-json-details[open] .receipt-json-summary::before {
  transform: rotate(90deg);
  color: var(--brass);
}

.receipt-json-content {
  margin-top: 6px;
  background: #0d0f12; /* deeper pitch background for structural code readability */
  border: 1px solid var(--line-soft);
  border-radius: 3px;
  padding: 12px;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--paper-dim);
  overflow-x: auto;
  white-space: pre-wrap; /* wraps long lines */
  word-break: break-all; /* prevents horizontal spill */
  max-height: 280px;
  overflow-y: auto;
}
```

---

## 5. Visual State Matrix Spec

Every interactive elements inside the new components must support these specific states:

| Component / Node | State | Presentation / Visual Style |
| --- | --- | --- |
| **Close Button (`.close-btn`)** | Default | `border: 1px solid var(--line-soft); background: transparent; color: var(--paper-dim);` |
| | Hover | `border-color: var(--line); color: var(--paper); background: var(--ink-3);` |
| | Focus | `outline: 2px solid var(--brass); outline-offset: 2px;` |
| | Active | `background: var(--line-soft); transform: scale(0.97);` |
| | Disabled | `opacity: 0.5; cursor: not-allowed;` |
| **Receipt Card (`.receipt-card`)** | Default | `background: var(--ink-2); border-color: var(--line-soft);` |
| | Hover | `background: var(--ink-3); border-color: var(--line);` (Node: scale 1.15) |
| | Focus | Explicit focus border skipped unless accessed by keyboard (retains default `:focus-visible` if interactive) |
| **Disclosure Summary (`.receipt-json-summary`)**| Default | `background: var(--ink-3); border: 1px solid var(--line-soft); color: var(--paper-dim);` |
| | Hover | `background: var(--line-soft); color: var(--paper);` |
| | Focus | `outline: 2px solid var(--brass); outline-offset: 1px;` (Visible focus outline) |
| | Active | `background: var(--line); transform: scale(0.98);` |
| **Detail Panel loading state** | Loading | Spinner (`.spin`) centered vertically and horizontally inside `.drilldown-content` with label "Loading run receipts...". |
| **Detail Panel empty state** | Empty | Centered illustration/alert (0.5 opacity), `<h3>No receipts logged</h3>`, paragraph explaining failure at initialization, Close Button fully active. |
| **Detail Panel fetch error** | Error | `<h3>Comms Down</h3>`, display of raw Supabase error, red warning indicators, and a high-contrast standard button `Retry Connection` with hover/focus states active. |

---

## 6. Responsive Breakdown & Media Rules

### 1. Ultra-Narrow Viewports (320px)
At 320px width, the left sticky rail takes up `84px`, leaving exactly `236px` of active column content space. The slide-over panel will scale automatically to `width: 236px`.
- **Timeline Stacking:** Since horizontal space is extremely scarce, horizontal margins are squeezed. The `.drilldown-content` padding is restricted to `12px` on sides.
- **Card Padding & Layout:** `.receipt-card` reduces internal padding to `12px`.
- **Header Reflow:** `.receipt-card-header` reflows to a vertical flex-column, forcing timestamps and labels to stack vertically:
- **Badge wrapping:** Badges inside `.receipt-meta-row` wrap vertically onto multiple lines with custom `gap: 4px`.
- **JSON scrollbars:** JSON pre-code blocks are capped with `max-height: 200px` to prevent blowing past the viewport vertical height.

```css
@media (max-width: 480px) {
  .detail-cap {
    padding: 12px 18px;
  }
  .detail-cap .topic-title {
    font-size: 20px;
  }
  .drilldown-content {
    padding: 16px 18px 40px;
  }
  .timeline {
    padding-left: 14px;
    gap: 18px;
  }
  .timeline::before {
    left: 4px;
  }
  .timeline-node {
    left: -14px;
    width: 10px;
    height: 10px;
    top: 15px;
  }
  .receipt-card {
    padding: 12px;
    gap: 8px;
  }
  .receipt-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .receipt-stage-title {
    font-size: 15px;
  }
  .receipt-meta-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .receipt-verdict-banner {
    padding: 8px 10px;
    flex-direction: column;
    gap: 6px;
  }
}
```

### 2. Tablet Viewports (768px – 1024px)
Roster is hidden. Full Runs column width matches screen minus rail (`768px - 84px = 684px`).
- Slide-over panel scales to full column width (`684px`).
- Ample space for timeline horizontal metadata layout. Timestamps and seq tags remain side-by-side.

### 3. Desktop Viewports (>1024px)
Full screen structure. Column has plenty of dedicated space. Slide-over covers the runs list nicely. Custom hover transitions, node scaling, and smooth scroll behaviors are active.

---

## 7. WCAG 2.2 AA Compliance Audit

1. **Color Contrast Integrity:**
   - Background of disclosure JSON blocks is `#0D0F12` (relative luminance ~0.005).
   - Dimmed sand text (`var(--paper-dim)` = `#A39A86`, relative luminance ~0.354) meets a contrast ratio of **9.0:1** over `#0D0F12`, completely exceeding AA (4.5:1) and AAA (7:1).
   - Faint text (`var(--paper-faint)` = `#8A8475`, relative luminance ~0.228) over card background `#1C2027` (relative luminance ~0.014) is **4.34:1**, which is marginally below the 4.5:1 AA ratio for normal body copy.
   - **Accessible Implementation Rule for the Builder:** The Builder **must** increase the lightness of `--paper-faint` to **`#8F897B`** (luminance ~0.25). This secures a **4.7:1** contrast ratio over both `#15181E` and `#1C2027` backgrounds, achieving 100% WCAG 2.2 AA compliant typography across all small text tags and timestamps.
2. **Interactive Target Sizing:**
   - Touch targets for disclosure accordion summaries (`.receipt-json-summary`) are assigned `padding: 6px 10px; min-height: 24px;` to fulfill the WCAG 2.2 AA Target Size minimum (24px by 24px).
   - Close Back buttons (`.close-btn`) are assigned a minimum height of `28px` to guarantee an accessible target size.
3. **Reduced Motion Styles:**
   - To accommodate users with vestibular motion and animation sensitivities, keyframes and translations are disabled under the reduced-motion query:
   ```css
   @media (prefers-reduced-motion: reduce) {
     .drilldown-panel {
       animation: none !important;
     }
     .timeline-node {
       transition: none !important;
     }
     .receipt-card:hover .timeline-node {
       transform: none !important;
     }
     .receipt-json-summary::before {
       transition: none !important;
     }
   }
   ```

---

## 8. Specific Accessibility Corrective: Login Input Focus (S2-6)

Per Architect Acceptance Gate **S2-6**, the residual login card focus suppression in `src/app/globals.css` must be replaced with a highly visible, keyboard-accessible treatment consistent with our global `:focus-visible` standards.

### Corrective CSS Modification:
The Builder must locate the following styling block in `src/app/globals.css` (around line 170):
```css
.login-card input:focus{outline:none;border-color:var(--stamp-deep)}
```

And replace it with:
```css
.login-card input:focus{border-color:var(--stamp-deep)}
.login-card input:focus-visible{outline:2px solid var(--brass);outline-offset:2px;border-radius:2px}
```
*Note for Builder: Removing `outline: none` on standard mouse focus preserves a clean mouse click aesthetic, while adding the explicit `.login-card input:focus-visible` rule guarantees high-contrast keyboard-navigation focus ring indicators.*

---

## 9. Architect Boundary Restriction (Read-Only Inspection Only)

Per open decision **D-2** and Architect boundary rules, this drill-down component is STRICTLY a **read-only inspection interface**. 
- **NO OPERATIONAL CONTROLS:** Do not implement retry buttons for individual steps, manual state changes, step triggers, active status mutations, or run manipulation controls.
- Doing so is considered scope creep into the deferred board product spec and will result in a validation failure. Keep the interface focused entirely on descriptive metadata timeline logging.

---

DESIGN COMPLETE
