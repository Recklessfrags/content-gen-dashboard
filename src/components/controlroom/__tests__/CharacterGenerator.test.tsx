// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CharacterGenerator } from "@/components/controlroom/CharacterGenerator";
import {
  CHARACTER_CONCEPT_MIN,
  CharacterGenerationError,
  generateCharacter,
} from "@/lib/castingCharacter";

vi.mock("@/lib/castingCharacter", async (loadOriginal) => {
  const actual = await loadOriginal<typeof import("@/lib/castingCharacter")>();
  return { ...actual, generateCharacter: vi.fn() };
});

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

afterEach(() => {
  cleanup();
  vi.mocked(generateCharacter).mockReset();
});

describe("CharacterGenerator", () => {
  it("stays disabled until the concept is long enough", () => {
    render(
      <CharacterGenerator supabase={{} as never} concept="too short" onGenerated={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Generate from concept" })).toBeDisabled();
  });

  it("generates one editable draft without saving it", async () => {
    vi.mocked(generateCharacter).mockResolvedValue(generated);
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    const concept = "x".repeat(CHARACTER_CONCEPT_MIN);
    render(
      <CharacterGenerator supabase={{} as never} concept={concept} onGenerated={onGenerated} />,
    );

    await user.click(screen.getByRole("button", { name: "Generate from concept" }));

    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(generated));
    expect(generateCharacter).toHaveBeenCalledTimes(1);
    expect(generateCharacter).toHaveBeenCalledWith({}, concept);
    expect(screen.getByText(/review every field before saving/i)).toBeInTheDocument();
  });

  it("shows a friendly cap error and locks repeat generation", async () => {
    vi.mocked(generateCharacter).mockRejectedValue(
      new CharacterGenerationError("Daily character-generation cap reached. Try again tomorrow.", true),
    );
    const user = userEvent.setup();
    render(
      <CharacterGenerator
        supabase={{} as never}
        concept={"x".repeat(CHARACTER_CONCEPT_MIN)}
        onGenerated={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Generate from concept" });
    await user.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(/tomorrow/i);
    expect(button).toBeDisabled();
  });
});
