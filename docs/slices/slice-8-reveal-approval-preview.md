# Slice #8 (phase 1) — reveal-approval preview (§8), MOCK read/UI shell

_Author: Architect (Claude). Status: **BUILD (phase 1: mock-only, NO writes).** Problem-solver-
assigned + owner GO'd. Implements the dashboard half of the ratified reveal-approval contract
(`docs/contracts/data-contract.md` → "Reveal-approval contract"; reels#88 ratify `4952962040`).
Phase 1 is the surface exercised against synthetic fixtures — like #3's ReviewHub — so it's drop-in
the instant (a) the pipeline lands the `jobs.reveal_*` columns + a real reveal parks and (b) the
`reveal_approvals` write path is added (phase 2). Merge nod from the problem-solver before prod._

## Why
Every video now parks its risky **reveal** (the "how it's actually made" synthesis line) for the
owner's approve/edit/reject before it renders — the taste-and-control gate on every episode (§8/§11).
§15 makes this surface a **prerequisite** for the whole content-spine rebuild. Phase 1 makes the
surface real-and-exercisable now against mocks; phase 2 wires the real writes when the pipeline's
columns land.

## Phase split (this slice = phase 1 only)
- **Phase 1 (HERE):** read model + the preview UI + mock fixtures + local-only decision state. **No
  supabase writes, no `jobs` write, no `reveal_approvals` table yet.** A disabled "Submit decision"
  affordance marks where the real write lands (mirrors #3's disabled "Save review"). Single-lens
  (Gemini) review — it's a mock/read surface with no write path (like #3).
- **Phase 2 (LATER, separate slice):** the `reveal_approvals` migration + the real `jobs.reveal_*`
  write-back (approve/edit/reject clearing the park). **Two-lens (Gemini + suerta/Opus) + owner GO** —
  that's the render/spend-gating write path. Gated on the pipeline landing `reveal_approved`/
  `reveal_override`/`reveal_rejected` + posting the #88 heads-up.

## Build (phase 1 — mock, read-only)
### 1. `src/lib/revealApproval.ts` (+ `__tests__/revealApproval.test.ts`) — pure, fail-closed
- `export type RevealGrade = "green" | "yellow" | "red";`
- `export type Reveal = { reveal_id: string; reveal_text: string; grade: RevealGrade; reason: string;
  brand_specific: { flagged: boolean; detail?: string }; component_claims: FactClaim[] }` — reuse the
  existing `FactClaim` type from `@/lib/factClaims` for `component_claims` (same shape as the
  `fact_check` receipt claims, per the ratified contract), so the surface reuses the #2-display
  renderer.
- `export function parseRevealAuditorResult(result: unknown): Reveal[]` — fail-closed parse of a
  `reveal_auditor` receipt's `result.reveals[]`: drop any reveal missing `reveal_id`/`reveal_text`,
  coerce `grade` to the 3 allowed values (unknown → `"red"`, the safe/most-conservative default),
  parse `component_claims` via the existing `parseFactClaims` (reuse `isSafeHttpUrl` — an
  untrusted-LLM source url must stay allowlisted). Deterministic, total.
- `export type RevealDecision = { kind: "approve" } | { kind: "edit"; edited_text: string } |
  { kind: "reject"; steer: string }` + a per-reveal decision map helper; `isBatchDecided(reveals,
  decisions)` (every reveal has a decision) — pure.
- `export const MOCK_REVEAL_FIXTURES` — 2–3 synthetic parked episodes `{ id, title, channel,
  reveals: Reveal[] }`, clearly MOCK (no real `episode_id`), at least one multi-reveal batch and one
  YELLOW + one RED example so the UI states are exercised.

### 2. `src/components/aurora/RevealHub.tsx` — the §8 preview surface (`?hub=reveal`)
- Prominent **"MOCK — sample parked reveals (no pipeline data yet)"** banner (like ReviewHub).
- Lists the mock parked episodes; for each **reveal** in a batch render a card:
  - `reveal_text` (the synthesis line, prominent), a **grade chip** (green/yellow/red — reuse existing
    status-chip styling, colour by grade), the `reason`, and a **brand-specific flag** when
    `brand_specific.flagged` (a visible caution — §7).
  - the **grounding**: the `component_claims` rendered via the **shared fact-claim component**
    (`FactClaimsReviewSection` from the #2-display work — reuse, do not re-implement) so the owner
    sees the GREEN claims + citations the reveal rests on.
  - controls: **Approve** · **Edit** (opens a textarea prefilled with `reveal_text`; on save stores an
    `edit` decision locally + a note that "edited reveals re-check grounding before render") ·
    **Reject** (opens an optional steer textarea → `reject` decision). Decisions update **local state
    only**.
- A batch-level **"Submit decisions"** button, **disabled**, labelled *"Approval writes land when a
  real reveal parks and the pipeline columns exist"* (mirrors #3's disabled Save). **No DB write.**
- Empty state (no mock fixtures / none parked) + the standard back affordance.

### 3. `src/lib/route.ts` (+ test) — add the `"reveal"` hub key (mirror `runs`/`review`/`ideas`).
### 4. `ControlRoom.tsx` — a `?hub=reveal` branch rendering `<RevealHub fixtures={MOCK_REVEAL_FIXTURES} …/>`, plus a discoverable entry point (an approvals-context link — e.g. from the Action Center — or a hub link; keep it reachable, do not force it into the 5-item bottom nav).
### 5. aurora.css — scoped `.reveal-hub` styles (reveal card, grade chip colours, edit/reject affordances). Reuse existing tokens; no 393px overflow.

## Gates / review
`tsc` · full `vitest` (+ `revealApproval` + `route` tests) · `next build`. **Single cross-vendor
(Gemini) review** (phase 1 is mock/read-only, no write path — same posture as #3). Commit + push to
`claude/wire-aurora-home-5b-lleyyg`; problem-solver merge nod before prod. **The full two-lens
review is reserved for phase 2** (the real write-back).

## Explicitly NOT in scope (phase 2 / elsewhere)
The `reveal_approvals` migration + table, ANY real `jobs.reveal_*` write, real parked-reveal reads
from supabase, the pipeline's `reveal_auditor`/columns/script-retry, the edit re-check (pipeline
owns), the final Action-Center placement polish.

## States enumerated (rule 29)
- 0 fixtures → mock empty state.
- Batch with 1 reveal vs >1 reveal → each reveal individually decided.
- GREEN / YELLOW / RED grade → correct chip; RED + brand_specific.flagged → caution shown.
- Edit → local edited_text captured, note about re-check shown; Reject → optional steer captured.
- Not all reveals decided → "Submit decisions" stays disabled (and it's disabled regardless in
  phase 1 — mock).
- Malformed `reveal_auditor` result (missing fields / unknown grade / bad claim url) →
  `parseRevealAuditorResult` drops/`red`-defaults/allowlists fail-closed (unit-tested).
