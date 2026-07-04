import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";

type ChannelGuidelineClient = SupabaseClient<SupabaseCompatibleDatabase>;

const EDGE_FUNCTION = "channel-guideline-proxy";

export const CHANNEL_GUIDELINE_DAILY_CAP = 10;
export const DESCRIPTION_MIN = 30;

export type GuidelineSuggestions = {
  display_name: string;
  voice_archetype: string;
  fact_anchor: string;
  treatment: string;
  engagement_posture: { claim_discipline: string; arousal_ceiling: string };
  source_ladder: string[];
  packaging: { title_style: string; thumbnail_style: string };
  length_target: { short_s: number };
  platforms: string[];
};

export type CastBrief = { voice_description: string; preview_line: string };
export type GuidelineGenResult = { brief: string; suggestions: GuidelineSuggestions; assumptions: string[]; cast_brief: CastBrief };

export class GuidelineGenError extends Error {
  readonly capReached: boolean;
  constructor(message: string, capReached = false) {
    super(message);
    this.name = "GuidelineGenError";
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
      return { message: "Daily generation cap reached. Auto-generation is locked until tomorrow.", capReached: true };
    }
    if (status === 401) {
      return { message: "Your session expired — sign in again to generate.", capReached: false };
    }
    if (typeof msg === "string" && msg.length > 0) {
      return { message: msg, capReached: false };
    }
  }
  return { message: fallback, capReached: false };
}

export async function generateChannelGuidelines(
  client: ChannelGuidelineClient,
  description: string,
): Promise<GuidelineGenResult> {
  const trimmed = description.trim();
  if (trimmed.length < DESCRIPTION_MIN) {
    throw new GuidelineGenError(`Write at least ${DESCRIPTION_MIN} characters describing the channel first.`);
  }
  const { data, error } = await client.functions.invoke<{ brief?: string; suggestions?: GuidelineSuggestions; assumptions?: string[]; cast_brief?: { voice_description?: string; preview_line?: string }; error?: string }>(EDGE_FUNCTION, {
    body: { action: "generate", description: trimmed },
  });
  if (error) {
    const mapped = edgeErrorMessage(error, "Could not generate guidelines.");
    throw new GuidelineGenError(mapped.message, mapped.capReached);
  }
  if (data?.error) {
    throw new GuidelineGenError(data.error);
  }
  if (!data?.suggestions) {
    throw new GuidelineGenError("The model did not return a usable suggestion.");
  }
  return {
    brief: typeof data.brief === "string" ? data.brief : "",
    suggestions: data.suggestions,
    assumptions: Array.isArray(data.assumptions) ? data.assumptions : [],
    cast_brief: {
      voice_description: typeof data.cast_brief?.voice_description === "string" ? data.cast_brief.voice_description : "",
      preview_line: typeof data.cast_brief?.preview_line === "string" ? data.cast_brief.preview_line : "",
    },
  };
}
