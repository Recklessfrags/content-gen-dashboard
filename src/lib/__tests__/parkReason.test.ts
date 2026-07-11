import { describe, expect, it } from "vitest";
import { parkKindLabel, parseBelowFloorCuts } from "@/lib/parkReason";

describe("parseBelowFloorCuts", () => {
  it("extracts a single cut token from a stock vision gate message", () => {
    expect(parseBelowFloorCuts("stock_vision_gate: cut14: stock visual did not pass")).toEqual([
      "cut14",
    ]);
  });

  it("extracts multiple cut tokens in first-seen order", () => {
    expect(parseBelowFloorCuts("cut9 failed, cut19 retried, then cut21 failed")).toEqual([
      "cut9",
      "cut19",
      "cut21",
    ]);
  });

  it("dedupes repeated cut tokens", () => {
    expect(parseBelowFloorCuts("cut14 cut14")).toEqual(["cut14"]);
  });

  it("returns an empty list for missing or unmatched messages", () => {
    expect(parseBelowFloorCuts(null)).toEqual([]);
    expect(parseBelowFloorCuts("")).toEqual([]);
    expect(parseBelowFloorCuts("no cuts")).toEqual([]);
  });

  it("lowercases matched cut tokens", () => {
    expect(parseBelowFloorCuts("CUT14")).toEqual(["cut14"]);
  });
});

describe("parkKindLabel", () => {
  it("labels approval park kinds", () => {
    expect(parkKindLabel("fact")).toBe("Awaiting fact approval");
    expect(parkKindLabel("spend")).toBe("Awaiting spend approval");
    expect(parkKindLabel("publish")).toBe("Awaiting publish approval");
  });

  it("labels blocked and exhausted park-kind columns", () => {
    expect(parkKindLabel("unknown", "blocked")).toBe("Blocked");
    expect(parkKindLabel("unknown", "exhausted")).toBe("Budget exhausted");
  });

  it("falls back for unknown parked states", () => {
    expect(parkKindLabel("unknown")).toBe("Parked");
  });
});
