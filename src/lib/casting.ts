import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";
import type { Character } from "@/lib/types";

/**
 * Casting Studio contract layer (dashboard side).
 *
 * The dashboard has no server backend, so every ElevenLabs call is proxied
 * through the `casting-proxy` Supabase Edge Function (session-gated, the API key
 * lives server-side only). This module owns:
 *   - voice_settings defaults / ranges / clamping (the WORKER DOES NOT CLAMP —
 *     an out-of-range value errors at ElevenLabs, so this is the safety boundary),
 *   - the design-slider -> voice_description composition,
 *   - the typed edge-function wrappers (design / create / tts),
 *   - the localStorage tournament-bracket model.
 *
 * It is pure + side-effect-light on purpose (mirrors src/lib/jobs.ts): the
 * reducers and mappers are unit-testable; only the thin storage and fetch
 * helpers touch the outside world.
 */

type CastingClient = SupabaseClient<SupabaseCompatibleDatabase>;

const EDGE_FUNCTION = "casting-proxy";

/**
 * Soft per-user/day cap on credit-spending casting actions (design + create).
 * Mirrors the edge function's own limit; the function is authoritative — this is
 * only for the "N casts left today" display.
 */
export const CASTING_DAILY_CAP = 25;

// ── voice_settings (LIVE synthesis knobs → characters.voice_settings) ─────────

export type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
};

export const VOICE_SETTINGS_DEFAULTS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  speed: 1.0,
  use_speaker_boost: true,
};

/**
 * Allowed ranges the worker honors. ElevenLabs technically accepts speed
 * 0.25–4.0, but the pipeline pins the practical narration band to 0.7–1.2, so
 * the slider (and this clamp) does too.
 */
export const VOICE_SETTINGS_RANGES: Record<
  "stability" | "similarity_boost" | "style" | "speed",
  { min: number; max: number }
> = {
  stability: { min: 0, max: 1 },
  similarity_boost: { min: 0, max: 1 },
  style: { min: 0, max: 1 },
  speed: { min: 0.7, max: 1.2 },
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

/**
 * Clamp + fill a partial settings object to a complete, in-range VoiceSettings.
 * Unknown/NaN values fall back to the default; out-of-range values are clamped.
 */
export function clampVoiceSettings(
  settings: Partial<VoiceSettings> | null | undefined,
): VoiceSettings {
  const input = settings ?? {};
  return {
    stability: clampNumber(
      input.stability,
      VOICE_SETTINGS_RANGES.stability.min,
      VOICE_SETTINGS_RANGES.stability.max,
      VOICE_SETTINGS_DEFAULTS.stability,
    ),
    similarity_boost: clampNumber(
      input.similarity_boost,
      VOICE_SETTINGS_RANGES.similarity_boost.min,
      VOICE_SETTINGS_RANGES.similarity_boost.max,
      VOICE_SETTINGS_DEFAULTS.similarity_boost,
    ),
    style: clampNumber(
      input.style,
      VOICE_SETTINGS_RANGES.style.min,
      VOICE_SETTINGS_RANGES.style.max,
      VOICE_SETTINGS_DEFAULTS.style,
    ),
    speed: clampNumber(
      input.speed,
      VOICE_SETTINGS_RANGES.speed.min,
      VOICE_SETTINGS_RANGES.speed.max,
      VOICE_SETTINGS_DEFAULTS.speed,
    ),
    use_speaker_boost:
      typeof input.use_speaker_boost === "boolean"
        ? input.use_speaker_boost
        : VOICE_SETTINGS_DEFAULTS.use_speaker_boost,
  };
}

/**
 * Read the stored voice_settings jsonb off a character into a complete,
 * clamped VoiceSettings (defaults applied for anything missing/invalid).
 */
export function voiceSettingsFrom(
  character: Pick<Character, "voice_settings">,
): VoiceSettings {
  const raw = character.voice_settings;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return clampVoiceSettings(raw as Partial<VoiceSettings>);
  }
  return { ...VOICE_SETTINGS_DEFAULTS };
}

// ── voice DESIGN sliders (timbre → voice_description → RE-CAST, spends credits)

/**
 * Design sliders are normalized 0..1. Each maps to a 3-bucket descriptor that
 * composes into the ElevenLabs `voice_description` prose. Keeping them bucketed
 * (not free-form) makes a candidate's slider state reproducible (it's stamped on
 * each tournament candidate).
 */
export type VoiceGender = "male" | "female" | "androgynous";

export type VoiceDesignPrompt = {
  age: number; // 0 young → 1 old
  grit: number; // 0 smooth → 1 gravelly
  comedy_menace: number; // 0 comedic → 1 menacing
  bombast: number; // 0 understated → 1 bombastic
  gender?: VoiceGender; // optional; ElevenLabs design benefits from it
};

export const VOICE_DESIGN_DEFAULTS: VoiceDesignPrompt = {
  age: 0.5,
  grit: 0.5,
  comedy_menace: 0.5,
  bombast: 0.5,
  gender: "androgynous",
};

type Bucket = "low" | "mid" | "high";

function bucket(value: number): Bucket {
  const n = clampNumber(value, 0, 1, 0.5);
  if (n < 1 / 3) return "low";
  if (n < 2 / 3) return "mid";
  return "high";
}

type BucketedSlider = "age" | "grit" | "comedy_menace" | "bombast";

const DESIGN_PHRASES: Record<BucketedSlider, Record<Bucket, string>> = {
  age: {
    low: "a young, fresh-toned",
    mid: "a middle-aged",
    high: "an older, weathered",
  },
  grit: {
    low: "smooth and clean",
    mid: "with a touch of rasp",
    high: "gravelly and rough-edged",
  },
  comedy_menace: {
    low: "playful and comedic",
    mid: "wry and deadpan",
    high: "dark and menacing",
  },
  bombast: {
    low: "understated and intimate",
    mid: "confident and measured",
    high: "bombastic and theatrical",
  },
};

/**
 * Compose the design sliders into an ElevenLabs voice_description string.
 * Deterministic: the same prompt always yields the same prose (matters for the
 * reproducible tournament).
 */
export function composeVoiceDescription(prompt: VoiceDesignPrompt): string {
  const age = DESIGN_PHRASES.age[bucket(prompt.age)];
  const grit = DESIGN_PHRASES.grit[bucket(prompt.grit)];
  const tone = DESIGN_PHRASES.comedy_menace[bucket(prompt.comedy_menace)];
  const delivery = DESIGN_PHRASES.bombast[bucket(prompt.bombast)];
  const gender = prompt.gender && prompt.gender !== "androgynous" ? `${prompt.gender} ` : "";
  return `${age} ${gender}voice, ${grit}, ${tone}, ${delivery}. Suited to narrating short-form video with a strong, characterful presence.`;
}

const DESIGN_SAMPLE_MIN = 100;
const DESIGN_SAMPLE_MAX = 1000;

/**
 * A character-appropriate ~design sample (100–1000 chars). Falls back to a
 * neutral characterful line (NOT a food line — the worker's built-in sample is a
 * food line, which mis-flavors non-food channels).
 */
export function sampleTextFor(
  character: Pick<Character, "codename" | "concept" | "bible"> | null | undefined,
): string {
  const name = character?.codename?.trim() || "This character";
  const concept = character?.concept?.trim() || "a short-form video host";
  // Derive a character-appropriate read from the bible so the design preview is
  // flavored by the actual voice/cadence (the worker's built-in sample is a food
  // line, which mis-flavors non-food channels). A signature line is ideal.
  const signature =
    character?.bible?.lines?.trim() ||
    `Most people never hear the whole story — the part that doesn't make the brochure. Stay with me, because what comes next is the part you'll remember long after the screen goes dark.`;
  const base = `${name} is ${concept}. ${signature} Deliver it specific, alert, and in command of the room — vivid, but usable for production narration.`;
  // Guard the 100–1000 length contract regardless of bible length.
  if (base.length < DESIGN_SAMPLE_MIN) {
    return base.padEnd(DESIGN_SAMPLE_MIN, ".");
  }
  return base.slice(0, DESIGN_SAMPLE_MAX);
}

export function isValidDesignSample(text: string): boolean {
  const len = text.trim().length;
  return len >= DESIGN_SAMPLE_MIN && len <= DESIGN_SAMPLE_MAX;
}

// ── cast status ───────────────────────────────────────────────────────────────

/** Canonical "cast" signal per the contract: voice_id IS NOT NULL. */
export function isCast(character: Pick<Character, "voice_id">): boolean {
  return character.voice_id != null && character.voice_id.length > 0;
}

// ── edge-function wrappers (design / create / tts) ────────────────────────────

export type AuditionCandidate = {
  generated_voice_id: string;
  audio_base_64: string; // ephemeral; not persisted server-side
  media_type: string;
  prompt_state: VoiceDesignPrompt; // stamped for a reproducible tournament
};

type DesignResponse = {
  previews?: Array<{
    generated_voice_id?: string;
    audio_base_64?: string;
    media_type?: string;
  }>;
  error?: string;
};

type CreateResponse = { voice_id?: string; error?: string };
type DeleteResponse = { ok?: boolean; error?: string };
type TtsResponse = { audio_base_64?: string; media_type?: string; error?: string };

export class CastingError extends Error {
  readonly capReached: boolean;
  constructor(message: string, capReached = false) {
    super(message);
    this.name = "CastingError";
    this.capReached = capReached;
  }
}

function edgeErrorMessage(error: unknown, fallback: string): {
  message: string;
  capReached: boolean;
} {
  // supabase-js FunctionsHttpError carries the HTTP status in .context.
  if (error && typeof error === "object") {
    const ctx = (error as { context?: { status?: number } }).context;
    const status = ctx?.status;
    const msg = (error as { message?: string }).message;
    if (status === 429) {
      return { message: "Daily casting cap reached. Re-casting is locked until tomorrow.", capReached: true };
    }
    if (status === 401) {
      return { message: "Your session expired — sign in again to cast.", capReached: false };
    }
    if (typeof msg === "string" && msg.length > 0) {
      return { message: msg, capReached: false };
    }
  }
  return { message: fallback, capReached: false };
}

/**
 * DESIGN: spend credits to generate audition previews. Each preview is stamped
 * with the slider state that produced it so the tournament is reproducible.
 */
export async function generateVoicePreviews(
  client: CastingClient,
  prompt: VoiceDesignPrompt,
  sampleText: string,
): Promise<AuditionCandidate[]> {
  if (!isValidDesignSample(sampleText)) {
    throw new CastingError(
      `Design sample must be ${DESIGN_SAMPLE_MIN}–${DESIGN_SAMPLE_MAX} characters.`,
    );
  }
  const voice_description = composeVoiceDescription(prompt);
  const { data, error } = await client.functions.invoke<DesignResponse>(EDGE_FUNCTION, {
    body: { action: "design", voice_description, text: sampleText },
  });
  if (error) {
    const mapped = edgeErrorMessage(error, "Could not generate previews.");
    throw new CastingError(mapped.message, mapped.capReached);
  }
  if (data?.error) {
    throw new CastingError(data.error);
  }
  const previews = data?.previews ?? [];
  return previews
    .filter((p): p is { generated_voice_id: string; audio_base_64: string; media_type?: string } =>
      typeof p.generated_voice_id === "string" && typeof p.audio_base_64 === "string",
    )
    .map((p) => ({
      generated_voice_id: p.generated_voice_id,
      audio_base_64: p.audio_base_64,
      media_type: p.media_type ?? "audio/mpeg",
      prompt_state: { ...prompt },
    }));
}

/**
 * CREATE: save the chosen candidate as a permanent ElevenLabs voice. Returns the
 * permanent voice_id to write to characters.voice_id. Spends credits.
 */
export async function saveVoiceWinner(
  client: CastingClient,
  voice_name: string,
  voice_description: string,
  generated_voice_id: string,
): Promise<string> {
  const { data, error } = await client.functions.invoke<CreateResponse>(EDGE_FUNCTION, {
    body: { action: "create", voice_name, voice_description, generated_voice_id },
  });
  if (error) {
    const mapped = edgeErrorMessage(error, "Could not save the voice.");
    throw new CastingError(mapped.message, mapped.capReached);
  }
  if (data?.error) {
    throw new CastingError(data.error);
  }
  if (!data?.voice_id) {
    throw new CastingError("ElevenLabs did not return a voice id.");
  }
  return data.voice_id;
}

/**
 * DELETE: best-effort cleanup for a previous library voice after a re-cast has
 * already been locked to characters.voice_id. Does not spend casting credits.
 */
export async function deleteVoice(
  client: CastingClient,
  voiceId: string,
): Promise<void> {
  const id = voiceId.trim();
  if (!id) {
    throw new CastingError("voice_id is required.");
  }
  const { data, error } = await client.functions.invoke<DeleteResponse>(EDGE_FUNCTION, {
    body: { action: "delete", voice_id: id },
  });
  if (error) {
    const mapped = edgeErrorMessage(error, "Could not delete the previous voice.");
    throw new CastingError(mapped.message, mapped.capReached);
  }
  if (data?.error) {
    throw new CastingError(data.error);
  }
}

/**
 * TTS: audition a LIVE voice_settings change (no re-cast, no credits-worth of
 * design spend). Settings are clamped before sending — the worker does not
 * clamp. Returns a base64 mp3 the UI can play.
 */
export async function synthesizePreview(
  client: CastingClient,
  text: string,
  voiceId: string,
  settings: Partial<VoiceSettings>,
): Promise<{ audio_base_64: string; media_type: string }> {
  const { data, error } = await client.functions.invoke<TtsResponse>(EDGE_FUNCTION, {
    body: {
      action: "tts",
      voice_id: voiceId,
      text,
      voice_settings: clampVoiceSettings(settings),
    },
  });
  if (error) {
    const mapped = edgeErrorMessage(error, "Could not synthesize a preview.");
    throw new CastingError(mapped.message, mapped.capReached);
  }
  if (data?.error) {
    throw new CastingError(data.error);
  }
  if (!data?.audio_base_64) {
    throw new CastingError("ElevenLabs did not return audio.");
  }
  return { audio_base_64: data.audio_base_64, media_type: data.media_type ?? "audio/mpeg" };
}

/** Build a playable data URL from a base64 mp3 (ephemeral; nothing persisted). */
export function audioSrcFromBase64(audio_base_64: string, media_type = "audio/mpeg"): string {
  return `data:${media_type};base64,${audio_base_64}`;
}

// ── tournament bracket (localStorage-backed, dashboard-side) ──────────────────

export type BracketState = {
  characterId: string;
  favorites: AuditionCandidate[];
  pool: AuditionCandidate[]; // the current (most recent) batch awaiting triage
  winner: AuditionCandidate | null;
};

export function emptyBracket(characterId: string): BracketState {
  return { characterId, favorites: [], pool: [], winner: null };
}

function candidateKey(c: AuditionCandidate): string {
  return c.generated_voice_id;
}

/** Replace the current pool with a fresh batch of generated candidates. */
export function setPool(state: BracketState, batch: AuditionCandidate[]): BracketState {
  return { ...state, pool: batch };
}

/** Carry a candidate forward into the favorites set (dedup by generated id). */
export function addFavorite(state: BracketState, candidate: AuditionCandidate): BracketState {
  if (state.favorites.some((f) => candidateKey(f) === candidateKey(candidate))) {
    return { ...state, pool: state.pool.filter((c) => candidateKey(c) !== candidateKey(candidate)) };
  }
  return {
    ...state,
    favorites: [...state.favorites, candidate],
    pool: state.pool.filter((c) => candidateKey(c) !== candidateKey(candidate)),
  };
}

/** Drop a candidate from the pool without keeping it. */
export function discard(state: BracketState, candidate: AuditionCandidate): BracketState {
  return { ...state, pool: state.pool.filter((c) => candidateKey(c) !== candidateKey(candidate)) };
}

/** Remove a previously-kept favorite. */
export function removeFavorite(state: BracketState, candidate: AuditionCandidate): BracketState {
  return { ...state, favorites: state.favorites.filter((f) => candidateKey(f) !== candidateKey(candidate)) };
}

/** Crown a winner (must be a known favorite or pool candidate). */
export function setWinner(state: BracketState, candidate: AuditionCandidate): BracketState {
  return { ...state, winner: candidate };
}

export function resetBracket(state: BracketState): BracketState {
  return emptyBracket(state.characterId);
}

// thin storage I/O — kept separate so the reducers above stay pure/testable.

function bracketKey(characterId: string): string {
  return `casting_bracket_${characterId}`;
}

export function loadBracket(characterId: string): BracketState {
  if (typeof window === "undefined") {
    return emptyBracket(characterId);
  }
  try {
    const raw = window.localStorage.getItem(bracketKey(characterId));
    if (!raw) return emptyBracket(characterId);
    const parsed = JSON.parse(raw) as Partial<BracketState>;
    return {
      characterId,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      pool: Array.isArray(parsed.pool) ? parsed.pool : [],
      winner: parsed.winner ?? null,
    };
  } catch {
    return emptyBracket(characterId);
  }
}

export function saveBracket(state: BracketState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(bracketKey(state.characterId), JSON.stringify(state));
  } catch {
    // localStorage full / unavailable — bracket is best-effort, ignore.
  }
}

export function clearBracket(characterId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(bracketKey(characterId));
  } catch {
    // ignore
  }
}
