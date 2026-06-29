import { describe, expect, it } from "vitest";
import { computeCostStats, type CostReceipt } from "@/components/controlroom/shared";
import type { Episode } from "@/lib/types";

function episode(episodeId: string, characterId: string | null, food = episodeId): Episode {
  return {
    character_id: characterId,
    created_at: "2026-06-29T00:00:00.000Z",
    episode_id: episodeId,
    final_stage: "script",
    food,
    message: null,
    sentinels: [],
    spend: 0,
    status: "success",
    updated_at: "2026-06-29T00:00:00.000Z",
  };
}

function receipt(
  episodeId: string,
  seq: number,
  spendSoFar: number,
  provider = "anthropic",
): CostReceipt {
  return {
    episode_id: episodeId,
    provider,
    seq,
    spend_so_far: spendSoFar,
    stage: `stage-${seq}`,
  };
}

describe("computeCostStats character split", () => {
  it("reconciles character split amounts to the grand total", () => {
    const stats = computeCostStats(
      [episode("ep-1", "char-a"), episode("ep-2", "char-b"), episode("ep-3", "char-a")],
      [
        receipt("ep-1", 1, 2),
        receipt("ep-1", 2, 10),
        receipt("ep-2", 1, 5),
        receipt("ep-3", 1, 3),
      ],
      [
        { id: "char-a", codename: "Alpha" },
        { id: "char-b", codename: "Beta" },
      ],
    );

    const characterTotal = stats.characterSplit.reduce((sum, character) => sum + character.amount, 0);

    expect(stats.grandTotal).toBe(18);
    expect(characterTotal).toBe(stats.grandTotal);
  });

  it("groups null character_id into one Unattributed bucket with count", () => {
    const stats = computeCostStats(
      [episode("ep-1", null), episode("ep-2", null), episode("ep-3", "char-a")],
      [receipt("ep-1", 1, 4), receipt("ep-2", 1, 6), receipt("ep-3", 1, 2)],
      [{ id: "char-a", codename: "Alpha" }],
    );

    expect(stats.characterSplit).toContainEqual({
      characterId: null,
      label: "Unattributed",
      amount: 10,
      percentage: 83,
      episodeCount: 2,
    });
  });

  it("labels known characters by codename and deleted characters as Unknown character", () => {
    const stats = computeCostStats(
      [episode("ep-1", "char-a"), episode("ep-2", "missing-char")],
      [receipt("ep-1", 1, 3), receipt("ep-2", 1, 7)],
      [{ id: "char-a", codename: "Mad Dog" }],
    );

    expect(stats.characterSplit).toContainEqual({
      characterId: "char-a",
      label: "Mad Dog",
      amount: 3,
      percentage: 30,
      episodeCount: 1,
    });
    expect(stats.characterSplit).toContainEqual({
      characterId: "missing-char",
      label: "Unknown character",
      amount: 7,
      percentage: 70,
      episodeCount: 1,
    });
  });

  it("labels known characters with empty or whitespace codenames as Untitled character", () => {
    const stats = computeCostStats(
      [episode("ep-1", "char-empty"), episode("ep-2", "char-spaces")],
      [receipt("ep-1", 1, 4), receipt("ep-2", 1, 6)],
      [
        { id: "char-empty", codename: "" },
        { id: "char-spaces", codename: "   " },
      ],
    );

    expect(stats.characterSplit).toEqual([
      {
        characterId: "char-spaces",
        label: "Untitled character",
        amount: 6,
        percentage: 60,
        episodeCount: 1,
      },
      {
        characterId: "char-empty",
        label: "Untitled character",
        amount: 4,
        percentage: 40,
        episodeCount: 1,
      },
    ]);
  });

  it("keeps zero-spend character buckets at zero percent when grand total is zero", () => {
    const stats = computeCostStats(
      [episode("ep-1", "char-a"), episode("ep-2", "char-a")],
      [],
      [{ id: "char-a", codename: "Alpha" }],
    );

    expect(stats.grandTotal).toBe(0);
    expect(stats.characterSplit).toEqual([
      {
        characterId: "char-a",
        label: "Alpha",
        amount: 0,
        percentage: 0,
        episodeCount: 2,
      },
    ]);
  });

  it("rounds percentages and sorts by amount descending, then label", () => {
    const stats = computeCostStats(
      [episode("ep-1", "char-z"), episode("ep-2", "char-a"), episode("ep-3", "char-m")],
      [receipt("ep-1", 1, 5), receipt("ep-2", 1, 5), receipt("ep-3", 1, 11)],
      [
        { id: "char-z", codename: "Zed" },
        { id: "char-a", codename: "Alpha" },
        { id: "char-m", codename: "Mina" },
      ],
    );

    expect(stats.characterSplit.map((character) => character.label)).toEqual(["Mina", "Alpha", "Zed"]);
    expect(stats.characterSplit.map((character) => character.percentage)).toEqual([52, 24, 24]);
  });

  it("keeps the legacy two-argument call working without changing provider totals", () => {
    const stats = computeCostStats(
      [episode("ep-1", "char-a"), episode("ep-2", null)],
      [
        receipt("ep-1", 1, 2, "anthropic"),
        receipt("ep-1", 2, 10, "google"),
        receipt("ep-2", 1, 5, "anthropic"),
      ],
    );

    expect(stats.grandTotal).toBe(15);
    expect(stats.providerSplit).toEqual([
      { name: "google", amount: 8, percentage: 53 },
      { name: "anthropic", amount: 7, percentage: 47 },
    ]);
    expect(stats.characterSplit).toEqual([
      {
        characterId: "char-a",
        label: "Unknown character",
        amount: 10,
        percentage: 67,
        episodeCount: 1,
      },
      {
        characterId: null,
        label: "Unattributed",
        amount: 5,
        percentage: 33,
        episodeCount: 1,
      },
    ]);
  });
});
