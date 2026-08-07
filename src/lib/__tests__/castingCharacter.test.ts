import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  buildCharacterGenerationRequest,
  CHARACTER_CONCEPT_MAX,
  CHARACTER_CONCEPT_MIN,
  CharacterGenerationError,
  generateCharacter,
  parseGeneratedCharacter,
} from "@/lib/castingCharacter";

const completeDraft = {
  codename: "The Quiet Lantern",
  bible: {
    voice: "A patient guide who makes complex evidence feel approachable.",
    cadence: "Measured openings, crisp reveals, and a short reflective pause.",
    vocab: "Plain language, concrete verbs, and the occasional 'look closer.'",
    offlimits: "Never invents certainty, imitates a person, or sensationalizes harm.",
    lines: "Look closer—the useful clue is hiding in the ordinary.\nHere is what the evidence can actually support.",
    beats: "Open on the puzzle; establish evidence; reveal the turn; close with perspective.",
    runtime: "60–80s vertical, 135–165 spoken words.",
  },
};

describe("character generation client", () => {
  it("trims a valid concept and enforces both boundaries", () => {
    const valid = "x".repeat(CHARACTER_CONCEPT_MIN);
    expect(buildCharacterGenerationRequest(`  ${valid}  `)).toEqual({ concept: valid });
    expect(() => buildCharacterGenerationRequest("x".repeat(CHARACTER_CONCEPT_MIN - 1))).toThrow(
      CharacterGenerationError,
    );
    expect(() => buildCharacterGenerationRequest("x".repeat(CHARACTER_CONCEPT_MAX + 1))).toThrow(
      /too long/i,
    );
  });

  it("trims every returned field and rejects incomplete model output", () => {
    const padded = {
      codename: ` ${completeDraft.codename} `,
      bible: Object.fromEntries(
        Object.entries(completeDraft.bible).map(([key, value]) => [key, ` ${value} `]),
      ),
    };
    expect(parseGeneratedCharacter(padded)).toEqual(completeDraft);
    expect(() => parseGeneratedCharacter({ ...completeDraft, bible: { ...completeDraft.bible, runtime: " " } }))
      .toThrow(/complete character draft/i);
  });

  it("invokes only character-proxy and returns its sanitized draft", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: completeDraft, error: null });
    const client = { functions: { invoke } } as never;
    await expect(generateCharacter(client, "x".repeat(CHARACTER_CONCEPT_MIN))).resolves.toEqual(completeDraft);
    expect(invoke).toHaveBeenCalledWith("character-proxy", {
      body: { concept: "x".repeat(CHARACTER_CONCEPT_MIN) },
    });
  });

  it("maps an HTTP 429 to a friendly sticky cap error", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { context: { status: 429 } },
    });
    const client = { functions: { invoke } } as never;
    const error = await generateCharacter(client, "x".repeat(CHARACTER_CONCEPT_MIN)).catch((value) => value);
    expect(error).toBeInstanceOf(CharacterGenerationError);
    expect(error.capReached).toBe(true);
    expect(error.message).toMatch(/tomorrow/i);
  });
});

describe("character usage boundary", () => {
  it("keeps the migration separate and service-role-only", () => {
    const sql = readFileSync("supabase/migrations/dash_0013_character_usage.sql", "utf8");
    expect(sql).toContain("create table if not exists public.character_usage");
    expect(sql).toContain("primary key (user_id, day)");
    expect(sql).toContain("create policy character_usage_select");
    expect(sql).toContain("create or replace function public.character_bump_usage");
    expect(sql).toContain("grant execute on function public.character_bump_usage(uuid, int) to service_role");
    expect(sql).not.toContain("channel_guideline_bump_usage");
  });

  it("checks the character cap before the Anthropic request", () => {
    const source = readFileSync("supabase/functions/character-proxy/index.ts", "utf8");
    expect(source).toContain('admin.rpc("character_bump_usage"');
    expect(source).toContain("p_limit: DAILY_CAP");
    expect(source).toContain("const DAILY_CAP = 25");
    expect(source.indexOf('admin.rpc("character_bump_usage"')).toBeLessThan(
      source.indexOf('fetch("https://api.anthropic.com/v1/messages"'),
    );
  });
});
