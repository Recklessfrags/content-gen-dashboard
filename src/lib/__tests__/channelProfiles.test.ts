import { describe, expect, it } from "vitest";
import {
  buildChannelProfileUpsert,
  defaultChannelProfile,
  parseEngagementPosture,
  validateChannelProfile,
  type ChannelProfileUpsertInput,
} from "@/lib/channelProfiles";

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

describe("defaultChannelProfile", () => {
  it("matches the food-safe default row shape", () => {
    expect(defaultChannelProfile("default")).toEqual({
      channel: "default",
      display_name: "Default (food behavior)",
      fact_anchor: "fda_standard_of_identity",
      treatment: "archival_documentary",
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
    expect(validateChannelProfile(profileInput({ fact_anchor: "rumor" }))).toContain(
      "fact_anchor is invalid",
    );
  });

  it("rejects a bad treatment", () => {
    expect(validateChannelProfile(profileInput({ treatment: "podcast" }))).toContain(
      "treatment is invalid",
    );
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
        display_name: " Food Channel ",
        fact_anchor: "fda_standard_of_identity",
        treatment: "archival_documentary",
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
      display_name: "Food Channel",
      fact_anchor: "fda_standard_of_identity",
      treatment: "archival_documentary",
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
      buildChannelProfileUpsert(profileInput({ channel: "", fact_anchor: "bad" })),
    ).toThrow("channel is required; fact_anchor is invalid");
  });
});
