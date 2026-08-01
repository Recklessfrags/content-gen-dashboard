import { describe, expect, it } from "vitest";
import {
  buildChannelProfileUpsert,
  defaultChannelProfile,
  joinListInput,
  parseEngagementPosture,
  parseResearchProfile,
  parseShortSeconds,
  parseSourcing,
  resolvePipelineMerge,
  splitListInput,
  validateChannelProfile,
  type ChannelProfileUpsertInput,
} from "@/lib/channelProfiles";

describe("resolvePipelineMerge", () => {
  const existingProfile = {
    channel: "food",
    sourcing: { assembly_max_spend: 4.75 },
    research_profile: { thesis: "pipeline-owned" },
  };

  it("rejects a new channel whose name already exists", () => {
    const result = resolvePipelineMerge({
      creating: true,
      channel: "food",
      selectedProfile: null,
      profiles: [existingProfile],
    });

    expect(result.ok).toBe(false);
  });

  it("includes the duplicate channel name in a non-empty reason", () => {
    const result = resolvePipelineMerge({
      creating: true,
      channel: "food",
      selectedProfile: null,
      profiles: [existingProfile],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).not.toBe("");
      expect(result.reason).toContain("food");
    }
  });

  it("allows a new channel name with empty pipeline settings", () => {
    const result = resolvePipelineMerge({
      creating: true,
      channel: "history",
      selectedProfile: null,
      profiles: [existingProfile],
    });

    expect(result).toEqual({
      ok: true,
      stored: { sourcing: null, research_profile: null },
    });
  });

  it("preserves the selected profile pipeline settings while editing", () => {
    const result = resolvePipelineMerge({
      creating: false,
      channel: "food",
      selectedProfile: existingProfile,
      profiles: [existingProfile],
    });

    expect(result).toEqual({
      ok: true,
      stored: {
        sourcing: existingProfile.sourcing,
        research_profile: existingProfile.research_profile,
      },
    });
  });

  it("rejects editing without a selected profile", () => {
    const result = resolvePipelineMerge({
      creating: false,
      channel: "food",
      selectedProfile: null,
      profiles: [existingProfile],
    });

    expect(result.ok).toBe(false);
  });

  it("preserves null sourcing while editing", () => {
    const result = resolvePipelineMerge({
      creating: false,
      channel: "food",
      selectedProfile: { ...existingProfile, sourcing: null },
      profiles: [existingProfile],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stored.sourcing).toBeNull();
  });

  it("trims a new channel name before checking for an existing match", () => {
    const result = resolvePipelineMerge({
      creating: true,
      channel: "  food  ",
      selectedProfile: null,
      profiles: [existingProfile],
    });

    expect(result.ok).toBe(false);
  });
});

describe("parseShortSeconds", () => {
  it.each([
    ["", null],
    ["1", 1],
    ["70", 70],
    ["180", 180],
    ["70.5", 70.5],
  ])("accepts %j", (raw, value) => {
    expect(parseShortSeconds(raw)).toEqual({ ok: true, value });
  });

  it.each(["0", "-5", "181", "abc"])("rejects %j with the bound", (raw) => {
    expect(parseShortSeconds(raw)).toEqual({
      ok: false,
      error: "Short length must be between 1 and 180 seconds.",
    });
  });
});

function profileInput(
  overrides: Partial<ChannelProfileUpsertInput> = {},
): ChannelProfileUpsertInput {
  return {
    channel: "food",
    display_name: "Food",
    fact_anchor: "fda_standard_of_identity",
    treatment: "archival_documentary",
    engagement_posture: {
      claim_discipline: "fact_first",
      arousal_ceiling: "conservative",
    },
    ...overrides,
  };
}

describe("parseEngagementPosture", () => {
  it("returns valid engagement posture values", () => {
    expect(
      parseEngagementPosture({
        claim_discipline: "loose",
        arousal_ceiling: "aggressive",
      }),
    ).toEqual({
      claim_discipline: "loose",
      arousal_ceiling: "aggressive",
    });
  });

  it("defaults missing keys independently", () => {
    expect(parseEngagementPosture({ claim_discipline: "none" })).toEqual({
      claim_discipline: "none",
      arousal_ceiling: "conservative",
    });
  });

  it("defaults garbage input without throwing", () => {
    expect(parseEngagementPosture(["bad"])).toEqual({
      claim_discipline: "fact_first",
      arousal_ceiling: "conservative",
    });
    expect(
      parseEngagementPosture({
        claim_discipline: "whatever",
        arousal_ceiling: 12,
      }),
    ).toEqual({
      claim_discipline: "fact_first",
      arousal_ceiling: "conservative",
    });
  });
});

describe("parseResearchProfile", () => {
  const defaults = {
    anchor_type: "fda_standard_of_identity",
    source_hierarchy: [],
    thesis: null,
  };

  it("round-trips a full valid object", () => {
    expect(
      parseResearchProfile({
        anchor_type: "scripture",
        source_hierarchy: [" primary ", 12, "secondary"],
        thesis: "Receipts before rhetoric",
      }),
    ).toEqual({
      anchor_type: "scripture",
      source_hierarchy: ["primary", "secondary"],
      thesis: "Receipts before rhetoric",
    });
  });

  it("defaults unknown or absent anchor_type fail-closed", () => {
    expect(parseResearchProfile({ anchor_type: "rumor" }).anchor_type).toBe(
      "fda_standard_of_identity",
    );
    expect(parseResearchProfile({}).anchor_type).toBe(
      "fda_standard_of_identity",
    );
  });

  it("defaults missing source_hierarchy and thesis", () => {
    expect(parseResearchProfile({ anchor_type: "none" })).toEqual({
      anchor_type: "none",
      source_hierarchy: [],
      thesis: null,
    });
  });

  it("defaults null, array, and string inputs", () => {
    expect(parseResearchProfile(null)).toEqual(defaults);
    expect(parseResearchProfile(["bad"])).toEqual(defaults);
    expect(parseResearchProfile("bad")).toEqual(defaults);
  });
});

describe("parseSourcing", () => {
  const defaults = {
    artifact_types: [],
    stock_vision_gate: false,
    max_generated_clips: null,
    generation_budget_usd: null,
  };

  it("returns a valid object with all keys", () => {
    expect(
      parseSourcing({
        artifact_types: [" stock ", 4, "generated"],
        stock_vision_gate: true,
        max_generated_clips: 3,
        generation_budget_usd: 12.5,
      }),
    ).toEqual({
      artifact_types: ["stock", "generated"],
      stock_vision_gate: true,
      max_generated_clips: 3,
      generation_budget_usd: 12.5,
    });
  });

  it("defaults missing keys", () => {
    expect(parseSourcing({})).toEqual(defaults);
  });

  it("defaults null input", () => {
    expect(parseSourcing(null)).toEqual(defaults);
  });
});

describe("defaultChannelProfile", () => {
  it("matches the food-safe default row shape", () => {
    expect(defaultChannelProfile("default")).toEqual({
      channel: "default",
      description: "",
      display_name: "Default (food behavior)",
      fact_anchor: "fda_standard_of_identity",
      treatment: "archival_documentary",
      character_id: null,
      character: null,
      source_ladder: ["archival", "still_motion", "generated"],
      voice_archetype: null,
      packaging: {},
      engagement_posture: {
        claim_discipline: "fact_first",
        arousal_ceiling: "conservative",
      },
      length_target: { short_s: 75 },
      platforms: [],
    });
  });
});

describe("list input helpers", () => {
  it("splits newlines, commas, extra whitespace, and empty entries", () => {
    expect(
      splitListInput(" archival,  still_motion\n\n generated , , shorts "),
    ).toEqual(["archival", "still_motion", "generated", "shorts"]);
  });

  it("round-trips joined list values through split", () => {
    const items = ["archival", "still_motion", "generated"];

    expect(splitListInput(joinListInput(items))).toEqual(items);
  });
});

describe("validateChannelProfile", () => {
  it("accepts a valid profile", () => {
    expect(validateChannelProfile(profileInput())).toEqual([]);
  });

  it("rejects an empty channel", () => {
    expect(validateChannelProfile(profileInput({ channel: "   " }))).toContain(
      "channel is required",
    );
  });

  it("rejects a bad fact anchor", () => {
    expect(
      validateChannelProfile(profileInput({ fact_anchor: "rumor" })),
    ).toContain("fact_anchor is invalid");
  });

  it("rejects a bad treatment", () => {
    expect(
      validateChannelProfile(profileInput({ treatment: "podcast" })),
    ).toContain("treatment is invalid");
  });

  it("rejects a bad claim discipline", () => {
    expect(
      validateChannelProfile(
        profileInput({
          engagement_posture: {
            claim_discipline: "sloppy",
            arousal_ceiling: "standard",
          },
        }),
      ),
    ).toContain("engagement_posture.claim_discipline is invalid");
  });

  it("rejects a bad arousal ceiling", () => {
    expect(
      validateChannelProfile(
        profileInput({
          engagement_posture: {
            claim_discipline: "fact_first",
            arousal_ceiling: "reckless",
          },
        }),
      ),
    ).toContain("engagement_posture.arousal_ceiling is invalid");
  });
});

describe("buildChannelProfileUpsert", () => {
  it("normalizes fields and strips timestamps", () => {
    expect(
      buildChannelProfileUpsert({
        channel: " food ",
        description: " Food stories with receipts ",
        display_name: " Food Channel ",
        fact_anchor: "fda_standard_of_identity",
        treatment: "archival_documentary",
        character_id: "00000000-0000-4000-8000-000000000001",
        character: " mad-dog ",
        source_ladder: [" archival ", 12, "generated"],
        voice_archetype: " calm_explainer ",
        packaging: {
          title_style: " declarative ",
          thumbnail_style: "clean",
          ignored: "value",
        },
        engagement_posture: {
          claim_discipline: "loose",
          arousal_ceiling: "standard",
        },
        length_target: { short_s: 60, ignored: true },
        platforms: [" tiktok ", null, "shorts"],
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z",
      }),
    ).toEqual({
      channel: "food",
      description: "Food stories with receipts",
      display_name: "Food Channel",
      fact_anchor: "fda_standard_of_identity",
      treatment: "archival_documentary",
      character_id: "00000000-0000-4000-8000-000000000001",
      character: "mad-dog",
      source_ladder: ["archival", "generated"],
      voice_archetype: "calm_explainer",
      packaging: {
        title_style: "declarative",
        thumbnail_style: "clean",
      },
      engagement_posture: {
        claim_discipline: "loose",
        arousal_ceiling: "standard",
      },
      length_target: { short_s: 60 },
      platforms: ["tiktok", "shorts"],
    });
  });

  it("throws on invalid input", () => {
    expect(() =>
      buildChannelProfileUpsert(
        profileInput({ channel: "", fact_anchor: "bad" }),
      ),
    ).toThrow("channel is required; fact_anchor is invalid");
  });

  it("merges an edited escalation ladder without changing unrendered sourcing keys", () => {
    const queryVocabulary = {
      topic_token_policy: { mode: "pipeline-owned", minimum: 3 },
    };
    const result = buildChannelProfileUpsert(profileInput(), {
      stored: {
        research_profile: null,
        sourcing: {
          escalation_ladder: ["archival"],
          assembly_max_spend: 4.75,
          query_vocabulary: queryVocabulary,
        },
      },
      edits: {
        sourcing: { escalation_ladder: ["archival", "pixabay"] },
      },
    });

    expect(result.sourcing).toEqual({
      escalation_ladder: ["archival", "pixabay"],
      assembly_max_spend: 4.75,
      query_vocabulary: queryVocabulary,
    });
    expect(
      (result.sourcing as { query_vocabulary: unknown }).query_vocabulary,
    ).toBe(queryVocabulary);
  });

  it("merges an edited research anchor without changing other research keys", () => {
    const sourceHierarchy = ["primary", "secondary"];
    const result = buildChannelProfileUpsert(profileInput(), {
      stored: {
        sourcing: null,
        research_profile: {
          anchor_type: "scripture",
          source_hierarchy: sourceHierarchy,
          thesis: "pipeline-owned",
        },
      },
      edits: {
        research_profile: { anchor_type: "declassified_primary_doc" },
      },
    });

    expect(result.research_profile).toEqual({
      anchor_type: "declassified_primary_doc",
      source_hierarchy: sourceHierarchy,
      thesis: "pipeline-owned",
    });
    expect(
      (result.research_profile as { source_hierarchy: unknown })
        .source_hierarchy,
    ).toBe(sourceHierarchy);
  });

  it("emits neither pipeline-owned group when neither group was edited", () => {
    const result = buildChannelProfileUpsert(profileInput(), {
      stored: {
        sourcing: {
          escalation_ladder: ["pixabay"],
          assembly_max_spend: 8,
        },
        research_profile: {
          anchor_type: "scripture",
          thesis: "pipeline-owned",
        },
      },
      edits: {},
    });

    expect(Object.prototype.hasOwnProperty.call(result, "sourcing")).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(result, "research_profile"),
    ).toBe(false);
  });

  it("rejects pipeline values outside the named allowed sets instead of dropping them", () => {
    expect(() =>
      buildChannelProfileUpsert(profileInput(), {
        stored: { sourcing: null, research_profile: null },
        edits: {
          sourcing: {
            escalation_ladder: ["generated"],
            archival_providers: ["youtube"],
          },
        },
      }),
    ).toThrow(
      "sourcing.escalation_ladder must contain only: archival, pixabay; sourcing.archival_providers must contain only: internet_archive, loc, wikimedia_commons",
    );
  });
});
