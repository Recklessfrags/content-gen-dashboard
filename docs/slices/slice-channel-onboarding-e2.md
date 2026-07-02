# Slice — E2: guideline auto-fill editor (§4.E E2) — SCOPING / DECISION doc

_Status: **SCOPING — PARKED (not frozen, not building).** Author: Architect (Claude), 2026-07-02.
**Parked 2026-07-02:** Fork B settled (B2, review-refined) and Fork A narrowed to A-hybrid/A0
(both no-spend), but before a Fork-A ruling the operator stepped back to ask whether the
**dashboard's whole workflow needs redefining/redesigning** — E2 is itself a new workflow surface,
so building it now is premature. This doc + its review trail are preserved; E2 resumes (with a
rule-7 re-audit of the refinements) only after the workflow-definition question is settled and
`DIRECTION.md` is confirmed/updated._
This is the "own scoping slice" that `slice-channel-onboarding.md` §5 promised. It exists to
**settle two forks** so E2 becomes build-ready; it does **not** invent scope beyond roadmap
item 5 (`docs/roadmap-dashboard.md`) / §4.E E2 (rule 15). It ends in **two operator rulings**
(§6). Once ruled, a **frozen build spec** is written from this doc and goes through the normal
gate (Gemini spec-review → Codex → Gemini + suerta → ratify)._

_Reads against: `slice-channel-onboarding.md` (E1 shipped, this is its deferred sibling), the
pipeline **channel-onboarding recipe** (HQ, §C guideline-vs-must-do split), the **FOOD design
brief** (HQ, an example cast brief), `data-contract.md` (`channel_profiles`), and the live
`ChannelProfilesPanel` / `channelProfiles.ts`._

_**Independent review trail (2026-07-02, operator-requested aggressive pushback, rule 17/20):**
both **Gemini (cross-vendor)** and **suerta (Opus)** reviewed the forks neutrally (options
unlabeled + reordered, forced steelman of every option). **Both converged:** Fork A → paste #1,
curated #2, in-dashboard LLM last; Fork B → jsonb #1, discard #2, typed columns last. Two design
refinements folded in from the passes: (1) the paste must be **structured/deterministic**, never
a free-form parse that would smuggle in an LLM; (2) `cast_brief` stores the **3 named fields +
schema_version**, NOT the raw brief (provenance ≠ guideline; avoids split-brain). New option
surfaced: **A-hybrid** (curated defaults for the 7 typed fields + structured paste for the 3)._

---

## 0. What E2 is (60 seconds)

**E2 = a "populate from cast brief" flow on the channel editor.** A **cast brief** (the
channel-researcher's output — audience lean, hook mix, vocab, packaging angle, source ladder,
length, platforms, archetype for a *specific sub-niche*) is turned into **pre-filled GUIDELINE
fields** on a `channel_profiles` row, which the operator **reviews and saves**. It is the
onboarding on-ramp for a new channel: instead of hand-typing every field, the operator starts
from a researched draft and edits.

**Two hard constraints already frozen (do not reopen — rule 18):**
- **GUIDELINE fields only** (recipe §C): archetype, audience lean, hook mix, vocab, packaging
  *style within the gate*, source ladder, length, platforms. Universal **MUST-DOs live in
  pipeline graders/sentinels — never editable dossier text.**
- **Channel-researcher boundary** (recipe, verbatim): operator-invoked, dashboard-side, **never
  a pipeline node, never writes `characters`**, outputs a cast brief; the Casting Studio keeps
  generation/audition/attestation/lock.

**Why it's been blocked:** two things are undecided — **(A)** how the cast brief is *produced*
(the researcher), and **(B)** where the brief / its new guideline fields are *stored*. This doc
resolves both.

---

## 1. The data flow (what E2 actually moves)

```
  [ channel-researcher ]  ──►  cast brief (structured)  ──►  [ editor: review + accept ]  ──►  channel_profiles row
      Fork A: how produced?         Fork B: where stored?                                          (worker reads at job start)
```

The editor half is straightforward dashboard work (a parse → map → review → save flow layered
onto the existing `ChannelProfilesPanel`). **The two forks are the only real decisions.**

### 1.1 Guideline-field inventory — where each brief field can land today

| Guideline field (recipe §C) | `channel_profiles` column today? | Worker reads it today? | Note |
| --- | --- | --- | --- |
| archetype (voice) | `voice_archetype` (text, open vocab) | resolved at job start | maps directly |
| treatment | `treatment` (text CHECK) | yes | maps directly |
| fact_anchor | `fact_anchor` (text CHECK) | yes | maps directly |
| source ladder | `source_ladder` (jsonb array) | yes | maps directly |
| packaging style | `packaging` (jsonb `{title_style,thumbnail_style}`) | **SPEC'D-NOT-BUILT** (recipe §B) | store, badge non-enforcing |
| length target | `length_target` (jsonb `{short_s}`) | yes | maps directly |
| platforms | `platforms` (jsonb array) | yes | maps directly |
| **audience lean** | **none** | **no read path** | NEW guideline field |
| **hook mix** | **none** | **no read path** | NEW guideline field |
| **vocab** | **none** | **no read path** | NEW guideline field |

**Key finding:** ~7 of the ~10 guideline fields already have columns the worker reads. Only
**audience lean, hook mix, vocab** have no home and no worker read path. So Fork B is really
"where do those three (plus the raw brief, if we keep it) live, and does the pipeline consume
them or are they operator-reference-only for now?" — same shape as the engagement dials and
packaging sentinels that ship **stored-but-inert** ahead of the pipeline's read path.

---

## 2. Fork A — how the cast brief is produced

Three shapes, presented even-handedly. The distinguishing axis is **where the research
intelligence lives** and **whether the dashboard spends**.

### A0 · Dumb receiver — operator pastes a **structured** researched brief
The operator runs the research in **whatever tool they choose** (a chat model in a browser, a
doc, their own notes) and **pastes a cast brief** into the editor; the editor maps it into the
guideline fields for review. No in-dashboard model call, **no spend**, no provider dependency.
- **CRITICAL DESIGN CONSTRAINT (both reviewers, independently):** the paste target must be
  **structured, not free-form** — a copy-out prompt the dashboard provides that yields **fixed
  JSON / labeled sections**, parsed **deterministically** (`JSON.parse` against a declared
  schema), **or** the 3 open-vocab fields go into **3 discrete boxes** (no parsing at all). If
  the parser ever needs an LLM to make sense of loose text, that is **no longer A0** — it has
  smuggled A2's spend + dependency in and must go through the gate. Keep the receiver dumb.
- **+** Real research quality (the operator uses any model); **zero dashboard spend / no
  bucket-3**; ships now; **directly mirrors the operator-ratified Casting-2a "dumb receiver"
  decision** (operator generates the asset anywhere, dashboard is the structured receiver +
  lock). No new vendor surface to secure.
- **−** Manual step (copy/paste); the operator must paste in the declared format; research rigor
  is on the operator, not enforced.

### A-hybrid · Curated defaults + structured paste (surfaced by the review — likely the best fit)
Combine A1 and A0: the instant the operator picks **sub-niche + archetype**, a deterministic
mapping pre-fills the **7 already-columned fields** with sensible defaults (where curated tables
are genuinely good — see §1.1); a **structured paste / 3 boxes** captures the **3 homeless
open-vocab fields** (audience lean, hook mix, vocab) + provenance (where curation produces mush).
- **+** Each half plays to its strength — curation for the typed/enum-ish 7, real research for
  the open-vocab 3; still **no spend**; the operator always edits before Save.
- **−** Two input affordances instead of one (slightly more UI); the curated table is still real
  ongoing maintenance for the 7.

### A1 · Curated deterministic — menu → mapping → brief
Extend E1's pattern: the operator picks **sub-niche + archetype** from curated menus; a **pure
mapping** (like `suggestPersona.ts`) emits default guideline values. No LLM, no spend.
- **+** No spend; deterministic/testable; consistent with E1's curated precedent.
- **−** Shallow — a lookup table can't do genuine competitor/audience research for a *novel*
  sub-niche; it only replays what we hand-curated. Curating the table well is real ongoing work.
  Much of E2's promised value (research) isn't delivered.

### A2 · In-dashboard LLM researcher — operator-invoked model call
The dashboard calls an LLM (via an edge-function proxy, like `casting-proxy`) that researches
the sub-niche and returns a structured cast brief.
- **+** Genuine research inside the tool, one click; handles novel niches.
- **−** **Spend + a new provider dependency + a new secured proxy surface + a rate cap to
  design → bucket-3 (rule 20 hard-exit (a): spends money).** Also carries a **provider
  sub-fork** (which model/key) that would itself need the neutral two-pass treatment. Heaviest
  path; not required to unlock E2.

**Recommendation → A-hybrid (or A0 structured-paste if you want one input).** Both independent
reviewers (Gemini + suerta/Opus) ranked **paste #1, curated #2, in-dashboard LLM dead last**,
and both prescribed the structured-paste constraint above. A-hybrid delivers real research on the
3 open-vocab fields + solid defaults on the 7 typed fields, all with **no spend and no provider
fork**, and is the *exact* dumb-receiver pattern the operator already ratified for visual identity
(2a). **A2 is a deferred phase-2** — green-light it only if paste/menu proves insufficient and you
accept the bucket-3 spend + provider sub-fork. **A-hybrid, A0, or A1 all remove the only bucket-3
trigger in E2** (no spend), which is the point of surfacing this.

---

## 3. Fork B — where the cast brief / new guideline fields are stored

The mapped fields that already have columns (§1.1) just fill those columns — no decision there.
The decision is only about **audience lean / hook mix / vocab** and **whether we persist the raw
brief**.

### B1 · Ephemeral — fill existing columns only, drop the rest
Map only the fields with existing columns; discard audience lean / hook mix / vocab and the raw
brief. **No migration, no seam.**
- **+** Zero schema change; nothing inert.
- **−** Throws away ~3 of the recipe's guideline fields — E2 would silently under-deliver §C.
  The research context isn't captured anywhere.

### B2 · One `channel_profiles.cast_brief jsonb` column (RECOMMENDED — operator lean, review-refined)
A single **new** jsonb column (there is **no existing catch-all jsonb column** on
`channel_profiles` — the current jsonb columns are typed slots like `packaging`,
`engagement_posture`; so adding `cast_brief` is **one** migration, after which new *keys inside
it* need no further migration). Existing-column fields still fill their own columns.
- **REVIEW REFINEMENT (both reviewers, independently) — store the 3 fields, NOT the raw brief:**
  `cast_brief` holds the **3 structured homeless fields as named keys** + a **`schema_version`**
  key from day one (stable anchors for the future worker read path — never a schema-less junk
  drawer). The **raw brief text is provenance, not a guideline** — storing it *alongside* the
  extracted fields creates split-brain/stale data (edit a field, the blob contradicts it). So the
  raw brief is **discarded after extraction** (default), or, if provenance is wanted later, goes
  to a **separate side table** — it does **not** get dumped into the operator-authored guideline
  row. `cast_brief` is surfaced with a **"stored — not yet enforced"** badge until the pipeline
  builds a read path (same honest convention as the engagement dials / packaging sentinels).
- **+** Captures the 3 §C guideline fields; **one** `dash_*` migration; forward-compatible;
  precedent-consistent (stored-inert-then-enforced). Gives the pipeline a **versioned, named
  shape to read later** — an HQ heads-up now lets them plan the worker read path.
- **−** A `dash_*` migration with expand/contract choreography + pg_jsonschema shape CHECK + an
  HQ heads-up (it's a shared-surface change even if inert — the worker *will* read it eventually).
  Inert until the pipeline builds enforcement (honest, badged). **Note the A↔B coupling:** if
  Fork A collapses to pure curated (A1), the 3 fields are generic defaults and there's little
  worth storing → B1 (discard) becomes defensible. B2 is right precisely because A-hybrid/A0
  produce *real* research on those 3 fields.

### B3 · Named columns per field — `audience_lean`, `hook_mix`, `vocab`
Add three typed columns instead of a blob.
- **+** Explicit; the worker can read named fields directly.
- **−** Bigger migration now, and **premature** — the worker has no read path for any of these
  yet, so naming their columns commits a shape before the consumer exists. jsonb (B2) defers
  that commitment cheaply and the table already treats structured config as jsonb-on-purpose.

**Recommendation → B2 (single `cast_brief` jsonb column).** One migration, forward-compatible,
matches the table's established jsonb convention and the "store-inert-then-enforce" precedent,
and hands the pipeline a stable shape via an HQ heads-up. **This is a shared-seam change → it
routes to you (rule 20 hard-exit (a): commits architecture another team builds on) and gets the
HQ heads-up + expand/contract + negative contract tests treatment** (`data-contract.md` §5;
roadmap "shared-seam hardening").

---

## 4. What ships once the forks are settled (proposed decomposition)

- **E2a — the auto-fill editor** (buildable immediately after the rulings): a "Populate from
  brief" affordance on `ChannelProfilesPanel` that takes the Fork-A brief source, maps it to the
  form (existing columns + the Fork-B store), and lets the operator review/edit before Save.
  Under **A0/A1 + B2** this is **no-spend, one `dash_*` migration, one HQ heads-up** — a clean
  fresh-session build slice.
- **E2b — the in-dashboard LLM researcher (A2)**: deferred phase-2, its own bucket-3 slice with
  a provider sub-fork; only if you green-light the spend.

This mirrors how E1 shipped the buildable half and honestly parked the LLM half.

---

## 5. Boundaries preserved (rule 15 — no scope drift)

- MUST-DOs stay in pipeline graders/sentinels; the editor only ever touches GUIDELINE fields.
- Any packaging / music-mood UI is labelled **non-enforcing** (recipe §B: SPEC'D-NOT-BUILT).
- The researcher never writes `characters`; the Casting Studio keeps generation/audition/lock.
- Onboarding still produces an **operator-authored** `channel_profiles` row (dashboard CRUD,
  worker read-only) — auto-fill is a *starting draft the operator ratifies*, never an auto-write.
- `channel_profiles` stays operation-global, PK `channel`, no `owner` (unchanged).

## 6. The ruling this doc still needs from you (sharpened; post-review)

**Fork B is settled:** you chose **B2** (single `cast_brief` jsonb column), review-refined to
**3 named fields + `schema_version`, raw brief NOT stored in the guideline row**. Shared-seam →
HQ heads-up + expand/contract before apply (operator-gated).

**Fork A is the open ruling.** Both independent passes rank paste #1, curated #2, LLM last:
1. **A-hybrid** (recommended by the review) — curated defaults pre-fill the 7 typed fields +
   structured paste captures the 3 open-vocab fields. No spend. Best-of-both, slightly more UI.
2. **A0 structured-paste only** — one input; the operator pastes a structured brief (JSON/labeled
   or 3 boxes) that fills everything. No spend. Simplest to build.
3. **A2 in-dashboard LLM** — bucket-3 spend + provider sub-fork; **defer to phase-2** (both
   reviewers ranked it last).

Any of A-hybrid / A0 / A1 keeps E2 **out of bucket-3** (no spend). On your Fork-A pick I freeze
the **E2a** build spec (**A-pick + B2**, a no-spend single-`dash_*`-migration slice) and run it
through the full gate (Gemini spec-review → Codex → Gemini + suerta → ratify). **E2b** (the LLM
researcher, A2) stays a deferred phase-2 unless you green-light the spend.
