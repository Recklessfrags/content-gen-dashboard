# Slice (SCOPING / PROPOSAL) — Character bible auto-draft (+ empty-bible guard as interim)

_Status: **SCOPING — operator-owned, not greenlit** (generation = spend → bucket-3, like 2b visual
gen and E2 guideline auto-fill). Author: Architect (Claude), 2026-07-03, at operator direction
("scope with the auto-gen"). Driving incident: Fine Print's `characters.bible` shipped **all-empty**,
which broke a live Gate-2 render (job #36 parked `exhausted`, wasted LLM spend) — HQ heads-up
2026-07-02._

## 1. The real reason this exists (not semantics)
**Manual authoring is the weak link.** A solo, non-technical operator will not reliably hand-author
dense, structured, required content — a 7-key bible with a `runtime` word-window, register, and legal
rules. Left to a manual step, it gets **skipped or written thin**. The empty bible was the
**predictable** outcome, not a fluke. This is the **same root cause as the flat/generic voices**
(slider one-liners underdelivered until the rich KIT-format description was generated). **Auto-gen's
main purpose is to make complete, good content the default path**, removing the manual bottleneck and
its failure modes. A guard only *catches* the bad state; auto-draft *prevents* it.

## 2. The systemic fix — bible auto-draft (draft → approve → save)
**Generate a first-draft character bible the operator reviews and edits, never auto-committed.**
- **Inputs (already on hand):** the locked register (e.g. "The Honest Demystifier"), the character's
  `voice_recipe` birth certificate, the channel's `channel_profiles` config (`fact_anchor`,
  treatment, engagement posture), and the standing food/channel legal rules. (These are exactly what
  the pipeline used when it hand-drafted Fine Print's bible — proof the inputs are sufficient.)
- **Output:** a full 7-key `characters.bible` draft including a valid `runtime` (parses to a word
  window, e.g. "60–80s vertical, 135–165 spoken words") + register/discipline guidance — i.e. the
  fields the pipeline's `_word_bounds` + system-block reads.
- **Flow:** operator triggers "Draft bible" on the Character surface → draft appears in the bible
  editor → **operator edits + approves + saves** (generative quality = the operator's eye, the
  standing rule; never auto-save). Provenance recorded like `voice_recipe` (what generated it).
- **Guarantee:** pairs with the guard (§3) — auto-draft makes the good state easy; the guard makes
  the bad state impossible. Enforce-then-autofill, not autofill-instead-of-enforce.

## 3. Interim stopgap — the empty-bible guard (`slice-casting-bible-guard.md`)
Ships **first / independently**, and **stays valid after** auto-draft lands (a draft can be skipped,
rejected, or edited to empty). Block voice-lock on an empty/incomplete bible + warn on locked-empty
rows. It's the band-aid until auto-draft exists — not the real fix. Fold into the Phase-2 Character
rebuild (see §6).

## 4. Open decisions (bucket-3 — operator owns; NO spend until greenlit)
Auto-draft needs an **LLM call**, which the dashboard has no sanctioned path for today (casting uses
the ElevenLabs `casting-proxy` edge function; there is no general text-LLM path). Real decisions:
- **D1 — where does generation run + which key? → ARCHITECT RECOMMENDATION: a dashboard-owned
  edge-function generation path** (new proxy à la `casting-proxy`: holds the secret, `verify_jwt`,
  server-clamp, count/day-cap), **NOT** a pipeline-hosted endpoint. Rationale: (a) the bible is
  dashboard-owned content authored in the dashboard — keep trigger→draft→edit→approve→save in one
  place, no cross-team coupling/latency for a daily authoring aid; (b) it's the **same sanctioned
  generation infra E2 and 2b need** — build once, unblock the family; (c) proven pattern already
  exists (`casting-proxy`). _Steelman for the pipeline-endpoint alternative:_ the pipeline owns the
  render-consumed bible format and already drafted one, so its endpoint would guarantee
  compatibility — but it couples our authoring UX to their repo/availability, adds latency, and
  generalizes to nothing. **Capture the compatibility without the coupling:** generate to the
  pipeline's consumed bible format as a **mirrored contract** (already on HQ: Fine Print's authored
  bible + the `_word_bounds` note + the food brief), so the only cross-team ask is a **narrow
  contract-confirm** ("confirm the exact bible fields/shape the worker's script-writer reads"), NOT
  "host generation for us." _(Architecture = Architect's recommendation; spend/provider/key below =
  operator's.)_
- **D2 — provider/model + cost cap** (count-based, never a shared reviews key) — same discipline as
  the 2b provider fork.
- **D3 — boundary:** the dashboard writes `characters.bible` (already owned); **no** unsanctioned
  pipeline-table writes. Draft-then-approve keeps a human in the loop on every write.

## 5. This is one instance of a broader auto-gen theme (for coherence)
Same principle recurs across the tool — worth solving with shared infra, not one-offs:
- **Casting card** (SHIPPED) — chip-builder → rich `voice_description` (solved the generic-voice
  version of this, without an LLM).
- **E1 persona auto-suggest** (SHIPPED) — curated mapping, no spend.
- **E2 guideline auto-fill** (DEFERRED/blocked) — channel `guidelines` from a channel-researcher +
  cast-brief storage.
- **Bible auto-draft** (THIS doc) — character `bible`.
- **2b visual-candidate gen** (DEFERRED) — reference images.
D1's "sanctioned dashboard generation path" decision is **shared** across bible auto-draft, E2, and
2b — deciding it once unblocks the family. Flag for the operator: these are the same infra question.

## 6. Constraints & sequencing
- **D-2 holds** — still a focused control tool; auto-draft is an authoring aid on owned content, not
  new scope-creep. **Operator audition/approve gate** on every generated bible (no programmatic
  quality gate for generative output — the operator's eye is the gate).
- **Review tiers** (`channel-first-review-plan.md`): touches spend (money-ish) + possibly a
  migration (provenance column) + a shared edge function → **Gemini + suerta** (escalate suerta to
  Fable-5 if it lands a migration or the proxy). Live edge-function deploy = gated (HQ heads-up,
  `verify_jwt:true`).
- **Sequencing:** (a) ship the **guard** now/interim (Phase-2 fold or sooner); (b) auto-draft is
  **operator-greenlit bucket-3** — naturally lands in/after the **Phase-2 Character surface** (where
  bible ‖ casting become one flow, structurally attacking the decouple that caused the empty bible);
  (c) resolve D1 once (shared with E2/2b). **Nothing built until the operator greenlights the
  generation path + spend.**

## 7. Open items for the operator
1. Greenlight scoping bible auto-draft as a real roadmap item (this doc) — priority vs E2/2b?
2. **D1 direction is recommended (dashboard edge-proxy generation path — §4).** Operator's part is
   the **bucket-3 spend + provider/model + key** greenlight (same call as the 2b fork). On your go,
   I file the **narrow HQ contract-confirm** (the bible fields/shape the worker reads) — not an ask
   to host generation.
3. Confirm the guard ships as the interim (Phase-2 fold vs sooner standalone).
