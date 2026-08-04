import type { Json } from "@/lib/database.types";

export type ConsumerKind = "pipeline" | "dashboard" | "inert";

export type FieldConsumption = {
  field: string;
  kind: ConsumerKind;
  /** Operator-facing one-liner. Plain English, no jargon. */
  note: string;
  /** Human names of the real consumers. Empty for kind "inert". */
  consumers: readonly string[];
  /** For inert fields shadowed by a real pipeline key, the key that actually governs. */
  shadowedBy?: string;
};

export const CHANNEL_FIELD_CONSUMPTION: Readonly<Record<string, FieldConsumption>> = {
  engagement_posture: {
    field: "engagement_posture",
    kind: "pipeline",
    note: "Used by the pipeline to enforce the channel's engagement limits.",
    consumers: ["Content pipeline"],
  },
  length_target: {
    field: "length_target",
    kind: "pipeline",
    note: "Used by the pipeline to set the target runtime.",
    consumers: ["Content pipeline"],
  },
  character_id: {
    field: "character_id",
    kind: "pipeline",
    note: "Used by the pipeline to identify the channel's character.",
    consumers: ["Content pipeline"],
  },
  voice_archetype: {
    field: "voice_archetype",
    kind: "pipeline",
    note: "Used by the pipeline as the channel's voice direction.",
    consumers: ["Content pipeline"],
  },
  display_name: {
    field: "display_name",
    kind: "dashboard",
    note: "Dashboard only — shown as the channel's name and used when suggesting a persona.",
    consumers: ["Channel dashboard", "Persona suggestion"],
  },
  description: {
    field: "description",
    kind: "dashboard",
    note: "Dashboard only — describes the channel and helps generate guidelines and suggest a persona.",
    consumers: ["Channel dashboard", "Guideline generation", "Persona suggestion"],
  },
  character: {
    field: "character",
    kind: "dashboard",
    note: "Dashboard only — keeps the character name visible for older channel records.",
    consumers: ["Channel dashboard"],
  },
  treatment: {
    field: "treatment",
    kind: "dashboard",
    note: "Dashboard only — the pipeline never reads it. It sets the channel card's style label and helps suggest a persona.",
    consumers: ["Channel card", "Persona suggestion"],
  },
  fact_anchor: {
    field: "fact_anchor",
    kind: "dashboard",
    note: "Dashboard only — the pipeline never reads it. It helps suggest a persona.",
    consumers: ["Persona suggestion"],
  },
  source_ladder: {
    field: "source_ladder",
    kind: "inert",
    note: "Not used by the pipeline. Actual footage routing comes from `sourcing.escalation_ladder`.",
    consumers: [],
    shadowedBy: "sourcing.escalation_ladder",
  },
  packaging: {
    field: "packaging",
    kind: "inert",
    note: "Stored for visibility, but nothing reads these presentation values.",
    consumers: [],
  },
  platforms: {
    field: "platforms",
    kind: "inert",
    note: "Stored for visibility, but nothing reads this platform list.",
    consumers: [],
  },
  "sourcing.archival_metadata_only_weight": {
    field: "sourcing.archival_metadata_only_weight",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.archival_miss_fallback": {
    field: "sourcing.archival_miss_fallback",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.archival_providers": {
    field: "sourcing.archival_providers",
    kind: "pipeline",
    note: "Used by the pipeline to select archival providers.",
    consumers: ["Content pipeline"],
  },
  "sourcing.archival_relevance_weight_floor": {
    field: "sourcing.archival_relevance_weight_floor",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.archival_still_retry_max_cuts": {
    field: "sourcing.archival_still_retry_max_cuts",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.archival_vision_gate": {
    field: "sourcing.archival_vision_gate",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.artifact_types": {
    field: "sourcing.artifact_types",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.artifact_vision_cap": {
    field: "sourcing.artifact_vision_cap",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.assembly_max_spend": {
    field: "sourcing.assembly_max_spend",
    kind: "pipeline",
    note: "Per-episode assembly spend ceiling the pipeline enforces. This is the key the 2026-08-01 wipe destroyed; a bad write here silently removes the episode cost ceiling.",
    consumers: ["Content pipeline"],
  },
  "sourcing.min_relevance_overlap": {
    field: "sourcing.min_relevance_overlap",
    kind: "pipeline",
    note: "pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.archival_medium_denylist": {
    field: "sourcing.archival_medium_denylist",
    kind: "pipeline",
    note: "pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.generation_failure_kill_threshold": {
    field: "sourcing.generation_failure_kill_threshold",
    kind: "pipeline",
    note: "pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.generation_failure_spend_cap_usd": {
    field: "sourcing.generation_failure_spend_cap_usd",
    kind: "pipeline",
    note: "pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.craft_hook_window_s": {
    field: "sourcing.craft_hook_window_s",
    kind: "pipeline",
    note: "pipeline-read; R6-4 Tier-2 hook window in seconds. 0 disables BOTH the relatedness check and the static-hook check for this channel -- the intended switch for deliberately static formats.",
    consumers: ["Content pipeline"],
  },
  "sourcing.craft_min_luma_variance": {
    field: "sourcing.craft_min_luma_variance",
    kind: "pipeline",
    note: "pipeline-read; R6-4 near-blank-frame floor, grayscale 0-255 population variance. 0 disables. Default 100 was measured: a real render shipped a frame at mean luma 1.1/255.",
    consumers: ["Content pipeline"],
  },
  "sourcing.craft_flag_static_hook": {
    field: "sourcing.craft_flag_static_hook",
    kind: "pipeline",
    note: "pipeline-read; R6-4. When false, the 100%-static-hook proxy reports not_run instead of firing. Set false for held-shot formats.",
    consumers: ["Content pipeline"],
  },
  "sourcing.craft_phash_hamming_max": {
    field: "sourcing.craft_phash_hamming_max",
    kind: "pipeline",
    note: "pipeline-read; R6-1 craft gates. Threshold for near-identical FRAME detection only -- measured NOT to catch same-subject repetition.",
    consumers: ["Content pipeline"],
  },
  "sourcing.craft_rhythm_band_ratio": {
    field: "sourcing.craft_rhythm_band_ratio",
    kind: "pipeline",
    note: "pipeline-read; R6-1 shot-rhythm monotony band, RELATIVE (max/min - 1), not seconds. Renamed from craft_rhythm_band_sec per pipeline P41 -- the units were wrong. Correct, but measured NOT effective: flags zero runs on a render a director scored 3-4/10 for pacing.",
    consumers: ["Content pipeline"],
  },
  "sourcing.craft_rhythm_run_min": {
    field: "sourcing.craft_rhythm_run_min",
    kind: "pipeline",
    note: "pipeline-read; R6-1 minimum run length before monotony is flagged.",
    consumers: ["Content pipeline"],
  },
  "sourcing.craft_subject_confusables": {
    field: "sourcing.craft_subject_confusables",
    kind: "pipeline",
    note: "pipeline-read; R6-1 per-channel confusable subjects (e.g. cottage cheese -> brie) for the free subject pre-filter.",
    consumers: ["Content pipeline"],
  },
  "sourcing.escalation_ladder": {
    field: "sourcing.escalation_ladder",
    kind: "pipeline",
    note: "Used by the pipeline to set the footage routing order.",
    consumers: ["Content pipeline"],
  },
  "sourcing.escalation_max_cuts": {
    field: "sourcing.escalation_max_cuts",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.generation_budget_usd": {
    field: "sourcing.generation_budget_usd",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.generation_model": {
    field: "sourcing.generation_model",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.generation_model_ladder": {
    field: "sourcing.generation_model_ladder",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.generation_retries": {
    field: "sourcing.generation_retries",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.generation_tier": {
    field: "sourcing.generation_tier",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.live_retrieval": {
    field: "sourcing.live_retrieval",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.loc_call_budget": {
    field: "sourcing.loc_call_budget",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.low_specificity_tokens": {
    field: "sourcing.low_specificity_tokens",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.low_specificity_weight": {
    field: "sourcing.low_specificity_weight",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.max_artifact_cuts": {
    field: "sourcing.max_artifact_cuts",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.max_asset_reuse": {
    field: "sourcing.max_asset_reuse",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.max_generated_clips": {
    field: "sourcing.max_generated_clips",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.on_below_floor": {
    field: "sourcing.on_below_floor",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.on_topic_ratio_floor": {
    field: "sourcing.on_topic_ratio_floor",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.provider_retry_max_attempts_per_call": {
    field: "sourcing.provider_retry_max_attempts_per_call",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.provider_retry_max_per_episode": {
    field: "sourcing.provider_retry_max_per_episode",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.query_vocabulary": {
    field: "sourcing.query_vocabulary",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.relevance_floor": {
    field: "sourcing.relevance_floor",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.repair_degrade_mode": {
    field: "sourcing.repair_degrade_mode",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.repair_max_attempts_per_cut": {
    field: "sourcing.repair_max_attempts_per_cut",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.repair_max_cuts_per_episode": {
    field: "sourcing.repair_max_cuts_per_episode",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.repair_max_paid_attempts_per_episode": {
    field: "sourcing.repair_max_paid_attempts_per_episode",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.repair_unrepairable_park_ratio": {
    field: "sourcing.repair_unrepairable_park_ratio",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.repair_unshippable_park_ratio": {
    field: "sourcing.repair_unshippable_park_ratio",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.retrieval_call_budget": {
    field: "sourcing.retrieval_call_budget",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.retrieval_fee_estimate_usd": {
    field: "sourcing.retrieval_fee_estimate_usd",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.stock_on_below_floor": {
    field: "sourcing.stock_on_below_floor",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.stock_on_topic_action": {
    field: "sourcing.stock_on_topic_action",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.stock_text_screen": {
    field: "sourcing.stock_text_screen",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.stock_vision_gate": {
    field: "sourcing.stock_vision_gate",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
  "sourcing.visual_relevance_vision_cap": {
    field: "sourcing.visual_relevance_vision_cap",
    kind: "pipeline",
    note: "Pipeline-read; semantics not documented dashboard-side.",
    consumers: ["Content pipeline"],
  },
};

export function fieldConsumption(field: string): FieldConsumption | null {
  return CHANNEL_FIELD_CONSUMPTION[field] ?? null;
}

export function isInertChannelField(field: string): boolean {
  return fieldConsumption(field)?.kind === "inert";
}

// These local tuples are the TypeScript source of truth. Contract parity tests
// deliberately fail when the vendored pipeline vocabulary changes.
export const PIPELINE_ESCALATION_TIERS = ["archival", "pixabay"] as const;
export const PIPELINE_ARCHIVAL_PROVIDERS = [
  "internet_archive",
  "loc",
  "wikimedia_commons",
] as const;
export const PIPELINE_DEFAULT_ESCALATION_LADDER = ["archival"] as const;
export const PIPELINE_DEFAULT_ARCHIVAL_PROVIDERS = [
  "internet_archive",
  "wikimedia_commons",
] as const;
// Display order is intentionally local. Its permutation test makes drift loud.
export const PIPELINE_RESEARCH_ANCHORS = [
  "fda_standard_of_identity",
  "declassified_primary_doc",
  "scripture",
  "none",
] as const;

const PIPELINE_ESCALATION_TIER_SET = new Set<string>(PIPELINE_ESCALATION_TIERS);
const PIPELINE_ARCHIVAL_PROVIDER_SET = new Set<string>(PIPELINE_ARCHIVAL_PROVIDERS);
const PIPELINE_RESEARCH_ANCHOR_SET = new Set<string>(
  PIPELINE_RESEARCH_ANCHORS,
);

export type LadderResolution = {
  /** PRESENCE only: the key exists. Never type, emptiness, or equality-with-a-default. */
  configured: boolean;
  /** Exactly what the pipeline will use. */
  effective: string[];
  /** Configured entries the pipeline silently drops (unknown tiers). */
  ignored: string[];
  /** True when the pipeline falls back to its built-in default. */
  usesDefault: boolean;
  /** Raw stored value rendered for display when it is present but wholly unusable. */
  ignoredRaw: string | null;
};

export type AnchorResolution = {
  /** PRESENCE only: the anchor_type key exists. */
  configured: boolean;
  /** The anchor the pipeline honours, else null. */
  effective: string | null;
  /** Present-but-rejected value rendered for display, else null. */
  ignoredValue: string | null;
};

function jsonObject(
  value: Json | null | undefined,
): { [key: string]: Json | undefined } | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function displayRaw(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
}

export function resolveEscalationLadder(
  sourcing: Json | null | undefined,
): LadderResolution {
  const object = jsonObject(sourcing);
  const hasKey = Boolean(
    object && Object.prototype.hasOwnProperty.call(object, "escalation_ladder"),
  );
  const rawValue = hasKey ? object?.escalation_ladder : undefined;
  if (!hasKey) {
    return {
      configured: false,
      effective: [...PIPELINE_DEFAULT_ESCALATION_LADDER],
      ignored: [],
      usesDefault: true,
      ignoredRaw: null,
    };
  }

  if (typeof rawValue !== "string" && !Array.isArray(rawValue)) {
    return {
      configured: true,
      effective: [...PIPELINE_DEFAULT_ESCALATION_LADDER],
      ignored: [],
      usesDefault: true,
      ignoredRaw: displayRaw(rawValue),
    };
  }

  const entries = typeof rawValue === "string"
    ? rawValue.split(/[\s,]+/)
    : rawValue.map((entry) => String(entry));
  const normalized = entries.map((entry) => entry.trim()).filter(Boolean);

  if (normalized.length === 0) {
    return {
      configured: true,
      effective: [...PIPELINE_DEFAULT_ESCALATION_LADDER],
      ignored: [],
      usesDefault: true,
      ignoredRaw: displayRaw(rawValue),
    };
  }

  const lowered = normalized.map((entry) => entry.toLowerCase());
  return {
    configured: true,
    effective: lowered.filter((entry) => PIPELINE_ESCALATION_TIER_SET.has(entry)),
    ignored: lowered.filter((entry) => !PIPELINE_ESCALATION_TIER_SET.has(entry)),
    usesDefault: false,
    ignoredRaw: null,
  };
}

export function resolveArchivalProviders(
  sourcing: Json | null | undefined,
): LadderResolution {
  const object = jsonObject(sourcing);
  const hasKey = Boolean(
    object && Object.prototype.hasOwnProperty.call(object, "archival_providers"),
  );
  const rawValue = hasKey ? object?.archival_providers : undefined;
  if (!hasKey) {
    return {
      configured: false,
      effective: [...PIPELINE_DEFAULT_ARCHIVAL_PROVIDERS],
      ignored: [],
      usesDefault: true,
      ignoredRaw: null,
    };
  }

  if (typeof rawValue !== "string" && !Array.isArray(rawValue)) {
    return {
      configured: true,
      effective: [...PIPELINE_DEFAULT_ARCHIVAL_PROVIDERS],
      ignored: [],
      usesDefault: true,
      ignoredRaw: displayRaw(rawValue),
    };
  }

  const entries = typeof rawValue === "string"
    ? rawValue.split(/[\s,]+/)
    : rawValue.map((entry) => String(entry));
  const normalized = entries
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (normalized.length === 0) {
    return {
      configured: true,
      effective: [...PIPELINE_DEFAULT_ARCHIVAL_PROVIDERS],
      ignored: [],
      usesDefault: true,
      ignoredRaw: displayRaw(rawValue),
    };
  }

  return {
    configured: true,
    effective: normalized.filter((entry) => PIPELINE_ARCHIVAL_PROVIDER_SET.has(entry)),
    ignored: normalized.filter((entry) => !PIPELINE_ARCHIVAL_PROVIDER_SET.has(entry)),
    usesDefault: false,
    ignoredRaw: null,
  };
}

export function resolveResearchAnchor(
  researchProfile: Json | null | undefined,
): AnchorResolution {
  const object = jsonObject(researchProfile);
  const configured = Boolean(
    object && Object.prototype.hasOwnProperty.call(object, "anchor_type"),
  );
  if (!configured) return { configured: false, effective: null, ignoredValue: null };

  const value = object?.anchor_type;
  if (typeof value === "string" && PIPELINE_RESEARCH_ANCHOR_SET.has(value)) {
    return { configured: true, effective: value, ignoredValue: null };
  }
  return {
    configured: true,
    effective: null,
    ignoredValue: typeof value === "string" ? value : displayRaw(value),
  };
}
