import type { Json } from "@/lib/database.types";

export function recastTargetFromRecipe(recipe: Json | null | undefined): string | null {
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe)) return null;
  const value = recipe as Record<string, Json | undefined>;
  if (value.status !== "recast_target_recorded_not_cast") return null;
  if (typeof value.target !== "string" || value.target.trim().length === 0) return null;
  return value.target;
}
