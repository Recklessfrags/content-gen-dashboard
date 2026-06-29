import { describe, expect, it } from "vitest";
import { budgetStatus } from "@/lib/budget";

describe("budgetStatus", () => {
  it("returns null ratio and not-over when no positive target exists", () => {
    expect(budgetStatus(10, null)).toEqual({ over: false, ratio: null });
    expect(budgetStatus(10, 0)).toEqual({ over: false, ratio: null });
    expect(budgetStatus(10, -5)).toEqual({ over: false, ratio: null });
    expect(budgetStatus(10, Number.NaN)).toEqual({ over: false, ratio: null });
  });

  it("computes threshold ratio with negative spend clamped to zero", () => {
    expect(budgetStatus(-5, 20)).toEqual({ over: false, ratio: 0 });
    expect(budgetStatus(10, 20)).toEqual({ over: false, ratio: 0.5 });
  });

  it("marks over only when spend exceeds the target", () => {
    expect(budgetStatus(20, 20)).toEqual({ over: false, ratio: 1 });
    // ratio is floating-point (20.01/20 = 1.0005000000000002) — assert closeness.
    const over = budgetStatus(20.01, 20);
    expect(over.over).toBe(true);
    expect(over.ratio).toBeCloseTo(1.0005, 6);
  });
});
