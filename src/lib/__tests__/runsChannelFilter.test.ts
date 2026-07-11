import { describe, expect, it } from "vitest";
import {
  ALL_CHANNELS_KEY,
  UNASSIGNED_CHANNEL_KEY,
  cardMatchesChannel,
  channelFacets,
  isUnassignedChannel,
} from "@/lib/runsChannelFilter";

describe("channelFacets", () => {
  it("returns only the zero-count All channels facet for zero cards", () => {
    expect(channelFacets([])).toEqual([{ key: ALL_CHANNELS_KEY, label: "All channels", count: 0 }]);
  });

  it("returns two facets for one assigned channel with no unassigned cards", () => {
    expect(channelFacets([{ channel: "weird_food" }])).toEqual([
      { key: ALL_CHANNELS_KEY, label: "All channels", count: 1 },
      { key: "weird_food", label: "weird_food", count: 1 },
    ]);
  });

  it("sorts assigned channels case-insensitively, trims distinct keys, and counts each bucket", () => {
    expect(
      channelFacets([
        { channel: "zebra" },
        { channel: " Weird_Food " },
        { channel: "alpha" },
        { channel: "Weird_Food" },
        { channel: null },
        { channel: "" },
      ]),
    ).toEqual([
      { key: ALL_CHANNELS_KEY, label: "All channels", count: 6 },
      { key: "alpha", label: "alpha", count: 1 },
      { key: "Weird_Food", label: "Weird_Food", count: 2 },
      { key: "zebra", label: "zebra", count: 1 },
      { key: UNASSIGNED_CHANNEL_KEY, label: "Unassigned", count: 2 },
    ]);
  });

  it("returns All channels followed by Unassigned when all cards are unassigned", () => {
    expect(channelFacets([{ channel: null }, { channel: "   " }])).toEqual([
      { key: ALL_CHANNELS_KEY, label: "All channels", count: 2 },
      { key: UNASSIGNED_CHANNEL_KEY, label: "Unassigned", count: 2 },
    ]);
  });
});

describe("isUnassignedChannel", () => {
  it("buckets null, undefined, empty, and whitespace-only default values as Unassigned", () => {
    expect(isUnassignedChannel(null)).toBe(true);
    expect(isUnassignedChannel(undefined)).toBe(true);
    expect(isUnassignedChannel("")).toBe(true);
    expect(isUnassignedChannel("   ")).toBe(true);
    expect(isUnassignedChannel("weird_food")).toBe(false);
  });
});

describe("cardMatchesChannel", () => {
  it("matches every card for All channels and unassigned cards only for Unassigned", () => {
    expect(cardMatchesChannel({ channel: "weird_food" }, ALL_CHANNELS_KEY)).toBe(true);
    expect(cardMatchesChannel({ channel: null }, ALL_CHANNELS_KEY)).toBe(true);
    expect(cardMatchesChannel({ channel: "   " }, UNASSIGNED_CHANNEL_KEY)).toBe(true);
    expect(cardMatchesChannel({ channel: "weird_food" }, UNASSIGNED_CHANNEL_KEY)).toBe(false);
  });

  it("matches assigned channels by their trimmed value", () => {
    expect(cardMatchesChannel({ channel: " weird_food " }, "weird_food")).toBe(true);
  });

  it("fails closed for an unknown facet key", () => {
    expect(cardMatchesChannel({ channel: "weird_food" }, "missing_channel")).toBe(false);
  });

  it("composes with the attention filter using AND and can yield zero matches", () => {
    const cards = [
      { channel: "alpha", needsAttention: true },
      { channel: "beta", needsAttention: false },
    ];
    const visible = cards.filter(
      (card) => card.needsAttention && cardMatchesChannel(card, "beta"),
    );

    expect(visible).toEqual([]);
  });

  it("supports falling back to All channels when a selected channel disappears", () => {
    const cards = [{ channel: "alpha" }];
    const facets = channelFacets(cards);
    const selectedChannelKey = "missing_channel";
    const effectiveChannelKey = facets.some((facet) => facet.key === selectedChannelKey)
      ? selectedChannelKey
      : ALL_CHANNELS_KEY;

    expect(effectiveChannelKey).toBe(ALL_CHANNELS_KEY);
    expect(cards.filter((card) => cardMatchesChannel(card, effectiveChannelKey))).toEqual(cards);
  });
});
