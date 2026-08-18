import { describe, expect, it } from "vitest";
import pipelineVocabularies from "@/lib/pipeline-vocabularies.json";
import {
  PIPELINE_ARCHIVAL_PROVIDERS,
  PIPELINE_ESCALATION_TIERS,
} from "@/lib/channelFieldConsumption";
import {
  buildChannelProfilePipelinePatch,
  buildChannelProfileUpsert,
  buildLexiconColumn,
  buildSubstitutionMap,
  defaultChannelProfile,
  joinListInput,
  parseChannelAiDisclosure,
  parseChannelCtaTarget,
  parseChannelHashtags,
  parseChannelLexiconSubstitutions,
  parseEngagementPosture,
  parseResearchProfile,
  parseShortSeconds,
  parseSourcing,
  RESEARCH_ANCHOR_TYPE,
  resolvePipelineMerge,
  splitListInput,
  validateChannelProfile,
  validateChannelProfilePipelineEdits,
  VOICE_ARCHETYPE_SUGGESTIONS,
  type ChannelProfileUpsertInput,
} from "@/lib/channelProfiles";

const EXPECTED_PIPELINE_VOCABULARIES = {
  escalation_tiers: PIPELINE_ESCALATION_TIERS,
  park_kinds: ["blocked", "exhausted", "fact", "publish", "reveal", "spend"],
  // Pipeline f83a0d3 (R3-1): honest source-type classification. "web" is the new
  // non-primary value -- an unrecognised domain now labels itself honestly instead of
  // being laundered into a primary-source type. Report-only pipeline-side for now.
  source_types: ["archive", "cfr", "court", "fda", "foia", "gov_record", "patent", "peer_reviewed", "usda", "web"],
  artifact_types: ["archival_doc", "period_archival", "reg_text", "scripture_text"],
  anchor_types: RESEARCH_ANCHOR_TYPE,
  voice_archetypes: VOICE_ARCHETYPE_SUGGESTIONS,
  beat_types: ["abstract_process", "authoritative_claim", "character", "concrete_subject"],
  visual_sources: [
    "archival",
    "artifact",
    "footage",
    "generated",
    "locked_character",
    "still_motion",
  ],
  cut_rhythm_keys: [
    "generated_max_hold_s",
    "hook_hold_s",
    "max_hold_s",
    "min_hold_s",
    "target_hold_s",
  ],
  foley_bed: ["native", "off"],
  foley_keys: ["bed", "volume"],
  caption_keys: [
    "line_color",
    "max_chars_per_line",
    "max_words_per_line",
    "position",
    "style",
    "word_color",
  ],
  particle_keys: ["suppression_fragment"],
  grade_keys: ["preset"],
  grade_presets: ["archival_neutral", "warm_incandescent"],
  archival_miss_fallback: ["generated", "stock"],
  archival_providers: PIPELINE_ARCHIVAL_PROVIDERS,
  sourcing_keys: [
    // Pipeline a3baf5c: the export went 12 -> 50 keys. It previously listed only a
    // fraction of what the pipeline actually reads from channel_profiles.sourcing,
    // so writes to the other 38 -- including assembly_max_spend -- could not be
    // validated here at all.
    "archival_medium_denylist",
    "archival_metadata_only_weight",
    "archival_miss_fallback",
    "archival_providers",
    "archival_relevance_weight_floor",
    "archival_still_retry_max_cuts",
    "archival_vision_gate",
    "artifact_types",
    "artifact_vision_cap",
    "assembly_max_spend",
    "craft_flag_static_hook",
    "craft_hook_window_s",
    "craft_min_luma_variance",
    "craft_phash_hamming_max",
    "craft_rhythm_band_ratio",
    "craft_rhythm_run_min",
    "craft_subject_confusables",
    "craft_vision_batch_cap_usd",
    "craft_vision_estimated_batch_cost_usd",
    "craft_vision_proximity_window_sec",
    "escalation_ladder",
    "escalation_max_cuts",
    "generation_budget_usd",
    "generation_failure_kill_threshold",
    "generation_failure_spend_cap_usd",
    "generation_model",
    "generation_model_ladder",
    "generation_retries",
    "generation_tier",
    "live_retrieval",
    "loc_call_budget",
    "low_specificity_tokens",
    "low_specificity_weight",
    "max_artifact_cuts",
    "max_asset_reuse",
    "max_generated_clips",
    "min_relevance_overlap",
    "on_below_floor",
    "on_topic_ratio_floor",
    "provider_retry_max_attempts_per_call",
    "provider_retry_max_per_episode",
    "query_vocabulary",
    "relevance_floor",
    "repair_degrade_mode",
    "repair_max_attempts_per_cut",
    "repair_max_cuts_per_episode",
    "repair_max_paid_attempts_per_episode",
    "repair_unrepairable_park_ratio",
    "repair_unshippable_park_ratio",
    "retrieval_call_budget",
    "retrieval_fee_estimate_usd",
    "stock_on_below_floor",
    "stock_on_topic_action",
    "stock_text_screen",
    "stock_vision_gate",
    "visual_relevance_vision_cap",
  ],
  script: ["bombast_max_outbursts"],
  qa_dimensions: [
    "beat_pacing",
    "editing",
    "hook",
    "rendering",
    "script",
    "visual_relevance",
    "vo_delivery",
  ],
  humanization_keys: [
    "breath_dashes",
    "eq",
    "filler_rate",
    "pitch_semitones",
    "pronunciation_extra",
    "stutter_rate",
  ],
} as const satisfies Record<string, readonly string[]>;

describe("pipeline vocabulary wiring", () => {
  const syncInstructions =
    "Per src/lib/SYNC.md, re-copy docs/contracts/vocabularies.json from the pipeline repo and update source_commit, confirming the pipeline change is intentional — do not just edit EXPECTED_PIPELINE_VOCABULARIES.";

  const driftMessage = (
    name: string,
    expected: readonly string[],
    actual: readonly string[],
  ) => {
    const added = actual.filter((value) => !expected.includes(value));
    const removed = expected.filter((value) => !actual.includes(value));
    return `Pipeline vocabulary "${name}" drifted; added values: ${added.length ? added.join(", ") : "none"}; removed values: ${removed.length ? removed.join(", ") : "none"}. ${syncInstructions}`;
  };

  const vendoredVocabularies = (
    Object.entries(pipelineVocabularies) as Array<[string, unknown]>
  ).filter(
    (entry): entry is [string, { values: string[] }] =>
      typeof entry[1] === "object" &&
      entry[1] !== null &&
      "values" in entry[1] &&
      Array.isArray(entry[1].values),
  );

  it("carries the pipeline source commit", () => {
    expect(
      typeof pipelineVocabularies.source_commit === "string" &&
        pipelineVocabularies.source_commit.trim().length > 0,
      `Vendored pipeline vocabularies have an empty source_commit. ${syncInstructions}`,
    ).toBe(true);
  });

  it("pins every vendored vocabulary", () => {
    const actualNames = vendoredVocabularies.map(([name]) => name).sort();
    const expectedNames = Object.keys(EXPECTED_PIPELINE_VOCABULARIES).sort();
    expect(
      actualNames,
      driftMessage("vocabulary list", expectedNames, actualNames),
    ).toEqual(
      expectedNames,
    );
  });

  it.each(vendoredVocabularies)("keeps %s in sync", (name, vocabulary) => {
    const expected: readonly string[] | undefined = EXPECTED_PIPELINE_VOCABULARIES[
      name as keyof typeof EXPECTED_PIPELINE_VOCABULARIES
    ];
    const message = driftMessage(name, expected ?? [], vocabulary.values);
    expect(expected, message).toBeDefined();
    expect(new Set(expected ?? []), message).toEqual(new Set(vocabulary.values));
    expect(expected, message).toHaveLength(vocabulary.values.length);
  });
});

describe("resolvePipelineMerge", () => {
  const existingProfile = {
    channel: "food",
    sourcing: { assembly_max_spend: 4.75 },
    research_profile: { thesis: "pipeline-owned" },
  };

  it("rejects a new channel whose name already exists", () => {
    const result = resolvePipelineMerge({
      channel: "food",
      profiles: [existingProfile],
    });

    expect(result.ok).toBe(false);
  });

  it("includes the duplicate channel name in a non-empty reason", () => {
    const result = resolvePipelineMerge({
      channel: "food",
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
      channel: "history",
      profiles: [existingProfile],
    });

    expect(result).toEqual({
      ok: true,
      creating: true,
      stored: { sourcing: null, research_profile: null },
    });
  });

  it("trims a new channel name before checking for an existing match", () => {
    const result = resolvePipelineMerge({
      channel: "  food  ",
      profiles: [existingProfile],
    });

    expect(result.ok).toBe(false);
  });

  it("returns an edit result with no stored pipeline snapshot", () => {
    const result = resolvePipelineMerge({
      creating: false,
      channel: "food",
      selectedProfile: existingProfile,
      profiles: [existingProfile],
    });

    expect(result).toEqual({ ok: true, creating: false });
    expect(result).not.toHaveProperty("stored");
  });

  it("rejects a changed channel identity while editing", () => {
    const result = resolvePipelineMerge({
      creating: false,
      channel: "renamed",
      selectedProfile: existingProfile,
      profiles: [existingProfile],
    });

    expect(result).toEqual({
      ok: false,
      reason: "The channel identity cannot be changed while editing. Create a new channel instead.",
    });
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

describe("buildChannelProfilePipelinePatch", () => {
  it("normalizes and returns only explicitly edited top-level keys", () => {
    expect(
      buildChannelProfilePipelinePatch({
        sourcing: {
          escalation_ladder: ["  Archival  ", "PIXABAY"],
        },
        research_profile: {
          anchor_type: "declassified_primary_doc",
        },
      }),
    ).toEqual({
      sourcing: {
        escalation_ladder: ["archival", "pixabay"],
      },
      research_profile: {
        anchor_type: "declassified_primary_doc",
      },
    });
  });

  it("rejects invalid patch values", () => {
    expect(() =>
      buildChannelProfilePipelinePatch({
        sourcing: { archival_providers: ["youtube"] },
      }),
    ).toThrow(
      "sourcing.archival_providers must contain only: internet_archive, loc, wikimedia_commons",
    );
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

  it("preserves unrendered sourcing keys while building a new profile", () => {
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

  it("preserves unrendered research keys while building a new profile", () => {
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

  it("never copies populated pipeline groups from the profile input without edits", () => {
    const result = buildChannelProfileUpsert(
      profileInput({
        sourcing: {
          escalation_ladder: ["pixabay"],
          assembly_max_spend: 8,
        },
        research_profile: {
          anchor_type: "scripture",
          thesis: "pipeline-owned",
        },
      }),
    );

    expect(Object.prototype.hasOwnProperty.call(result, "sourcing")).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(result, "research_profile"),
    ).toBe(false);
  });

  it("normalizes pipeline list edits before validating and writing", () => {
    expect(
      validateChannelProfilePipelineEdits({
        sourcing: { escalation_ladder: ["Archival"] },
      }),
    ).toEqual([]);

    const result = buildChannelProfileUpsert(profileInput(), {
      stored: { sourcing: null, research_profile: null },
      edits: {
        sourcing: {
          escalation_ladder: ["  Archival  ", "PIXABAY"],
          archival_providers: [" Internet_Archive ", "WIKIMEDIA_COMMONS"],
        },
      },
    });

    expect(result.sourcing).toEqual({
      escalation_ladder: ["archival", "pixabay"],
      archival_providers: ["internet_archive", "wikimedia_commons"],
    });
  });

  it("round-trips mixed-case stored pipeline lists as normalized edits", () => {
    const result = buildChannelProfileUpsert(profileInput(), {
      stored: {
        sourcing: {
          escalation_ladder: ["Archival"],
          archival_providers: ["Wikimedia_Commons"],
        },
        research_profile: null,
      },
      edits: {
        sourcing: {
          escalation_ladder: ["Archival"],
          archival_providers: ["Wikimedia_Commons"],
        },
      },
    });

    expect(result.sourcing).toEqual({
      escalation_ladder: ["archival"],
      archival_providers: ["wikimedia_commons"],
    });
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

describe("channel_profiles distribution + register (flat columns)", () => {
  describe("parse helpers", () => {
    it("reads each flat column into form shape", () => {
      expect(parseChannelHashtags(["#a", "#b"])).toEqual(["#a", "#b"]);
      expect(parseChannelCtaTarget(" follow for more ")).toBe("follow for more");
      expect(
        parseChannelLexiconSubstitutions({ substitutions: { colour: "color" } }),
      ).toEqual([{ from: "colour", to: "color" }]);
    });

    it("is null/shape-safe", () => {
      expect(parseChannelHashtags(null)).toEqual([]);
      expect(parseChannelCtaTarget(null)).toBe("");
      expect(parseChannelCtaTarget(undefined)).toBe("");
      expect(parseChannelLexiconSubstitutions("nope")).toEqual([]);
      expect(parseChannelLexiconSubstitutions({ substitutions: "bad" })).toEqual([]);
    });
  });

  describe("buildSubstitutionMap / buildLexiconColumn", () => {
    it("trims, drops blank rows, and lets a later duplicate win", () => {
      expect(
        buildSubstitutionMap([
          { from: " colour ", to: " color " },
          { from: "", to: "x" },
          { from: "y", to: "" },
          { from: "gray", to: "grey" },
          { from: "gray", to: "greyer" },
        ]),
      ).toEqual({ colour: "color", gray: "greyer" });
    });

    it("wraps the map in the pipeline's { substitutions } shape (empty stays empty)", () => {
      expect(buildLexiconColumn([{ from: "a", to: "b" }])).toEqual({
        substitutions: { a: "b" },
      });
      expect(buildLexiconColumn([])).toEqual({ substitutions: {} });
    });
  });

  describe("buildChannelProfileUpsert — SAFETY: an un-edited column is omitted (preserved)", () => {
    it("omits all three columns when no distributionEdits are supplied", () => {
      const result = buildChannelProfileUpsert(profileInput());
      expect("hashtags" in result).toBe(false);
      expect("cta_target" in result).toBe(false);
      expect("lexicon" in result).toBe(false);
    });

    it("omits all three columns when distributionEdits is empty", () => {
      const result = buildChannelProfileUpsert(profileInput(), undefined, {});
      expect("hashtags" in result).toBe(false);
      expect("cta_target" in result).toBe(false);
      expect("lexicon" in result).toBe(false);
    });

    it("editing ONLY hashtags writes hashtags and OMITS cta_target + lexicon", () => {
      const result = buildChannelProfileUpsert(profileInput(), undefined, {
        hashtags: [" #new ", "", "#fresh"],
      });
      expect(result.hashtags).toEqual(["#new", "#fresh"]);
      // The un-edited columns must not appear in the payload — the upsert preserves them.
      expect("cta_target" in result).toBe(false);
      expect("lexicon" in result).toBe(false);
    });

    it("editing ONLY cta_target writes it and OMITS hashtags + lexicon", () => {
      const result = buildChannelProfileUpsert(profileInput(), undefined, {
        ctaTarget: " follow for more ",
      });
      expect(result.cta_target).toBe("follow for more");
      expect("hashtags" in result).toBe(false);
      expect("lexicon" in result).toBe(false);
    });

    it("editing ONLY lexicon writes it and OMITS hashtags + cta_target", () => {
      const result = buildChannelProfileUpsert(profileInput(), undefined, {
        lexiconSubstitutions: [{ from: "colour", to: "color" }],
      });
      expect(result.lexicon).toEqual({ substitutions: { colour: "color" } });
      expect("hashtags" in result).toBe(false);
      expect("cta_target" in result).toBe(false);
    });

    it("clearing an edited column is an explicit write (null / empty), not an omission", () => {
      const result = buildChannelProfileUpsert(profileInput(), undefined, {
        ctaTarget: "   ",
        lexiconSubstitutions: [],
      });
      // Editing-to-empty is a deliberate clear (distinct from omitting an untouched column).
      expect(result.cta_target).toBeNull();
      expect(result.lexicon).toEqual({ substitutions: {} });
      expect("hashtags" in result).toBe(false);
    });
  });
});

describe("parseChannelAiDisclosure", () => {
  // The pipeline (distribution._ai_disclosure_enabled) reads ONLY an explicit boolean and
  // defaults to ON. The dashboard must agree, or the toggle would show a state the
  // pipeline does not act on.
  it("reads an explicit boolean", () => {
    expect(parseChannelAiDisclosure(true)).toBe(true);
    expect(parseChannelAiDisclosure(false)).toBe(false);
  });

  it.each([null, undefined, "false", "true", 0, 1, [], {}] as const)(
    "defaults to on for a non-boolean value (%p)",
    (value) => {
      expect(parseChannelAiDisclosure(value as never)).toBe(true);
    },
  );
});

describe("buildChannelProfileUpsert — ai_disclosure", () => {
  const base = {
    channel: "food",
    description: "d",
    display_name: "Food",
    fact_anchor: "fda_standard_of_identity",
    treatment: "archival_documentary",
  };

  it("omits the column when the toggle was not touched, preserving the stored value", () => {
    const built = buildChannelProfileUpsert(base, undefined, { hashtags: ["a"] });
    expect("ai_disclosure" in built).toBe(false);
  });

  it("writes false when the operator turns it off", () => {
    const built = buildChannelProfileUpsert(base, undefined, { aiDisclosure: false });
    expect(built.ai_disclosure).toBe(false);
  });

  it("writes true when the operator turns it back on", () => {
    const built = buildChannelProfileUpsert(base, undefined, { aiDisclosure: true });
    expect(built.ai_disclosure).toBe(true);
  });

  it("does not disturb the other independent distribution columns", () => {
    const built = buildChannelProfileUpsert(base, undefined, { aiDisclosure: false });
    expect("hashtags" in built).toBe(false);
    expect("cta_target" in built).toBe(false);
    expect("lexicon" in built).toBe(false);
  });
});
