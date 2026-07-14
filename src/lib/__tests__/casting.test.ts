import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addFavorite,
  GENERATION_DEFAULTS,
  GENERATION_RANGES,
  clampGeneration,
  clampGuidanceScale,
  clampSeed,
  clampVoiceSettings,
  composeVoiceDescription,
  discard,
  emptyBracket,
  isCast,
  isValidVoiceDescription,
  loadBracket,
  reconcileBracket,
  removeFavorite,
  saveBracket,
  setPool,
  setWinner,
  writeCastToCharacter,
  type AuditionCandidate,
  type BracketState,
  type VoiceRecipe,
} from "@/lib/casting";
import {
  DEFAULT_BUILDER_SELECTIONS,
  castingControlVisibility,
  purgeCreatedVoiceId,
} from "@/components/controlroom/CastingStudioPanel";
import { PERSONA_BANK } from "@/lib/castingPhrases";

describe("casting progressive disclosure", () => {
  it("keeps the tournament in basic while hiding advanced controls", () => {
    expect(castingControlVisibility(true)).toEqual({
      kit: false,
      previewEditor: false,
      guidance: false,
      resetToPicks: false,
      tournament: true,
    });
    expect(castingControlVisibility(false)).toEqual({
      kit: true,
      previewEditor: true,
      guidance: true,
      resetToPicks: true,
      tournament: true,
    });
  });
});

const TEST_DESCRIPTION =
  "Audio quality: clean studio documentary narration, warm but not polished flat. Identity: middle-aged androgynous American food-channel host with a grounded accent. Timbre: textured, lightly smoky, a little grit at sentence ends. Pitch/dynamics: medium-low pitch with lifted emphasis on reveals. Pace/cadence: patient setup, clipped punchlines, longer pauses before the turn. Emotion/character: curious, dry, observant, amused by the absurd details without sounding cartoonish.";

const builderState = {
  gender: "female",
  ageBand: "40s",
  accent: "general-american",
  timbre: "warm-smooth",
  pitch: "downward-authority",
  pace: "measured-unhurried",
  persona: "deadpan-demystifier",
  emotion: "dry-amused",
};

function candidate(id: string): AuditionCandidate {
  return {
    generated_voice_id: id,
    audio_base_64: `audio-${id}`,
    media_type: "audio/mpeg",
    voice_description_raw: TEST_DESCRIPTION,
    preview_text_raw:
      "This is a representative audition script with a setup, a turn, and enough punctuation to shape delivery.",
    model_id: "eleven_ttv_v3",
    guidance_scale: 5,
    seed: null,
    quality: null,
    builder_state: builderState,
    prompt_state: {
      age: 0.5,
      grit: 0.5,
      comedy_menace: 0.5,
      bombast: 0.5,
      gender: "androgynous",
    },
  };
}

function stubLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const localStorage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
  };
  vi.stubGlobal("window", { localStorage });
  return { localStorage, store };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("casting builder defaults", () => {
  it("uses a persona id from the persona bank", () => {
    expect(PERSONA_BANK.some((persona) => persona.id === DEFAULT_BUILDER_SELECTIONS.persona)).toBe(true);
  });
});

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

describe("generation clamps", () => {
  it("clamps guidance scale and uses defaults for invalid inputs", () => {
    expect(clampGuidanceScale(-10)).toBe(0);
    expect(clampGuidanceScale(150)).toBe(100);
    expect(clampGuidanceScale("bad")).toBe(GENERATION_DEFAULTS.guidance_scale);
  });

  it("clamps seeds to the documented ElevenLabs range and omits invalid seeds", () => {
    expect(clampSeed(null)).toBeNull();
    expect(clampSeed("")).toBeNull();
    expect(clampSeed([])).toBeNull();
    expect(clampSeed(false)).toBeNull();
    expect(clampSeed({ value: 1 })).toBeNull();
    expect(clampSeed(1.5)).toBeNull();
    expect(clampSeed("123")).toBe(123);
    expect(clampSeed(-1)).toBe(0);
    expect(clampSeed(GENERATION_RANGES.seed.max + 1)).toBe(GENERATION_RANGES.seed.max);
  });

  it("normalizes a full generation block", () => {
    expect(
      clampGeneration({
        model_id: "bad" as never,
        guidance_scale: -1,
        seed: GENERATION_RANGES.seed.max + 10,
        quality: 2,
      }),
    ).toEqual({
      model_id: "eleven_ttv_v3",
      guidance_scale: 0,
      seed: GENERATION_RANGES.seed.max,
      quality: 1,
    });
  });
});

describe("isValidVoiceDescription", () => {
  it("enforces the hard 200 character minimum after trimming", () => {
    expect(isValidVoiceDescription("x".repeat(199))).toBe(false);
    expect(isValidVoiceDescription(` ${"x".repeat(200)} `)).toBe(true);
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

describe("generateVoicePreviews", () => {
  it("sends raw description verbatim with clamped generation params and stamps candidates", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        previews: [
          {
            generated_voice_id: "gen-1",
            audio_base_64: "audio",
            media_type: "audio/mpeg",
          },
        ],
      },
      error: null,
    }));
    const client = { functions: { invoke } };
    const description = `${TEST_DESCRIPTION}\nDo not compose this from sliders.`;
    const preview =
      "A real audition script opens on a familiar detail, pauses for the reveal, and then lands the final turn with punctuation doing the work.";

    const result = await import("@/lib/casting").then(({ generateVoicePreviews }) =>
      generateVoicePreviews(client as never, {
        voice_description_raw: description,
        preview_text: preview,
        model_id: "bad-model",
        guidance_scale: 500,
        seed: GENERATION_RANGES.seed.max + 99,
        quality: -2,
        builder_state: builderState,
      }),
    );

    expect(invoke).toHaveBeenCalledWith("casting-proxy", {
      body: {
        action: "design",
        voice_description: description,
        text: preview,
        model_id: "eleven_ttv_v3",
        guidance_scale: 100,
        seed: GENERATION_RANGES.seed.max,
        quality: -1,
      },
    });
    expect(result).toEqual([
      {
        generated_voice_id: "gen-1",
        audio_base_64: "audio",
        media_type: "audio/mpeg",
        voice_description_raw: description,
        preview_text_raw: preview,
        model_id: "eleven_ttv_v3",
        guidance_scale: 100,
        seed: GENERATION_RANGES.seed.max,
        quality: -1,
        builder_state: builderState,
      },
    ]);
  });

  it("captures a returned random seed when ElevenLabs exposes one", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        seed: 98765,
        previews: [
          {
            generated_voice_id: "gen-random",
            audio_base_64: "audio",
            media_type: "audio/mpeg",
          },
        ],
      },
      error: null,
    }));
    const client = { functions: { invoke } };

    const result = await import("@/lib/casting").then(({ generateVoicePreviews }) =>
      generateVoicePreviews(client as never, {
        voice_description_raw: TEST_DESCRIPTION,
        preview_text:
          "A real audition script opens on a familiar detail, pauses for the reveal, and then lands the final turn with punctuation doing the work.",
        seed: null,
      }),
    );

    expect(result[0]?.seed).toBe(98765);
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

    const won = setWinner(favorited, a, "voice-live");
    expect(won.winner).toEqual(a);
    expect(won.lockedVoiceId).toBe("voice-live");
    expect(discard(favorited, b).pool).toEqual([]);
    expect(removeFavorite(favorited, a).favorites).toEqual([]);
  });
});

describe("reconcileBracket", () => {
  it("keeps a winner when its locked voice matches the live DB voice", () => {
    const state = setWinner(emptyBracket("char-1"), candidate("a"), "voice-live");

    expect(reconcileBracket(state, "voice-live")).toEqual({
      state,
      staleWinnerCleared: false,
    });
  });

  it("clears a stale winner when the live DB voice is different", () => {
    const winner = candidate("a");
    const state = setWinner(emptyBracket("char-1"), winner, "voice-old");

    expect(reconcileBracket(state, "voice-new")).toEqual({
      state: { ...state, winner: null, lockedVoiceId: null },
      staleWinnerCleared: true,
    });
  });

  it("clears a stale winner when the live DB voice is null or undefined", () => {
    const state = setWinner(emptyBracket("char-1"), candidate("a"), "voice-old");

    expect(reconcileBracket(state, null)).toEqual({
      state: { ...state, winner: null, lockedVoiceId: null },
      staleWinnerCleared: true,
    });
    expect(reconcileBracket(state, undefined)).toEqual({
      state: { ...state, winner: null, lockedVoiceId: null },
      staleWinnerCleared: true,
    });
  });

  it("leaves brackets without winners unchanged even when voice ids differ", () => {
    const state: BracketState = { ...emptyBracket("char-1"), lockedVoiceId: "voice-old" };

    expect(reconcileBracket(state, "voice-new")).toEqual({
      state,
      staleWinnerCleared: false,
    });
  });

  it("preserves pool and favorites when clearing a stale winner", () => {
    const favorite = candidate("favorite");
    const pooled = candidate("pooled");
    const state: BracketState = {
      ...emptyBracket("char-1"),
      favorites: [favorite],
      pool: [pooled],
      winner: favorite,
      lockedVoiceId: "voice-old",
    };

    const reconciled = reconcileBracket(state, "voice-new");

    expect(reconciled.staleWinnerCleared).toBe(true);
    expect(reconciled.state.favorites).toEqual([favorite]);
    expect(reconciled.state.pool).toEqual([pooled]);
    expect(reconciled.state.winner).toBeNull();
    expect(reconciled.state.lockedVoiceId).toBeNull();
  });
});

describe("bracket storage", () => {
  it("defaults empty and older persisted brackets to a null lockedVoiceId", () => {
    expect(emptyBracket("char-1").lockedVoiceId).toBeNull();

    stubLocalStorage({
      casting_bracket_char_legacy: JSON.stringify({
        favorites: [],
        pool: [],
        winner: null,
      }),
    });

    expect(loadBracket("char-empty").lockedVoiceId).toBeNull();
    expect(loadBracket("char_legacy").lockedVoiceId).toBeNull();
  });

  it("reads a persisted lockedVoiceId string", () => {
    stubLocalStorage({
      casting_bracket_char_1: JSON.stringify({
        favorites: [],
        pool: [],
        winner: candidate("a"),
        lockedVoiceId: "voice-live",
      }),
    });

    expect(loadBracket("char_1").lockedVoiceId).toBe("voice-live");
  });

  it("preserves generation-time template provenance through localStorage", () => {
    const templated = { ...candidate("a"), template_name: "Archive Profile A" };
    const state: BracketState = {
      ...emptyBracket("char-1"),
      pool: [templated],
      favorites: [templated],
      winner: templated,
      lockedVoiceId: "voice-live",
    };
    const { store } = stubLocalStorage();

    saveBracket(state);
    expect(JSON.parse(store.get("casting_bracket_char-1") ?? "{}").pool[0].template_name).toBe(
      "Archive Profile A",
    );
    expect(loadBracket("char-1").pool[0]?.template_name).toBe("Archive Profile A");
    expect(loadBracket("char-1").favorites[0]?.template_name).toBe("Archive Profile A");
    expect(loadBracket("char-1").winner?.template_name).toBe("Archive Profile A");
  });
});

describe("isCast", () => {
  it("treats non-empty voice_id as cast", () => {
    expect(isCast({ voice_id: "voice_123" })).toBe(true);
    expect(isCast({ voice_id: "" })).toBe(false);
    expect(isCast({ voice_id: null })).toBe(false);
  });
});

describe("writeCastToCharacter", () => {
  const recipe: VoiceRecipe = {
    design_prompt: {
      voice_description_raw: TEST_DESCRIPTION,
      preview_text_raw:
        "This is a representative audition script with a setup, a turn, and enough punctuation to shape delivery.",
      builder_state: builderState,
    },
    generation: {
      model_id: "eleven_ttv_v3",
      guidance_scale: 7,
      seed: GENERATION_RANGES.seed.max + 1,
      quality: 2,
    },
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      speed: 1,
      use_speaker_boost: true,
    },
    template_name: "Archive Profile A",
  };

  function mockCharactersUpdate(result: { error: { message: string } | null }) {
    const single = vi.fn(async () => result);
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    return {
      client: { from },
      from,
      update,
      eq,
      select,
      single,
    };
  }

  it("writes cast fields through select(id).single() so zero-row updates surface as errors", async () => {
    const mock = mockCharactersUpdate({ error: null });

    await writeCastToCharacter(
      mock.client as never,
      "char-1",
      "voice-live",
      { stability: 2, speed: 0.1 },
      recipe,
    );

    expect(mock.from).toHaveBeenCalledWith("characters");
    expect(mock.update).toHaveBeenCalledWith({
      voice_id: "voice-live",
      voice_settings: {
        stability: 1,
        similarity_boost: 0.75,
        style: 0,
        speed: 0.7,
        use_speaker_boost: true,
      },
      voice_recipe: {
        design_prompt: {
          voice_description_raw: TEST_DESCRIPTION,
          preview_text_raw:
            "This is a representative audition script with a setup, a turn, and enough punctuation to shape delivery.",
          builder_state: builderState,
        },
        generation: {
          model_id: "eleven_ttv_v3",
          guidance_scale: 7,
          seed: GENERATION_RANGES.seed.max,
          quality: 1,
        },
        voice_settings: {
          stability: 1,
          similarity_boost: 0.75,
          style: 0,
          speed: 0.7,
          use_speaker_boost: true,
        },
        template_name: "Archive Profile A",
      },
    });
    expect(mock.eq).toHaveBeenCalledWith("id", "char-1");
    expect(mock.select).toHaveBeenCalledWith("id");
    expect(mock.single).toHaveBeenCalledOnce();
  });

  it("throws the recovery message when the selected update returns an error", async () => {
    const mock = mockCharactersUpdate({ error: { message: "JSON object requested, multiple (or no) rows returned" } });

    await expect(
      writeCastToCharacter(mock.client as never, "missing-char", "voice-live", recipe.voice_settings, recipe),
    ).rejects.toThrow(
      "Saved the voice but could not write it to the character: JSON object requested, multiple (or no) rows returned",
    );
  });
});

describe("purgeCreatedVoiceId", () => {
  it("drops every generated-voice cache entry that points at the deleted ElevenLabs voice", () => {
    const createdVoiceIds = new Map([
      ["gen-a", "voice_A"],
      ["gen-a-duplicate", "voice_A"],
      ["gen-b", "voice_B"],
    ]);

    purgeCreatedVoiceId(createdVoiceIds, "voice_A");

    expect([...createdVoiceIds.entries()]).toEqual([["gen-b", "voice_B"]]);
  });
});
