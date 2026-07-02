# Slice — Channel onboarding auto-fill + on-creation persona auto-suggest (§4.E)

_Status: **FROZEN for build** (operator resumed 2026-07-02 → build E1; draft §2.1 mapping
shipped as-is — operator may redline the mapping data anytime without touching code;
E1.b carry-into-casting **deferred to phase-2**). Pending Gemini spec-review before Codex
builds. Author: Architect (Claude). Scopes roadmap item 5 (`docs/roadmap-dashboard.md`) +
the operator's 2026-07-02 "auto-suggest a Casting-Card persona on channel creation"
sub-ask. Hold on §4.E treated as **lifted** (precondition "finish the voice agent work"
met: §4.A shipped, PRs #53–#56)._

---

## 0. Why this doc exists / what it is NOT

§4.E as written bundles two very different pieces. This slice **decomposes** them,
builds the concrete one, and honestly parks the underspecified one. It does **not**
invent scope beyond roadmap item 5 (rule 15).

- **E1 — on-creation persona auto-suggest** (THIS slice, buildable now): when the
  operator creates/edits a `channel_profiles` row, suggest the best-fit **Casting-Card
  persona archetype** for that channel, as a **non-binding advisory hint**.
- **E2 — guideline auto-fill editor** (DEFERRED, see §5): auto-populate the channel
  dossier's GUIDELINE fields from a **channel-researcher cast brief**. Blocked —
  the channel-researcher tool isn't built and the cast-brief **storage destination is
  undecided** (roadmap item 5 gap). Not buildable until those are resolved.

## 1. Frozen inputs (already-decided — do not reopen, rule 18)

- **§C guideline-vs-must-do split** (pipeline onboarding recipe, repo-canonical via HQ
  `channel-onboarding-recipe.md`): the editor may parameterize **GUIDELINE** fields
  only (archetype, audience lean, hook mix, vocab, packaging, source ladder, length,
  platforms). Universal **MUST-DOs live in pipeline graders/sentinels — never editable
  dossier text.** Persona is a **casting hint**, not a channel must-do field.
- **Persona bank stays static + curated for v1** (`slice-casting-voice-upgrade.md` §3):
  the LLM `enrich`/"AI-expand" path is **deferred to phase-2** (reason: spend + a new
  dependency). ⇒ **E1's suggestion engine is a deterministic curated mapping, NOT an
  LLM call.** This is the frozen decision that makes E1 no-spend and derivable.
- **Channel-researcher boundary** (recipe, verbatim): operator-invoked, dashboard-side,
  **never a pipeline node, never writes `characters`**, outputs a cast brief; the
  Casting Studio keeps generation/audition/attestation/lock. (Bears on E2, not E1.)
- **`channel_profiles` is operation-global** (`data-contract.md`): PK `channel` (text,
  = `jobs.channel`), no `owner`, `authenticated` full CRUD, worker reads via service
  role. Create + edit share one `upsert(..., {onConflict:"channel"})`
  (`src/lib/channelProfiles.ts`, `src/components/controlroom/ChannelProfilesPanel.tsx`).
- **Casting Card** emits chip-ids: `assembleKitDescription(BuilderSelections)` is pure;
  `builder_state` (chip picks) lives in `characters.voice_recipe`. Persona is one
  single-select slot; **19 curated chips** in `src/lib/castingPhrases.ts` `PERSONA_BANK`.

## 2. E1 — the design (derived, no spend, no migration)

A **pure function** maps a channel row to a persona chip-id:

```
suggestPersonaForChannel(profile: ChannelProfile): { chipId: PersonaId; reason: string } | null
```

- **Deterministic + curated.** No network, no LLM, no persistence. Because it is a pure
  function of the channel's own fields, it is recomputed wherever needed — **no new
  column, no migration.** (Making the suggestion sticky/overridable per-channel would be
  a phase-2 migration; explicitly out of scope here.)
- **One ordered rule list, first match wins** (`null` if none — never guess). The §2.1
  table IS the rule list, evaluated **strictly top-to-bottom**; the first row whose
  keyword hits wins. This makes ties fully deterministic (table order = precedence) and
  subsumes "voice_archetype beats niche": the `voice_archetype` rows are listed first,
  so they win before any niche row is tested. No reliance on object-key iteration order.
- **Word-boundary matching, NOT substring `.includes()`.** Match each keyword as a whole
  token (regex `\b`-delimited, or tokenize the field on non-alphanumerics and compare).
  This prevents the Scunthorpe class of false hits — "tran**sport**" must NOT match
  `sport`, "re**news**" must NOT match `news`. Underscored enum values (`calm_explainer`,
  `standard_of_identity`) tokenize on `_`, so `explainer` and `identity` match cleanly.
- **Null-safe over every field.** `voice_archetype`, `treatment`, `fact_anchor`,
  `display_name`, `character` are all nullable/absent during channel creation. Coerce
  missing→`""` before matching; the function must never throw on a half-filled or empty
  profile (it returns `null`, and the panel shows no hint).
- Emits a `PERSONA_BANK` **chip-id** (so it drops straight into `BuilderSelections`),
  plus a short human `reason` ("matched food / FDA → Wry regulatory insider") for the hint.

### 2.1 Draft curated mapping (DELIVERABLE FOR OPERATOR REDLINE — content, not a blocker)

Seeded from the phrase-bank doc's roster-fit column
(`docs/design/casting-phrase-bank.md` §PERSONA). Operator: this is your taste to redline
(same posture as the phrase bank — "a deliverable to review, not a blocking question").

**Evaluation = strictly top-to-bottom, first whole-token match wins** (§2 rules). The
first three rows inspect **`voice_archetype`** only (explicit voice intent — highest
precedence); the rest inspect the niche fields **`channel` + `display_name` + `treatment`
+ `fact_anchor`**. Keywords match on word boundaries (no bare "calm" — it collided with
both the explainer and wellness rows; use `npr`/`explainer` and `wellness`/`meditation`).

| # | Field(s) inspected | Whole-token keyword | → Persona chip-id |
| --- | --- | --- | --- |
| 1 | `voice_archetype` | drill / sergeant | `drill-sergeant-historian` |
| 2 | `voice_archetype` | hype / announcer / street | `street-energizer` |
| 3 | `voice_archetype` | npr / explainer | `wry-regulatory-insider` |
| 4 | niche | food / fda / identity / ingredient / snack | `wry-regulatory-insider` |
| 5 | niche | animal / nature / wildlife / creature | `hushed-naturalist` |
| 6 | niche | crime / mystery / unsolved | `true-crime-skeptic` |
| 7 | niche | history / archival / historical / footnote | `drill-sergeant-historian` |
| 8 | niche | wellness / sleep / meditation / mindful | `serene-guide` |
| 9 | niche | sport / sports / action / athletics | `breathless-announcer` |
| 10 | niche | news / briefing / headline | `broadcast-anchor` |
| 11 | niche | comedy / absurd / weird / bizarre | `deadpan-absurdist` |
| 12 | niche | drama / villain / thriller | `menacing-mastermind` |
| 13 | niche | story / campfire / folklore / legend | `campfire-storyteller` |
| 14 | niche | grandma / cozy / wholesome / heartwarming | `warm-grandmother` |
| 15 | niche | noir / detective / hardboiled | `hardboiled-noir-narrator` |
| 16 | niche | confession / secret | `late-night-confessor` |
| — | — | _(no row matched)_ | `null` — show no suggestion |

_(Keyword lists are illustrative-extendable; the code holds the authoritative table.
`default`/food channel → `wry-regulatory-insider`, matching the live Fine Print anchor.)_

### 2.2 Where it surfaces (E1 v1 = channel-side hint only)

**In `ChannelProfilesPanel` (create + edit)**, once the channel has enough fields to
match: render a **non-binding advisory chip** below the relevant fields —
> 💡 Suggested casting persona: **"Wry regulatory insider"** — seeds the Casting Card
> when you cast this channel's character. _(matched: food / FDA)_

- Advisory ONLY. **No write to `channel_profiles`** (persona is not a dossier field per
  §C). No effect on Save/upsert. Recomputes live as fields change.
- **Carrying the suggestion into the Casting Card is phase-2** (E1.b): the
  character↔channel link today is loose (`channel_profiles.character` is free text, not
  an FK), so auto-pre-selecting the persona chip in the Casting Studio needs a link
  decision. v1 ships the hint; the operator taps the same chip when casting. Flag in §6.

## 3. Acceptance criteria (frozen once approved — spec every state, rule 29)

| # | Criterion |
| --- | --- |
| E1-1 | `suggestPersonaForChannel` is pure/deterministic, returns a valid `PERSONA_BANK` id or `null`. Unit tests cover: each mapping row; the null/no-match path; **precedence** (a `voice_archetype` row wins over a simultaneously-matching niche row); **within-niche tie** (two niche rows match → the higher-listed row wins, top-to-bottom); **word-boundary negatives** ("transport" !→ `sport`, "renews" !→ `news`); **null-safety** (empty `{}`, and each field individually null/undefined/"" → returns `null`, never throws). |
| E1-2 | Every returned id **exists in `PERSONA_BANK`** (guard against bank drift; test asserts membership for every mapping row). |
| E1-3 | Channel create: hint appears once a confident match exists; **no-match → no hint** (not an empty box). |
| E1-4 | Channel edit: hint **recomputes live** as `voice_archetype`/`treatment`/`fact_anchor`/name change. |
| E1-5 | Hint is **advisory**: Save/upsert payload is **byte-identical** with and without the hint shown (zero new writes; intercept-and-verify). |
| E1-6 | States: default (match shown), empty/no-match (hidden), loading (channel list loading → no hint), long persona label (no overflow). |
| E1-7 | Quality floor: responsive 412/1440px, `:focus-visible` if interactive, `prefers-reduced-motion`, WCAG AA contrast; hint is not a focus trap. |
| E1-8 | Build clean (`next build`); **no migration; no new deps; no LLM/network**; no `any`. |
| E1-9 | Reviews: Gemini spec-review folded (pre-build) + Codex build + Gemini + suerta(Opus) review; browser-ratified with the persona hint matching the curated table on the real artifact. |

## 4. Non-happy / edge states (rule 29)

- **Half-filled / empty profile during creation** → every field coerced missing→`""`; the function returns `null` and never throws; the panel shows no hint (§2 null-safety). This is the default state of a brand-new channel form.
- **No confident match** → render nothing (E1-3). Never a blank/placeholder hint.
- **Conflicting signals** → resolved by strict top-to-bottom row order (§2.1): a `voice_archetype` row (rows 1–3) wins over any niche row; among niche rows, the higher-listed wins. Deterministic, tested (E1-1).
- **Near-miss substrings** ("transport", "renews", "grandmaster") → must NOT match via word-boundary rule; tested as negatives (E1-1).
- **Persona bank id renamed/removed later** → E1-2 test fails loudly (bank is the source of truth).
- **Operator ignores the hint** → zero consequence (advisory; no persistence).

## 5. E2 — DEFERRED (guideline auto-fill editor)

Blocked, not killed. Needs, in order: (a) the **channel-researcher** (operator-invoked,
outputs a cast brief; never writes `characters`) — **not built**; (b) a **cast-brief
storage decision** (roadmap item 5 gap — likely a `channel_profiles` jsonb column ⇒ a
`dash_*` migration + worker-read seam ⇒ HQ heads-up). Until (a)+(b) are resolved, an
auto-fill editor has no source to fill from. Its own scoping slice when the operator
prioritizes it. Any editor UI built later around **packaging / music-mood** sentinels
must be labelled **non-enforcing** (recipe §B: those sentinels are SPEC'D-NOT-BUILT).

## 6. Open items for the operator (sharpened; none block E1's spec)

1. **Redline the §2.1 mapping** (or "ship my draft"). Content review, not a blocker —
   E1 builds against whatever the table says.
2. **E1.b carry-into-casting** (pre-select the persona chip in the Casting Studio for a
   channel-linked character): ship in v1 or defer to phase-2? Default = **defer** (the
   character↔channel link is loose today). 
3. **QA creds** (`RATIFY_EMAIL`/`RATIFY_PASSWORD`) are not in this container — needed for
   the E1-9 browser ratification step at build time.

## 7. Sequencing note (rule 30)

This session authored the frozen-draft spec while the inputs were hot. Given accumulated
context weight, the **build loop (Gemini spec-review → Codex → reviews → ratify) is a
clean fresh-session task** against this frozen spec — recommended handoff point.
