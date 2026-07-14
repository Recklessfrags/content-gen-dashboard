import { describe, expect, it } from "vitest";
import {
  buildChannelProfileUpsert,
  defaultChannelProfile,
  joinListInput,
  parseEngagementPosture,
  parseResearchProfile,
  parseShortSeconds,
  parseSourcing,
  splitListInput,
  validateChannelProfile,
  type ChannelProfileUpsertInput,
} from "@/lib/channelProfiles";

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

  it("never emits research_profile/sourcing (preserve-on-update safety)", () => {
    const result = buildChannelProfileUpsert({
      ...profileInput(),
      research_profile: {
        anchor_type: "scripture",
        source_hierarchy: ["primary"],
        thesis: "pipeline-owned",
      },
      sourcing: {
        artifact_types: ["stock"],
        stock_vision_gate: true,
        max_generated_clips: 2,
        generation_budget_usd: 9,
      },
    });

    expect(
      Object.prototype.hasOwnProperty.call(result, "research_profile"),
    ).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, "sourcing")).toBe(false);
  });
});
