import { describe, expect, it } from "vitest";
import {
  addFavorite,
  clampVoiceSettings,
  composeVoiceDescription,
  discard,
  emptyBracket,
  isCast,
  removeFavorite,
  setPool,
  setWinner,
  type AuditionCandidate,
} from "@/lib/casting";

function candidate(id: string): AuditionCandidate {
  return {
    generated_voice_id: id,
    audio_base_64: `audio-${id}`,
    media_type: "audio/mpeg",
    prompt_state: {
      age: 0.5,
      grit: 0.5,
      comedy_menace: 0.5,
      bombast: 0.5,
      gender: "androgynous",
    },
  };
}

describe("clampVoiceSettings", () => {
  it("clamps numeric ranges and preserves boolean speaker boost", () => {
    expect(
      clampVoiceSettings({
        stability: -1,
        similarity_boost: 2,
        style: 1.5,
        speed: 3,
        use_speaker_boost: false,
      }),
    ).toEqual({
      stability: 0,
      similarity_boost: 1,
      style: 1,
      speed: 1.2,
      use_speaker_boost: false,
    });

    expect(
      clampVoiceSettings({
        stability: 2,
        similarity_boost: -1,
        style: -0.2,
        speed: 0.1,
        use_speaker_boost: true,
      }),
    ).toEqual({
      stability: 1,
      similarity_boost: 0,
      style: 0,
      speed: 0.7,
      use_speaker_boost: true,
    });
  });

  it("uses defaults for invalid inputs", () => {
    expect(
      clampVoiceSettings({
        stability: Number.NaN,
        similarity_boost: "bad" as unknown as number,
        style: undefined,
        speed: Number.POSITIVE_INFINITY,
        use_speaker_boost: "yes" as unknown as boolean,
      }),
    ).toEqual({
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      speed: 1,
      use_speaker_boost: true,
    });
  });
});

describe("composeVoiceDescription", () => {
  it("maps slider buckets to deterministic prose", () => {
    expect(
      composeVoiceDescription({
        age: 0,
        grit: 0.34,
        comedy_menace: 0.99,
        bombast: 0.2,
        gender: "female",
      }),
    ).toBe(
      "a young, fresh-toned female voice, with a touch of rasp, dark and menacing, understated and intimate. Suited to narrating short-form video with a strong, characterful presence.",
    );
  });

  it("omits gender wording for androgynous prompts", () => {
    expect(
      composeVoiceDescription({
        age: 0.5,
        grit: 0.5,
        comedy_menace: 0.5,
        bombast: 0.5,
        gender: "androgynous",
      }),
    ).toContain("a middle-aged voice, with a touch of rasp, wry and deadpan");
  });
});

describe("bracket reducers", () => {
  it("replaces the current pool", () => {
    const a = candidate("a");
    const b = candidate("b");

    expect(setPool(emptyBracket("char-1"), [a, b]).pool).toEqual([a, b]);
  });

  it("carries candidates forward to favorites and dedups by generated id", () => {
    const a = candidate("a");
    const duplicateA = { ...candidate("a"), audio_base_64: "different-audio" };
    const state = setPool(emptyBracket("char-1"), [a, candidate("b")]);

    const withFavorite = addFavorite(state, a);
    const deduped = addFavorite(withFavorite, duplicateA);

    expect(withFavorite.favorites).toEqual([a]);
    expect(withFavorite.pool.map((item) => item.generated_voice_id)).toEqual(["b"]);
    expect(deduped.favorites).toEqual([a]);
    expect(deduped.pool.map((item) => item.generated_voice_id)).toEqual(["b"]);
  });

  it("sets winners and removes candidates from pool/favorites", () => {
    const a = candidate("a");
    const b = candidate("b");
    const pooled = setPool(emptyBracket("char-1"), [a, b]);
    const favorited = addFavorite(pooled, a);

    expect(setWinner(favorited, a).winner).toEqual(a);
    expect(discard(favorited, b).pool).toEqual([]);
    expect(removeFavorite(favorited, a).favorites).toEqual([]);
  });
});

describe("isCast", () => {
  it("treats non-empty voice_id as cast", () => {
    expect(isCast({ voice_id: "voice_123" })).toBe(true);
    expect(isCast({ voice_id: "" })).toBe(false);
    expect(isCast({ voice_id: null })).toBe(false);
  });
});
