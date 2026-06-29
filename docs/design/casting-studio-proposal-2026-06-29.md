# Proposal: Character Casting Studio & Live Voice Synthesis Spec

**Status: PROPOSAL FOR HQ SIGN-OFF**  
**Author: DESIGNER (Gemini)**  
**Date: June 29, 2026**  
**Target Audience: Core Pipeline Team & Front-End Builder**  
**Target File Audience:** `src/components/ControlRoom.tsx`, `src/lib/database.types.ts` & `src/app/globals.css`  
**Core Purpose:** Propose the UX layout, database contract write paths, and ElevenLabs API proxy integration for a high-fidelity "Casting Studio" and live TTS control surface integrated directly inside the dossier-noir character Roster view.

---

## Executive Summary & Architectural Alignment

Per the product directives in `DIRECTION.md` and the pipeline contracts in `docs/contracts/data-contract.md`, characters are mapped directly to a dedicated **Channel** (e.g. "Dark history", "Food", "Animals"), acting as the brand anchor for that channel's automated episode runs. A channel's automated production queue cannot safely start running until its assigned Character has been **Cast & Locked**—meaning a permanent ElevenLabs Voice ID and optimized TTS parameters are committed and validated.

This proposal defines the complete visual layout and operational flow of the **Casting Studio** which lives as a secondary sub-view of the character dossier. It distinguishes between:
1. **Voice Design (Timbre - Paid Re-Cast):** Modifying the underlying physical qualities of the voice (grit, age, gender, menace, bombast) to create a custom voice footprint via ElevenLabs `POST /v1/text-to-voice/design`. This action consumes credits, generates distinct candidates, and updates the permanent `voice_id` column.
2. **Synthesis Control (Live Knobs - Free):** Fine-tuning standard ElevenLabs TTS options (stability, similarity boost, style, speed) applied live on every episode generation. This is zero-credit, instantaneous, and writes to the `voice_settings` jsonb column.

```
                  +----------------------------------------+
                  |            CHARACTERS TABLE            |
                  +----------------------------------------+
                  | id | codename | bible (jsonb) | ...    |
                  +----------------------------------------+
                               /              \
         (Full Re-Cast; Costly)              (Live Sliders; Free)
         Writes ElevenLabs Voice ID          Writes TTS Parameters
                             /                  \
                            v                    v
                   +---------------+      +----------------------+
                   | voice_id (str)|      | voice_settings(jsonb)|
                   +---------------+      +----------------------+
```

---

## 1. Entry, Placement & Mandatory Casting Discipline

The Casting Studio lives inside the **Roster view** (`view === "roster"`) as a secondary sub-panel directly parallel to the existing **Dossier Manual** text fields.

### Layout & Toggle Integration
When an operator selects a character from the roster aside panel, the main workspace panel `<section className="dossier">` renders. Below the character header block (which contains the Codename, Concept, and Status badges), we introduce a primary segmented **Sub-Tablist Switcher**:

```
+───────────────────────────────────────────────────────────────+
| FILE · A1B2C3D4              [ HISTORY ]   ● ACTIVE FIELD MANUAL |
|                                                               |
| # MAD DOG                                                     |
| Concept: Dark history grit narrative operator.                |
|                                                               |
| +───────────────────────────────────────────────────────────+ |
| | [ DOSSIER MANUAL ]          [ VOICE & CASTING STUDIO * ]  | |
| +───────────────────────────────────────────────────────────+ |
|                                                               |
| ( Active View: VOICE & CASTING STUDIO )                       |
|                                                               |
+───────────────────────────────────────────────────────────────+
```

### Exact Microcopy & Classes
- **Tab Wrapper:** `<div className="dossier-subtabs" role="tablist" aria-label="Character editor views">`
- **Tab 1 Trigger:** `<button className="subtab-btn on" role="tab" aria-selected="true" ...>`
  - **Copy:** `DOSSIER MANUAL`
- **Tab 2 Trigger:** `<button className="subtab-btn" role="tab" aria-selected="false" ...>`
  - **Copy:** `VOICE & CASTING STUDIO` (Displays an asterisk `*` if casting is in an uncast, draft, or dirty state).

### Cast & Lock Badges
A character’s voice footprint goes through two distinct lifecycle states on the dashboard:
1. **UNCAST / UNLOCKED (State A):**
   - **Trigger:** `voice_id` is `null` OR the manual lock state is open.
   - **Aesthetic:** A highlighted high-visibility badge in the character header block with `border: 1px dashed var(--brass); background: rgba(201,162,75,.05); color: var(--brass);`.
   - **Microcopy:** `⚠️ CASTING PENDING — NOT PRODUCTION READY`
   - **Dashboard Discipline Warning:** If an operator attempts to queue an idea for a character with an uncast status, the Queue Form panel in "The Wire" displays a hard, red-bordered warning:  
     `"🛑 PIPELINE BLOCKED: Operator '[CODENAME]' is assigned to the '[CHANNEL]' channel, but has not completed Voice Casting. You must Cast & Lock their voice in the Roster before transmitting enqueue signals."`
2. **CAST & LOCKED (State B):**
   - **Trigger:** `voice_id` is a valid string, and the operator has clicked the "LOCK VOICE CAST" button.
   - **Aesthetic:** Clean, high-contrast, stamped green badge with `border: 1px solid var(--cleared); color: var(--cleared); background: rgba(126,139,83,.05);`.
   - **Microcopy:** `🔒 VOICE CAST LOCKED — PRODUCTION READY`

---

## 2. Voice Design (Re-Cast) Flow

To cast a voice from scratch or completely redesign the voice's physical timbre, operators use **Voice Design**. This operation triggers a paid synthesis request via the ElevenLabs Voice Design API.

### The Timbre Control Interface
When in Voice Casting mode, the studio displays four physical **Design-Prompt Sliders**. These controls compose an expressive description which is dispatched to the generative voice-design endpoint.

```
+───────────────────────────────────────────────────────────────+
| [!] VOICE TIMBRE DESIGN (RE-CAST DISPATCHER)                  |
|                                                               |
| TIMBRE SLIDERS:                                               |
| GRIT:      [========|========] (50% / Neutral Texture)         |
| AGE:       [==============|==] (85% / Deep Mature Elder)      |
| MENACE:    [=====|===========] (30% / Cheerful & Friendly)     |
| BOMBAST:   [==|==============] (10% / Intimate Whispering)     |
|                                                               |
| GENERATED DESCRIPTION SENT TO API:                            |
| "An intimate whispering mature elder voice with deep age and    |
| a neutral texture, possessing a highly cheerful tone."        |
|                                                               |
| AUDITION SAMPLE SCRIPT (100-1000 chars required):              |
| +───────────────────────────────────────────────────────────+ |
| | "Welcome back to Dark history. Today we declassify..."     | |
| +───────────────────────────────────────────────────────────+ |
|                                                               |
| [!] SYSTEM CHARGE DISCLOSURE: Generative Design will charge  |
|     1,500 ElevenLabs credits per dispatch.                    |
|                                                               |
|                     [ TRANSMIT GENERATIVE DESIGN SIGNAL ]     |
+───────────────────────────────────────────────────────────────+
```

### Form Fields & Slider Logic
1. **Grit Slider (`grit`):**
   - **Range:** `0%` to `100%` (continuous slider).
   - **Descriptors Mapping:** `0%-25%` = `"extremely smooth and clear"`, `26%-45%` = `"clean"`, `46%-55%` = `"neutral texture"`, `56%-75%` = `"husky"`, `76%-100%` = `"highly gritty and rough"`.
2. **Age Slider (`age`):**
   - **Range:** `0%` to `100%`.
   - **Descriptors Mapping:** `0%-15%` = `"young child"`, `16%-35%` = `"youthful"`, `36%-60%` = `"middle-aged"`, `61%-80%` = `"mature"`, `81%-100%` = `"deep mature elder"`.
3. **Comedy ↔ Menace Slider (`menace`):**
   - **Range:** `0%` to `100%`.
   - **Descriptors Mapping:** `0%-20%` = `"highly cheerful and comedic"`, `21%-40%` = `"warm and friendly"`, `41%-60%` = `"neutral"`, `61%-80%` = `"somber and stern"`, `81%-100%` = `"intensely dark, menacing, and cold"`.
4. **Bombast Slider (`bombast`):**
   - **Range:** `0%` to `100%`.
   - **Descriptors Mapping:** `0%-20%` = `"intimate whispering"`, `21%-45%` = `"subdued and quiet"`, `46%-65%` = `"conversational"`, `66%-85%` = `"projected and theatrical"`, `81%-100%` = `"bombastic, loud, and dramatic"`.

### Composing the Voice Description
As sliders are moved, a reactive script concatenates these selected descriptors into a natural language prompt string (`voice_description`), satisfying the ElevenLabs `/v1/text-to-voice/design` API parameters.

**Concat Pattern:**  
`"A [BOMBAST] [AGE] voice with [GRIT] and [MENACE]."`

### The Dispatch and Preview Lifecycle
1. **Audition Sample Script Textarea:**
   - Prefilled with the character's first "Gold-standard line" from the dossier (`bible.lines` parse), fallback to a generic channel-relevant intro string.
   - Character count validation: Must be between `100` and `1000` characters. Shows active character counter.
2. **Credit Warn Badge:** High visibility warning directly above dispatch trigger:  
   `"⚠️ CREDIT TRANSACTION WARNING: Triggering Generative Design will immediately spend ~1,500 ElevenLabs credits from the unified API quota. Ensure slider parameters are tightly audited before dispatching."`
3. **Submission State:**
   - Button turns to `"GENERATING AUDITION CLIPS... (SPENDING CREDITS)"` with an active loader spinner.
   - All sliders and textareas lock (`disabled`).
4. **Failure State:**
   - Displays error block below the dispatch bar: `"DESIGN TIMEOUT: ElevenLabs reported credit exhaustion or API rate limiting. Retry in 60s."` in `var(--stamp)`.

---

## 3. The Tournament Selection & Casting Bracket

Generative design produces up to four unique audio voice samples based on the slider state. Because ElevenLabs voices are random on design, operators must compare them head-to-head. We propose a client-side **Casting Tournament Bracket**.

```
+───────────────────────────────────────────────────────────────+
| ⚔️ ACTIVE CASTING TOURNAMENT BRACKET                           |
|                                                               |
| CANDIDATE A (DESIGN 1)               CANDIDATE B (DESIGN 2)   |
| SLIDERS: G:50% A:85% M:30% B:10%     SLIDERS: G:50% A:85% M:30% B:10% |
| STAMP: #173-Alpha                    STAMP: #173-Beta         |
| [ ▶ PLAY AUDITION ]                  [ ▶ PLAY AUDITION ]      |
|                                                               |
| [ KEEP FORWARD ]  [ DISCARD ]        [ PROMOTE TO WINNER 🏆 ]  |
+───────────────────────────────────────────────────────────────+
```

### Tournament Selection Logic & Mechanics
- **Head-to-Head Comparison:** Displays generated candidates in side-by-side card slots (`Candidate A` vs `Candidate B`).
- **Interactive Controls:**
  - **`[ ▶ PLAY AUDITION ]`**: Triggers local HTML5 audio playback of the binary preview returned from ElevenLabs. Replaced with standard pause/reset controls.
  - **`[ KEEP FORWARD ]`**: Pin/carry forward a candidate. It remains in its current slot while the operator generates a brand new batch of candidates to challenge it in the opposite slot.
  - **`[ DISCARD ]`**: Erases the candidate, opening up the bracket slot for replacement.
  - **`[ PROMOTE TO WINNER 🏆 ]`**: The active operator selects this candidate as the permanent voice of the Character.
- **Winner Selection Payload & Save Path:**
  Selecting a winner triggers a direct API call to ElevenLabs `/v1/text-to-voice/create` to save the temporary generated sample as a permanent custom voice in the ElevenLabs voice library.
  - **Response:** Returns `generated_voice_id` (string).
  - **Database Write:** Updates the local character model, setting `voice_id` to `generated_voice_id`, and sets the status to "locked".

### Bracket State & Persistence (Open Question FLAG)
- **Problem:** Where does this active tournament state live? Multiple generated clips must remain playable while the operator compares. If the operator closes the browser, is the bracket lost?
- **Proposals & State Modeling:**
  1. **Option A (Zero Schema Change - Recommended for V1):** Store candidate bracket metadata and base64-encoded audio clips directly inside `localStorage`. Keep it 100% dashboard-side.
  2. **Option B (Database Persistence):** Add a lightweight dashboard-owned sibling table `character_casting_candidates` containing `id`, `character_id`, `slider_settings` (jsonb), and `audio_url` (Supabase Storage URI).
  - **HQ Sign-off Flag:** We have designated this as a primary open question in Section 6.

---

## 4. Live Synthesis Sliders

Once a physical voice is selected, operators do **not** need to spend credits or re-cast to tweak the operational delivery settings. We expose the **Live Synthesis Sliders**. These settings are read live by the text-to-speech pipeline and can be changed on-the-fly.

```
+───────────────────────────────────────────────────────────────+
| ⚙️ LIVE SYNTHESIS DELIVERY SLIDERS                            |
| (ZERO COST · LIVE PIPELINE UPDATES)                          |
|                                                               |
| STABILITY:         [==========|==========] (50% - Standard)   |
| SIMILARITY BOOST:  [==============|======] (75% - High fidelity)|
| STYLE EXAGGERATION:[====|────────────────] (20% - Natural)     |
| SPEAKERS BOOST:    [ ON ] (Enables ultra-clear noise gate)    |
| SPEED STRETCH:     [==========|==========] (1.00x - Normal)   |
|                                                               |
| [!] These sliders do NOT spend credits. Tuning applies        |
|     instantaneously on the next automated run.                |
+───────────────────────────────────────────────────────────────+
```

### Live Sliders Specifications & Defaults
1. **Stability (`stability`):**
   - **Range:** `0.0` to `1.0` (step `0.05`).
   - **Default:** `0.5` (if null or unconfigured).
   - **Help Context:** Higher values make the voice stable and consistent but sometimes robotic; lower values increase emotional range but introduce glitches.
2. **Similarity Boost (`similarity_boost`):**
   - **Range:** `0.0` to `1.0` (step `0.05`).
   - **Default:** `0.75` (if null).
   - **Help Context:** Higher values tightly replicate the original cast voice; lower values allow the synthesizer to drift and interpret accents.
3. **Style Exaggeration (`style`):**
   - **Range:** `0.0` to `1.0` (step `0.05`).
   - **Default:** `0.0`.
   - **Help Context:** Attempts to exaggerate the voice's theatrical character. Often best left near `0.0` for organic speech.
4. **Speaker Boost (`use_speaker_boost`):**
   - **Type:** Toggle Switch (`true` or `false`).
   - **Default:** `true`.
   - **Help Context:** Standard ElevenLabs noise gate/filter to boost clarity.
5. **Speed (`speed`):**
   - **Range:** `0.5` to `2.0` (step `0.05`).
   - **Default:** `1.0` (Normal speed).
   - **Help Context:** Linear time stretch scaling. Great for compressing runtimes of wordy characters.

### Writing Live Synthesis Data
Modifying these sliders marks the character dossier as **Dirty** (`dirty === true`).
Saving the dossier writes directly to the character’s `voice_settings` jsonb column using the following strict payload structure:

```typescript
const voiceSettingsPayload = {
  stability: parseFloat(stabilityValue),
  similarity_boost: parseFloat(similarityBoostValue),
  style: parseFloat(styleValue),
  use_speaker_boost: booleanSpeakerBoostValue,
  speed: parseFloat(speedValue)
};
```

---

## 5. Lock, Versioning & Historical Sync

The Casting Studio integrates directly into the existing database and version history flow of the dashboard.

### Lock Casting State
Once a permanent voice is selected, the operator clicks **"LOCK VOICE CAST"**:
- **Operation:**
  1. Saves any pending edits in the active buffer.
  2. Commits `voice_id` and the latest `voice_settings` payload to the `characters` table.
  3. Writes a new snapshot entry to the `character_bible_revisions` table, embedding the finalized casting parameters.
- **UI State Shift:** Design sliders lock. Audition bracket collapses and disappears, replaced by the green "LOCKED & READY" banner.
- **Safety Interlock:** To prevent accidental credit-spending dispatches, the Design Sliders cannot be clicked or dragged until an operator explicitly clicks an **"UNLOCK TIMBRE FOR RE-CAST"** button, which displays a double-check confirmation dialog.

### Cheap Edits vs Full Re-Cast Lifecycle
The system distinguishes between cheap, zero-cost parameters (Synthesis sliders) and high-cost parameters (Design sliders):
- **Synthesis edits** do NOT require unlocking the voice timbre. Operators can modify stability, style, or speed on a locked character, click "Save Dossier" on the global Savebar, and update the live runtime parameters instantly.
- **Timbre edits** require a full unlock, discarding the previous bracket, warning the user about credit consumption, and initiating a new generative tournament.

---

## 6. Open Questions, Dependencies & Blockers

This section outlines critical technical hurdles that the Core Pipeline/Architecture team must resolve on the HQ before the frontend developer can build the Casting Studio.

### Blocker 1: ElevenLabs API Keys & Browser Secret Exposure
* **The Problem:** The content-generation dashboard is a client-side single-page application. It uses a Supabase anonymous key (`anon_key`) and executes database operations directly from the browser. **It does not possess a secure server backend.** Storing a private ElevenLabs API key in browser memory or environment variables is a high-level security risk that invites prompt-injection thefts.
* **The Proposed Solution:** The pipeline team must build a lightweight **Server-Side API Proxy / Supabase Edge Function** to act as the gatekeeper.
  - **Proxy Route:** `POST /api/voice-proxy/design` and `POST /api/voice-proxy/create`.
  - **Behavior:** The edge function intercepts the request, validates the user’s Supabase Session Token, appends the secret ElevenLabs API key from secure server-side environment variables, dispatches to ElevenLabs, and returns the binary audio stream back to the client.

```
+────────────────+             +────────────────────────+             +─────────────────+
| CLIENT BROWSER | ----------> | SUPABASE EDGE FUNCTION | ----------> | ELEVENLABS API  |
|                |  (Session)  |  (Appends Server Key)  |  (Private)  |                 |
+────────────────+             +────────────────────────+             +─────────────────+
```

### Blocker 2: Audio Preview Blob Storage
* **The Problem:** When ElevenLabs generates 4 temporary design candidates, it returns raw MP3 binary data. How does the browser play these audio streams during head-to-head comparison?
* **The Proposed Solution:**
  - **Option A (No Storage):** Load the binary data directly into browser memory as temporary object URLs: `URL.createObjectURL(new Blob([mp3Buffer], { type: 'audio/mpeg' }))`. This is free, lightning-fast, and does not touch Supabase Storage, but previews are lost forever upon browser refresh.
  - **Option B (Supabase Storage):** The proxy uploads the mp3 previews to a public Supabase Storage bucket (`character-previews/`) and returns public CDN URLs. Highly robust, supports sharing previews across operators, but requires bucket setup and periodic cache-clearing cron jobs to avoid storage bloating.

### Blocker 3: Tournament Bracket Persistence
* **The Problem:** If an operator starts a casting tournament, evaluates 2 candidates, and then navigates away or loses connection, where does that tournament state go?
* **The Proposed Solution:** We propose caching active brackets inside the browser's `localStorage` indexed by `character_id`. Upon loading a character in Casting mode, the studio checks for a cached bracket. If found, it restores the candidates and audio urls seamlessly without requiring a costly generative re-run.

---

## 7. Scope Guardrails (Anti-Bloat Protection)

To deliver this slice rapidly without scope creep, we enforce strict product guardrails:
1. **Acoustic Focus Only:** This slice addresses **Voice & TTS Casting only**. Visual casting (AI image generation, style sheets, avatar sprites) is strictly deferred to future milestones.
2. **Standard ElevenLabs Vocoders:** No custom-trained voice models or long-form cloning interfaces. The casting workflow relies entirely on the rapid ElevenLabs Generative Design API.
3. **No Direct ElevenLabs Billing Control:** The dashboard does not manage ElevenLabs accounts, view billing tiers, or buy additional credits. It strictly logs execution costs to the existing `receipts` ledger.

---

## 8. Theme CSS Tokens & Aesthetic Declarations

Add these styling declarations to the dashboard UI to preserve the noir cockpit identity.

```css
/* Subtabs layout inside the character dossier sheet */
.dossier-subtabs {
  display: flex;
  border-bottom: 1px solid var(--line);
  margin-bottom: 20px;
  background: var(--ink-3);
  padding: 4px 4px 0 4px;
}

.subtab-btn {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .05em;
  text-transform: uppercase;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  color: var(--paper-faint);
  cursor: pointer;
  transition: all 0.12s ease;
}

.subtab-btn:hover {
  color: var(--paper);
}

.subtab-btn.on {
  color: var(--brass);
  background: var(--ink);
  border-color: var(--line);
  border-top: 2px solid var(--brass);
}

/* Bracket Layout */
.casting-bracket {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  background: var(--ink-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  margin-top: 16px;
}

.bracket-card {
  padding: 12px;
  background: var(--ink-3);
  border: 1px solid var(--line-soft);
  border-radius: 2px;
}

.bracket-card.active-challenger {
  border-color: var(--brass);
}

/* Credit warning box */
.credit-warning-box {
  border-left: 3px solid var(--stamp);
  background: rgba(200, 69, 59, 0.05);
  color: var(--paper-dim);
  padding: 10px 14px;
  font-family: var(--mono);
  font-size: 11px;
  margin-bottom: 12px;
}
```
