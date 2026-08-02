import { describe, expect, it } from "vitest";
import pipelineVocabularies from "@/lib/pipeline-vocabularies.json";
import {
  CHANNEL_FIELD_CONSUMPTION,
  PIPELINE_ARCHIVAL_PROVIDERS,
  PIPELINE_ESCALATION_TIERS,
  PIPELINE_RESEARCH_ANCHORS,
  isInertChannelField,
  resolveArchivalProviders,
  resolveEscalationLadder,
  resolveResearchAnchor,
} from "@/lib/channelFieldConsumption";
import { NICHE_FIELDS } from "@/lib/suggestPersona";
import type { Json } from "@/lib/database.types";

describe("channel field consumption", () => {
  it("uses the bundled pipeline contract for vocabulary membership", () => {
    expect(new Set(PIPELINE_ESCALATION_TIERS)).toEqual(
      new Set(pipelineVocabularies.escalation_tiers.values),
    );
    expect(PIPELINE_ESCALATION_TIERS).toHaveLength(
      pipelineVocabularies.escalation_tiers.values.length,
    );
    expect(new Set(PIPELINE_ARCHIVAL_PROVIDERS)).toEqual(
      new Set(pipelineVocabularies.archival_providers.values),
    );
    expect(PIPELINE_ARCHIVAL_PROVIDERS).toHaveLength(
      pipelineVocabularies.archival_providers.values.length,
    );
    expect(new Set(PIPELINE_RESEARCH_ANCHORS)).toEqual(
      new Set(pipelineVocabularies.anchor_types.values),
    );
    expect(PIPELINE_RESEARCH_ANCHORS).toHaveLength(
      pipelineVocabularies.anchor_types.values.length,
    );
  });

  it("records the pipeline commit that supplied the bundled contract", () => {
    expect(pipelineVocabularies.source_commit).toMatch(/^[0-9a-f]{7,40}$/);
  });

  it("classifies pipeline, dashboard, and inert fields", () => {
    for (const field of ["source_ladder", "packaging", "platforms"]) {
      expect(CHANNEL_FIELD_CONSUMPTION[field].kind).toBe("inert");
    }
    for (const field of ["treatment", "fact_anchor"]) {
      expect(CHANNEL_FIELD_CONSUMPTION[field].kind).toBe("dashboard");
    }
    for (const field of ["engagement_posture", "length_target", "character_id"]) {
      expect(CHANNEL_FIELD_CONSUMPTION[field].kind).toBe("pipeline");
    }
  });

  it("keeps inert classifications aligned with persona consumers", () => {
    const inertFields = Object.values(CHANNEL_FIELD_CONSUMPTION)
      .filter(({ kind }) => kind === "inert")
      .map(({ field }) => field);
    expect(inertFields.some((field) => NICHE_FIELDS.includes(field as never))).toBe(false);
    expect(NICHE_FIELDS).toContain("treatment");
    expect(NICHE_FIELDS).toContain("fact_anchor");
    expect(isInertChannelField("source_ladder")).toBe(true);
  });

  it("resolves every pipeline escalation-ladder case", () => {
    const fallback = { configured: false, effective: ["archival"], ignored: [], usesDefault: true, ignoredRaw: null };
    for (const value of [null, {}] as const) {
      expect(resolveEscalationLadder(value)).toEqual(fallback);
    }
    for (const [raw, ignoredRaw] of [[42, "42"], [{}, "{}"], [null, "null"], [true, "true"]] as const) {
      expect(resolveEscalationLadder({ escalation_ladder: raw })).toEqual({
        configured: true, effective: ["archival"], ignored: [], usesDefault: true, ignoredRaw,
      });
    }
    expect(resolveEscalationLadder({ escalation_ladder: [] })).toEqual({
      configured: true, effective: ["archival"], ignored: [], usesDefault: true, ignoredRaw: "[]",
    });
    expect(resolveEscalationLadder({ escalation_ladder: ["pixabay", null] })).toEqual({
      configured: true, effective: ["pixabay"], ignored: ["null"], usesDefault: false, ignoredRaw: null,
    });
    expect(resolveEscalationLadder({ escalation_ladder: ["archival", "still_motion", "generated"] })).toEqual({
      configured: true, effective: ["archival"], ignored: ["still_motion", "generated"], usesDefault: false, ignoredRaw: null,
    });
    expect(resolveEscalationLadder({ escalation_ladder: ["still_motion"] })).toEqual({
      configured: true, effective: [], ignored: ["still_motion"], usesDefault: false, ignoredRaw: null,
    });
    expect(resolveEscalationLadder({ escalation_ladder: ["archival", "pixabay"] })).toEqual({
      configured: true, effective: ["archival", "pixabay"], ignored: [], usesDefault: false, ignoredRaw: null,
    });
  });

  it("keeps ladder presence separate from an identical effective fallback", () => {
    expect(resolveEscalationLadder({})).toEqual({
      configured: false, effective: ["archival"], ignored: [], usesDefault: true, ignoredRaw: null,
    });
    expect(resolveEscalationLadder({ escalation_ladder: [] })).toEqual({
      configured: true, effective: ["archival"], ignored: [], usesDefault: true, ignoredRaw: "[]",
    });
    expect(resolveEscalationLadder({ escalation_ladder: 42 })).toEqual({
      configured: true, effective: ["archival"], ignored: [], usesDefault: true, ignoredRaw: "42",
    });
  });

  it("resolves archival providers with the pipeline default when unset", () => {
    const fallback = {
      configured: false,
      effective: ["internet_archive", "wikimedia_commons"],
      ignored: [],
      usesDefault: true,
      ignoredRaw: null,
    };

    expect(resolveArchivalProviders(undefined)).toEqual(fallback);
    expect(resolveArchivalProviders(null)).toEqual(fallback);
    expect(resolveArchivalProviders({})).toEqual(fallback);
  });

  it("normalizes configured archival providers like the pipeline", () => {
    expect(
      resolveArchivalProviders({
        archival_providers: [" Internet_Archive ", "WIKIMEDIA_COMMONS", "YouTube"],
      }),
    ).toEqual({
      configured: true,
      effective: ["internet_archive", "wikimedia_commons"],
      ignored: ["youtube"],
      usesDefault: false,
      ignoredRaw: null,
    });
  });

  it("treats every present ladder key as configured", () => {
    for (const raw of [42, {}, [], null, ""] as const) {
      expect(resolveEscalationLadder({ escalation_ladder: raw }).configured).toBe(true);
    }
  });

  it("normalizes string ladders and resolves research anchors", () => {
    expect(resolveEscalationLadder({ escalation_ladder: "archival, pixabay" })).toEqual({
      configured: true, effective: ["archival", "pixabay"], ignored: [], usesDefault: false, ignoredRaw: null,
    });
    expect(resolveResearchAnchor({})).toEqual({ configured: false, effective: null, ignoredValue: null });
    for (const value of ["", "banana"]) {
      expect(resolveResearchAnchor({ anchor_type: value })).toEqual({ configured: true, effective: null, ignoredValue: value });
    }
    const rejectedAnchors: Array<[Json, string]> = [
      [42, "42"],
      [["scripture"], '["scripture"]'],
      [null, "null"],
    ];
    for (const [raw, ignoredValue] of rejectedAnchors) {
      expect(resolveResearchAnchor({ anchor_type: raw })).toEqual({ configured: true, effective: null, ignoredValue });
    }
    expect(resolveResearchAnchor({ anchor_type: "scripture" })).toEqual({ configured: true, effective: "scripture", ignoredValue: null });
  });

  it("treats every present anchor key as configured", () => {
    for (const raw of ["", "banana", 42, ["scripture"], null] as Json[]) {
      expect(resolveResearchAnchor({ anchor_type: raw }).configured).toBe(true);
    }
  });

  it("serializes non-string rejected anchors for honest display", () => {
    expect(resolveResearchAnchor({ anchor_type: 42 }).ignoredValue).toBe("42");
    expect(resolveResearchAnchor({ anchor_type: ["scripture"] }).ignoredValue).toBe('["scripture"]');
    expect(resolveResearchAnchor({ anchor_type: null }).ignoredValue).toBe("null");
  });

  it("never throws while resolving malformed pipeline settings", () => {
    for (const value of [undefined, null, [], 4, "bad", { escalation_ladder: [null, {}, []] }]) {
      expect(() => resolveEscalationLadder(value)).not.toThrow();
    }
    for (const value of [undefined, null, [], 4, "bad", { anchor_type: null }, { anchor_type: {} }]) {
      expect(() => resolveResearchAnchor(value)).not.toThrow();
    }
  });
});
