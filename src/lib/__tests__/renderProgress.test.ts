import { describe, expect, it } from "vitest";
import { renderProgress, STAGE_LADDER } from "@/lib/renderProgress";

describe("renderProgress", () => {
  it("keeps the progress ladder arithmetic at nine steps", () => {
    expect(STAGE_LADDER).toHaveLength(9);
    expect(renderProgress("distribution").total).toBe(9);
  });
  it.each(STAGE_LADDER.map((stage, index) => [stage.stage, stage.label, index + 1] as const))(
    "maps %s to its honest ladder position",
    (stage, label, step) => {
      expect(renderProgress(stage)).toEqual({
        step,
        total: 9,
        label,
        fraction: step / 9,
      });
    },
  );

  it.each([null, "channel_profile", "preflight"])("treats %s as setup", (stage) => {
    expect(renderProgress(stage)).toEqual({
      step: 0,
      total: 9,
      label: "Starting…",
      fraction: 0,
    });
  });

  it.each(["future_stage", "entertainment_judge"])("keeps the step-zero starting state for %s", (stage) => {
    expect(renderProgress(stage)).toEqual({
      step: 0,
      total: 9,
      label: "Starting…",
      fraction: 0,
    });
  });
});
