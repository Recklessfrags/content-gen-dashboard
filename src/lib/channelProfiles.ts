import type { Json, Tables, TablesInsert } from "@/lib/database.types";

export type ChannelProfile = Tables<"channel_profiles">;
export type ChannelProfileUpsertInput = TablesInsert<"channel_profiles">;

export const CLAIM_DISCIPLINE = ["fact_first", "loose", "none"] as const;
export type ClaimDiscipline = (typeof CLAIM_DISCIPLINE)[number];

export const AROUSAL_CEILING = [
  "conservative",
  "standard",
  "aggressive",
] as const;
export type ArousalCeiling = (typeof AROUSAL_CEILING)[number];

export const FACT_ANCHOR = [
  "fda_standard_of_identity",
  "declassified_primary_doc",
  "none",
] as const;
export type FactAnchor = (typeof FACT_ANCHOR)[number];

export const RESEARCH_ANCHOR_TYPE = [
  "fda_standard_of_identity",
  "declassified_primary_doc",
  "scripture",
  "none",
] as const;
export type ResearchAnchorType = (typeof RESEARCH_ANCHOR_TYPE)[number];

export const TREATMENT = [
  "archival_documentary",
  "motion_graphic",
  "avatar",
  "live_demo",
] as const;
export type Treatment = (typeof TREATMENT)[number];

// Suggestion hints for the (free-text, open-vocabulary) voice_archetype field.
// The PIPELINE is the authority on accepted archetypes; this list is a
// hand-maintained convenience copy and can drift — the durable fix is to
// generate it from the pipeline's shared vocabulary contract
// (docs/contracts/vocabularies.json, incoming) instead of editing here.
export const VOICE_ARCHETYPE_SUGGESTIONS = [
  "drill_instructor",
  "calm_explainer",
  "warm_storyteller",
  "npr_explainer",
  "hype_announcer",
] as const;
export type VoiceArchetypeSuggestion =
  (typeof VOICE_ARCHETYPE_SUGGESTIONS)[number];

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

export type ParsedShortSeconds =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

export function parseShortSeconds(raw: string): ParsedShortSeconds {
  const normalized = raw.trim();
  if (!normalized) return { ok: true, value: null };

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > 180) {
    return { ok: false, error: "Short length must be between 1 and 180 seconds." };
  }

  return { ok: true, value };
}

export type ResearchProfile = {
  anchor_type: ResearchAnchorType;
  source_hierarchy: string[];
  thesis: string | null;
};

export type Sourcing = {
  artifact_types: string[];
  stock_vision_gate: boolean;
  max_generated_clips: number | null;
  generation_budget_usd: number | null;
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

export function parseResearchProfile(json: Json): ResearchProfile {
  if (!isJsonRecord(json)) {
    return {
      anchor_type: "fda_standard_of_identity",
      source_hierarchy: [],
      thesis: null,
    };
  }

  const anchorType = stringField(json, "anchor_type");
  const thesis = stringField(json, "thesis") ?? null;

  return {
    anchor_type: isCatalogValue(anchorType, RESEARCH_ANCHOR_TYPE)
      ? anchorType
      : "fda_standard_of_identity",
    source_hierarchy: parseStringArray(json.source_hierarchy ?? []),
    thesis,
  };
}

export function parseSourcing(json: Json): Sourcing {
  if (!isJsonRecord(json)) {
    return {
      artifact_types: [],
      stock_vision_gate: false,
      max_generated_clips: null,
      generation_budget_usd: null,
    };
  }

  const maxGeneratedClips = json.max_generated_clips;
  const generationBudgetUsd = json.generation_budget_usd;

  return {
    artifact_types: parseStringArray(json.artifact_types ?? []),
    stock_vision_gate:
      typeof json.stock_vision_gate === "boolean"
        ? json.stock_vision_gate
        : false,
    max_generated_clips:
      typeof maxGeneratedClips === "number" && Number.isFinite(maxGeneratedClips)
        ? maxGeneratedClips
        : null,
    generation_budget_usd:
      typeof generationBudgetUsd === "number" &&
      Number.isFinite(generationBudgetUsd)
        ? generationBudgetUsd
        : null,
  };
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

export function defaultChannelProfile(
  channel: string,
): TablesInsert<"channel_profiles"> {
  return {
    channel,
    description: "",
    display_name: channel === "default" ? "Default (food behavior)" : "",
    fact_anchor: "fda_standard_of_identity",
    treatment: "archival_documentary",
    character_id: null,
    character: null,
    source_ladder: [...DEFAULT_SOURCE_LADDER],
    voice_archetype: null,
    packaging: {},
    engagement_posture: { ...DEFAULT_ENGAGEMENT_POSTURE },
    length_target: { short_s: 75 },
    platforms: [],
  };
}

export function validateChannelProfile(
  input: ChannelProfileUpsertInput,
): string[] {
  const errors: string[] = [];
  const channel = input.channel.trim();
  const factAnchor = input.fact_anchor ?? "none";
  const treatment = input.treatment ?? "archival_documentary";
  const engagementPosture =
    input.engagement_posture !== undefined &&
    isJsonRecord(input.engagement_posture)
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

// research_profile and sourcing are pipeline-owned; the dashboard intentionally
// omits them from the upsert so an on-conflict update never clobbers them. A UI
// to edit them is a future, separately-gated build.
export function buildChannelProfileUpsert(
  input: ChannelProfileUpsertInput,
): TablesInsert<"channel_profiles"> {
  const errors = validateChannelProfile(input);

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return {
    channel: input.channel.trim(),
    description: input.description?.trim() ?? "",
    display_name: input.display_name?.trim() ?? "",
    fact_anchor: input.fact_anchor ?? "none",
    treatment: input.treatment ?? "archival_documentary",
    character_id: input.character_id ?? null,
    character: input.character?.trim() || null,
    source_ladder: parseSourceLadder(input.source_ladder ?? []),
    voice_archetype: input.voice_archetype?.trim() || null,
    packaging: parsePackaging(input.packaging ?? {}),
    engagement_posture: parseEngagementPosture(input.engagement_posture ?? {}),
    length_target: parseLengthTarget(input.length_target ?? {}),
    platforms: parsePlatforms(input.platforms ?? []),
  };
}
