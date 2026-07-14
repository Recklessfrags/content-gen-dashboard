import { describe, expect, it } from "vitest";
import { recastTargetFromRecipe } from "@/lib/castingRecast";

describe("recastTargetFromRecipe", () => {
  it("reads the exact live intent-capture shape", () => {
    expect(recastTargetFromRecipe({
      status: "recast_target_recorded_not_cast",
      target: "Mad Dog should sound like contained minced-oath fury.",
      note: "Owner-gated recast",
      source: "owner",
      recorded_at: "2026-07-14T00:00:00Z",
    })).toBe("Mad Dog should sound like contained minced-oath fury.");
  });

  it.each([null, [], "junk", {}, { status: "wrong", target: "text" },
    { status: "recast_target_recorded_not_cast" },
    { status: "recast_target_recorded_not_cast", target: 4 },
    { status: "recast_target_recorded_not_cast", target: "   " },
  ])("fails safe for junk shape %#", (recipe) => {
    expect(recastTargetFromRecipe(recipe as never)).toBeNull();
  });
});
