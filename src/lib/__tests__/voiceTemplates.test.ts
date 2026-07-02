import { describe, expect, it } from "vitest";
import {
  buildVoiceTemplateInsert,
  templateRecipe,
  validateVoiceTemplateName,
  type VoiceTemplate,
} from "@/lib/voiceTemplates";

function template(overrides: Partial<VoiceTemplate> = {}): VoiceTemplate {
  return {
    id: "tpl-1",
    name: "Courier",
    description: "Fast archival read",
    design_prompt: {
      age: 1.8,
      grit: -1,
      comedy_menace: 0.25,
      bombast: 0.75,
      gender: "female",
    },
    voice_settings: {
      stability: -1,
      similarity_boost: 2,
      style: 0.4,
      speed: 9,
      use_speaker_boost: false,
    },
    source_codename: "Mina",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("validateVoiceTemplateName", () => {
  it("enforces the 2-60 character name range after trimming", () => {
    expect(validateVoiceTemplateName(" A ")).toEqual([
      "Template name must be at least 2 characters.",
    ]);
    expect(validateVoiceTemplateName("x".repeat(61))).toEqual([
      "Template name must be 60 characters or fewer.",
    ]);
    expect(validateVoiceTemplateName(" Archive Voice ")).toEqual([]);
  });
});

describe("buildVoiceTemplateInsert", () => {
  it("normalizes text and clamps prompt/settings before writes", () => {
    expect(
      buildVoiceTemplateInsert({
        name: " Courier ",
        description: "  Fast archival read  ",
        sourceCodename: " Mina ",
        designPrompt: {
          age: 2,
          grit: -1,
          comedy_menace: Number.NaN,
          bombast: 0.25,
          gender: "male",
        },
        voiceSettings: {
          stability: -1,
          similarity_boost: 2,
          style: Number.NaN,
          speed: 0.1,
          use_speaker_boost: false,
        },
      }),
    ).toEqual({
      name: "Courier",
      description: "Fast archival read",
      source_codename: "Mina",
      design_prompt: {
        age: 1,
        grit: 0,
        comedy_menace: 0.5,
        bombast: 0.25,
        gender: "male",
      },
      voice_settings: {
        stability: 0,
        similarity_boost: 1,
        style: 0,
        speed: 0.7,
        use_speaker_boost: false,
      },
    });
  });

  it("throws on invalid names", () => {
    expect(() =>
      buildVoiceTemplateInsert({
        name: "x",
        designPrompt: {},
        voiceSettings: {},
      }),
    ).toThrow("Template name must be at least 2 characters.");
  });
});

describe("templateRecipe", () => {
  it("shapes immutable recipe snapshots with the template name", () => {
    expect(templateRecipe(template())).toEqual({
      design_prompt: {
        age: 1,
        grit: 0,
        comedy_menace: 0.25,
        bombast: 0.75,
        gender: "female",
      },
      voice_settings: {
        stability: 0,
        similarity_boost: 1,
        style: 0.4,
        speed: 1.2,
        use_speaker_boost: false,
      },
      template_name: "Courier",
    });
  });
});
