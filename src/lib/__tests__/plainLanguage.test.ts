import { describe, expect, it } from "vitest";
import {
  isAdvancedOnlyLabel,
  plainLanguage,
  PLAIN_LANGUAGE,
  stageLabel,
} from "@/lib/plainLanguage";

describe("plainLanguage", () => {
  it.each(Object.entries(PLAIN_LANGUAGE))("maps %s", (term, label) => {
    expect(plainLanguage(term)).toBe(label);
  });

  it("passes unknown terms through unchanged", () => {
    expect(plainLanguage("future pipeline term")).toBe("future pipeline term");
  });

  it("describes the final stage as a location, not a reason", () => {
    expect(plainLanguage("final_stage")).toBe("Stopped at");
    expect(plainLanguage("terminal_state")).toBe("Why it stopped");
    expect(plainLanguage("failure_class")).toBe("Why it stopped");
  });

  it("uses the render ladder as the stage-label source", () => {
    expect(stageLabel("script_writer")).toBe("Writing the script");
    expect(stageLabel("future_stage")).toBe("Future Stage");
  });

  it.each(["sentinels", "idempotency key", "reveal_auditor", "correlation-key"])(
    "marks %s as advanced-only",
    (term) => expect(isAdvancedOnlyLabel(term)).toBe(true),
  );
});
