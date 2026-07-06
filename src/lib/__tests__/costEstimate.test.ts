import { describe, expect, it } from "vitest";
import { estimateRunCost, percentile } from "@/lib/costEstimate";

describe("percentile", () => {
  it("returns 0 for an empty sample", () => {
    expect(percentile([], 0.5)).toBe(0);
  });

  it("returns the single value regardless of q", () => {
    expect(percentile([0.4], 0.9)).toBe(0.4);
  });

  it("interpolates linearly", () => {
    const sample = [0, 1, 2, 3, 4];
    expect(percentile(sample, 0)).toBe(0);
    expect(percentile(sample, 0.5)).toBe(2);
    expect(percentile(sample, 1)).toBe(4);
    expect(percentile(sample, 0.25)).toBe(1);
  });

  it("clamps q outside [0,1]", () => {
    expect(percentile([1, 2, 3], -1)).toBe(1);
    expect(percentile([1, 2, 3], 2)).toBe(3);
  });
});

describe("estimateRunCost", () => {
  it("returns nulls when there is no spend history", () => {
    const estimate = estimateRunCost([], 5);
    expect(estimate).toEqual({ sampleSize: 0, episodeCap: 5, perEpisode: null, run: null });
  });

  it("drops non-finite and negative values but keeps zeros", () => {
    const estimate = estimateRunCost([0, 0.2, NaN, Infinity, -1, 0.4], 1);
    expect(estimate.sampleSize).toBe(3); // 0, 0.2, 0.4
    expect(estimate.perEpisode?.min).toBe(0);
    expect(estimate.perEpisode?.max).toBe(0.4);
  });

  it("computes the per-episode distribution", () => {
    const estimate = estimateRunCost([0.1, 0.2, 0.3, 0.4, 0.5], 1);
    expect(estimate.sampleSize).toBe(5);
    expect(estimate.perEpisode?.p50).toBeCloseTo(0.3, 6);
    expect(estimate.perEpisode?.mean).toBeCloseTo(0.3, 6);
    expect(estimate.perEpisode?.p90).toBeCloseTo(0.46, 6);
    expect(estimate.perEpisode?.min).toBe(0.1);
    expect(estimate.perEpisode?.max).toBe(0.5);
  });

  it("scales the run estimate by episodeCap (p50 low, mean typical, p90 high)", () => {
    const estimate = estimateRunCost([0.1, 0.2, 0.3, 0.4, 0.5], 5);
    expect(estimate.episodeCap).toBe(5);
    expect(estimate.run?.low).toBeCloseTo(0.3 * 5, 6);
    expect(estimate.run?.typical).toBeCloseTo(0.3 * 5, 6);
    expect(estimate.run?.high).toBeCloseTo(0.46 * 5, 6);
  });

  it("defaults a non-positive or non-finite cap to 1", () => {
    expect(estimateRunCost([0.2], 0).episodeCap).toBe(1);
    expect(estimateRunCost([0.2], -3).episodeCap).toBe(1);
    expect(estimateRunCost([0.2], NaN).episodeCap).toBe(1);
  });

  it("floors a fractional cap", () => {
    expect(estimateRunCost([0.2], 4.9).episodeCap).toBe(4);
  });
});
