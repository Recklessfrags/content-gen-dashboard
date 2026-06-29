# Casting Studio Implementation Specification

**Status: READY FOR BUILDER**  
**Author: DESIGNER (Gemini)**  
**Date: June 29, 2026**  
**Target Audience: Dashboard Builder**  
**Target File Audience:** `supabase/functions/*`, `src/lib/casting.ts`, `src/components/ControlRoom.tsx`, `src/app/globals.css`

## Executive Summary
This specification details the implementation of the "Casting Studio" slice for the Control Room dashboard. It provides the end-to-end architecture and UI/UX design for character voice casting using ElevenLabs, proxied securely through a Supabase Edge Function.

---

## 1. Edge Function Proxy (`supabase/functions/casting-proxy/index.ts`)

The entire studio depends on this secure relay to ElevenLabs. The dashboard is browser/anon-key only; the ElevenLabs secret (`ELEVENLABS_API_KEY`) is stored as a Supabase Project Secret and read only server-side.

**Architecture & Routing**
We will use a single Edge Function (`casting-proxy/index.ts` using Deno) with an `"action"` discriminator in the JSON body. A single function minimizes cold starts and simplifies dashboard-to-edge deployment.
- **Action Options:** `"design"` | `"create"` | `"tts"`

**Session Validation (Strict No-Open-Relay)**
The client MUST pass the Supabase session token in the `Authorization: Bearer <token>` header. The function validates the user using the Supabase JS client's `supabase.auth.getUser(token)` (or JWT verify). Anonymous or invalid requests are rejected with `401 Unauthorized`.

**Per-User/Day Soft Cap**
To prevent a dashboard bug from burning shared quota, we enforce a soft cap of **25 design/re-cast actions per user per day**. (TTS previews are cheaper and will not be capped at this time, to encourage fine-tuning synthesis). 

*Cap Enforcement:*
The function uses the `SERVICE_ROLE` key to query and upsert to a dashboard-owned `casting_usage` table. 

**Response & Error Mapping**
- ElevenLabs 4xx/5xx errors are caught and returned as `{ error: "ElevenLabs API Error: <msg>" }`.
- Cap Hit returns HTTP 429: `{ error: "Daily casting cap reached (25/25). Please try again tomorrow or contact admin." }`.

**Migration Sketch (Dashboard-Owned, likely `0003_casting_usage.sql`)**
```sql
CREATE TABLE public.casting_usage (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day date NOT NULL DEFAULT CURRENT_DATE,
    count int NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);
ALTER TABLE public.casting_usage ENABLE ROW LEVEL SECURITY;
-- Dashboard clients can read their own usage to display "N/M casts left today"
CREATE POLICY "Users can view their own usage" ON public.casting_usage FOR SELECT USING (auth.uid() = user_id);
-- NO authenticated INSERT/UPDATE. The Edge Function writes via SERVICE_ROLE.
```

---

## 2. Client Library (`src/lib/casting.ts`)

A pure, highly-testable client library handling ElevenLabs contracts, clamping, and local state.

**Synthesis Defaults & Clamping (B2)**
- `stability`: Range `[0.0, 1.0]`, Default `0.5`
- `similarity_boost`: Range `[0.0, 1.0]`, Default `0.75`
- `style`: Range `[0.0, 1.0]`, Default `0.0`
- `speed`: Range `[0.7, 1.2]`, Default `1.0` (narration band, clamped aggressively from ElevenLabs' wider allowance)
- `use_speaker_boost`: `boolean`, Default `true`

```typescript
export function clampVoiceSettings(settings: Partial<VoiceSettings>): VoiceSettings { ... }
```

**Voice Description Composition (Design Prompts)**
Maps high-level UI sliders to ElevenLabs `voice_description` prose.
*Templates:* "A {age} {gender} voice with {grit} texture, {bombast} delivery, and a {comedy_menace} undertone."

**Tournament Bracket Model**
```typescript
type AuditionCandidate = {
  generated_voice_id: string;
  audio_base_64: string; // Ephemeral
  prompt_state: VoiceDesignPrompt; // Stamped for reproducibility
};

type BracketState = {
  candidates: AuditionCandidate[];
  favorites: AuditionCandidate[];
  winner: AuditionCandidate | null;
};
// Reducers for save/load to localStorage key `casting_bracket_${characterId}`
```

**Client Wrappers**
```typescript
export async function generateVoicePreviews(prompt: string, sampleText: string): Promise<AuditionCandidate[]>
export async function saveVoiceWinner(name: string, description: string, generated_voice_id: string): Promise<string>
export async function synthesizePreview(text: string, voiceId: string, settings: VoiceSettings): Promise<Blob>
export function isCast(character: Pick<Character, "voice_id">): boolean { return character.voice_id !== null; }
```

---

## 3. Entry + Placement

**Placement:** 
The Casting Studio lives as a full Slide-Over panel (reusing `.drilldown-panel` architecture) triggered from the Roster view or the Character Dossier sheet.

**Character Cast Status:**
On the roster `.pcard` and the main dossier header, the `voice_id` governs the brand discipline read-out.
- `voice_id === null`: Display a `.chip.draft` badge labeled "UNCAST / NOT PRODUCTION-READY".
- `voice_id !== null`: Display a `.chip.active` badge labeled "CAST".

**Trigger:**
A new action button in the dossier savebar: `[ ENTER CASTING STUDIO ]`.

---

## 4. Voice Design (Re-Cast) Flow

This is the expensive, credit-consuming flow.

**UI State:**
1. **Design Sliders:** Timbre sliders (Age, Grit, Comedy/Menace, Bombast).
2. **Sample Text:** A 100-1000 character sample line appropriate to the character's channel (e.g., a dark history monologue for Mad Dog, not food).
3. **Credit Warning:** Above the "Generate Previews" button: 
   *"⚠️ GENERATING DESIGN PREVIEWS CONSUMES PIPELINE CREDITS. (X/25 daily casts remaining)."*
4. **Loading State:** "SYNTHESIZING PREVIEWS..."
5. **Auditioning:** An inline audio player (using object URLs from the returned base64) with standard `<audio controls>` for a11y.
6. **Save:** Picking a candidate writes the new `voice_id` to `characters.voice_id`.

**Errors:**
If a 429 Cap Hit is returned, disable the Generate button and show a red error banner (`.history-error` aesthetic): *"Daily casting cap reached. Re-casting locked until tomorrow."*
If an ElevenLabs error occurs, map it to a clean JSON error message for the UI.

---

## 5. Tournament Selection

**Bracket Interaction:**
- The Edge Function returns multiple previews per design cast.
- The UI renders these as candidate cards.
- **Action:** `[ Add to Favorites ]` or `[ Discard ]`.
- **Reproducibility Stamp:** Each candidate card is STAMPED with the slider state used to generate it.
- **Persistence:** Saved automatically to `localStorage` so a reload doesn't lose the in-progress bracket.
- **Locking:** `[ LOCK AS WINNER ]` triggers the `create` proxy action and finalizes the cast.

---

## 6. Synthesis Sliders (Live Tweaking)

These sliders modify the `voice_settings` JSON column. They are cheaper and applied live.

**UI Distinctions:**
- **Placement:** Displayed in a separate section titled "LIVE SYNTHESIS TUNING (CHEAPER THAN RECAST)".
- **Sliders:** Stability, Similarity Boost, Style, Speed, and a Speaker Boost toggle.
- **Constraints:** Sliders are physically restricted to the ranges defined in B2.
- **Live Preview:** A `[ TEST SYNTHESIS ]` button calls the `tts` proxy action using the live slider state.
- **Save Semantics:** Writing these changes updates `characters.voice_settings` directly (owner-scoped RLS). No new `voice_id` is generated, and it does not trigger a re-cast. 

---

## 7. Lock + Versioning

**Locking the Cast:**
A character is considered "locked" when `voice_id` is present. 

**Interaction with Bible Versioning:**
- **Open Question Flag:** *Does a re-cast or voice setting tweak trigger a new `character_bible_revisions` row?*
- **Recommendation:** A re-cast (`voice_id` change) is a major notable event and **SHOULD** trigger a snapshot into `character_bible_revisions` to maintain historical lineage of the character's identity. 
- Live tweaks to `voice_settings` are cheap tuning adjustments and **SHOULD NOT** spam the revision history.
- **Schema Implication (Open Question):** The `character_bible_revisions` table currently does not capture `voice_id` or `voice_settings`. Should we expand the revisions table schema to include voice columns, or embed them into the `bible` jsonb column for snapshots? *Do not assume a new column is added yet.*

---

## 8. Scope Guardrails

**In Scope:**
- Voice design (re-casting) via ElevenLabs proxy.
- Local tournament bracket for voice picking.
- Live synthesis tuning (voice settings).
- Usage cap tracking for design requests.

**DEFERRED (Out of Scope):**
- Image/visual style generation.
- Casting cost ledger or credit logging in the dashboard Cost Box (stays render-based for now).
- Persistent audio storage (S3/Buckets). Audio remains ephemeral base64/object URLs.
- Cross-user shared casting brackets (bracket state is local to the operator's browser).

---

## 9. Build Plan & Parallelism

The slice is broken down into strictly non-interfering units for parallel execution:

- **Unit A: Edge Proxy & Migrations (Backend/DB)**
  - Implement `supabase/functions/casting-proxy/index.ts`.
  - Create the `casting_usage` tracking table and RLS in a new `.sql` migration file.
  - *Unblocks Unit C.*

- **Unit B: Client Library (Logic/State)**
  - Implement `src/lib/casting.ts` (API wrappers, clamping, local storage bracket logic).
  - Pure TypeScript, zero UI dependencies.
  - *Unblocks Unit C.*

- **Unit C: Studio UI (Frontend)**
  - Implement the UI components in `src/components/ControlRoom.tsx` and styling in `src/app/globals.css`.
  - Wire up the slide-over panel, sliders, and audio playback.
  - *Depends on A and B.*