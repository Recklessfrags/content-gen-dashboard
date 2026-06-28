# Slice 3 — Read-Only "Overview" Design Specification

**Status: READY FOR IMPLEMENTATION**  
**Author: DESIGNER (Gemini)**  
**Date: June 28, 2026**

---

## 1. Introduction & Layout Justification

### Multi-Column Aggregate Operational Panel
For the read-only **Overview** screen, we specify a **Responsive Multi-Column Summary Grid Layout** that surfaces as a new fourth navigation view inside the Character Control Room. 

This design aggregates operational intelligence across Roster, The Wire, and Runs into a single-page view. It is selected and justified against other layout patterns (such as sequential tabs, modals, or dedicated lists) based on the following UX and technical parameters:

1. **Dashboard-at-a-Glance Mindset:**
   The non-technical founder needs a high-level cockpit view to assess the overall state of the content creation system without clicking through three different tabs and manually counting rows. Putting these aggregates side-by-side provides immediate cross-domain context (e.g., matching character count vs. ideation volume vs. active pipeline spending).
2. **Strict Read-Only Isolation (Inspection Only):**
   This view is dedicated purely to read-only aggregates. By grouping data points into distinct column panels, we prevent cognitive overlap with active workspace controls. There are no input elements, textareas, edit triggers, or status mutators here. It is an operational dashboard that never threatens the read-only integrity of pipeline-owned tables.
3. **Scroll State Isolation & Component Containment:**
   The Overview screen occupies the main workspace area next to the sticky sidebar rail (`.rail`). It implements its own scroll container (`.overview-content` with `overflow-y: auto`), allowing the operator to scan through all aggregate metrics fluidly on narrow screens without shifting the navigation rail or clipping page-level headers.
4. **Zero-Dependency Integration:**
   Rather than introducing heavy third-party charting libraries (which would violate Gate S3-6), this specification achieves rich visual summaries through clever CSS grids, progress bars, and existing semantic elements. All calculations are performed on the client-side utilizing already loaded datasets (`chars`, `ideas`, `episodes`), preventing extra round-trip queries and keeping DB operations extremely token-efficient.

---

## 2. Rail Navigation Item & Icon Design

The Overview screen is reached via a **fourth navigation button** positioned in the sticky rail (`.rail`), placed directly beneath the **Runs** navigation item and before the bottom sign-out spacer.

```
+---------------+
|  CONTROL·ROOM |
|               |
|  [ Roster ]   |
|  [ The Wire ] |
|  [ Runs ]     |
|  [ Overview ]*|  <-- New 4th nav button (active state highlights .dot with --stamp)
|               |
|  [ Exit ]     |
+---------------+
```

### Nav Button Specifications
To ensure visual continuity and compliance with existing interactive behaviors:
1. **Interactive Element:** The navigation button is represented as a `<button>` element with the exact class name `.navbtn`.
2. **Active State Highlight:** When the active view is set to `"overview"`, the button gains the `.on` class, altering its border-color to `var(--line)` and coloring its inner dot to `var(--stamp)` (crimson).
3. **Accessibility Attributes:** To fulfill WCAG 2.2 AA target size and state criteria, the button must include `aria-pressed={view === "overview"}` and have a click target size of exactly `56px x 56px`.
4. **Sequential Focus:** The button must participate in the normal tab flow of the navigation rail, responding immediately to keyboard focus with a high-contrast `:focus-visible` outline.

### Inline SVG Icon Pattern
The existing inline-SVG `Icon` component inside `ControlRoom.tsx` is extended to support `"overview"` by returning a symmetrical, beautifully balanced 4-quadrant grid path that represents dashboard cards:

```tsx
// Extension inside src/components/ControlRoom.tsx -> Icon component
const p = {
  roster: "M4 20v-2a4 4 0 014-4h0M16 14a4 4 0 014 4v2M12 4a4 4 0 100 8 4 4 0 000-8z",
  wire: "M4 6h16M4 12h16M4 18h10",
  runs: "M5 12l4 4 10-10",
  overview: "M4 4h6v6H4V4zm10 0h6v6h-6V4zm-10 10h6v6H4v-6zm10 0h6v6h-6v-6z", // Symmetrical 4-quadrant layout
  exit: "M14 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2M9 12h12m0 0l-3-3m3 3l-3 3",
  clock: "M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
}[name] || "";
```

---

## 3. Overview Layout & Column specifications

The overall screen container utilizes a vertical layout `.overview` that is structured identically to the `.wire` and `.main` column schemas to ensure perfect structural alignment:

```html
<div className="overview">
  {/* VIEW HEADER */}
  <div className="col-head">
    <h2>Overview</h2>
    <span className="count">operations summary</span>
  </div>

  {/* BRIEF CAPTION BAR */}
  <div className="cap">
    <span className="eyebrow">Aggregate operational intelligence across content domains.</span>
  </div>

  {/* MAIN COLUMN WORKSPACE */}
  <div className="overview-content">
    <div className="overview-grid">
      {/* Group columns render here */}
    </div>
  </div>
</div>
```

The `.overview-grid` serves as the primary layout wrapper, dividing the dashboard into **three semantic columns (groups)** on desktop, which gracefully stack on smaller screens.

```
+------------------------------------------------------------------------------------------+
|  OVERVIEW  •  OPERATIONS SUMMARY                                                          |
|  ======================================================================================  |
|                                                                                          |
|  [ COLUMN 1: ROSTER STATS ]    [ COLUMN 2: THE WIRE QUEUE ]   [ COLUMN 3: RUNS PIPELINE ]|
|  +------------------------+    +--------------------------+   +-------------------------+|
|  | TOTAL CHARACTERS   12  |    | TOTAL logged iDEAS   45  |   | TOTAL EPISODES     180  | |
|  | 8 Active · 4 Drafts    |    | 12 backlog · 18 In-Prg   |   | 150 Passed · 30 Failed  | |
|  |                        |    | 15 Used                  |   |                         | |
|  | ROSTER INTEGRITY   67% |    |                          |   | TOTAL PIPELINE SPEND    | |
|  | [===========------]    |    | INSPIRATION FLOW    33%  |   | $1,245.50               | |
|  +------------------------+    | [======----------------]  |   | Avg. Run Cost: $6.92    | |
|                                +--------------------------+   |                         | |
|                                                               | SENTINEL PASS RATE  83% | |
|                                                               | [=================----] | |
|                                                               |                         | |
|                                                               | LAST RUN OPERATED       | |
|                                                               | Jun 28, 2026, 4:15 PM   | |
|                                                               +-------------------------+|
+------------------------------------------------------------------------------------------+
```

### Column 1: Roster Group (Dossier Statistics)
This panel aggregates stats from the `characters` table. It contains two high-impact metric cards:
1. **Total Characters Card:**
   - **Label Eyebrow:** `TOTAL CHARACTERS`
   - **Primary Metric:** `chars.length` (formatted in large Oswald typography).
   - **Supporting Breakdown:** A clean textual list: `[ActiveCount] Active · [DraftCount] Drafts`.
2. **Roster Status Distribution Card:**
   - **Label Eyebrow:** `ROSTER INTEGRITY`
   - **Primary Metric:** Active ratio percentage (e.g., `67%`).
   - **Supporting Breakdown:** A progress-bar track illustrating the split. The filled bar uses the `--cleared` (olive green) token for active manuals, while the track background represents the `--line-soft` border token.

### Column 2: The Wire Group (Inspiration Queue)
This panel aggregates stats from the `ideas` table. It contains two high-impact metric cards:
1. **Total Logged Ideas Card:**
   - **Label Eyebrow:** `TOTAL LOGGED IDEAS`
   - **Primary Metric:** `ideas.length`.
   - **Supporting Breakdown:** Formatted as: `[BacklogCount] Backlog · [ActiveCount] Active · [UsedCount] Used`.
2. **Inspiration Conversion Card:**
   - **Label Eyebrow:** `INSPIRATION CONVERSION`
   - **Primary Metric:** Idea conversion rate (Used ideas as a percentage of total, e.g., `33.3%`).
   - **Supporting Breakdown:** Text detailing actual numbers: `[UsedCount] ideas implemented as runs`. Includes a mini visual progress track colored with `--stamp` (crimson) or `--brass` (amber) depending on activity level.

### Column 3: Pipeline Output & Runs Group (Operational Performance)
This panel aggregates pipeline execution stats from the read-only `episodes` table, representing the founder's production health. It contains four high-impact metric cards:
1. **Total Output Volume Card:**
   - **Label Eyebrow:** `TOTAL PIPELINE RUNS`
   - **Primary Metric:** `episodes.length`.
   - **Supporting Breakdown:** Status distribution breakdown based on final statuses: `[SuccessCount] Cleared · [WarningCount] Warnings · [FailedCount] Failed`.
2. **Financial Overhead Card:**
   - **Label Eyebrow:** `TOTAL OPERATIONAL SPEND`
   - **Primary Metric:** The sum of all episode spend, formatted in standard currency: `$[TotalSpend]`.
   - **Supporting Breakdown:** The calculated average cost per generated episode: `Avg. Cost: $[AvgSpend]/episode`.
3. **Quality Assurance Gate Pass-Rate Card:**
   - **Label Eyebrow:** `SENTINEL PASS RATE`
   - **Primary Metric:** The percentage of episodes whose last recorded sentinel verdict in the JSON array is a success/pass: `[PassRate]%`.
   - **Supporting Breakdown:** The exact pass ratio: `[PassedCount] of [TotalCount] episodes passed fact-checks`. Displays an inline visual meter track utilizing `--cleared` for success and `--line-soft` for outstanding items.
4. **Chronological Freshness Card:**
   - **Label Eyebrow:** `LAST RUN OPERATED`
   - **Primary Metric:** The timestamp of the most recent episode created: formatted localized date (e.g., `Jun 28, 2026` or localized date-string).
   - **Supporting Breakdown:** The metadata of that specific run: `ID: [ID] · [FoodTitle]`.

---

## 4. Component Structure & JSX / TSX Blueprint

The following TSX blueprint maps out the exact aggregate calculations and rendering structures that the Builder will integrate within `ControlRoom.tsx` under the `{view === "overview" && ( ... )}` rendering conditional block:

```tsx
import React, { useMemo } from "react";
import { type Character, type Idea, type Episode } from "@/lib/types";

interface OverviewProps {
  chars: Character[];
  ideas: Idea[];
  episodes: Episode[];
  onRetry?: () => void;
}

export function OverviewDashboard({ chars = [], ideas = [], episodes = [], onRetry }: OverviewProps) {
  
  // ── 1. ROSTER AGGREGATIONS ───────────────────────────────────────────────
  const rosterStats = useMemo(() => {
    const total = chars.length;
    const active = chars.filter((c) => c.status === "active").length;
    const draft = total - active;
    const activeRatio = total > 0 ? Math.round((active / total) * 100) : 0;
    return { total, active, draft, activeRatio };
  }, [chars]);

  // ── 2. THE WIRE AGGREGATIONS ─────────────────────────────────────────────
  const wireStats = useMemo(() => {
    const total = ideas.length;
    const backlog = ideas.filter((i) => i.status === "backlog").length;
    const active = ideas.filter((i) => i.status === "active").length;
    const used = ideas.filter((i) => i.status === "used").length;
    const conversionRate = total > 0 ? Math.round((used / total) * 100) : 0;
    return { total, backlog, active, used, conversionRate };
  }, [ideas]);

  // ── 3. RUNS/PIPELINE AGGREGATIONS ────────────────────────────────────────
  const runsStats = useMemo(() => {
    const total = episodes.length;
    
    // Sum of spend formatted carefully to numeric types
    const totalSpend = episodes.reduce((sum, e) => sum + Number(e.spend || 0), 0);
    const avgSpend = total > 0 ? totalSpend / total : 0;

    // Status mapping matching dashboard filters
    const cleared = episodes.filter((e) => e.status === "success" || e.status === "cleared" || e.status === "approved").length;
    const failed = episodes.filter((e) => e.status === "failed" || e.status === "fail" || e.status === "rejected").length;
    const active = total - cleared - failed;

    // Sentinel Pass Rate computation based on last gate verdict in array
    const passedSentinels = episodes.filter((e) => {
      const gate = e.sentinels?.[e.sentinels.length - 1];
      const verdict = (gate?.verdict || "").toLowerCase();
      return ["pass", "cleared", "approved", "success"].includes(verdict);
    }).length;
    const passRate = total > 0 ? Math.round((passedSentinels / total) * 100) : 0;

    // Chronological freshness check
    const sortedEpisodes = [...episodes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastEpisode = sortedEpisodes[0] ?? null;

    return { total, totalSpend, avgSpend, cleared, failed, active, passRate, passedSentinels, lastEpisode };
  }, [episodes]);

  return (
    <div className="overview" role="region" aria-label="Overview Dashboard">
      
      {/* COLUMN HEAD */}
      <div className="col-head">
        <h2>Overview</h2>
        <span className="count">Operations summary</span>
      </div>

      {/* VIEW DESCRIPTION */}
      <div className="cap">
        <span className="eyebrow">Aggregate operational intelligence across active assets.</span>
      </div>

      {/* AGGREGATE WORKSPACE SCROLLCONTAINER */}
      <div className="overview-content">
        <div className="overview-grid">
          
          {/* ROSTER COLUMN PANEL */}
          <section className="overview-column" aria-labelledby="group-roster-title">
            <div className="overview-column-header">
              <span className="eyebrow">Domain 01</span>
              <h3 id="group-roster-title">Roster Dossier</h3>
            </div>
            
            <div className="overview-cards">
              
              {/* Card 1: Total Characters */}
              <div className="metric-card" tabIndex={0} aria-label={`Total characters: ${rosterStats.total}. ${rosterStats.active} active, ${rosterStats.draft} draft.`}>
                <div className="metric-meta">
                  <span className="metric-eyebrow">TOTAL CHARACTERS</span>
                  <div className="metric-indicator cleared" aria-hidden="true" />
                </div>
                <div className="metric-value">{rosterStats.total}</div>
                <div className="metric-breakdown">
                  <span className="accent-cleared">{rosterStats.active} Active</span>
                  <span className="divider">·</span>
                  <span className="accent-dim">{rosterStats.draft} Drafts</span>
                </div>
              </div>

              {/* Card 2: Roster Integrity (Ratio) */}
              <div className="metric-card" tabIndex={0} aria-label={`Roster integrity: ${rosterStats.activeRatio} percent active characters.`}>
                <div className="metric-meta">
                  <span className="metric-eyebrow">ROSTER INTEGRITY</span>
                  <span className="metric-badge">ACTIVE RATIO</span>
                </div>
                <div className="metric-value">{rosterStats.activeRatio}%</div>
                <div className="metric-breakdown">
                  <div className="progress-container" aria-hidden="true">
                    <div className="progress-bar cleared" style={{ width: `${rosterStats.activeRatio}%` }} />
                  </div>
                  <span className="metric-subtext">Percentage of finalized dossier manuals</span>
                </div>
              </div>

            </div>
          </section>

          {/* THE WIRE COLUMN PANEL */}
          <section className="overview-column" aria-labelledby="group-wire-title">
            <div className="overview-column-header">
              <span className="eyebrow">Domain 02</span>
              <h3 id="group-wire-title">The Wire Queue</h3>
            </div>

            <div className="overview-cards">
              
              {/* Card 1: Total Logged Ideas */}
              <div className="metric-card" tabIndex={0} aria-label={`Total logged ideas: ${wireStats.total}. ${wireStats.backlog} backlog, ${wireStats.active} in progress, ${wireStats.used} used.`}>
                <div className="metric-meta">
                  <span className="metric-eyebrow">TOTAL IDEAS LOGGED</span>
                  <div className="metric-indicator brass" aria-hidden="true" />
                </div>
                <div className="metric-value">{wireStats.total}</div>
                <div className="metric-breakdown">
                  <span className="accent-dim">{wireStats.backlog} Backlog</span>
                  <span className="divider">·</span>
                  <span className="accent-brass">{wireStats.active} In-Prg</span>
                  <span className="divider">·</span>
                  <span className="accent-cleared">{wireStats.used} Used</span>
                </div>
              </div>

              {/* Card 2: Inspiration Conversion */}
              <div className="metric-card" tabIndex={0} aria-label={`Inspiration conversion: ${wireStats.conversionRate} percent of ideas converted.`}>
                <div className="metric-meta">
                  <span className="metric-eyebrow">INSPIRATION CONVERSION</span>
                  <span className="metric-badge">USED RATE</span>
                </div>
                <div className="metric-value">{wireStats.conversionRate}%</div>
                <div className="metric-breakdown">
                  <div className="progress-container" aria-hidden="true">
                    <div className="progress-bar stamp" style={{ width: `${wireStats.conversionRate}%` }} />
                  </div>
                  <span className="metric-subtext">{wireStats.used} ideas written to pipeline runs</span>
                </div>
              </div>

            </div>
          </section>

          {/* RUNS COLUMN PANEL */}
          <section className="overview-column" aria-labelledby="group-runs-title">
            <div className="overview-column-header">
              <span className="eyebrow">Domain 03</span>
              <h3 id="group-runs-title">Runs Pipeline</h3>
            </div>

            <div className="overview-cards">
              
              {/* Card 1: Total Pipeline Runs */}
              <div className="metric-card" tabIndex={0} aria-label={`Total pipeline runs: ${runsStats.total}. ${runsStats.cleared} cleared, ${runsStats.failed} failed, ${runsStats.active} active.`}>
                <div className="metric-meta">
                  <span className="metric-eyebrow">TOTAL PIPELINE RUNS</span>
                  <div className="metric-indicator stamp" aria-hidden="true" />
                </div>
                <div className="metric-value">{runsStats.total}</div>
                <div className="metric-breakdown">
                  <span className="accent-cleared">{runsStats.cleared} Cleared</span>
                  <span className="divider">·</span>
                  <span className="accent-failed">{runsStats.failed} Failed</span>
                  {runsStats.active > 0 && (
                    <>
                      <span className="divider">·</span>
                      <span className="accent-brass">{runsStats.active} Running</span>
                    </>
                  )}
                </div>
              </div>

              {/* Card 2: Financial Overhead */}
              <div className="metric-card" tabIndex={0} aria-label={`Total operational spend: ${runsStats.totalSpend.toFixed(2)} dollars. Average cost per episode is ${runsStats.avgSpend.toFixed(2)} dollars.`}>
                <div className="metric-meta">
                  <span className="metric-eyebrow">TOTAL OPERATIONS SPEND</span>
                  <span className="metric-badge">FINANCIAL OVERHEAD</span>
                </div>
                <div className="metric-value">${runsStats.totalSpend.toFixed(2)}</div>
                <div className="metric-breakdown">
                  <span className="metric-subtext">Avg Cost: <b>${runsStats.avgSpend.toFixed(2)}</b> / episode</span>
                </div>
              </div>

              {/* Card 3: Quality Gate Pass Rate */}
              <div className="metric-card" tabIndex={0} aria-label={`Sentinel pass rate: ${runsStats.passRate} percent.`}>
                <div className="metric-meta">
                  <span className="metric-eyebrow">SENTINEL PASS RATE</span>
                  <span className="metric-badge">QUALITY GATE</span>
                </div>
                <div className="metric-value">{runsStats.passRate}%</div>
                <div className="metric-breakdown">
                  <div className="progress-container" aria-hidden="true">
                    <div className="progress-bar cleared" style={{ width: `${runsStats.passRate}%` }} />
                  </div>
                  <span className="metric-subtext">{runsStats.passedSentinels} of {runsStats.total} passed fact-checks</span>
                </div>
              </div>

              {/* Card 4: Last Run Operated */}
              <div className="metric-card" tabIndex={0} aria-label={runsStats.lastEpisode ? `Last run operated on ${new Date(runsStats.lastEpisode.created_at).toLocaleDateString()}. Subject: ${runsStats.lastEpisode.food}.` : "No runs executed yet."}>
                <div className="metric-meta">
                  <span className="metric-eyebrow">LAST RUN OPERATED</span>
                  <span className="metric-badge">FRESHNESS</span>
                </div>
                {runsStats.lastEpisode ? (
                  <>
                    <div className="metric-value-date">
                      {new Date(runsStats.lastEpisode.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="metric-breakdown">
                      <span className="metric-subtext truncated">
                        ID: <b>{runsStats.lastEpisode.episode_id.slice(0, 8).toUpperCase()}</b> · {runsStats.lastEpisode.food}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="metric-value-date">NO RUNS</div>
                    <div className="metric-breakdown">
                      <span className="metric-subtext">No episodes processed by pipeline</span>
                    </div>
                  </>
                )}
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
```

---

## 5. Visual Layout & CSS Specifications

The Builder must append the following declarations to the bottom of `src/app/globals.css`. These classes reuse the existing token system (`--ink`, `--ink-2`, `--ink-3`, `--line`, `--line-soft`, `--paper`, `--paper-dim`, `--paper-faint`, `--stamp`, `--brass`, `--cleared`) to guarantee absolute aesthetic continuity:

```css
/* ── OVERVIEW READ-ONLY DASHBOARD ── */
.overview {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  background: var(--ink);
}

.overview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 34px 60px;
  display: flex;
  flex-direction: column;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  align-items: start;
}

/* Overview Column Panels */
.overview-column {
  background: var(--ink-2);
  border: 1px solid var(--line-soft);
  border-radius: 4px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0; /* Protect flex columns from breaking on long text */
}

.overview-column-header {
  border-bottom: 1px solid var(--line-soft);
  padding-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-column-header h3 {
  font-family: var(--display);
  font-weight: 600;
  font-size: 19px;
  letter-spacing: .03em;
  text-transform: uppercase;
  margin: 0;
  color: var(--paper);
}

.overview-cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Metric Cards */
.metric-card {
  background: var(--ink-3);
  border: 1px solid var(--line-soft);
  border-radius: 3px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
  cursor: default;
}

/* Gentle inspection feedback on hover and focus */
.metric-card:hover {
  border-color: var(--line);
  background: var(--line-soft);
}

.metric-card:focus-visible {
  outline: 2px solid var(--brass);
  outline-offset: 2px;
  background: var(--line-soft);
  border-color: var(--line);
}

.metric-card:active {
  transform: translateY(1px);
}

.metric-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.metric-eyebrow {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--paper-dim);
}

/* Indicators representing domains */
.metric-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.metric-indicator.cleared { background: var(--cleared); }
.metric-indicator.brass { background: var(--brass); }
.metric-indicator.stamp { background: var(--stamp); }

.metric-badge {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .06em;
  color: var(--paper-faint);
  border: 1px solid var(--line);
  padding: 2px 6px;
  border-radius: 2px;
  background: rgba(21, 24, 30, 0.25);
  text-transform: uppercase;
  flex-shrink: 0;
}

/* Sizing metrics using tabular numbers to prevent jitter */
.metric-value {
  font-family: var(--display);
  font-weight: 700;
  font-size: 32px;
  line-height: 1;
  letter-spacing: .02em;
  color: var(--paper);
  font-feature-settings: "tnum";
}

.metric-value-date {
  font-family: var(--display);
  font-weight: 500;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: .03em;
  color: var(--paper);
  text-transform: uppercase;
}

/* Supporting text breakdown layout */
.metric-breakdown {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--paper-dim);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  line-height: 1.4;
}

.metric-subtext {
  font-size: 11px;
  color: var(--paper-faint);
  line-height: 1.35;
}

.metric-subtext b {
  color: var(--paper-dim);
}

.metric-subtext.truncated {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.divider {
  color: var(--line-soft);
  font-weight: bold;
}

.accent-cleared { color: var(--cleared); }
.accent-brass { color: var(--brass); }
.accent-dim { color: var(--paper-dim); }
.accent-failed { color: var(--stamp); }

/* Progress meters */
.progress-container {
  width: 100%;
  height: 4px;
  background: var(--line-soft);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 2px;
}

.progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1);
}
.progress-bar.cleared { background: var(--cleared); }
.progress-bar.stamp { background: var(--stamp); }
```

---

## 6. Detailed Visual States & Theme Token Mapping

Every component on the Overview board strictly supports its respective lifecycle and interface states:

| UI Element | State | Visual Style & Behavior | Token / Class Mapping |
| --- | --- | --- | --- |
| **Nav Button (`.navbtn`)** | Default | Low-contrast grey text, icon stroke aligned. | `color: var(--paper-dim)` |
| | Hover | Shifts to dark ink background, bright text. | `background: var(--ink-3); color: var(--paper)` |
| | Focus | Sharp golden-brass outer glow. | `:focus-visible { outline: 2px solid var(--brass) }` |
| | Active (Selected) | Locked dark background, hard border, crimson dot. | `background: var(--ink-3); border-color: var(--line); .dot { background: var(--stamp) }` |
| | Disabled | Semitransparent, default pointer. | `opacity: 0.5; cursor: not-allowed` |
| **Metric Card (`.metric-card`)** | Default | Slate background, dark border, tabular typography. | `background: var(--ink-3); border-color: var(--line-soft)` |
| | Hover | Border hardens to medium line, background brightens. | `border-color: var(--line); background: var(--line-soft)` |
| | Focus | Highlighted text, sharp brass focus outline. | `:focus-visible { outline: 2px solid var(--brass) }` |
| | Active (Press) | Shifts down by 1px to provide springy depth. | `transform: translateY(1px)` |
| | Disabled | Dimmed opacity, text remains legible but grayed. | `opacity: 0.45; cursor: not-allowed` |
| | Loading | Smooth animated skeleton screens (pulse effect). | `.skeleton-card { animation: skeletonPulse 1.5s ease-in-out infinite }` |
| | Empty / Zero | Standard placeholder states per column panel. | `.empty { color: var(--paper-faint) }` |
| | Error | Column replaced with warning block & retry CTA. | `.empty { border-left: 3px solid var(--stamp) }` |

### Skeletons for Loading State
When aggregate data is fetching from Supabase (`loading === true`), the dashboard replaces the cards inside `.overview-grid` with skeleton cards to avoid jarring layout shifts:

```tsx
function OverviewSkeleton() {
  return (
    <div className="overview-grid" aria-busy="true" aria-label="Loading aggregations">
      {[1, 2, 3].map((col) => (
        <div key={col} className="overview-column">
          <div className="overview-column-header">
            <div className="skeleton skeleton-eyebrow" />
            <div className="skeleton skeleton-title" />
          </div>
          <div className="overview-cards">
            {[1, 2].map((card) => (
              <div key={card} className="metric-card skeleton-card">
                <div className="skeleton skeleton-label" />
                <div className="skeleton skeleton-value" />
                <div className="skeleton skeleton-text" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

```css
/* ── Skeleton Loading Animations ── */
.skeleton {
  background: linear-gradient(90deg, var(--ink-3) 25%, var(--line-soft) 50%, var(--ink-3) 75%);
  background-size: 200% 100%;
  animation: skeletonPulse 1.5s infinite linear;
  border-radius: 2px;
}

@keyframes skeletonPulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-eyebrow { width: 50px; height: 8px; }
.skeleton-title { width: 120px; height: 16px; margin-top: 4px; }
.skeleton-label { width: 100px; height: 10px; }
.skeleton-value { width: 60px; height: 28px; margin: 8px 0; }
.skeleton-text { width: 140px; height: 10px; }
```

### Empty / Zero States
If any data array contains exactly zero elements (e.g. `chars.length === 0`), the respective column cards render a localized, informative empty state. This maintains responsive proportions without breaking the columns:

* **Empty Characters (Roster):**
  * Displays value `0` for characters.
  * Description reads: *"No characters drafted yet. Go to Roster to draft your first field manual."*
* **Empty Ideas (The Wire):**
  * Displays value `0` for ideas.
  * Description reads: *"The inspiration wire is quiet. Log an idea in The Wire to seed the queue."*
* **Empty Episodes (Runs):**
  * Displays value `0` for runs, `$0.00` for spend, and `0%` pass rate.
  * Description reads: *"Pipeline output pending. Runs initiated by the content pipeline will log here."*

### Error State Handlers
If database connectivity fails (`loadError !== null`), the entire `.overview-content` view renders an immersive error layout utilizing the standard `.empty` styling with a crimson accent border, preventing the operator from seeing broken metrics:

```html
<div className="empty" style={{ borderLeft: "3px solid var(--stamp)" }}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--stamp)" }}>
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
  <h3>AGGREGATES DISCONNECTED</h3>
  <p>The control room lost sync with active tables: {loadError}</p>
  <button className="btn" onClick={onRetry} style={{ marginTop: "12px" }}>
    Re-Establish Connection
  </button>
</div>
```

---

## 7. Breakpoints & Adaptations

The Overview interface adaptively adjusts across all device classes to preserve extreme legibility down to `320px`:

```
+-----------------------------------------------------------------------------------------+
| BREAKPOINTS & LAYOUT RE-ARRANGEMENTS                                                    |
| ======================================================================================= |
|                                                                                         |
| 1. MOBILE (320px - 767px)         2. TABLET (768px - 1023px)      3. DESKTOP (1024px+)  |
|                                                                                         |
|  +----+ +------------------+       +----+ +---------+ +---------+  +----+ +---+ +---+ +---+|
|  |    | | [ ROSTER STATS ] |       |    | |[ROSTER] | |[ WIRE ] |  |    | |RST| |WRE| |RUN| |
|  | R  | | +--------------+ |       | R  | |+-------+| |+-------+|  | R  | |+-+| |+-+| |+-+| |
|  | A  | | | card         | |       | A  | || card  || || card  ||  | A  | || || || || || || |
|  | I  | | +--------------+ |       | I  | |+-------+| |+-------+|  | I  | || || || || || || |
|  | L  | | [ WIRE QUEUE ]  |       | L  | |         | |         |  | L  | |+-+| |+-+| |+-+| |
|  |    | | +--------------+ |       |    | |[ RUNS  | |         |  |    | |   | |   | |   | |
|  |    | | | card         | |       |    | | PIPELN]| |         |  |    | |   | |   | |   | |
|  |    | | +--------------+ |       |    | |+-------+| |         |  |    | |   | |   | |   | |
|  |    | | [ RUNS PIPELN ] |       |    | || card  || |         |  |    | |   | |   | |   | |
|  |    | | +--------------+ |       |    | |+-------+| |         |  |    | |   | |   | |   | |
|  +----+ +------------------+       +----+ +---------+ +---------+  +----+ +---+ +---+ +---+|
|  Stacked Columns (1-Col Grid)      2-Column Grid (Wrap Runs)       Full 3-Column Grid      |
+-----------------------------------------------------------------------------------------+
```

### Breakpoint CSS Directives

```css
/* ── RESPONSIVE ADAPTATIONS ── */

/* 1. Medium Screens / Tablet (max-width: 1024px) */
@media (max-width: 1024px) {
  .overview-grid {
    grid-template-columns: repeat(2, 1fr); /* 2 Columns */
  }
  /* Let the widest operational group (Runs Pipeline) span across both columns for readability */
  .overview-grid .overview-column:last-child {
    grid-column: span 2;
  }
}

/* 2. Narrow Screens / Mobile (max-width: 767px) */
@media (max-width: 767px) {
  .overview-grid {
    grid-template-columns: 1fr; /* Stack columns vertically */
    gap: 18px;
  }
  .overview-grid .overview-column:last-child {
    grid-column: span 1;
  }
  .overview-content {
    padding: 16px 18px 40px; /* Reduce horizontal spacing on mobile edge */
  }
}

/* 3. Extremely Narrow Viewports / Mobile (max-width: 320px) */
@media (max-width: 320px) {
  .rail {
    width: 80px; /* Conserve rail spacing */
  }
  .overview-column {
    padding: 14px; /* Tighten panel spacing */
  }
  .metric-card {
    padding: 12px;
  }
  .metric-value {
    font-size: 26px; /* Scales typography downwards */
  }
}
```

---

## 8. Accessibility (WCAG 2.2 AA) Integration

The read-only Overview board strictly aligns with the highest accessibility baselines, ensuring no operator is excluded:

1. **Compliant Contrast Ratios:**
   - Primary metric numbers (`var(--paper)` on `var(--ink-3)`) exceed an **8.5:1 ratio**.
   - Sub-labels and indicators use `var(--paper-dim)` (#A39A86) which guarantees a solid **4.8:1 ratio** over card backgrounds, passing WCAG 2.2 AA (minimum 4.5:1 requirement) effortlessly.
   - Text colors `.accent-cleared` (`--cleared` / #7E8B53) and `.accent-failed` (`--stamp` / #C8453B) are paired with high-contrast text backing.
2. **Sequential Keyboard Navigation:**
   - Every metric card includes an explicit `tabIndex={0}` attribute. This registers the card inside the keyboard focus loop, allowing keyboard operators to step sequentially (`Tab` / `Shift+Tab`) through each statistic.
   - Active focus is highlighted immediately with a high-visibility golden-brass indicator: `:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px }`.
3. **Screen Reader Semantic Support:**
   - The outer container uses `role="region"` with a clear `aria-label="Overview Dashboard"`.
   - Each column group is represented as a `<section>` tag with an `aria-labelledby` referencing the column heading (`h3` ID), which allows screen readers to announce the current domain when traversing the layout.
   - Cards utilize descriptive, computed `aria-label` strings (e.g., *"Total characters: 12. 8 active, 4 draft."*) so screen readers announce synthesized outcomes rather than disjointed raw text blocks.
   - Purely aesthetic visual elements (dots, progress tracks, and decorative indicators) are isolated using `aria-hidden="true"`.
4. **Target Size Safety Floor:**
   - The new rail navigation item `"Overview"` maintains a tap target area of exactly **`56px x 56px`**, safely exceeding the WCAG 2.2 target size requirement of `>= 24px`.
5. **Reduced-Motion Queries:**
   - The progress-bar loading animations, skeleton pulses, and active card transformations automatically deactivate when the user-agent has enabled reduced-motion rules:
   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation: none !important;
       transition: none !important;
       transform: none !important;
     }
     .progress-bar {
       transition: none !important;
     }
   }
   ```

---

## 9. Verification & Gates Mapping

This design fulfills every criterion specified in the Slice 3 frozen gates contract:

- **Gate S3-1 (View & Summary Cards):** Fulfills this by specifying the fourth nav rail item `"Overview"`, which maps perfectly to standard database attributes.
- **Gate S3-2 (Correct Aggregates):** Fully addressed via precise, clean frontend calculations utilizing `useMemo` hooks over the characters, ideas, and episodes records already stored in client state.
- **Gate S3-3 (Zero Writes):** Fulfills this strictly by specifying no interaction buttons, status toggles, or mutation forms. All metrics are mapped directly to plain HTML semantic markup.
- **Gate S3-4 (Loading / Empty / Error States):** Thoroughly specified in Section 6, providing full loading skeletons, individual column empty states, and standard reload-triggered error layouts.
- **Gate S3-5 (Quality Baseline & Accessibility):** Covered in Sections 7 and 8, detailing WCAG 2.2 contrast compliance, keying keyboard sequential focus, scaling layouts down to 320px, and handling reduced-motion.
- **Gate S3-6 (Build & Setup integrity):** Ensured by relying entirely on the native Next.js + Tailwind/CSS variables system, requiring zero new external packages or schema updates.

---
**DESIGN COMPLETE**
