import { describe, expect, it } from "vitest";
import { assembleKitDescription, type BuilderSelections } from "@/lib/castingPhrases";

describe("assembleKitDescription", () => {
  it("assembles a full Casting Card selection in KIT order", () => {
    const selections: BuilderSelections = {
      gender: "female",
      ageBand: "40s",
      accent: "general-american",
      timbre: "warm-smooth",
      pitch: "downward-authority",
      pace: "measured-unhurried",
      persona: "wry-regulatory-insider",
      emotion: "dry-amused",
    };

    const assembled = assembleKitDescription(selections);

    expect(assembled.length).toBeGreaterThanOrEqual(200);
    expect(assembled.startsWith("Perfect audio quality, studio recording.")).toBe(true);
    expect(assembled).toMatchInlineSnapshot(
      `"Perfect audio quality, studio recording. Female, 40s, neutral General American accent, educated but conversational. A warm, smooth tone with a rounded, easy resonance; it lands each statement with a downward drop that reads as authority. Deliberate, unhurried pacing with small pauses and precise emphasis — a documentary explainer who reads the fine print and finds the rules genuinely funny. Deadpan but never flat, a knowing half-smile in the read."`,
    );
  });

  it("degrades gracefully for sparse selections", () => {
    const assembled = assembleKitDescription({
      gender: "androgynous",
      timbre: "dry-close-micd",
      persona: "steady-mentor",
    });

    expect(assembled).toMatchInlineSnapshot(
      `"Perfect audio quality, studio recording. An androgynous voice. A dry, close-mic'd sound, present and up against the ear. A steady mentor who genuinely wants you to get it, patient and encouraging."`,
    );
    expect(assembled).not.toContain("; .");
    expect(assembled).not.toContain(" — .");
    expect(assembled).not.toContain(", .");
  });
});
