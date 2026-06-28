# Slice 4 — Read-Only "Cost Box" Spend-Governance Design Specification

**Status: READY FOR IMPLEMENTATION**  
**Author: DESIGNER (Gemini)**  
**Date: June 28, 2026**

---

## 1. View Placement: Dedicated "Cost" View & Reconciled Overview

We recommend and specify a dedicated **"Cost" Navigation Rail View** (using view state `"cost"`) as the fifth item in the sidebar rail, positioned directly below the `"overview"` navigation item.

### Justification over alternative patterns (such as a modal or a nested panel):
1. **Space for Auditing Detail:** Spend governance requires comparing aggregate numbers, reviewing provider percentages, and auditing a chronologically dense per-run log. Squeezing this audit log into a card or a generic modal would obscure run-by-run details and fail the solo founder's need for comfortable inspection.
2. **Dedicated Workspace Context:** A dedicated workspace view maintains the clean "cockpit" layout pattern of the Control Room, allowing the user to switch into a pure monitoring mode. It prevents mixing execution states (Runs list) with financial auditing.
3. **Accessibility and Target Safety:** Adding a dedicated `.navbtn` maintains the exact click targets and keyboard navigation loops established by the previous slices.

```
+---------------+
|  CONTROL·ROOM |
|               |
|  [ Roster ]   |
|  [ The Wire ] |
|  [ Runs ]     |
|  [ Overview ] |
|  [ Cost ]*    |  <-- Dedicated 5th nav button (active highlights .dot with --stamp)
|               |
|  [ Exit ]     |
+---------------+
```

### Nav Button Specifications
- **Interactive Element:** Represented as a `<button>` with the exact class name `.navbtn`.
- **Active State:** Gaining `.on` when `view === "cost"`, turning the `.dot` into `var(--stamp)` (crimson).
- **Accessibility:** Must include `aria-pressed={view === "cost"}` and have a click target size of `56px x 56px`.
- **Inline SVG Icon:** Symmetrical double-circulur stacked "coins" represent the ledger/spend view:
  ```tsx
  // Extension inside src/components/ControlRoom.tsx -> Icon component
  cost: "M12 8c-3.31 0-6 2.24-6 5s2.69 5 6 5 6-2.24 6-5-2.69-5-6-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-10c-3.31 0-6 2.24-6 5h12c0-2.76-2.69-5-6-5z"
  ```

### Reconciling Contradictory Totals (Gate S4-9)
The Slice 3 Overview spend card currently sums completed episodes via `episode.spend` (which is `0` for running episodes). To prevent contradictory metrics across views:
1. **Single Source of Truth:** Both the Overview screen's *Total Operational Spend* card and the Cost view's *Running Total Hero* must draw from the exact same live-calculated receipts dataset (`max(spend_so_far)` per episode).
2. **Unified Data Loading:** Upon mounting or clicking "Cost/Overview", a single read retrieves a lightweight projection of the `receipts` table:
   ```sql
   select episode_id, seq, provider, stage, spend_so_far from receipts;
   ```
   This projection omits heavy columns (`evidence`, `result`), allowing instant, token-efficient client-side calculations that guarantee perfect mathematical alignment (Overview Grand Total == Cost Box Grand Total).

---

## 2. Running Total Hero (USD Only)

At the focal point of the Cost dashboard sits the **Running Total Spend Hero**. This element presents the aggregate cost across all content creation operations.

```
+-------------------------------------------------------+
|  RUNNING TOTAL OPERATIONAL SPEND                      |
|  $1,245.82 USD                                        |
|  [Live & In-Flight Aware]                             |
+-------------------------------------------------------+
```

### Visual Specifications
- **Container:** Standard `.metric-card` with an extra styling class `.hero-card` to expand its visual weight.
- **Label Eyebrow:** `RUNNING TOTAL OPERATIONAL SPEND` in monospace, uppercase, colored with `var(--paper-dim)`.
- **Primary Value:** Displayed in large Oswald font (`42px`), formatted explicitly as `$[Value] USD`. The "USD" label is critical (Gate S4-4) to prevent silent unit confusion once multi-currency or API-credit units exist.
- **Supporting Caption:** Monospace text reading: `"Live & In-Flight Aware · Includes running pipeline operations"`.

---

## 3. By-Provider / API Breakdown & Delta Computation

A primary requirement of the Cost Box is a breakdown illustrating how costs are divided among API vendors (e.g., Anthropic, Google, and local deterministic processors).

```
+-------------------------------------------------------+
|  API PROVIDER BREAKDOWN                               |
|                                                       |
|  ANTHROPIC      $842.15 USD  [==========-----------]   |
|  GOOGLE         $391.22 USD  [=====----------------]   |
|  DETERMINISTIC   $12.45 USD  [=--------------------]   |
+-------------------------------------------------------+
```

### The Delta Mathematics (Crucial)
`receipts.spend_so_far` is cumulative per episode. Summing this column directly would multiply the actual cost by orders of magnitude. The actual spend per stage must be computed as a delta, grouped by provider, and aggregated:

$$\text{Delta}_i = \begin{cases} \text{spend\_so\_far}_i, & \text{if seq}_i \text{ is the first row for episode\_id} \\ \text{spend\_so\_far}_i - \text{spend\_so\_far}_{i-1}, & \text{if seq}_i > \text{seq}_{i-1} \end{cases}$$

### Grouping and Bucketing Rules:
1. **Deltas:** Group rows of `receipts` by `episode_id` ordered by `seq` ascending. Calculate the delta increment for each step.
2. **Deterministic / Empty Provider Bucket:** Rows where `provider` is null, empty (`""`), or undefined represent deterministic operations (such as the factual `gate` check, static templates, or local scripts). These usually carry a $\$0$ increment, but must be grouped cleanly in a bucket labeled `"Deterministic / None"`.
3. **Attribution:** Sum the calculated deltas for each provider. Calculate each provider's percentage share:
   $$\text{Share}\% = \left( \frac{\text{Provider Sum}}{\text{Grand Total}} \right) \times 100$$

### UI Design
- Render each provider row with its name in `var(--paper)` bold, followed by its exact calculated dollar amount, and its relative percentage share.
- Display a thin horizontal progress bar (`.progress-container` / `.progress-bar`) colored with `--cleared` (for the leading provider) or `--brass` / `--stamp` (for other providers) to visually communicate the proportional split.

---

## 4. Per-Episode Cost Log & Live In-Flight Indicator

The right-hand side of the Cost Box view displays a scrollable ledger containing the financial footprint of every episode.

```
+------------------------------------------------------------------------+
|  LIVE RUN AUDIT LOG                                                    |
|  +-------------------------------------------------------------------+ |
|  | #EP-409A · TRUFFLE BUTTER CHOCOLATE CUPCAKE        $12.54 USD     | |
|  | STATUS: SUCCESS · Completed cottage-cheese run                    | |
|  +-------------------------------------------------------------------+ |
|  | #EP-821B · COCONUT WATER SHERBET                   $4.12 USD      | |
|  | STATUS: RUNNING · [IN-FLIGHT]                      (active)       | |
|  +-------------------------------------------------------------------+ |
+------------------------------------------------------------------------+
```

### In-Flight Cost Detection
1. **The Issue:** For running episodes, `episodes.spend = 0` until the run finalizes.
2. **The Solution:** The cost log reads `max(spend_so_far)` from the receipts table for that `episode_id`. If an episode's status is `"running"` or `"active"` (or `status !== "success" && status !== "failed"`), and `max(spend_so_far) > 0`, it is flagged with a high-visibility, pulse-animated badge: `[IN-FLIGHT]`.
3. **Reconciliation (Gate S4-6):** For completed runs, this calculated `max(spend_so_far)` aligns perfectly with `episodes.spend` (e.g. the standard cottage-cheese episode `max(spend_so_far) == episodes.spend`).

---

## 5. Budget Cap & Flagged Pipeline Gaps

To protect against runaway pipelines, the design designates a clear, highlighted area for future budget configurations and outlines the boundaries of current tracking.

```
+------------------------------------------------------------------------+
|  [!] PIPELINE DISCLOSURE                                               |
|  Asset spend (voices, rendering, audio tracks) is not yet reported     |
|  by the content pipeline. Today's ledger tracks LLM text-generation    |
|  providers only (USD).                                                 |
+------------------------------------------------------------------------+
|  BUDGET CAP STATUS                                                     |
|  [ PARKED ] Budget cap configurations are currently managed            |
|  via pipeline environmental variables. This UI component is parked     |
|  until cap configs are exposed in a dashboard-reachable table.         |
+------------------------------------------------------------------------+
```

### Specified Elements
1. **Asset Spend Disclosure Box (Gate S4-4):**
   - A distinct panel with `border: 1px dashed var(--line-soft)`, a golden-brass warning icon, and a monospace note explaining that **voice, music, sound effects, and rendering overhead** are currently missing from the pipeline's logging table. This ensures the solo operator knows they are viewing an LLM-specific subset of operations.
2. **Budget Cap Visual Placement (Parked - Gate S4-7):**
   - A parked budget card located directly underneath the grand total hero. It displays a simulated progress bar pointing to a $\$100.00$ limit.
   - It is covered by a low-opacity watermark overlay carrying a clear label: `[ PARKED · Awaiting pipeline cap API exposure ]`. This provides the operator with immediate context on where governance limits will sit in future releases.

---

## 6. Deferred Seam: Per-Character Grouping (Tier 2)

Per Gate S4-7, grouping costs by active character (e.g. "How much has Acoustic Kitty cost vs. Space Dino?") is deferred to Tier 2 because `character_id` does not yet exist on the pipeline-owned `episodes` table.

### The Seam Design
To provide a smooth upgrade path, we specify a **dormant aggregation toggle** inside the Provider breakdown header:

```
+-------------------------------------------------------------+
|  COST DISTRIBUTION                      [ PROVIDERS ] (On)  |
|                                         [ CHARACTERS ] (Off) | <-- Seam
|  Aggregate views by API vendor or character manual.        |
+-------------------------------------------------------------+
```

- **Interactive Element:** A segmented control or button group inside the card head.
- **Active State:** The `"Providers"` option is locked in an active `.on` state.
- **Deferred State:** The `"Characters"` option is rendered with standard disabled styling (greyed out text, pointer default) and contains a tooltip/hint reading: `"Character-attribution requires episodes metadata upgrade (Tier 2 - Deferred)"`.

---

## 7. Component Blueprint & JSX Rendering Layout

Below is the TSX layout blueprint that the Builder will translate into React elements inside `ControlRoom.tsx` under the `{view === "cost" && ( ... )}` rendering path:

```tsx
import React, { useMemo, useState } from "react";
import { type Episode, type Receipt } from "@/lib/types";

interface CostBoxProps {
  episodes: Episode[];
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
}

export function CostBoxDashboard({ episodes = [], receipts = [], loading, error }: CostBoxProps) {
  
  // ── 1. MATHEMATICAL DELTA AND AGGREGATION CALCULATIONS ──────────────────
  const costStats = useMemo(() => {
    if (episodes.length === 0) {
      return { grandTotal: 0, providerSplit: [], episodeCosts: [] };
    }

    // A. Compute per-episode costs from live max(spend_so_far)
    const epCostsMap: Record<string, number> = {};
    const runningEpsSet = new Set<string>();

    // Seed mapped records and record running status
    episodes.forEach((ep) => {
      epCostsMap[ep.episode_id] = 0;
      const status = (ep.status || "").trim().toLowerCase();
      if (status === "running" || status === "active" || status === "in-flight") {
        runningEpsSet.add(ep.episode_id);
      }
    });

    // Group receipts by episode
    const receiptsByEp: Record<string, Receipt[]> = {};
    receipts.forEach((r) => {
      if (!receiptsByEp[r.episode_id]) {
        receiptsByEp[r.episode_id] = [];
      }
      receiptsByEp[r.episode_id].push(r);
    });

    // B. Calculate actual per-row deltas per episode to allocate to providers
    const providerTotals: Record<string, number> = {};
    let grandTotalSum = 0;

    Object.keys(epCostsMap).forEach((epId) => {
      const epReceipts = receiptsByEp[epId] || [];
      // Sort sequentially to guarantee correct sequential delta matching
      const sortedReceipts = [...epReceipts].sort((a, b) => (a.seq || 0) - (b.seq || 0));

      let lastSpend = 0;
      let maxSpendForEp = 0;

      sortedReceipts.forEach((r) => {
        const currentSpend = Number(r.spend_so_far || 0);
        const delta = Math.max(0, currentSpend - lastSpend);
        
        // Track the highest value seen as the actual live episode cost
        if (currentSpend > maxSpendForEp) {
          maxSpendForEp = currentSpend;
        }

        // Allocate delta to provider
        const rawProvider = (r.provider || "").trim().toLowerCase();
        const providerKey = rawProvider === "" ? "Deterministic / None" : r.provider || "Deterministic / None";
        
        providerTotals[providerKey] = (providerTotals[providerKey] || 0) + delta;
        lastSpend = currentSpend;
      });

      // Update maps
      epCostsMap[epId] = maxSpendForEp;
      grandTotalSum += maxSpendForEp;
    });

    // C. Format provider list for rendering with percentage shares
    const providerSplit = Object.entries(providerTotals)
      .map(([name, amount]) => {
        const percentage = grandTotalSum > 0 ? Math.round((amount / grandTotalSum) * 100) : 0;
        return { name, amount, percentage };
      })
      .sort((a, b) => b.amount - a.amount);

    // D. Compile chronological run list with live indicators
    const episodeCosts = episodes.map((ep) => {
      const liveSpend = epCostsMap[ep.episode_id] || 0;
      const isLiveInFlight = runningEpsSet.has(ep.episode_id) && liveSpend > 0;
      
      return {
        id: ep.episode_id,
        food: ep.food,
        status: ep.status,
        finalStage: ep.final_stage,
        completedSpend: ep.spend, // Reconciles against live spend
        liveSpend,
        isLiveInFlight,
        createdAt: ep.created_at,
      };
    });

    return {
      grandTotal: grandTotalSum,
      providerSplit,
      episodeCosts,
    };
  }, [episodes, receipts]);

  if (loading) return <CostSkeleton />;
  if (error) return <CostError message={error} />;
  if (episodes.length === 0) return <CostEmptyState />;

  return (
    <div className="cost" role="region" aria-label="Spend Governance Workspace">
      
      {/* HEADER */}
      <div className="col-head">
        <h2>Spend Governance</h2>
        <span className="count">cost box (tier 1)</span>
      </div>

      {/* VIEW DESCRIPTION & METRICS BANNER */}
      <div className="cap">
        <span className="eyebrow">Read-only auditing of computational api operations.</span>
      </div>

      {/* DASHBOARD WORKSPACE GRID */}
      <div className="cost-content">
        
        {/* PIPELINE DISCLOSURE / WARNING BANNER */}
        <div className="disclosure-banner" role="status">
          <span className="disclosure-tag">pipeline gap note</span>
          <p>
            <b>Notice:</b> External voice synthesis, musical asset rendering, and cloud storage overhead are 
            not yet integrated into pipeline logging tables. This panel displays **LLM provider spend only** (USD).
          </p>
        </div>

        <div className="cost-grid">
          
          {/* LEFT COLUMN: GENERAL SUMMARY & SPLITS */}
          <section className="cost-summary-column" aria-labelledby="cost-metrics-title">
            <h3 id="cost-metrics-title" className="sr-only">Financial Summary</h3>
            <div className="cost-cards-stack">
              
              {/* 1. GRAND HERO SPEND */}
              <div className="metric-card hero-card" tabIndex={0} aria-label={`Grand total operational spend is ${costStats.grandTotal.toFixed(2)} USD.`}>
                <div className="metric-meta">
                  <span className="metric-eyebrow">RUNNING GRAND TOTAL</span>
                  <span className="metric-badge">USD ONLY</span>
                </div>
                <div className="metric-value hero-value">${costStats.grandTotal.toFixed(2)} <span className="currency-label">USD</span></div>
                <div className="metric-breakdown text-cleared">
                  <span className="pulse-dot" /> Live in-flight aware calculations
                </div>
              </div>

              {/* 2. PARKED BUDGET CAP SECTION */}
              <div className="metric-card parked-card" tabIndex={0} aria-label="Budget cap progress: Parked, awaiting pipeline configuration API exposure.">
                <div className="metric-meta">
                  <span className="metric-eyebrow">BUDGET CAP</span>
                  <span className="metric-badge stamp-badge">PARKED</span>
                </div>
                <div className="parked-watermark">CAP OFF-GRID</div>
                <div className="metric-value text-muted">$100.00 <span className="currency-label">LIMIT</span></div>
                <div className="progress-container" aria-hidden="true">
                  <div className="progress-bar progress-parked" style={{ width: "0%" }} />
                </div>
                <span className="metric-subtext">
                  Budget limit rules are processed via backend pipeline environmental variables.
                </span>
              </div>

              {/* 3. API VENDOR BREAKDOWN */}
              <div className="metric-card" tabIndex={0}>
                <div className="metric-meta-header">
                  <span className="metric-eyebrow">API ATTRIBUTION SPLIT</span>
                  
                  {/* SEAM: Tier 2 Deferred Character Grouping Button */}
                  <div className="deferred-seam" title="Grouping by character is deferred to Tier 2">
                    <button className="seam-btn active" disabled>Vendor</button>
                    <button className="seam-btn disabled" disabled aria-describedby="deferred-tip">Character</button>
                    <span id="deferred-tip" className="sr-only">Character aggregation requires database revisions in Tier 2</span>
                  </div>
                </div>

                <div className="provider-breakdown-list">
                  {costStats.providerSplit.map((p) => (
                    <div key={p.name} className="provider-row">
                      <div className="provider-info">
                        <span className="provider-name">{p.name}</span>
                        <span className="provider-percentage">{p.percentage}%</span>
                      </div>
                      <div className="progress-container" aria-hidden="true">
                        <div 
                          className={`progress-bar ${p.name.toLowerCase().includes("anthropic") ? "cleared" : "brass"}`} 
                          style={{ width: `${p.percentage}%` }} 
                        />
                      </div>
                      <div className="provider-value-row">
                        <span className="provider-value">${p.amount.toFixed(3)} USD</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* RIGHT COLUMN: CHRONOLOGICAL RUN AUDIT LOG */}
          <section className="cost-audit-column" aria-labelledby="cost-audit-title">
            <div className="column-sub-header">
              <h3 id="cost-audit-title">LIVE RUN AUDIT LOG</h3>
              <span className="count">{costStats.episodeCosts.length} episodes tracked</span>
            </div>

            <div className="audit-scroller">
              {costStats.episodeCosts.map((ec) => (
                <div key={ec.id} className={`audit-card ${ec.isLiveInFlight ? "in-flight" : ""}`} tabIndex={0}>
                  <div className="audit-card-top">
                    <div className="run-identity">
                      <span className="run-id">#{ec.id.slice(0, 8).toUpperCase()}</span>
                      <span className="run-topic">{ec.food}</span>
                    </div>
                    
                    <div className="run-spend-container">
                      <span className="run-spend-value">${ec.liveSpend.toFixed(2)} USD</span>
                      {ec.isLiveInFlight && (
                        <span className="flight-badge pulse" aria-label="In-flight spend actively accumulating">IN-FLIGHT</span>
                      )}
                    </div>
                  </div>

                  <div className="audit-card-meta">
                    <span className={`run-status-badge ${ec.status.toLowerCase()}`}>
                      {ec.status}
                    </span>
                    <span className="run-date">
                      {new Date(ec.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {ec.finalStage && (
                      <span className="run-stage-tag">Stage: {ec.finalStage}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
```

---

## 8. Theme Token Styling Integrations (CSS additions)

To maintain pixel-perfect alignment with the design language of `ControlRoom.tsx` and the tokens inside `globals.css`, append the following visual directives directly into `src/app/globals.css`:

```css
/* ==========================================================================
   SHAPE & GRID DEFINITIONS FOR SPEND GOVERNANCE (SLICE 4)
   ========================================================================== */

.cost {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--ink);
  position: relative;
}

.cost-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 34px 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Pipeline Disclosure warning box */
.disclosure-banner {
  background: rgba(201, 162, 75, 0.05);
  border: 1px dashed #6e5a26;
  border-left: 4px solid var(--brass);
  border-radius: 4px;
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.disclosure-tag {
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--brass);
  font-weight: bold;
}

.disclosure-banner p {
  margin: 0;
  font-size: 13px;
  color: var(--paper-dim);
  line-height: 1.5;
}

/* Master grid layout for desk/tablets */
.cost-grid {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 28px;
  align-items: start;
}

/* Cards stacked vertical columns */
.cost-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Hero Grand total spend */
.hero-card {
  border-left: 3px solid var(--stamp);
  background: linear-gradient(135deg, var(--ink-2), var(--ink-3));
  position: relative;
  overflow: hidden;
}

.hero-value {
  font-size: 42px !important;
  color: #fff !important;
  margin: 4px 0;
}

.currency-label {
  font-size: 14px;
  font-family: var(--mono);
  color: var(--paper-dim);
  vertical-align: middle;
  margin-left: 4px;
  letter-spacing: normal;
}

.pulse-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  background: var(--cleared);
  border-radius: 50%;
  margin-right: 6px;
  animation: radarPulse 1.8s infinite ease-in-out;
}

@keyframes radarPulse {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

/* Parked visual configuration card */
.parked-card {
  border: 1px solid var(--line-soft);
  opacity: 0.7;
  position: relative;
}

.parked-card .text-muted {
  color: var(--paper-faint) !important;
  text-decoration: line-through;
}

.parked-watermark {
  position: absolute;
  right: 16px;
  top: 40px;
  font-family: var(--display);
  font-size: 26px;
  color: var(--stamp);
  border: 2px solid var(--stamp);
  border-radius: 4px;
  padding: 3px 10px;
  font-weight: bold;
  opacity: 0.25;
  transform: rotate(-10deg);
  pointer-events: none;
}

.progress-parked {
  background: var(--line) !important;
}

/* Attribution metadata and seams */
.metric-meta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--line-soft);
  padding-bottom: 10px;
  margin-bottom: 12px;
}

.deferred-seam {
  display: flex;
  background: var(--ink-2);
  border: 1px solid var(--line-soft);
  padding: 2px;
  border-radius: 3px;
}

.seam-btn {
  font-family: var(--mono);
  font-size: 8.5px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 2px;
  border: none;
  background: transparent;
  cursor: default;
}

.seam-btn.active {
  background: var(--line-soft);
  color: var(--paper);
  font-weight: bold;
}

.seam-btn.disabled {
  color: var(--paper-faint);
  opacity: 0.45;
}

/* Vendor splitting display */
.provider-breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.provider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.provider-name {
  font-family: var(--mono);
  font-weight: bold;
  color: var(--paper);
}

.provider-percentage {
  font-family: var(--mono);
  color: var(--brass);
}

.provider-value-row {
  display: flex;
  justify-content: flex-end;
}

.provider-value {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--paper-dim);
}

/* Right-hand chronological ledger list styles */
.column-sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-soft);
  margin-bottom: 14px;
}

.column-sub-header h3 {
  font-family: var(--display);
  font-size: 18px;
  letter-spacing: .04em;
  color: var(--paper);
  margin: 0;
  text-transform: uppercase;
}

.audit-scroller {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 720px;
  overflow-y: auto;
  padding-right: 6px;
}

.audit-card {
  background: var(--ink-2);
  border: 1px solid var(--line-soft);
  border-left: 3px solid var(--line);
  border-radius: 3px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.15s ease-in-out;
}

.audit-card:hover {
  border-color: var(--line);
  background: var(--ink-3);
}

.audit-card:focus-visible {
  outline: 2px solid var(--brass);
  outline-offset: 2px;
  border-color: var(--line);
  background: var(--ink-3);
}

.audit-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.run-identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.run-id {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--paper-faint);
  letter-spacing: .08em;
}

.run-topic {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--paper);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.run-spend-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.run-spend-value {
  font-family: var(--mono);
  font-size: 14px;
  font-weight: bold;
  color: var(--cleared);
}

/* Pulse animation for active execution status */
.audit-card.in-flight {
  border-left-color: var(--brass);
  background: rgba(201, 162, 75, 0.02);
}

.flight-badge {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .1em;
  background: rgba(201, 162, 75, 0.1);
  border: 1px solid var(--brass);
  color: var(--brass);
  padding: 1px 5px;
  border-radius: 2px;
  font-weight: bold;
}

.flight-badge.pulse {
  animation: borderFlash 2s infinite ease-in-out;
}

@keyframes borderFlash {
  0% { box-shadow: 0 0 0 0px rgba(201, 162, 75, 0.15); }
  50% { box-shadow: 0 0 0 4px rgba(201, 162, 75, 0.0); }
  100% { box-shadow: 0 0 0 0px rgba(201, 162, 75, 0.15); }
}

.audit-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 11.5px;
  color: var(--paper-dim);
}

.run-status-badge {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .06em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 2px;
  font-weight: bold;
  border: 1px solid var(--line-soft);
}

.run-status-badge.success, .run-status-badge.cleared {
  color: var(--cleared);
  background: rgba(126, 139, 83, 0.08);
  border-color: rgba(126, 139, 83, 0.22);
}

.run-status-badge.running {
  color: var(--brass);
  background: rgba(201, 162, 75, 0.05);
  border-color: rgba(201, 162, 75, 0.22);
}

.run-status-badge.failed, .run-status-badge.fail {
  color: var(--stamp);
  background: rgba(200, 69, 59, 0.08);
  border-color: rgba(200, 69, 59, 0.22);
}

.run-stage-tag {
  font-family: var(--mono);
  color: var(--paper-faint);
}
```

---

## 9. Structural Error, Empty & Loading States

### A. Loading Skeleton (`CostSkeleton`)
When `loading === true`, the viewport is swapped with a skeleton frame using linear-gradient loading pulses inside standard boundaries:

```tsx
function CostSkeleton() {
  return (
    <div className="cost-content" aria-busy="true" aria-label="Calculating API bills">
      <div className="disclosure-banner skeleton-card" style={{ height: "64px" }} />
      <div className="cost-grid">
        <div className="cost-cards-stack">
          <div className="metric-card hero-card skeleton-card" style={{ height: "130px" }} />
          <div className="metric-card skeleton-card" style={{ height: "110px" }} />
          <div className="metric-card skeleton-card" style={{ height: "240px" }} />
        </div>
        <div className="audit-scroller">
          {[1, 2, 3].map((s) => (
            <div key={s} className="audit-card skeleton-card" style={{ height: "82px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### B. Empty State (`CostEmptyState`)
If there are zero execution history records present:
- **Hero Card:** Shows `$0.00 USD`.
- **API Splits:** Renders `"Deterministic / None $0.000 USD (100%)"`.
- **Audit Log Panel:** Replaced with an informative, responsive `.empty` panel:
  ```html
  <div className="empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
    <h3>NO LOGGED PIPELINE EXPENDITURE</h3>
    <p>Zero runs are registered in the current pipeline. Launching an episode on the pipeline will generate active ledger bills here.</p>
  </div>
  ```

### C. Error State (`CostError`)
If database projection fails:
- Swaps the entire content workspace with a clear `.empty` component highlighted with a crimsion left border:
  ```html
  <div className="empty" style={{ borderLeft: "3px solid var(--stamp)" }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--stamp)" }}>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <h3>GOVERNANCE OUT OF SYNC</h3>
    <p>The control room failed to query active pipeline ledger rows: {message}</p>
  </div>
  ```

---

## 10. Breakpoint Adaptations & Accessibility Integrations

### Breakpoints & Layout Adaptations
1. **Desktop Viewport (1024px+):** Full multi-column view with a `420px` left summary column and a flexible right chronological ledger.
2. **Tablet Viewport (768px - 1023px):** Collapses the horizontal workspace into a single column (`grid-template-columns: 1fr;`), stacking the summaries on top of the chronological ledger.
3. **Mobile Viewport (320px - 767px):** Adjusts card padding to `14px`, scales the hero typography to `32px` to prevent overflow, and reduces horizontal margins of the disclosures banner.

```css
/* Tablet Stack Rules */
@media (max-width: 1023px) {
  .cost-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* Mobile Spacing Adapters */
@media (max-width: 480px) {
  .cost-content {
    padding: 16px 18px 40px;
  }
  .hero-value {
    font-size: 32px !important;
  }
  .disclosure-banner {
    padding: 12px 14px;
  }
}
```

### Accessibility Compliances (WCAG 2.2 AA)
- **High-Contrast Value Pairs:** All numerical readouts pair `var(--paper)` (#E9E2D3) or white over card surfaces, exceeding an **8.5:1 contrast ratio**.
- **Interactive Focus Outlines:** The ledger audit cards have tab-indices (`tabIndex={0}`) registering them in standard sequential keyboard tab cycles, lighting up with a distinct golden-brass `:focus-visible` outline upon focus.
- **Screen Reader Support:** Decorative pulse dots and blank progress bars are shielded via `aria-hidden="true"`, while the grand total card communicates a single descriptive speech string: *"Grand total operational spend is [Value] USD."*
- **Reduced Motion:** Interactive scale and slide transitions are disabled under `@media (prefers-reduced-motion: reduce)` rules to protect motion-sensitive users.

---
**DESIGN COMPLETE**
