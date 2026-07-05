# Basic/Advanced mode — field-impact rubric (truth-derived)

_2026-07-05. The operator asked for a **Basic / Advanced** view toggle (Basic = default, holds "the
few things that make the biggest impact"), and ruled the split **must be called by truth, not a
judgement call.** This doc derives the split from evidence — what the pipeline actually consumes/
enforces + documented craft leverage — with a citation for every tier. It is the spec the toggle is
built to; it is reproducible from the sources cited, not taste._

## The objective criterion (why a field is Basic)

A field is **Basic** only if it clears the truth test:

1. **Consumed today** — the pipeline (or a live dashboard generator) actually reads it to shape the
   output. A field the worker does not yet act on cannot be "biggest impact" — it is inert.
2. **High documented craft leverage** — the field's own hint / a craft playbook states it materially
   changes the result.
3. **Operator must set it** — no safe default that produces a good result without input.

Everything else is **Advanced**: inert/not-yet-enforced config, safe-defaulted tuning levers,
refinements, or dashboard-only labels. (When pipeline enforcement lands for an inert field, re-tier it
here — the tier follows the truth, so it moves when the truth moves.)

## Truth findings (sources)

- **`channel_profiles` is largely NOT consumed by the worker yet.** "The worker-read of
  `channel_profiles` isn't wired yet… setting a channel to `aggressive` today changes **nothing**…
  inert config until enforcement lands." (HQ, `🟢 channel_profiles — GO … engagement dials
  stored-but-inert`, 2026-06-30.) The engagement dials (`claim_discipline`/`arousal_ceiling` =
  "Fact-check strictness"/"Intensity limit") are **stored, not enforced** (`docs/contracts/
  data-contract.md` L162–164).
- **The worker does NOT read `channel_profiles.character`** ("→ NO, grep-verified" — Coordination Log
  Open-Items tracker). The character a run uses is the **job's** `character` codename, not the profile.
- **The character bible IS consumed by the pipeline script-writer.** "The pipeline **reads** `runtime`
  … the script-writer parses the 'N–M spoken words' target out of it to size the script."
  (`data-contract.md` L51–56.) The bible keys `voice, cadence, vocab, offlimits, lines, beats, runtime`
  feed the script.
- **Casting is consumed.** TTS reads `voice_id`/`voice_settings` (`data-contract.md` L40–44).
- **Gold-standard lines = top craft leverage.** Field hint (source): *"the writer imitates these more
  than any instruction."* (`ControlRoom.tsx` dossier editor.)
- **Concept seeds the dashboard's own guideline auto-generation** (E2 channel-researcher). Field hint:
  *"this seeds guideline auto-generation."* (`ChannelProfilesPanel.tsx`.) → a live dashboard-side
  generator consumes it, so it clears test 1 even though the worker doesn't.

## The split

### Character profile (dossier editor) — the pipeline consumes this
| Field | Tier | Truth basis |
|---|---|---|
| Name (`codename`) | **Basic** | routes the job (worker matches character by verbatim codename, contract L281); identity |
| One-line concept (`concept`) | **Basic** | seeds the script + is the logline the writer reads first (hint) |
| Voice & identity (`bible.voice`) | **Basic** | core character input consumed by the script-writer |
| Gold-standard lines (`bible.lines`) | **Basic** | "imitated more than any instruction" (hint) — highest leverage |
| Voice cast (`voice_id`) | **Basic** | consumed by TTS (contract L44); without it there's no voice |
| Cadence & delivery (`bible.cadence`) | Advanced | consumed but a refinement; safe default (empty) |
| Vocabulary & catchphrases (`bible.vocab`) | Advanced | refinement; safe default |
| Off-limits (`bible.offlimits`) | Advanced | guardrail; empty is safe to start |
| Beat template (`bible.beats`) | Advanced | structural refinement; safe default |
| Runtime target (`bible.runtime`) | Advanced | consumed (sizes script, L54) but has a working default |
| Visual identity (`reference_image_url`/`visual_style`) | Advanced | optional; assembly degrades gracefully when absent |

### Channel profile (setup form) — mostly inert config today
| Field | Tier | Truth basis |
|---|---|---|
| Channel (`channel` PK) | **Basic** | the routing key (`jobs.channel → profile`, contract L292); required identity |
| Display name (`display_name`) | **Basic** | the human label for the channel (identity; low cost to keep) |
| Channel concept (`description`) | **Basic** | seeds the dashboard guideline auto-gen (live generator consumes it) |
| Character (`character`) | **Basic** | which character the channel's runs use (prefilled onto the job) |
| Style / treatment | Advanced | worker-read of `channel_profiles` not wired yet (HQ 2026-06-30) — inert |
| Fact anchor | Advanced | inert until worker-read lands |
| Voice archetype | Advanced | advisory; not consumed yet |
| Fact-check strictness (`claim_discipline`) | Advanced | **stored, not enforced** (contract L162) — changes nothing today |
| Intensity limit (`arousal_ceiling`) | Advanced | **stored, not enforced** (contract L162) — changes nothing today |
| Footage sources (`source_ladder`) | Advanced | current column not yet consumed (worker's new `sourcing` group is a separate, unbuilt column) |
| Platforms | Advanced | not consumed yet |
| Title style / Thumbnail style (`packaging`) | Advanced | not consumed yet |
| Short length target (`length_target`) | Advanced | not consumed yet; safe default |

**Honest gap:** the pipeline repo's `spec-channel-profiles-contract.md` (not in this repo) defines the
*future* consumption of the channel fields once worker-read + ADR-005 land. When that ships (HQ will
post), several channel fields graduate from inert → consumed and should be re-tiered here. Until then,
truth = inert = Advanced.

## Mechanism (build spec)
- `src/lib/uiMode.ts` — `"basic" | "advanced"`, localStorage-backed, **default `basic`** (mirror of
  `src/lib/theme.ts`).
- A segmented **Basic · Advanced** control in the Aurora header `.header-actions` beside the theme
  toggle (`AuroraShell.tsx`), provided to surfaces via a small context/hook.
- In Basic mode, Advanced fields/sections are hidden behind a per-surface **"Show advanced settings"**
  disclosure (never destroyed — the values persist; Advanced just reveals them).
- Surfaces gated: the character dossier editor (`ControlRoom.tsx renderDossierEditor`) and the channel
  form (`ChannelProfilesPanel.tsx`). Optional: hide the advanced workspace tabs (Production/Cost) in
  Basic — deferred pending operator call on app-wide reach.
