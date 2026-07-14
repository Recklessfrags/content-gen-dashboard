import { describe, expect, it } from "vitest";
import { extractBelowFloorCuts, parkExplanation } from "../parkExplanation";

describe("parkExplanation", () => {
  it.each([
    ["fact", "Paused for your fact call. A flagged claim needs your yes/no before the pipeline continues. Approving re-queues the run; money is not spent by this approval."],
    ["spend", "Paused for your spend approval. The next stage costs real money and waits for your go."],
  ] as const)("maps %s exactly", (kind, copy) => expect(parkExplanation(kind, "ready_for_review")).toBe(copy));

  it("uses authoritative hard-park columns", () => {
    expect(parkExplanation("unknown", "error", "blocked")).toBe("Stopped: the pipeline hit a wall it can't retry through (config, credentials, or an upstream refusal). Needs a fix on the pipeline side, not an approval.");
    expect(parkExplanation("unknown", "error", "exhausted")).toBe("Stopped: the pipeline used all its retries on a failing stage. The per-worker log below shows which stage and why.");
  });

  it("fails safe on junk", () => {
    expect(parkExplanation(undefined, 42)).toBeNull();
    expect(extractBelowFloorCuts(null)).toEqual([]);
    expect(extractBelowFloorCuts({ below_floor_cuts: "bad" })).toEqual([]);
  });
});

describe("extractBelowFloorCuts", () => {
  it("extracts array and keyed per-cut reasons", () => {
    expect(extractBelowFloorCuts({ result: { below_floor_cuts: [{ cut_id: "cut14", reason: "Too generic" }] }, evidence: { below_floor_cuts: { cut2: { reason: "Low relevance" } } } })).toEqual([
      { cut: "cut14", reason: "Too generic" },
      { cut: "cut2", reason: "Low relevance" },
    ]);
  });
});
