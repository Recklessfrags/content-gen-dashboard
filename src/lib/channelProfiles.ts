import type { Json, Tables, TablesInsert } from "@/lib/database.types";

export type ChannelProfile = Tables<"channel_profiles">;
export type ChannelProfileUpsertInput = TablesInsert<"channel_profiles">;

export const CLAIM_DISCIPLINE = ["fact_first", "loose", "none"] as const;
export type ClaimDiscipline = (typeof CLAIM_DISCIPLINE)[number];

export const AROUSAL_CEILING = ["conservative", "standard", "aggressive"] as const;
export type ArousalCeiling = (typeof AROUSAL_CEILING)[number];

export const FACT_ANCHOR = [
  "fda_standard_of_identity",
  "declassified_primary_doc",
  "none",
] as const;
export type FactAnchor = (typeof FACT_ANCHOR)[number];

export const TREATMENT = [
  "archival_documentary",
  "motion_graphic",
  "avatar",
  "live_demo",
] as const;
export type Treatment = (typeof TREATMENT)[number];

export const VOICE_ARCHETYPE_SUGGESTIONS = [
  "drill_instructor",
  "calm_explainer",
  "npr_explainer",
  "hype_announcer",
] as const;
export type VoiceArchetypeSuggestion = (typeof VOICE_ARCHETYPE_SUGGESTIONS)[number];

export type EngagementPosture = {
  claim_discipline: ClaimDiscipline;
  arousal_ceiling: ArousalCeiling;
};

export type Packaging = {
  title_style?: string;
  thumbnail_style?: string;
};

export type LengthTarget = {
  short_s?: number;
};

export const DEFAULT_ENGAGEMENT_POSTURE: EngagementPosture = {
  claim_discipline: "fact_first",
  arousal_ceiling: "conservative",
};

export const DEFAULT_SOURCE_LADDER = [
  "archival",
  "still_motion",
  "generated",
] as const;

type JsonRecord = { [key: string]: Json | undefined };

function isJsonRecord(json: Json): json is JsonRecord {
  return json !== null && typeof json === "object" && !Array.isArray(json);
}

function isCatalogValue<const T extends readonly string[]>(
  value: unknown,
  catalog: T,
): value is T[number] {
  return typeof value === "string" && catalog.includes(value);
}

function stringField(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function parseStringArray(json: Json): string[] {
  if (!Array.isArray(json)) {
    return [];
  }

  return json
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitListInput(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinListInput(items: string[]): string {
  return items.join("\n");
}

export function parseEngagementPosture(json: Json): EngagementPosture {
  if (!isJsonRecord(json)) {
    return { ...DEFAULT_ENGAGEMENT_POSTURE };
  }

  const claimDiscipline = stringField(json, "claim_discipline");
  const arousalCeiling = stringField(json, "arousal_ceiling");

  return {
    claim_discipline: isCatalogValue(claimDiscipline, CLAIM_DISCIPLINE)
      ? claimDiscipline
      : DEFAULT_ENGAGEMENT_POSTURE.claim_discipline,
    arousal_ceiling: isCatalogValue(arousalCeiling, AROUSAL_CEILING)
      ? arousalCeiling
      : DEFAULT_ENGAGEMENT_POSTURE.arousal_ceiling,
  };
}

export function parseSourceLadder(json: Json): string[] {
  return parseStringArray(json);
}

export function parsePlatforms(json: Json): string[] {
  return parseStringArray(json);
}

export function parsePackaging(json: Json): Packaging {
  if (!isJsonRecord(json)) {
    return {};
  }

  const titleStyle = stringField(json, "title_style")?.trim();
  const thumbnailStyle = stringField(json, "thumbnail_style")?.trim();
  const packaging: Packaging = {};

  if (titleStyle) {
    packaging.title_style = titleStyle;
  }

  if (thumbnailStyle) {
    packaging.thumbnail_style = thumbnailStyle;
  }

  return packaging;
}

export function parseLengthTarget(json: Json): LengthTarget {
  if (!isJsonRecord(json)) {
    return {};
  }

  const shortS = json.short_s;

  if (typeof shortS !== "number" || !Number.isFinite(shortS)) {
    return {};
  }

  return { short_s: shortS };
}

export function defaultChannelProfile(channel: string): TablesInsert<"channel_profiles"> {
  return {
    channel,
    display_name: channel === "default" ? "Default (food behavior)" : "",
    fact_anchor: "fda_standard_of_identity",
    treatment: "archival_documentary",
    character: null,
    source_ladder: [...DEFAULT_SOURCE_LADDER],
    voice_archetype: null,
    packaging: {},
    engagement_posture: { ...DEFAULT_ENGAGEMENT_POSTURE },
    length_target: { short_s: 75 },
    platforms: [],
  };
}

export function validateChannelProfile(input: ChannelProfileUpsertInput): string[] {
  const errors: string[] = [];
  const channel = input.channel.trim();
  const factAnchor = input.fact_anchor ?? "none";
  const treatment = input.treatment ?? "archival_documentary";
  const engagementPosture =
    input.engagement_posture !== undefined && isJsonRecord(input.engagement_posture)
      ? input.engagement_posture
      : {};
  const claimDiscipline = engagementPosture.claim_discipline;
  const arousalCeiling = engagementPosture.arousal_ceiling;

  if (!channel) {
    errors.push("channel is required");
  }

  if (!isCatalogValue(factAnchor, FACT_ANCHOR)) {
    errors.push("fact_anchor is invalid");
  }

  if (!isCatalogValue(treatment, TREATMENT)) {
    errors.push("treatment is invalid");
  }

  if (
    claimDiscipline !== undefined &&
    !isCatalogValue(claimDiscipline, CLAIM_DISCIPLINE)
  ) {
    errors.push("engagement_posture.claim_discipline is invalid");
  }

  if (
    arousalCeiling !== undefined &&
    !isCatalogValue(arousalCeiling, AROUSAL_CEILING)
  ) {
    errors.push("engagement_posture.arousal_ceiling is invalid");
  }

  return errors;
}

export function buildChannelProfileUpsert(
  input: ChannelProfileUpsertInput,
): TablesInsert<"channel_profiles"> {
  const errors = validateChannelProfile(input);

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return {
    channel: input.channel.trim(),
    display_name: input.display_name?.trim() ?? "",
    fact_anchor: input.fact_anchor ?? "none",
    treatment: input.treatment ?? "archival_documentary",
    character: input.character?.trim() || null,
    source_ladder: parseSourceLadder(input.source_ladder ?? []),
    voice_archetype: input.voice_archetype?.trim() || null,
    packaging: parsePackaging(input.packaging ?? {}),
    engagement_posture: parseEngagementPosture(input.engagement_posture ?? {}),
    length_target: parseLengthTarget(input.length_target ?? {}),
    platforms: parsePlatforms(input.platforms ?? []),
  };
}
