import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";
import { BIBLE_FIELDS, type Bible } from "@/lib/types";

type CharacterGeneratorClient = SupabaseClient<SupabaseCompatibleDatabase>;

const EDGE_FUNCTION = "character-proxy";
export const CHARACTER_CONCEPT_MIN = 30;
export const CHARACTER_CONCEPT_MAX = 2000;
export const CHARACTER_DAILY_CAP = 25;

export type GeneratedCharacter = {
  codename: string;
  bible: Required<Pick<Bible, (typeof BIBLE_FIELDS)[number]>>;
};

export class CharacterGenerationError extends Error {
  readonly capReached: boolean;

  constructor(message: string, capReached = false) {
    super(message);
    this.name = "CharacterGenerationError";
    this.capReached = capReached;
  }
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function buildCharacterGenerationRequest(concept: string) {
  const trimmed = concept.trim();
  if (trimmed.length < CHARACTER_CONCEPT_MIN) {
    throw new CharacterGenerationError(
      `Write at least ${CHARACTER_CONCEPT_MIN} characters describing the character first.`,
    );
  }
  if (trimmed.length > CHARACTER_CONCEPT_MAX) {
    throw new CharacterGenerationError(
      `Character concept is too long (max ${CHARACTER_CONCEPT_MAX} characters).`,
    );
  }
  return { concept: trimmed };
}

async function edgeError(error: unknown): Promise<CharacterGenerationError> {
  if (error && typeof error === "object") {
    const context = (error as { context?: { status?: number; json?: () => Promise<unknown> } }).context;
    if (context?.status === 429) {
      return new CharacterGenerationError(
        "Daily character-generation cap reached. Try again tomorrow.",
        true,
      );
    }
    if (context?.status === 401) {
      return new CharacterGenerationError("Your session expired — sign in again to generate.");
    }
    if (typeof context?.json === "function") {
      try {
        const body = (await context.json()) as { error?: unknown; cap_reached?: unknown };
        if (typeof body?.error === "string" && body.error) {
          return new CharacterGenerationError(body.error, Boolean(body.cap_reached));
        }
      } catch {
        // Fall through to the transport message.
      }
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return new CharacterGenerationError(message);
  }
  return new CharacterGenerationError("Could not generate a character.");
}

export function parseGeneratedCharacter(value: unknown): GeneratedCharacter {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawBible = raw.bible && typeof raw.bible === "object"
    ? raw.bible as Record<string, unknown>
    : {};
  const codename = cleanString(raw.codename);
  const bible = Object.fromEntries(
    BIBLE_FIELDS.map((field) => [field, cleanString(rawBible[field])]),
  ) as GeneratedCharacter["bible"];

  if (!codename || BIBLE_FIELDS.some((field) => !bible[field])) {
    throw new CharacterGenerationError("The model did not return a complete character draft.");
  }
  return { codename, bible };
}

export async function generateCharacter(
  client: CharacterGeneratorClient,
  concept: string,
): Promise<GeneratedCharacter> {
  const body = buildCharacterGenerationRequest(concept);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION, { body });
  if (error) throw await edgeError(error);
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    throw new CharacterGenerationError((data as { error: string }).error);
  }
  return parseGeneratedCharacter(data);
}
