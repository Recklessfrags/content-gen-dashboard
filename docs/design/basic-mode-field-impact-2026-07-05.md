# Basic/Advanced mode — field-impact rubric (user-seed vs auto-drafted)

_2026-07-05. The operator asked for a **Basic / Advanced** view toggle (Basic = default, holds "the
few things that make the biggest impact"). Two operator rulings fix the criterion:_

1. _**Impact = what the USER fills in that most shapes the output** — because the auto-generation does
   a lot of the work. Basic holds the high-leverage **seeds** the user provides; Advanced holds the
   detailed fields the **auto-gen drafts** and the user only refines._
2. _**Do NOT tier by what's currently wired.** This is a product in active development; a field isn't
   "lesser" because the worker-read isn't hooked up yet, or because one channel/character doesn't use
   it. Tier by intended impact, not present plumbing._

## The criterion (why a field is Basic)

**Basic** = a field the **user must provide** that is a high-leverage **seed** — the creative /
directional input the auto-generation and pipeline build everything else from. **Advanced** = a field
the **auto-gen drafts** (or auto-suggests / sensibly defaults), which the user only reviews or refines.
Not "what's wired today"; not "what this one channel uses" — the intended, durable impact of the input.

## What the auto-gen does (so we know what's a seed vs. a draft)

- **Character bible** → `slice-bible-autogen.md`: "an AI writes a **first draft** of the bible
  (personality, speaking style, length, legal rules); you read it, tweak it, approve it." So the dense
  bible sections are **auto-drafted** — the user's seed is the concept + the few DNA inputs the draft
  can't invent well.
- **Channel guidelines** → `src/lib/channelGuideline.ts` `generateChannelGuidelines` (E2 channel
  researcher): the channel's guideline set is **generated from the concept**. The concept is the seed.
- **Voice archetype** → `suggestPersonaForChannel` (`slice-channel-onboarding.md` E1):
  **auto-suggested** from the profile. Not a required user seed.
- **Voice itself** → Casting Studio: the user actively **casts/generates** the voice (a paid, deliberate
  creative choice) — a seed.

## The split

### Character profile (dossier editor)
| Field | Tier | Why (seed vs auto-drafted) |
|---|---|---|
| Name | **Basic** | user-authored identity; nothing can invent the right name |
| One-line concept | **Basic** | the seed the whole bible draft + script build from |
| Voice & identity | **Basic** | the character's DNA — highest-value thing the user brings; the draft leans on it |
| Gold-standard lines | **Basic** | "the writer imitates these more than any instruction" (field hint) — top user leverage |
| Voice cast | **Basic** | the user deliberately casts/generates the voice (paid creative choice) |
| Cadence & delivery | Advanced | auto-drafted bible section; user refines |
| Vocabulary & catchphrases | Advanced | auto-drafted; user refines |
| Off-limits | Advanced | auto-drafted legal/brand rules; user refines |
| Beat template | Advanced | auto-drafted structure; user refines |
| Runtime target | Advanced | auto-drafted with a sensible default; user refines |
| Visual identity | Advanced | optional; separate casting step |

### Channel profile (setup form)
| Field | Tier | Why (seed vs auto-drafted) |
|---|---|---|
| Channel | **Basic** | required identity / routing key the user names |
| Display name | **Basic** | user-authored channel label |
| Channel concept | **Basic** | the seed that drives guideline auto-generation (`generateChannelGuidelines`) |
| Character | **Basic** | which character the channel's videos star — a directional user choice |
| Style / treatment | Advanced | detail the auto-gen/defaults handle; user refines |
| Fact anchor | Advanced | detail; sensible default |
| Voice archetype | Advanced | **auto-suggested** by `suggestPersonaForChannel`; user can override |
| Fact-check strictness | Advanced | posture dial; default is fine to start |
| Intensity limit | Advanced | posture dial; default is fine to start |
| Footage sources | Advanced | detail; auto/default |
| Platforms | Advanced | detail; default |
| Title style / Thumbnail style | Advanced | packaging detail; auto/default |
| Short length target | Advanced | detail; sensible default |

_Note: tiers reflect intended impact, not current wiring. If a field ever becomes a required user seed
(e.g. the auto-gen can't infer it well), it graduates to Basic here — the rubric follows the input's
role, not the plumbing's state._

## Mechanism (build spec)
- `src/lib/uiMode.ts` — `"basic" | "advanced"`, localStorage-backed, **default `basic`** (mirror of
  `src/lib/theme.ts`: `getStoredMode` / `setStoredMode` / read on mount).
- `UiModeProvider` + `useUiMode()` context, mounted in `AuroraShell.tsx` wrapping `{children}` (the
  dossier editor + channel form are descendants, so they can read it). A segmented **Basic · Advanced**
  control in the header `.header-actions` beside the theme toggle.
- In **Basic**, Advanced fields/sections render behind a per-surface **"Show advanced settings"**
  disclosure (values are never destroyed — Advanced just reveals them; edits persist across the toggle).
- Surfaces gated v1: character dossier editor (`ControlRoom.tsx renderDossierEditor`) + channel form
  (`ChannelProfilesPanel.tsx`). App-wide reach (hiding Production/Cost tabs) is a later, separate call.
