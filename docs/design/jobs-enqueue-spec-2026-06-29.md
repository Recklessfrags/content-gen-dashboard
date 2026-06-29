# Pipeline Jobs & Queue Control Surface Design Specification

**Status: READY FOR BUILDER**  
**Author: DESIGNER (Gemini)**  
**Date: June 29, 2026**  
**Target Audience: Dashboard Builder**  
**Target File Audience:** `src/components/ControlRoom.tsx` & `src/app/globals.css`  
**Core Purpose:** Enable turning captured ideas from The Wire into pipeline jobs, monitoring the in-flight job queue with granular statuses, and approving parked jobs (Spend-Guard approvals) directly within the dossier-noir Control Room dashboard.

---

## Executive Summary & Architectural Alignment

Per the product mandate in `DIRECTION.md` and `docs/contracts/data-contract.md`, the dashboard operates as a focused "cockpit" control surface, not a broad analysis board. The database contract is frozen for pipeline-owned tables (`episodes`, `receipts`), but is open for **`jobs`** which has a specialized Row Level Security (RLS) write contract.

### The `jobs` Database Contract (Authoritative)
The database enforces a strict `INSERT WITH CHECK` RLS security policy for authenticated dashboard clients. The dashboard can **only SELECT** from `jobs` and **INSERT enqueue-only rows**. 
- **The INSERT WITH CHECK Constraints:** 
  - `status` MUST be exactly `'queued'`
  - `attempts` MUST be exactly `0`
  - `episode_cap` MUST be in the range `(0, 50]`
  - All worker-owned fields (`spend`, `episode_id`, `lease_expires_at`, `started_at`, `finished_at`, `error`) MUST be `NULL`.
- **The Dashboard Write Payload:** The dashboard must set *only* the input fields and omit or explicitly write `null`/default values for worker-owned fields to comply with the RLS check.
- **Duplicate Enqueues (Idempotency Lock):** The table enforces unique constraints on `idempotency_key`. Inserting a duplicate key results in a Postgres `409 Conflict` (error code `'23505'`). The dashboard must intercept this error and treat it as a success-ish state ("Already queued" warning toast) rather than a crash or unhandled error.

---

## 1. Enqueue an Idea as a Job

The Wire view displays idea cards (`.icard`). We introduce a new action button labeled **"Queue as run"** to each active idea card on the Wire, opening a Slide-Over form panel.

```
+--------------------------------------------------------------+
| [!] TURN IDEA INTO RUN                                       |
|                                                              |
| TOPIC / FOOD: Aromatic Truffle & Cheese Sourdough (Read-Only) |
| OPERATOR:     Mad Dog (Read-Only Badge)                       |
|                                                              |
| SELECT RECIPE:                                               |
| [ PROVEN RENDER ]      [ FULL EPISODE ]                      |
|                                                              |
| EPISODE CAP: [ 50 ] (Range: 1-50)                            |
|                                                              |
| ANCHOR CITATION: [ Wikipedia - Black Truffles              ] |
| ANCHOR URL:      [ https://en.wikipedia.org/wiki/Truffle  ] |
|                                                              |
| > ADVANCED CONFIGURATIONS (Collapsible)                      |
|   INJECT CLAIMS (JSON Array):  [ []                       ]  |
|   ROUTING CONFIG (JSON Object):[ {}                       ]  |
|   LIVE ADAPTERS (JSON List):   [ null                     ]  |
|                                                              |
| [!] BRAND WARNING: Operator 'Mad Dog' is mapped to 'Dark    |
|     history' channel, but this idea is routed to 'Food'.    |
|                                                              |
| [ CANCEL ]                        [ TRANSMIT ENQUEUE SIGNAL ]|
+--------------------------------------------------------------+
```

### Layout, Trigger & Placement
- **Trigger Button:** Appended inside each `.icard`'s tags/controls area (visible only when the idea is not already "used").
  - **Copy:** `[ Queue as run ]`
  - **Class:** `.statusbtn.enqueue-trigger`
  - **Style:** Compact monospace button matching `.statusbtn` aesthetic. Gutter-aligned.
- **Enqueue Surface:** Opens as a right-hand **Slide-Over Panel** overlaying the Wire view. It reuses the exact layout, transition, and animation profiles of the existing `DrillDownPanel` (`.drilldown-panel`) to maintain visual consistency.
- **Escape Path:** Clickable `← Back` ghost button or clicking outside the panel closes it, returning focus to the trigger button. Supported by the `useFocusTrap` hook to capture focus within the Slide-Over.

### Form Field Specifications

1. **Topic / Food (Read-Only Field):**
   - **Label:** `TOPIC / FOOD` (Eyebrow format)
   - **Pre-filled Value:** `idea.title`
   - **Visual State:** Text input styled with `background: var(--ink-2); border-color: var(--line-soft); color: var(--paper-faint);` and marked `readOnly`/`disabled`.
2. **Character Operator (Read-Only Badge):**
   - **Label:** `ASSIGNED CHARACTER OPERATOR`
   - **Pre-filled Value:** If the idea has a `character_id`, retrieve the character's `codename` (e.g. "Mad Dog") and convert it to a lowercase URL-safe slug: `character.codename.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")`. If no character is assigned, display `"default"`.
   - **Visual State:** Rendered as a `.chip` style badge in a disabled input wrapper.
3. **Recipe Selection (Segmented Control):**
   - **Label:** `EXECUTION RECIPE`
   - **Buttons:** Segmented horizontal control with two options:
     - **"PROVEN RENDER"** (Default for quick/deterministic testing):
       - *Pre-sets:* Sets `stub_upstream = true`, and sets `episode_cap` to `5`.
       - *UI Behavior:* Hides the `Anchor Citation` and `Anchor URL` fields (since rendering uses pre-compiled cached fixtures).
     - **"FULL EPISODE"** (Complete pipeline execution):
       - *Pre-sets:* Sets `stub_upstream = false`, and sets `episode_cap` to `50`.
       - *UI Behavior:* Displays the `Anchor Citation` and `Anchor URL` fields and marks them as **Required** (`*`).
4. **Episode Cap (Numeric Input):**
   - **Label:** `EPISODE RUN CAP`
   - **Input Type:** `<input type="number" min="1" max="50" step="1" />`
   - **Validation:** Must be a integer between `1` and `50`. Shows an inline validation warning if invalid.
5. **Anchor Citation & Anchor URL (Text Inputs):**
   - **Labels:** `ANCHOR CITATION` and `ANCHOR URL`
   - **Requirements:** Hidden under "Proven Render"; required and validated under "Full Episode".
   - **URL Validator:** If URL is provided, verify it starts with `http://` or `https://`.
6. **Advanced Options (Collapsible Disclosure):**
   - Styled using an elegant HTML `<details className="advanced-job-details">` and `<summary>` disclosure element.
   - **Summary text:** `▶ ADVANCED PIPELINE PARAMETERS` (turns to `▼` when expanded).
   - **Inject Claims Input:** Textarea styled as monospace. Pre-filled with `[]`. Expects a JSON array of strings.
   - **Routing Overrides Input:** Textarea styled as monospace. Pre-filled with `{}`. Expects a JSON object.
   - **Live Adapters Input:** Textarea styled as monospace. Pre-filled with `null` (or blank). Expects JSON or null.
   - **Validation:** Live JSON linting. If invalid JSON is typed, the text color changes to `var(--stamp)` (crimson) and submission is disabled.

### Brand-Channel Alignment Warning
The dossier system enforces consistent character-to-channel mappings to protect brand alignment (e.g., "Mad Dog" is mapped to "Dark history" channel and must never produce cooking/food shows).
- **The Rule:** In the pre-submit hook, if the idea's assigned character slug is `"mad-dog"` or `"maddog"`, and the idea's `channel` is NOT `"Dark history"`, trigger a high-visibility warning box.
- **Warning Copy:** 
  `"⚠️ BRAND ALIGNMENT WARNING: Operator 'Mad Dog' is registered under the 'Dark history' channel, but this idea is routed to '[idea.channel]'. Proceed only if declassifying operations."`
- **Aesthetic:** A block with `border: 1px solid var(--brass); background: rgba(201,162,75,.05); color: var(--brass); padding: 12px; margin-bottom: 16px; font-family: var(--mono); font-size: 11px;`.
- **Constraint:** This is a gentle warning; it **does not block** submission.

### Submission Lifecycle & States
Upon clicking **"TRANSMIT ENQUEUE SIGNAL"**:
1. **Idempotency Key Generation:** Generates a unique key based on the recipe and idea ID: `job_${idea.id}_${stub_upstream ? 'proven' : 'full'}_${Date.now()}`.
2. **Database Insert Payload:**
   ```typescript
   const payload = {
     food: idea.title,
     character: characterSlug || "default",
     anchor_citation: stubUpstream ? null : anchorCitation,
     anchor_url: stubUpstream ? null : anchorUrl,
     episode_cap: Number(episodeCap),
     inject_claims: parseJson(injectClaims, []),
     routes: parseJson(routes, {}),
     live_adapters: parseJson(liveAdapters, null),
     stub_upstream: stubUpstream,
     spend_approved: false, // Default false, must approve cost separately
     idempotency_key: idempotencyKey,
     status: "queued", // Required RLS check literal
     attempts: 0,      // Required RLS check literal
     // All worker-owned fields must be null to pass RLS Check
     spend: null,
     episode_id: null,
     lease_expires_at: null,
     started_at: null,
     finished_at: null,
     error: null
   };
   ```
3. **Form Submitting State:**
   - Submit button text changes to `"TRANSMITTING ENQUEUE SIGNAL..."` and displays a spinning radar element.
   - All fields inside the slide-over are marked `disabled`.
4. **Success State:**
   - Triggers standard success toast: `showFlash("✓ Job enqueued successfully in pipeline")`.
   - Closes the slide-over panel.
   - Focus returns to the Wire view.
5. **Postgres 409 (Duplicate Key) Handling:**
   - If the database returns error code `'23505'` (Unique violation on `idempotency_key`), intercept it.
   - Treat as a "success-ish" state. Show warning toast: `showFlash("! Idea already enqueued (Idempotency locked)", false)` (gold indicator).
   - Close the slide-over panel.
6. **Error State:**
   - If a normal database error occurs (e.g. network failure), display red error text at the bottom of the form: `"TRANSMISSION FAILURE: [Database Error message]"`. The form remains open and interactive for retry.

---

## 2. The Run-Queue View

To monitor enqueued jobs, we introduce a new tab in the control room navigation rail labeled **"Queue"**. This tab represents upstream active pipeline processing, whereas the existing "Runs" view represents finished, downstream output.

```
+--------------------------------------------------------------------------------+
|  QUEUE                                                       comms link active |
|  pipeline queue · 3 active jobs                                                |
|  +---------------------------------------------------------------------------+ |
|  | TOPIC: Acoustic Kitty Target Audio Extraction          [ AWAITING HUMAN ] | |
|  | OPERATOR: maddog · CREATED: 10:42 AM                   Attempts: 0/3      | |
|  | SPEND AUTHORIZED: No · [Approve Spend & Continue]                         | |
|  +---------------------------------------------------------------------------+ |
|  | TOPIC: Declassified Area 51 Commissary Menus                [ IN-FLIGHT ] | |
|  | OPERATOR: default · CREATED: 10:35 AM                  Attempts: 1/3      | |
|  | SPEND AUTHORIZED: Yes ($1.42 spent) · [Open Run Detail]                   | |
|  +---------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------+
```

### View Placement & Nav Rail Integration
- **Placement:** Positioned as the **3rd item** on the Left Navigation Rail (between `"The Wire"` and `"Runs"`), as enqueued jobs represent the logical bridge between ideas (Wire) and finished episodes (Runs).
- **Navigation item keys:** `["roster", "wire", "queue", "runs", "overview", "cost"]`
- **Navigation Label:** `"Queue"`
- **Nav Button Class:** `.navbtn` with active status turning the `.dot` into `var(--stamp)`.
- **Nav SVG Icon (clock-ledger aesthetic):**
  ```tsx
  // Path for queue clock-ledger
  queue: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
  ```

### List Layout & Job Cards
- **Ordering:** Jobs fetched from Supabase are ordered newest-first: `.order('created_at', { ascending: false })`.
- **Card Wrapper:** Every job renders in a card with class `.icard.job-card` inside a scrollable `.wire-list` container.
- **Visual Palette Status Badges (The Dossier Theme):**
  - **`queued`** (Waiting for worker): 
    - *Badge:* `[ QUEUED ]`
    - *Style:* Dashed soft-grey border (`border: 1px dashed var(--line-soft); color: var(--paper-faint);`)
  - **`running`** (Active worker processing): 
    - *Badge:* `[ IN-FLIGHT ]`
    - *Style:* Glowing/pulsing amber-brass border (`border: 1px solid var(--brass); color: var(--brass); animation: pulseMuted 1.5s infinite;`)
  - **`done`** (Job finished cleanly): 
    - *Badge:* `[ DONE ]`
    - *Style:* Solid green-forest border (`border: 1px solid var(--cleared); color: var(--cleared);`)
  - **`no_op`** (Job exited with clean no-op): 
    - *Badge:* `[ NO-OP ]`
    - *Style:* Muted dark border (`border: 1px solid var(--line-soft); color: var(--paper-faint);`)
  - **`ready_for_review`** (Pipeline parked - Awaiting human intervention): 
    - *Badge:* `[ AWAITING HUMAN ]`
    - *Style:* High-visibility solid crimson-stamp border (`border: 1px solid var(--stamp); color: var(--stamp); font-weight: bold;`)
  - **`error`** (Pipeline crashed): 
    - *Badge:* `[ SYSTEM FAILURE ]`
    - *Style:* Muted red border with error text (`border: 1px solid var(--stamp-deep); color: var(--stamp);`)
  - **`stale`** (Worker lease expired; stranded job): 
    - *Badge:* `[ STRANDED ]`
    - *Style:* High-visibility flashing amber-brass border (`border: 1px dashed var(--brass); color: var(--brass);`)

### Card Content Details
- **Job Topic (`food`):** Capitalized Oswald header styled as `.title`.
- **Operator Badge:** Displays `character` slug inside a mini-badge `.chip`.
- **Metadata Line:** Displays formatted `created_at` timestamp, and current `attempts` count (e.g. `Attempts: 1/3`).
- **Financial Footprint:** If `spend` is present and `> 0`, render spend explicitly: `Spend: $1.20 USD`.
- **Run Detail Linkage:** If `episode_id` is present on the job card, display a ghost button: `[ Open Run Detail ]` (`.btn.ghost.compact`). Clicking this triggers the existing `openRunDetail(episode_id)` function, opening the `DrillDownPanel` slide-over directly over the Queue view! This creates a tight, highly-functional linkage between jobs and receipts.

### Empty, Loading & Comms Error States
- **Loading:** Render 3 skeleton pulsing cards using `.skeleton` loading class.
  - **Text:** `"Interrogating pipeline database..."` in monospace.
- **Empty:** Render standard `.empty` container:
  - **Heading:** `"The queue is clear"`
  - **Text:** `"No jobs are currently registered in the pipeline. Dispatch a target run from The Wire to engage the worker engines."`
- **Error:** Comms Down banner with detailed Supabase error message and a large `.btn` button to `"Retry Queue Connection"`.

---

## 3. Ready-for-Review Approvals & Actionable States

The primary purpose of the Queue Control Surface is to unblock parked or stranded jobs. Two states are actionable: `ready_for_review` and `stale`.

```
+--------------------------------------------------------------------------------+
|  SPEND PARK DETECTED (Assembly Gate)                                           |
|  This job was parked to prevent runaway credit usage.                          |
|  [ APPROVE SPEND & CONTINUE ]                                                  |
+--------------------------------------------------------------------------------+
|  PUBLISH PARK DETECTED (Distribution Gate)                                     |
|  Awaiting publisher deployment (Pipeline-side only).                           |
|  [ Awaiting publish (pipeline-side) ]                                          |
+--------------------------------------------------------------------------------+
```

### SPEND vs. PUBLISH Park Detection Logic
The pipeline parks jobs in `ready_for_review` for two reasons: a cost safety limit (SPEND park) or a posting approval (PUBLISH park). Because the `jobs` table does not have an explicit park-type column, the dashboard must programmatically deduce the type from the job's last receipt:
1. When a job's status is `'ready_for_review'`, fetch the receipts for the job's `episode_id` ordered by `seq desc` limit 1 (the last receipt).
2. Inspect the latest receipt's **`stage`** column:
   - **SPEND Park:** If the stage is `'assembly'` or `'cost-guard'` (indicating the run was halted by the Assembly cost-guard credit check).
   - **PUBLISH Park:** If the stage is `'distribution'` or `'publish'` (indicating the run is complete but awaiting posting).
3. If no receipts are available or the stage is unrecognized, default to displaying the Spend Park approval mechanism to ensure the user is not stranded.

---

### A. Spend Park Approval: "Approve Spend & Continue"

If a SPEND park is detected, display a primary action button on the Job Card:
- **Button Copy:** `[ Approve spend & continue ]`
- **Button Class:** `.btn` (Crimson background, high priority visual weight).
- **Interaction:** Clicking opens the **Spend Authorization Modal**.

```
+----------------------------------------------------------------------+
|  APPROVE SPEND LIMITS                                       [ ESC ]  |
|                                                                      |
|  You are about to authorize extra-budgetary spend for topic:         |
|  "Aromatic Truffle & Cheese Sourdough"                               |
|                                                                      |
|  This operation will re-enqueue the job with spend_approved=true,     |
|  bypassing the Assembly cost-guard limits. A hard-cap check will     |
|  still protect against absolute runaway loops.                       |
|                                                                      |
|  [ CANCEL ]                              [ AUTHORIZE & CONTINUE ]    |
+----------------------------------------------------------------------+
```

#### Spend Authorization Modal Specs
- **Wrapper Class:** Reuse `.restore-layer` and `.restore-dialog` for dark overlay backdrop and crisp modal placement.
- **Header:** `APPROVE SPEND LIMITS` (Oswald font, bold, uppercase).
- **Border Indicator:** Red indicator border on left side: `border-left: 4px solid var(--stamp);`.
- **Cancel Action:** Closes the modal without action, returning focus to the card.
- **Confirm Action ("AUTHORIZE & CONTINUE"):**
  1. Trigger submitting loading state (button text: `"TRANSMITTING APPROVAL..."`).
  2. **Enqueuing a New Job:** Since the RLS policy forbids updating the existing parked job, the dashboard **inserts a new row** into `jobs` with:
     - All identical input parameters from the parked job (`food`, `character`, `anchor_citation`, `anchor_url`, `episode_cap`, `inject_claims`, `routes`, `live_adapters`, `stub_upstream`).
     - **`spend_approved` set to `true`**
     - `status` set to `'queued'`
     - `attempts` set to `0`
     - `idempotency_key` set to `job_approved_${job.episode_id}_${Date.now()}` (to bypass duplicate checks and force a re-evaluation).
     - All other worker fields explicitly set to `null`.
  3. Upon insert success, trigger success toast: `showFlash("✓ Spend approved. Job re-entered the pipeline.")` and refresh the queue list.

---

### B. Publish Park Display (Read-Only)

If a PUBLISH park is detected, the approval mechanism is pipeline-bound and not yet supported in this UI. 
- **Display:** Display a disabled, muted button on the card.
- **Copy:** `[ Awaiting publish (pipeline-side) ]`
- **Hover Tooltip / Monospace Footnote:** `"Distribution channel approval is currently pipeline-managed. This card is read-only until distribution webhook integration is finalized."`

---

### C. Stale/Stranded Job Affordance: "Re-run Job"

If a job is in a `stale` state (lease expired, worker crash), it represents a stranded run that needs human attention.
- **Visual Alert:** Card border turns dashed amber-brass (`border: 1px dashed var(--brass)`).
- **Sub-label:** ` stranded — needs attention` in monospace gold.
- **Action Button:** `[ Re-run Job ]` (`.btn.ghost.compact`).
- **Interaction:** Clicking triggers a clean re-run by enqueuing a **new copy of the job** with identical input parameters, `status: 'queued'`, `attempts: 0`, a fresh timestamped `idempotency_key`, and worker fields set to `null` to bypass RLS validation.
- **Success Notification:** `showFlash("✓ Stranded job re-queued for execution")`.

---

## 4. Accessibility, Keyboard & Motion Guidelines

We enforce a strict quality floor (WCAG 2.2 AA) to make sure these complex operational actions remain accessible.

### Focus Management & Keyboard Navigation
1. **The Enqueue Slide-Over Loop:**
   - Opening the enqueue slide-over triggers the `useFocusTrap` hook, pinning keyboard focus inside the form.
   - Initial focus lands on the Recipe selection control.
   - Pressing `Escape` closes the form and returns focus directly to the original "Queue as run" trigger button on the Wire idea card.
2. **Spend Authorization Modal Loop:**
   - Opening the modal traps focus.
   - Initial focus lands on the `"CANCEL"` button to prevent accidental keyboard authorization.
   - `Escape` dismisses the modal safely. Closing returns focus to the "Approve spend" button on the job card.
3. **Nav Rail Tabs (`role="tablist"`):**
   - The Queue button is integrated into the vertical tab list. Gaining focus, the operator can cycle through tabs (Roster, The Wire, Queue, Runs, Overview, Cost) using `ArrowUp` and `ArrowDown` keys, hitting `Enter` or `Space` to activate.

### Screen Reader Disclosures
- **Active States:** Nav tab uses `role="tab"` with `aria-selected={view === "queue"}` and `aria-controls="control-room-primary-view-panel"`.
- **Dialogs:** The Enqueue Form and the Spend Modal both use `role="dialog"` or `role="alertdialog"` with `aria-modal="true"`, accompanied by `aria-labelledby` pointing to their respective Oswald headers.
- **Pulsing States:** Pulsing in-flight or loading states use `aria-busy="true"` on their parent elements.

### Reduced Motion Respect
If a user has configured system-level reduced motion (`(prefers-reduced-motion: reduce)`):
- All slide-over translation animations are disabled (`transition: none !important; animation: none !important;`). The panel appears instantly.
- The glowing pulse animation on running `"IN-FLIGHT"` job cards is disabled, falling back to a solid, static amber-brass border.

---

## 5. CSS Extensions & Class Reuse Map

To prevent bloat and maintain the noir/dossier aesthetic, the builder will reuse existing global utility tokens. Below is the CSS extension specification to be added to `src/app/globals.css`.

### Theme Tokens Used
- `var(--ink)` (Dark slate background `#15181E`)
- `var(--ink-2)` (Subtle slate panels `#1C2027`)
- `var(--line)` (Standard borders `#333B45`)
- `var(--line-soft)` (Soft layout lines `#2A313B`)
- `var(--brass)` (Amber warning / accent `#C9A24B`)
- `var(--stamp)` (Crimson error / priority `#C8453B`)
- `var(--cleared)` (Green success `#7E8B53`)
- `var(--display)` (Oswald font family)
- `var(--mono)` (JetBrains Mono font family)

### CSS Classes to Add or Expand in `globals.css`

```css
/* ── PIPELINE QUEUE SURFACES ── */

/* Job Card custom overrides inside lists */
.icard.job-card {
  position: relative;
  transition: transform 0.15s ease, border-color 0.15s ease;
  margin-bottom: 12px;
}

.icard.job-card:hover {
  transform: translateX(2px);
  background: var(--ink-3);
}

/* Status badge bases */
.status-badge {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 2px;
  font-weight: 500;
}

/* Animations for active operations */
@keyframes glowPulse {
  0% { border-color: var(--line-soft); box-shadow: 0 0 0 0 rgba(201, 162, 75, 0); }
  50% { border-color: var(--brass); box-shadow: 0 0 10px 2px rgba(201, 162, 75, 0.15); }
  100% { border-color: var(--line-soft); box-shadow: 0 0 0 0 rgba(201, 162, 75, 0); }
}

.job-card.running-pulse {
  animation: glowPulse 2s infinite ease-in-out;
}

/* Advanced disclosure panel styling */
.advanced-job-details {
  background: var(--ink-3);
  border: 1px solid var(--line-soft);
  border-radius: 3px;
  margin-top: 14px;
  padding: 8px 12px;
}

.advanced-job-details summary {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--paper-dim);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.advanced-job-details summary::-webkit-details-marker {
  display: none;
}

.advanced-job-details[open] summary {
  border-bottom: 1px solid var(--line-soft);
  padding-bottom: 6px;
  margin-bottom: 10px;
  color: var(--paper);
}

/* Warning message block */
.brand-warning-banner {
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.45;
  color: var(--brass);
  background: rgba(201, 162, 75, 0.06);
  border: 1px solid rgba(201, 162, 75, 0.3);
  border-left: 3px solid var(--brass);
  border-radius: 3px;
  padding: 10px 12px;
  margin: 16px 0;
}

/* Compact button classes for lists */
.btn.compact {
  padding: 6px 12px;
  font-size: 11px;
  min-height: 28px;
}

@media (prefers-reduced-motion: reduce) {
  .job-card.running-pulse {
    animation: none !important;
    border-color: var(--brass) !important;
  }
}
```

---

## 6. Implementation Checklist & Verification Map

The builder must complete the following checkpoints to satisfy this specification:

### Phase 1: Database Wiring
- [ ] Extend `src/components/ControlRoom.tsx` state with `view === "queue"`.
- [ ] Formulate safe insert parameters inside the Supabase call, confirming worker-owned fields are omitted/null to pass the RLS policy check.
- [ ] Build the slugifier function to convert codenames cleanly to URL-safe strings: `(name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")`.

### Phase 2: Enqueue Form
- [ ] Inject `"Queue as run"` triggers into Wire active cards.
- [ ] Implement right-hand Slide-Over Panel reusing `.drilldown-panel` classes.
- [ ] Implement Recipe Selector, dynamically setting and hiding input elements.
- [ ] Wire brand-channel validation check for `"Mad Dog"` operator alignment.
- [ ] Implement JSON syntax linting for claim injections and custom routes.
- [ ] Capture unique-violating Postgres 409 database exceptions and handle gracefully.

### Phase 3: Monitoring Queue
- [ ] Integrate `"Queue"` nav rail item as the 3rd tab in the primary rail.
- [ ] Order jobs descending by `created_at`.
- [ ] Render dossier status-badges based on execution state (`queued`, `running`, `done`, `no_op`, `ready_for_review`, `error`, `stale`).
- [ ] Bind `"Open Run Detail"` actions to active job cards, displaying the existing drilldown panel.

### Phase 4: Job Approvals
- [ ] Build the programmatic SPEND vs. PUBLISH park deduction check.
- [ ] Create the Spend Authorization Modal Dialog using `.restore-layer` and `.restore-dialog` wrapper classes.
- [ ] Implement re-enqueuing of authorized spend parameters with `spend_approved: true`.
- [ ] Attach `stale` state handlers, offering `"Re-run Job"` actions for stranded execution threads.
- [ ] Ensure full keyboard trapping (`useFocusTrap`) and screen-reader `aria-*` tags are placed.
- [ ] Verify clean compilation with `npm run build` and zero linter warnings.
