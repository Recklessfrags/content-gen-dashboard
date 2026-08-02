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
