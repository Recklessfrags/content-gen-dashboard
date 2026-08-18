import { describe, expect, it } from "vitest";
import { runsHubStatus } from "../runsHubState";

const baseInput = {
  jobsError: null,
  jobsLoading: false,
  stepHistoryError: null,
  stepHistoryLoading: false,
  stepHistoryLoaded: true,
};

describe("runsHubStatus", () => {
  it("keeps a step-history failure non-blocking", () => {
    const status = runsHubStatus({
      ...baseInput,
      stepHistoryError: "receipts unavailable",
    });

    expect(status.error).toBeNull();
    expect(status.stepHistoryError).toBe("receipts unavailable");
  });

  it("keeps a jobs failure blocking", () => {
    const status = runsHubStatus({ ...baseInput, jobsError: "jobs unavailable" });

    expect(status.error).toBe("jobs unavailable");
    expect(status.stepHistoryError).toBeNull();
  });

  it("keeps simultaneous failures on their respective channels", () => {
    const status = runsHubStatus({
      ...baseInput,
      jobsError: "jobs unavailable",
      stepHistoryError: "receipts unavailable",
    });

    expect(status.error).toBe("jobs unavailable");
    expect(status.stepHistoryError).toBe("receipts unavailable");
  });

  it("blocks on the first step-history load but not a routine refresh", () => {
    expect(runsHubStatus({
      ...baseInput,
      stepHistoryLoading: true,
      stepHistoryLoaded: false,
    }).loading).toBe(true);
    expect(runsHubStatus({
      ...baseInput,
      stepHistoryLoading: true,
      stepHistoryLoaded: true,
    }).loading).toBe(false);
    expect(runsHubStatus({ ...baseInput, jobsLoading: true }).loading).toBe(true);
  });
});
