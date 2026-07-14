import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";

type CastingDescribeClient = SupabaseClient<SupabaseCompatibleDatabase>;

export const CASTING_PROMPT_MAX = 1000;

export type CastingDescribeResult = {
  voice_description: string;
  preview_text: string;
};

export class CastingDescribeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CastingDescribeError";
  }
}

export function buildCastingDescribeRequest(
  prompt: string,
  character?: { codename?: string | null; concept?: string | null },
) {
  const trimmed = prompt.trim();
  if (!trimmed) throw new CastingDescribeError("Describe the voice first.");
  if (trimmed.length > CASTING_PROMPT_MAX) {
    throw new CastingDescribeError(`Voice prompt must be ${CASTING_PROMPT_MAX} characters or fewer.`);
  }
  const context = character
    ? {
        ...(character.codename?.trim() ? { codename: character.codename.trim() } : {}),
        ...(character.concept?.trim() ? { concept: character.concept.trim() } : {}),
      }
    : undefined;
  return {
    action: "cast_describe" as const,
    prompt: trimmed,
    ...(context && Object.keys(context).length ? { character: context } : {}),
  };
}

async function errorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object") {
    const context = (error as { context?: { status?: number; json?: () => Promise<unknown> } }).context;
    if (context && typeof context.json === "function") {
      try {
        const body = (await context.json()) as { error?: unknown };
        if (typeof body?.error === "string" && body.error) return body.error;
      } catch {
        // Fall through to the transport message.
      }
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Could not draft the voice description.";
}

export async function draftCastingDescription(
  client: CastingDescribeClient,
  prompt: string,
  character?: { codename?: string | null; concept?: string | null },
): Promise<CastingDescribeResult> {
  const body = buildCastingDescribeRequest(prompt, character);
  const { data, error } = await client.functions.invoke<Partial<CastingDescribeResult> & { error?: string }>(
    "channel-guideline-proxy",
    { body },
  );
  if (error) throw new CastingDescribeError(await errorMessage(error));
  if (data?.error) throw new CastingDescribeError(data.error);
  if (typeof data?.voice_description !== "string" || typeof data?.preview_text !== "string") {
    throw new CastingDescribeError("The model did not return a usable casting draft.");
  }
  return { voice_description: data.voice_description, preview_text: data.preview_text };
}
