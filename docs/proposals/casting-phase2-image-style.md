# Proposal — Casting phase-2: visual identity (reference image + style)

_Author: Architect (Claude). Status: **PROPOSAL — not ratified, no build yet.** Per the
loop (`AGENTS.md`) and `docs/SESSION-HANDOFF.md` §4.D, a casting phase-2 proposal goes to
HQ for operator + pipeline reaction **before** any build. This is the repo-canonical copy
(rule 1: the repo is the memory); a short HQ page points here for discussion._

## Why

Casting phase-1 gave each character a **voice** (`voice_id` / `voice_settings` via the
`casting-proxy` edge function, bracket→reconcile, per-day usage cap in `casting_usage`).
The brand's production protocol (root HQ "Brand & channel notes") is explicit: **"lock ONE
reference image, animate image-to-video from it, reuse a clip bank, match archival grain,
let the VO carry continuity."** Today nothing in the dashboard authors or stores that locked
reference image — so the single most load-bearing visual asset of a character has no home.
Casting phase-2 closes that gap: give each character a **locked visual identity** — a
reference image plus a short style descriptor — the same way phase-1 gave it a voice.

This also feeds the already-LOCKED **"Character generation flow"** decision (root HQ): agents
propose 3–4 candidate characters as cards the operator picks/remixes. Phase-1 covers their
voice; a visual identity makes those candidates real.

## Scope (proposed phasing — each its own slice, independently reviewed)

- **2a — author + lock a single reference image & style descriptor per character (MVP).**
  Generate or upload one reference image, preview it, **lock** it onto the character, plus a
  short free-text "visual style" note (grain/era/framing). This is the minimum that satisfies
  the brand protocol. Mirrors phase-1's shape: a proxy/edge call for generation, a usage cap,
  a stored result on the character.
- **2b — candidate generation (3–4 options).** Extend 2a into the casting mechanism: generate
  a small set of candidate images, operator picks/remixes one to lock. Ties into the
  "Character generation flow" decision; reuses 2a's storage + the bible's off-limits guardrails.
- **2c — image-to-video preview** is **almost certainly pipeline**, not dashboard (it's
  render/assembly). Out of scope here; flagged for the pipeline to own.

## Open questions (the reason this is a proposal, not a spec)

1. **Image provider.** Two are available to us as MCP tools today: **Gemini image models**
   (handoff §4.D notes they're available) and **Higgsfield** (`generate_image`, plus
   `show_characters` / character-consistency features). Higgsfield is purpose-built for
   consistent character imagery and image→video, which matches the brand protocol better;
   Gemini is the cheaper general option already wired via the shared key. **Recommendation to
   pin after operator input:** Higgsfield for the locked character reference (consistency
   matters most there), with Gemini as a cheap ideation fallback. Needs a verified
   cost/quality check before locking (rule 6).
2. **Where the locked image lives (storage).** `render-assets` is **pipeline-owned + public**
   (per the bucket recipe) — wrong home for dashboard-authored, possibly-iterated character
   art. Proposed: a **new dashboard-owned bucket** (e.g. `character-refs`), owner-scoped RLS,
   mirroring the user-uploads design (D-5). Confirm with pipeline that the worker can read it
   at render (service-role SELECT), same pattern as `channel_profiles`.
3. **Data model on `characters`.** Two options: (a) extend the existing `bible` jsonb with a
   `visual` block (no migration, consistent with how bible fields work), or (b) a dedicated
   `reference_image_url` + `visual_style` column pair (queryable, explicit, mirrors how
   phase-1 added `voice_id`/`voice_settings` as real columns). **Lean (b)** for symmetry with
   phase-1 and so the pipeline can read a stable column, but (a) avoids a migration. Operator/
   pipeline call.
4. **Spend governance.** Image gen costs real credits. Reuse the `casting_usage` per-day-cap
   pattern (a `dash_*` migration extending it, or a sibling table) so phase-2 can't run away.
   Surfaces in the Cost Box later if/when image spend lands in `receipts` (today it would not).
5. **Guardrails.** The same non-negotiables as character generation: advertiser-safe, legally
   clean, **not an identifiable real person or copyrighted character** — baked into the
   generation prompt, not bolted on. (Especially important for image gen.)

## Boundary with the pipeline (must confirm before any build)

- **Dashboard owns:** authoring + locking the character's reference image and style descriptor,
  storing them, and the spend cap on generation. (Character inputs = dashboard's lane, D-2.)
- **Pipeline owns:** consuming the locked reference image at Assembly (image→video, clip bank,
  grain match) and the `render-assets` output bucket. No dashboard change to pipeline tables.

## What this proposal is asking for

1. **Operator:** is phase-2 visual identity the next casting investment (vs. parking it behind
   other backlog)? And a steer on Q1 (provider) and Q3 (data model).
2. **Pipeline:** confirm the storage/ownership boundary (Q2) and that a dashboard-owned
   `character-refs` bucket read via service role at render works for you — same contract shape
   as `channel_profiles`. Flag anything about how Assembly expects to receive the locked image.

**No build starts until this is ratified** (operator GO + pipeline boundary confirm), then it
follows the normal loop: Architect spec → Codex build → independent review (Gemini + Architect)
→ human ratifies/merges, one slice (2a) per PR.
