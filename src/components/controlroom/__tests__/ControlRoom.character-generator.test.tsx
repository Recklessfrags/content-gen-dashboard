// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { applyGeneratedCharacterDraft } from "@/components/ControlRoom";
import type { FlatChar } from "@/components/controlroom/shared";

const generated = {
  codename: "The Quiet Lantern",
  bible: {
    voice: "voice",
    cadence: "cadence",
    vocab: "vocab",
    offlimits: "offlimits",
    lines: "lines",
    beats: "beats",
    runtime: "60–80s vertical, 135–165 spoken words",
  },
};

function draft(overrides: Partial<FlatChar> = {}): FlatChar {
  return {
    id: "draft-character",
    codename: "",
    concept: "A character concept long enough to generate",
    status: "draft",
    created_at: "2026-08-07T00:00:00.000Z",
    voice: "",
    cadence: "",
    vocab: "",
    offlimits: "",
    lines: "",
    beats: "",
    runtime: "",
    voice_id: null,
    voice_settings: null,
    voice_recipe: null,
    reference_image_url: null,
    visual_style: null,
    ...overrides,
  };
}

describe("generated character overwrite guard", () => {
  it("applies to an empty draft without confirmation", () => {
    const applySnapshot = vi.fn();
    const confirmOverwrite = vi.fn();

    expect(
      applyGeneratedCharacterDraft(draft(), generated, applySnapshot, confirmOverwrite),
    ).toBe(true);
    expect(confirmOverwrite).not.toHaveBeenCalled();
    expect(applySnapshot).toHaveBeenCalledWith(
      "draft-character",
      expect.objectContaining({ codename: generated.codename, bible: generated.bible }),
    );
  });

  it("requires confirmation for a non-empty draft and preserves it when cancelled", () => {
    const existing = draft({ cadence: "Keep this cadence" });
    const applySnapshot = vi.fn();
    const confirmOverwrite = vi.fn(() => false);

    expect(
      applyGeneratedCharacterDraft(existing, generated, applySnapshot, confirmOverwrite),
    ).toBe(false);
    expect(confirmOverwrite).toHaveBeenCalledOnce();
    expect(applySnapshot).not.toHaveBeenCalled();
    expect(existing.cadence).toBe("Keep this cadence");
  });
});
