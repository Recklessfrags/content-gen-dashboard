import type { Json, Tables, TablesInsert } from "@/lib/database.types";
import {
  PIPELINE_ARCHIVAL_PROVIDERS,
  PIPELINE_ESCALATION_TIERS,
} from "@/lib/channelFieldConsumption";

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
const RESEARCH_ANCHOR_TYPE_SET = new Set<string>(
  RESEARCH_ANCHOR_TYPE,
);

function isResearchAnchorType(value: unknown): value is ResearchAnchorType {
  return typeof value === "string" && RESEARCH_ANCHOR_TYPE_SET.has(value);
}

export const TREATMENT = [
  "archival_documentary",
  "motion_graphic",
  "avatar",
  "live_demo",
] as const;
export type Treatment = (typeof TREATMENT)[number];

export const VOICE_ARCHETYPE_SUGGESTIONS = [
  "calm_explainer",
  "drill_instructor",
  "field_reporter",
  "warm_storyteller",
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

export type ChannelProfilePipelineEdits = {
  sourcing?: {
    escalation_ladder?: string[];
    archival_providers?: string[];
  };
  research_profile?: {
    anchor_type?: ResearchAnchorType;
  };
};

export type ChannelProfilePipelinePatch = {
  sourcing?: NonNullable<ChannelProfilePipelineEdits["sourcing"]>;
  research_profile?: NonNullable<
    ChannelProfilePipelineEdits["research_profile"]
  >;
};

export type ChannelProfilePipelineMerge = {
  stored: Pick<ChannelProfile, "sourcing" | "research_profile">;
  edits: ChannelProfilePipelineEdits;
};

export type PipelineMergeResolution =
  | {
      ok: true;
      creating: true;
      stored: { sourcing: Json | null; research_profile: Json | null };
    }
  | { ok: true; creating: false }
  | { ok: false; reason: string };

export function resolvePipelineMerge(params: {
  creating?: boolean;
  channel: string;
  selectedProfile?: {
    channel: string;
    sourcing: Json | null;
    research_profile: Json | null;
  } | null;
  profiles: ReadonlyArray<{
    channel: string;
    sourcing: Json | null;
    research_profile: Json | null;
  }>;
}): PipelineMergeResolution {
  const name = params.channel.trim();
  if (params.creating ?? true) {
    const existing = params.profiles.find((p) => p.channel === name);
    if (existing) {
      return {
        ok: false,
        reason: `A channel named "${name}" already exists. Open it from Channels and edit it there — saving here would overwrite its pipeline settings.`,
      };
    }
    return {
      ok: true,
      creating: true,
      stored: { sourcing: null, research_profile: null },
    };
  }
  if (!params.selectedProfile) {
    return { ok: false, reason: "No channel selected to save." };
  }
  if (name !== params.selectedProfile.channel) {
    return {
      ok: false,
      reason: "The channel identity cannot be changed while editing. Create a new channel instead.",
    };
  }
  return {
    ok: true,
    creating: false,
  };
}

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
    anchor_type: isResearchAnchorType(anchorType)
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

function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function validateListVocabulary(
  field: string,
  values: readonly string[],
  allowed: readonly string[],
): string | null {
  const allowedValues = new Set(allowed);
  return normalizePipelineList(values).every((value) => allowedValues.has(value))
    ? null
    : `${field} must contain only: ${allowed.join(", ")}`;
}

function normalizePipelineList(values: readonly string[]): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function validateChannelProfilePipelineEdits(
  edits: ChannelProfilePipelineEdits,
): string[] {
  const errors: string[] = [];
  const sourcing = edits.sourcing;
  const researchProfile = edits.research_profile;

  if (sourcing && hasOwn(sourcing, "escalation_ladder")) {
    const error = validateListVocabulary(
      "sourcing.escalation_ladder",
      sourcing.escalation_ladder ?? [],
      PIPELINE_ESCALATION_TIERS,
    );
    if (error) errors.push(error);
  }

  if (sourcing && hasOwn(sourcing, "archival_providers")) {
    const error = validateListVocabulary(
      "sourcing.archival_providers",
      sourcing.archival_providers ?? [],
      PIPELINE_ARCHIVAL_PROVIDERS,
    );
    if (error) errors.push(error);
  }

  if (
    researchProfile &&
    hasOwn(researchProfile, "anchor_type") &&
    !isResearchAnchorType(researchProfile.anchor_type)
  ) {
    errors.push(
      `research_profile.anchor_type must be one of: ${RESEARCH_ANCHOR_TYPE.join(", ")}`,
    );
  }

  return errors;
}

function storedObject(value: Json | null): JsonRecord {
  return isJsonRecord(value) ? value : {};
}

function normalizePipelineEdits(
  edits: ChannelProfilePipelineEdits,
): ChannelProfilePipelineEdits {
  return {
    ...edits,
    sourcing: edits.sourcing
      ? {
          ...edits.sourcing,
          ...(hasOwn(edits.sourcing, "escalation_ladder")
            ? {
                escalation_ladder: normalizePipelineList(
                  edits.sourcing.escalation_ladder ?? [],
                ),
              }
            : {}),
          ...(hasOwn(edits.sourcing, "archival_providers")
            ? {
                archival_providers: normalizePipelineList(
                  edits.sourcing.archival_providers ?? [],
                ),
              }
            : {}),
        }
      : undefined,
  };
}

/** Build only the edited top-level keys sent to the server-side shallow merge. */
export function buildChannelProfilePipelinePatch(
  edits: ChannelProfilePipelineEdits,
): ChannelProfilePipelinePatch {
  const normalized = normalizePipelineEdits(edits);
  const errors = validateChannelProfilePipelineEdits(normalized);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  const patch: ChannelProfilePipelinePatch = {};
  if (normalized.sourcing) {
    patch.sourcing = { ...normalized.sourcing };
  }
  if (normalized.research_profile) {
    patch.research_profile = { ...normalized.research_profile };
  }
  return patch;
}

// Pipeline-owned groups are omitted unless a rendered field was edited. When a
// field is edited during creation, merge it over the create-time stored object.
// Existing rows use buildChannelProfilePipelinePatch + the server-side RPC so a
// mount-time snapshot can never overwrite a concurrent pipeline setting.
export function buildChannelProfileUpsert(
  input: ChannelProfileUpsertInput,
  pipelineMerge?: ChannelProfilePipelineMerge,
): TablesInsert<"channel_profiles"> {
  const pipelinePatch = buildChannelProfilePipelinePatch(
    pipelineMerge?.edits ?? {},
  );
  const errors = [...validateChannelProfile(input)];

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  const result: TablesInsert<"channel_profiles"> = {
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

  const sourcingEdits = pipelinePatch.sourcing;
  if (
    sourcingEdits &&
    (hasOwn(sourcingEdits, "escalation_ladder") ||
      hasOwn(sourcingEdits, "archival_providers"))
  ) {
    const sourcing: JsonRecord = {
      ...storedObject(pipelineMerge?.stored.sourcing ?? null),
    };
    if (hasOwn(sourcingEdits, "escalation_ladder")) {
      sourcing.escalation_ladder = sourcingEdits.escalation_ladder ?? [];
    }
    if (hasOwn(sourcingEdits, "archival_providers")) {
      sourcing.archival_providers = sourcingEdits.archival_providers ?? [];
    }
    result.sourcing = sourcing;
  }

  const researchEdits = pipelinePatch.research_profile;
  if (researchEdits && hasOwn(researchEdits, "anchor_type")) {
    result.research_profile = {
      ...storedObject(pipelineMerge?.stored.research_profile ?? null),
      anchor_type: researchEdits.anchor_type,
    };
  }

  return result;
}
