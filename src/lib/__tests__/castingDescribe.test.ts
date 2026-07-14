import { describe, expect, it } from "vitest";
import { buildCastingDescribeRequest, CASTING_PROMPT_MAX, CastingDescribeError } from "@/lib/castingDescribe";

describe("buildCastingDescribeRequest", () => {
  it("trims the prompt and includes only useful character context", () => {
    expect(buildCastingDescribeRequest("  gravelly restraint  ", { codename: " Mad Dog ", concept: " " })).toEqual({
      action: "cast_describe",
      prompt: "gravelly restraint",
      character: { codename: "Mad Dog" },
    });
  });

  it("enforces the prompt length cap", () => {
    expect(buildCastingDescribeRequest("x".repeat(CASTING_PROMPT_MAX)).prompt).toHaveLength(CASTING_PROMPT_MAX);
    expect(() => buildCastingDescribeRequest("x".repeat(CASTING_PROMPT_MAX + 1))).toThrow(CastingDescribeError);
  });
});
