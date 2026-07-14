import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/database.types";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";
import type { Character } from "@/lib/types";
import { isBuilderSelections, type BuilderSelections } from "@/lib/castingPhrases";

/**
 * Casting Studio contract layer (dashboard side).
 *
 * The dashboard has no server backend, so every ElevenLabs call is proxied
 * through the `casting-proxy` Supabase Edge Function (session-gated, the API key
 * lives server-side only). This module owns:
 *   - voice_settings defaults / ranges / clamping (the WORKER DOES NOT CLAMP —
 *     an out-of-range value errors at ElevenLabs, so this is the safety boundary),
 *   - legacy design-slider -> voice_description composition for old recipes,
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
export type VoiceDesignModelId = "eleven_ttv_v3" | "eleven_multilingual_ttv_v2";

export type VoiceDesignPrompt = {
  age?: number; // legacy only: 0 young -> 1 old
  grit?: number; // legacy only: 0 smooth -> 1 gravelly
  comedy_menace?: number; // legacy only: 0 comedic -> 1 menacing
  bombast?: number; // legacy only: 0 understated -> 1 bombastic
  gender?: VoiceGender; // optional; ElevenLabs design benefits from it
  voice_description_raw?: string;
  preview_text_raw?: string;
  prompt_raw?: string;
  builder_state?: BuilderSelections;
};

export type LegacyVoiceDesignPrompt = Required<
  Pick<VoiceDesignPrompt, "age" | "grit" | "comedy_menace" | "bombast" | "gender">
>;

export const VOICE_DESIGN_DEFAULTS: LegacyVoiceDesignPrompt = {
  age: 0.5,
  grit: 0.5,
  comedy_menace: 0.5,
  bombast: 0.5,
  gender: "androgynous",
};

export type VoiceGeneration = {
  model_id: VoiceDesignModelId;
  guidance_scale: number;
  seed: number | null;
  quality: number | null;
};

export const VOICE_DESIGN_MODEL_IDS: readonly VoiceDesignModelId[] = [
  "eleven_ttv_v3",
  "eleven_multilingual_ttv_v2",
];

export const GENERATION_DEFAULTS: VoiceGeneration = {
  model_id: "eleven_ttv_v3",
  guidance_scale: 5,
  seed: null,
  quality: null,
};

export const GENERATION_RANGES = {
  // ElevenLabs POST /v1/text-to-voice/design documents guidance_scale as 0-100.
  guidance_scale: { min: 0, max: 100 },
  // ElevenLabs documents seed as 0-2147483647, not the frozen spec's 0-4294967295 recommendation.
  seed: { min: 0, max: 2147483647 },
  // ElevenLabs now documents quality as -1-1; the UI still omits it in this slice.
  quality: { min: -1, max: 1 },
} as const;

export const VOICE_DESCRIPTION_MIN = 200;
export const VOICE_DESCRIPTION_SOFT_MAX = 600;

export const KIT_PREVIEW_SCAFFOLD =
  "Tonight, the recipe looks harmless: a pan, a little heat, and a smell everybody thinks they recognize. Then the first strange detail lands. The kitchen goes quiet, the camera pushes in, and the truth is not in the ingredient list. It is in the choice someone made thirty seconds too late.";

export type VoiceRecipe = {
  design_prompt: VoiceDesignPrompt;
  generation: VoiceGeneration;
  voice_settings: VoiceSettings;
  template_name?: string;
};

export function clampVoiceDesignPrompt(
  prompt: Partial<VoiceDesignPrompt> | null | undefined,
): VoiceDesignPrompt {
  const input = prompt ?? {};
  const hasRaw =
    typeof input.voice_description_raw === "string" || typeof input.preview_text_raw === "string";
  const hasLegacySliders =
    input.age !== undefined ||
    input.grit !== undefined ||
    input.comedy_menace !== undefined ||
    input.bombast !== undefined ||
    input.gender !== undefined;
  const gender =
    input.gender === "male" || input.gender === "female" || input.gender === "androgynous"
      ? input.gender
      : VOICE_DESIGN_DEFAULTS.gender;

  const output: VoiceDesignPrompt = {
    ...(typeof input.voice_description_raw === "string"
      ? { voice_description_raw: input.voice_description_raw }
      : {}),
    ...(typeof input.preview_text_raw === "string"
      ? { preview_text_raw: input.preview_text_raw }
      : {}),
    ...(typeof input.prompt_raw === "string" ? { prompt_raw: input.prompt_raw } : {}),
    ...(isBuilderSelections(input.builder_state) ? { builder_state: input.builder_state } : {}),
  };
  if (!hasRaw || hasLegacySliders) {
    output.age = clampNumber(input.age, 0, 1, VOICE_DESIGN_DEFAULTS.age);
    output.grit = clampNumber(input.grit, 0, 1, VOICE_DESIGN_DEFAULTS.grit);
    output.comedy_menace = clampNumber(
      input.comedy_menace,
      0,
      1,
      VOICE_DESIGN_DEFAULTS.comedy_menace,
    );
    output.bombast = clampNumber(input.bombast, 0, 1, VOICE_DESIGN_DEFAULTS.bombast);
    output.gender = gender;
  }
  return output;
}

export function clampVoiceDesignModelId(value: unknown): VoiceDesignModelId {
  return value === "eleven_multilingual_ttv_v2" || value === "eleven_ttv_v3"
    ? value
    : GENERATION_DEFAULTS.model_id;
}

export function clampGuidanceScale(value: unknown): number {
  return clampNumber(
    value,
    GENERATION_RANGES.guidance_scale.min,
    GENERATION_RANGES.guidance_scale.max,
    GENERATION_DEFAULTS.guidance_scale,
  );
}

export function clampSeed(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  let n: number;
  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string" && value.trim().length > 0) {
    n = Number(value.trim());
  } else {
    return null;
  }
  if (!Number.isInteger(n)) return null;
  return Math.min(GENERATION_RANGES.seed.max, Math.max(GENERATION_RANGES.seed.min, n));
}

export function clampQuality(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(GENERATION_RANGES.quality.max, Math.max(GENERATION_RANGES.quality.min, n));
}

export function clampGeneration(
  generation:
    | {
        model_id?: unknown;
        guidance_scale?: unknown;
        seed?: unknown;
        quality?: unknown;
      }
    | null
    | undefined,
): VoiceGeneration {
  const input = generation ?? {};
  return {
    model_id: clampVoiceDesignModelId(input.model_id),
    guidance_scale: clampGuidanceScale(input.guidance_scale),
    seed: clampSeed(input.seed),
    quality: clampQuality(input.quality),
  };
}

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
  const legacy = { ...VOICE_DESIGN_DEFAULTS, ...clampVoiceDesignPrompt(prompt) };
  const age = DESIGN_PHRASES.age[bucket(legacy.age)];
  const grit = DESIGN_PHRASES.grit[bucket(legacy.grit)];
  const tone = DESIGN_PHRASES.comedy_menace[bucket(legacy.comedy_menace)];
  const delivery = DESIGN_PHRASES.bombast[bucket(legacy.bombast)];
  const gender = legacy.gender && legacy.gender !== "androgynous" ? `${legacy.gender} ` : "";
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

export function isValidVoiceDescription(text: string): boolean {
  return text.trim().length >= VOICE_DESCRIPTION_MIN;
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
  voice_description_raw: string;
  preview_text_raw: string;
  model_id: VoiceDesignModelId;
  guidance_scale: number;
  seed: number | null;
  quality: number | null;
  builder_state?: BuilderSelections;
  prompt_state?: VoiceDesignPrompt; // legacy persisted bracket support
  prompt_raw?: string;
  template_name?: string; // stamped at generation time for recipe provenance
};

type DesignResponse = {
  previews?: Array<{
    generated_voice_id?: string;
    audio_base_64?: string;
    media_type?: string;
    seed?: unknown;
  }>;
  seed?: unknown;
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
  input: {
    voice_description_raw: string;
    preview_text: string;
    model_id?: unknown;
    guidance_scale?: unknown;
    seed?: unknown;
    quality?: unknown;
    builder_state?: BuilderSelections;
    prompt_raw?: string;
  },
): Promise<AuditionCandidate[]> {
  const voiceDescription = input.voice_description_raw;
  const previewText = input.preview_text;
  if (!isValidVoiceDescription(voiceDescription)) {
    throw new CastingError(`Voice description must be at least ${VOICE_DESCRIPTION_MIN} characters.`);
  }
  if (!isValidDesignSample(previewText)) {
    throw new CastingError(
      `Design sample must be ${DESIGN_SAMPLE_MIN}–${DESIGN_SAMPLE_MAX} characters.`,
    );
  }
  const generation = clampGeneration({
    model_id: input.model_id,
    guidance_scale: input.guidance_scale,
    seed: input.seed,
    quality: input.quality,
  });
  const { data, error } = await client.functions.invoke<DesignResponse>(EDGE_FUNCTION, {
    body: {
      action: "design",
      voice_description: voiceDescription,
      text: previewText,
      model_id: generation.model_id,
      guidance_scale: generation.guidance_scale,
      seed: generation.seed,
      quality: generation.quality,
    },
  });
  if (error) {
    const mapped = edgeErrorMessage(error, "Could not generate previews.");
    throw new CastingError(mapped.message, mapped.capReached);
  }
  if (data?.error) {
    throw new CastingError(data.error);
  }
  const previews = data?.previews ?? [];
  const responseSeed = clampSeed(data?.seed);
  return previews
    .filter((p): p is { generated_voice_id: string; audio_base_64: string; media_type?: string; seed?: unknown } =>
      typeof p.generated_voice_id === "string" && typeof p.audio_base_64 === "string",
    )
    .map((p) => {
      const previewSeed = clampSeed(p.seed);
      return {
        generated_voice_id: p.generated_voice_id,
        audio_base_64: p.audio_base_64,
        media_type: p.media_type ?? "audio/mpeg",
        voice_description_raw: voiceDescription,
        preview_text_raw: previewText,
        model_id: generation.model_id,
        guidance_scale: generation.guidance_scale,
        // Current ElevenLabs docs do not expose the random seed; persist it only if returned.
        seed: generation.seed ?? previewSeed ?? responseSeed,
        quality: generation.quality,
        ...(isBuilderSelections(input.builder_state) ? { builder_state: input.builder_state } : {}),
        ...(typeof input.prompt_raw === "string" && input.prompt_raw.length > 0
          ? { prompt_raw: input.prompt_raw }
          : {}),
      };
    });
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
 * DB WRITE: attach an already-created voice to a character with its reproducible
 * recipe. This is intentionally separate from CREATE so retries after an RLS /
 * stale-id failure do not spend credits or re-consume a generated preview.
 */
export async function writeCastToCharacter(
  client: CastingClient,
  characterId: string,
  voiceId: string,
  settings: Partial<VoiceSettings>,
  recipe: VoiceRecipe,
): Promise<void> {
  const nextSettings = clampVoiceSettings(settings);
  const nextRecipe: VoiceRecipe = {
    design_prompt: clampVoiceDesignPrompt(recipe.design_prompt),
    generation: clampGeneration(recipe.generation),
    voice_settings: nextSettings,
    ...(recipe.template_name ? { template_name: recipe.template_name } : {}),
  };
  const { error: updateError } = await client
    .from("characters")
    .update({
      voice_id: voiceId,
      voice_settings: nextSettings as unknown as Json,
      voice_recipe: nextRecipe as unknown as Json,
    })
    .eq("id", characterId)
    .select("id")
    .single();
  if (updateError) {
    throw new CastingError(`Saved the voice but could not write it to the character: ${updateError.message}`);
  }
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
  /** The permanent characters.voice_id this bracket's winner was locked to.
   * null when no winner has been locked from THIS bracket. Used to detect a
   * re-cast (incl. on another device) that desyncs the crown from the DB. */
  lockedVoiceId: string | null;
};

export function emptyBracket(characterId: string): BracketState {
  return { characterId, favorites: [], pool: [], winner: null, lockedVoiceId: null };
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
export function setWinner(
  state: BracketState,
  candidate: AuditionCandidate,
  lockedVoiceId: string,
): BracketState {
  return { ...state, winner: candidate, lockedVoiceId };
}

export function resetBracket(state: BracketState): BracketState {
  return emptyBracket(state.characterId);
}

/**
 * Reconcile a loaded bracket against the character's canonical DB voice_id.
 * If the bracket crowned a winner but the live voice_id no longer matches the
 * voice that winner was locked to (a re-cast happened — possibly on another
 * device — or the voice was cleared), the crown is stale: drop winner +
 * lockedVoiceId so the UI never shows a stale "WINNER/live" state. Pool +
 * favorites are preserved (the operator may still be mid-triage). Returns the
 * reconciled state and whether anything was stale.
 */
export function reconcileBracket(
  state: BracketState,
  liveVoiceId: string | null | undefined,
): { state: BracketState; staleWinnerCleared: boolean } {
  if (state.winner && state.lockedVoiceId !== (liveVoiceId ?? null)) {
    return {
      state: { ...state, winner: null, lockedVoiceId: null },
      staleWinnerCleared: true,
    };
  }
  return { state, staleWinnerCleared: false };
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
      lockedVoiceId: typeof parsed.lockedVoiceId === "string" ? parsed.lockedVoiceId : null,
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
