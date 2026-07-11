# Slice #2-display — informed fact decision (claim + grounding fact + safe-phrasing)

_Author: Architect (Claude). Status: **BUILD (read-only display).** Problem-solver backlog #2,
split per their ruling: the **display** is read-only (this slice); the **approve action** already
exists in production (`QueueActionDialog` → `buildFactApprovalReenqueue`) and is out of scope here.
Green-lit read-only (reels#88 `4947103615`/`4947222958`). Data verified live. Merge nod from the
problem-solver (owner-delegated) before production._

## Why
The fact-approval dialog today is a **blind confirm** — "Approve the flagged claims for '<food>'"
with no claim detail. The owner rubber-stamps without seeing WHAT he's approving. This slice shows,
for each flagged claim, the **claim + its grounding fact/citation + the safe-phrasing** side by
side, so the call is informed. (Problem-solver: "the exact screen where he'd rule on an ambiguous
claim.") Read-only — it adds display to the existing dialog; the approve button is unchanged.

## Data (verified live — no new schema, no Track-3 dependency)
The parked-at-fact_check episode's **`fact_check` receipt** carries everything (`receipts` where
`stage='fact_check'`, latest `seq`):
- `evidence`: `{red, green, usable, yellow, regulated_yellow: ["c7", …]}` — which claim ids need
  human sign-off.
- `result.claims[]`: each `{ id, claim, status(yellow|red|green), reason, safe_phrasing,
  source:{url,type,citation}, receipt, category_claim, category_claim_note }`.

So claim text · grounding source (`source.citation`/`url`/`type`) · `safe_phrasing` · `reason` are
all present. `reason` IS the "why it parked" string — the same slot a Track-3 borderline-claim
reason will fill (per problem-solver #82 addendum `4946352594`), so no shape change needed later.

## Build (read-only)
1. **`src/lib/factClaims.ts` (+ tests):**
   - `type FactClaimSource = { url: string | null; type: string | null; citation: string | null }`.
   - `type FactClaim = { id: string; claim: string; status: string; reason: string | null;
     safePhrasing: string | null; source: FactClaimSource; receipt: string | null;
     regulated: boolean }`.
   - `parseFactClaims(result: Json, evidence: Json): FactClaim[]` — fail-closed: read
     `result.claims[]` (skip non-objects/those missing `id`+`claim`); `regulated` = id ∈
     `evidence.regulated_yellow[]`. Sort regulated-first, then by id. Empty on malformed.
2. **Loader in `ControlRoom.tsx`** (mirrors `loadRunDiagnostics`): `loadFactClaims(episodeId) →
   { claims: FactClaim[]; error: string | null }` — read-only select of the latest `fact_check`
   receipt (`stage='fact_check'`, order by `seq` desc, limit 1), parse via `parseFactClaims`.
3. **`QueueActionDialog.tsx` — fact action only:** accept an optional `factClaims: FactClaim[] |
   null` + `factClaimsLoading`/`factClaimsError` props. When `action==='fact'`, render a read-only
   **"Claims flagged for your review"** section above the buttons: per claim, a card with the claim
   text, a **grounding** line (`citation` + link to `url` if present), the **safe phrasing** block,
   and the **reason**; mark regulated claims with a badge. No inputs, no new buttons. Existing
   approve/cancel unchanged.
4. **Wire the parent** (wherever the fact dialog opens — `ControlRoom`/`ActionCenter`): call
   `loadFactClaims(job.episode_id)` when the fact dialog opens; pass claims + loading/error down.
   No load for non-fact actions.

## Gates / review
`tsc` · full `vitest` (+ `factClaims` tests) · `next build`. Single cross-vendor (Gemini) review
(read-only). Commit + push to `claude/wire-aurora-home-5b-lleyyg`; problem-solver merge nod before
prod. Mirror governance rule 40 into the dashboard `governance.md` with this slice.

## Explicitly NOT in scope
The approve *action* / any write (pre-existing; #2-approve review is a separate concern), Track-3
borderline-claim routing (waits on Track-3 — the `reason` slot already accommodates it), #3, #1b.
