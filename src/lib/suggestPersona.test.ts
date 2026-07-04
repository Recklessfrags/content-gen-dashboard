import { describe, expect, it } from "vitest";
import { PERSONA_BANK } from "@/lib/castingPhrases";
import {
  SUGGEST_PERSONA_RULES,
  suggestPersonaForChannel,
  type SuggestPersonaInput,
} from "@/lib/suggestPersona";

const personaIds = new Set(PERSONA_BANK.map((persona) => persona.id));

describe("suggestPersonaForChannel", () => {
  it.each([
    [{ voice_archetype: "drill_instructor" }, "drill-sergeant-historian"],
    [{ voice_archetype: "hype_announcer" }, "street-energizer"],
    [{ voice_archetype: "npr_explainer" }, "wry-regulatory-insider"],
    [{ description: "deep sea creatures", treatment: "archival_documentary" }, "hushed-naturalist"],
    [{ description: "food identity segment", channel: "wildlife-weekly" }, "wry-regulatory-insider"],
    [{ channel: "food" }, "wry-regulatory-insider"],
    [{ display_name: "Wildlife Field Notes" }, "hushed-naturalist"],
    [{ treatment: "mystery dossier" }, "true-crime-skeptic"],
    [{ treatment: "archival_documentary" }, "drill-sergeant-historian"],
    [{ display_name: "Sleep Meditation" }, "serene-guide"],
    [{ display_name: "Daily Sports" }, "breathless-announcer"],
    [{ display_name: "Morning Briefing" }, "broadcast-anchor"],
    [{ display_name: "Weird Comedy" }, "deadpan-absurdist"],
    [{ display_name: "Villain Thriller" }, "menacing-mastermind"],
    [{ display_name: "Campfire Folklore" }, "campfire-storyteller"],
    [{ display_name: "Cozy Grandma" }, "warm-grandmother"],
    [{ display_name: "Hardboiled Detective" }, "hardboiled-noir-narrator"],
    [{ display_name: "Secret Confession" }, "late-night-confessor"],
    [{ display_name: "Tutorial Guide" }, "steady-mentor"],
    [{ channel: "gear-heads" }, "giddy-obsessive"],
    [{ treatment: "Industry Expose" }, "jaded-insider"],
    [{ display_name: "Deal Hunters" }, "carnival-barker"],
    [{ fact_anchor: "Satire Commentary" }, "sardonic-wit"],
  ] satisfies ReadonlyArray<readonly [SuggestPersonaInput, string]>)(
    "maps %o to %s",
    (input, chipId) => {
      expect(suggestPersonaForChannel(input)?.chipId).toBe(chipId);
    },
  );

  it("returns null for empty and no-match inputs", () => {
    expect(suggestPersonaForChannel({})).toBeNull();
    expect(suggestPersonaForChannel({ channel: "parks-and-buildings" })).toBeNull();
  });

  it("gives voice_archetype precedence over matching niche fields", () => {
    expect(
      suggestPersonaForChannel({
        voice_archetype: "hype_announcer",
        display_name: "Food Identity",
      })?.chipId,
    ).toBe("street-energizer");
  });

  it("gives voice_archetype precedence over matching description", () => {
    expect(
      suggestPersonaForChannel({
        voice_archetype: "drill_instructor",
        description: "wildlife nature",
      })?.chipId,
    ).toBe("drill-sergeant-historian");
  });

  it("uses table order for ties within niche fields", () => {
    expect(
      suggestPersonaForChannel({
        display_name: "Wildlife mystery",
      })?.chipId,
    ).toBe("hushed-naturalist");
  });

  it.each([
    { display_name: "Transport Weekly" },
    { display_name: "Renews" },
    { display_name: "Grandmaster" },
  ] satisfies SuggestPersonaInput[])("does not match substrings in %o", (input) => {
    expect(suggestPersonaForChannel(input)).toBeNull();
  });

  it.each(["channel", "description", "display_name", "voice_archetype", "treatment", "fact_anchor", "character"] as const)(
    "is null-safe for %s",
    (field) => {
      expect(() => suggestPersonaForChannel({ [field]: null })).not.toThrow();
      expect(() => suggestPersonaForChannel({ [field]: undefined })).not.toThrow();
      expect(() => suggestPersonaForChannel({ [field]: "" })).not.toThrow();
      expect(suggestPersonaForChannel({ [field]: null })).toBeNull();
      expect(suggestPersonaForChannel({ [field]: undefined })).toBeNull();
      expect(suggestPersonaForChannel({ [field]: "" })).toBeNull();
    },
  );

  it("keeps every rule chip id inside PERSONA_BANK", () => {
    expect(SUGGEST_PERSONA_RULES).toHaveLength(21);
    for (const rule of SUGGEST_PERSONA_RULES) {
      expect(personaIds.has(rule.chipId)).toBe(true);
    }
  });
});
