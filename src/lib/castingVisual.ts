import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";
import type { Character } from "@/lib/types";

type VisualCastingClient = SupabaseClient<SupabaseCompatibleDatabase>;

export const CHARACTER_REFS_BUCKET = "character-refs";
export const REF_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const REF_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const EXT_BY_MIME: Record<(typeof REF_IMAGE_MIME_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export class VisualIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisualIdentityError";
  }
}

export function isVisuallyCast(c: Pick<Character, "reference_image_url">): boolean {
  return c.reference_image_url != null && c.reference_image_url.trim().length > 0;
}

export function validateRefImage(file: File): string | null {
  if (!REF_IMAGE_MIME_TYPES.includes(file.type as (typeof REF_IMAGE_MIME_TYPES)[number])) {
    return "Use a JPEG, PNG, or WEBP reference image.";
  }
  if (file.size > REF_IMAGE_MAX_BYTES) {
    return "Reference image must be 5MB or smaller.";
  }
  return null;
}

export function refImagePath(ownerId: string, characterId: string, file: Pick<File, "type">): string {
  const ext = EXT_BY_MIME[file.type as (typeof REF_IMAGE_MIME_TYPES)[number]];
  if (!ext) {
    throw new VisualIdentityError("Unsupported reference image type.");
  }
  return `${ownerId}/${characterId}/ref-${crypto.randomUUID()}.${ext}`;
}

export async function uploadRefImage(
  supabase: VisualCastingClient,
  ownerId: string,
  characterId: string,
  file: File,
): Promise<string> {
  const validationError = validateRefImage(file);
  if (validationError) {
    throw new VisualIdentityError(validationError);
  }
  const path = refImagePath(ownerId, characterId, file);
  const { error } = await supabase.storage.from(CHARACTER_REFS_BUCKET).upload(path, file);
  if (error) {
    throw new VisualIdentityError(error.message || "Could not upload reference image.");
  }
  return path;
}

export async function lockVisualIdentity(
  supabase: VisualCastingClient,
  characterId: string,
  path: string,
  visualStyle: string,
): Promise<void> {
  const style = visualStyle.trim();
  if (style.length < 3) {
    throw new VisualIdentityError("Visual style must be at least 3 characters.");
  }
  const { error } = await supabase
    .from("characters")
    .update({ reference_image_url: path, visual_style: style })
    .eq("id", characterId);
  if (error) {
    throw new VisualIdentityError(error.message || "Could not lock visual identity.");
  }
}

export async function unlockVisualIdentity(
  supabase: VisualCastingClient,
  characterId: string,
): Promise<void> {
  const { error } = await supabase
    .from("characters")
    .update({ reference_image_url: null, visual_style: null })
    .eq("id", characterId);
  if (error) {
    throw new VisualIdentityError(error.message || "Could not remove visual identity.");
  }
}

export async function signedRefImageUrl(
  supabase: VisualCastingClient,
  path: string,
  ttlSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CHARACTER_REFS_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new VisualIdentityError(error?.message || "Could not open secure reference image.");
  }
  return data.signedUrl;
}
