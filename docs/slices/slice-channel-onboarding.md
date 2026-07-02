# Slice — Channel onboarding auto-fill + on-creation persona auto-suggest (§4.E)

_Status: **DRAFT for operator + Gemini review** (not frozen until approved). Author:
Architect (Claude), 2026-07-02. Scopes roadmap item 5 (`docs/roadmap-dashboard.md`) +
the operator's 2026-07-02 "auto-suggest a Casting-Card persona on channel creation"
sub-ask. Hold on §4.E is treated as **lifted** (its stated precondition — "finish the
voice agent work" — is met: §4.A shipped, PRs #53–#56). Flag if that read is wrong._

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
- **Signal priority** (first confident match wins; **no match → return `null`**, never
  guess): (1) explicit `voice_archetype` free-text keyword; (2) niche keywords across
  `display_name` + `channel` + `treatment` + `fact_anchor`; (3) `null`.
- Emits a `PERSONA_BANK` **chip-id** (so it drops straight into `BuilderSelections`),
  plus a short human `reason` ("matched food/FDA → Wry regulatory insider") for the hint.

### 2.1 Draft curated mapping (DELIVERABLE FOR OPERATOR REDLINE — content, not a blocker)

Seeded from the phrase-bank doc's roster-fit column
(`docs/design/casting-phrase-bank.md` §PERSONA). Operator: this is your taste to redline
(same posture as the phrase bank — "a deliverable to review, not a blocking question").

| Channel signal (lowercased keyword match) | → Persona chip-id |
| --- | --- |
| `voice_archetype` contains "drill" / "sergeant" | `drill-sergeant-historian` |
| `voice_archetype` contains "hype" / "announcer" / "street" | `street-energizer` |
| `voice_archetype` contains "npr" / "calm" / "explainer" | `wry-regulatory-insider` |
| food / fda / `standard_of_identity` / ingredient / snack | `wry-regulatory-insider` |
| animal / nature / wildlife / creature | `hushed-naturalist` |
| crime / mystery / cold case / unsolved | `true-crime-skeptic` |
| history / archival / historical / footnote | `drill-sergeant-historian` |
| wellness / sleep / calm / meditation / mindful | `serene-guide` |
| sport / action / match / game-day | `breathless-announcer` |
| news / briefing / headline | `broadcast-anchor` |
| comedy / absurd / weird / bizarre | `deadpan-absurdist` |
| drama / villain / thriller | `menacing-mastermind` |
| story / campfire / folklore / legend | `campfire-storyteller` |
| grandma / cozy / wholesome / heartwarming | `warm-grandmother` |
| noir / detective / hardboiled | `hardboiled-noir-narrator` |
| late-night / confession / secret | `late-night-confessor` |
| _(no confident match)_ | `null` — show no suggestion |

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
| E1-1 | `suggestPersonaForChannel` is pure/deterministic, returns a valid `PERSONA_BANK` id or `null`; unit-tested across each mapping row + the null path. |
| E1-2 | Every returned id **exists in `PERSONA_BANK`** (guard against bank drift; test asserts membership). |
| E1-3 | Channel create: hint appears once a confident match exists; **no-match → no hint** (not an empty box). |
| E1-4 | Channel edit: hint **recomputes live** as `voice_archetype`/`treatment`/`fact_anchor`/name change. |
| E1-5 | Hint is **advisory**: Save/upsert payload is **byte-identical** with and without the hint shown (zero new writes; intercept-and-verify). |
| E1-6 | States: default (match shown), empty/no-match (hidden), loading (channel list loading → no hint), long persona label (no overflow). |
| E1-7 | Quality floor: responsive 412/1440px, `:focus-visible` if interactive, `prefers-reduced-motion`, WCAG AA contrast; hint is not a focus trap. |
| E1-8 | Build clean (`next build`); **no migration; no new deps; no LLM/network**; no `any`. |
| E1-9 | Reviews: Gemini spec-review folded (pre-build) + Codex build + Gemini + suerta(Opus) review; browser-ratified with the persona hint matching the curated table on the real artifact. |

## 4. Non-happy / edge states (rule 29)

- **No confident match** → render nothing (E1-3). Never a blank/placeholder hint.
- **`voice_archetype` conflicts with niche** → `voice_archetype` wins (explicit intent, §2 priority order). Documented, tested.
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
