import { describe, expect, it } from "vitest";
import {
  extractBelowFloorCuts,
  extractBelowFloorReport,
  parkExplanation,
} from "../parkExplanation";

describe("parkExplanation", () => {
  it.each([
    ["fact", "Waiting for your fact call. A flagged claim needs your yes/no before work continues. Approving starts the run again; money is not spent by this approval."],
    ["spend", "Waiting for your spend approval. The next step costs real money and needs your go."],
  ] as const)("maps %s exactly", (kind, copy) => expect(parkExplanation(kind, "ready_for_review")).toBe(copy));

  it("uses authoritative hard-park columns", () => {
    expect(parkExplanation("unknown", "error", "blocked")).toBe("Stopped: the video system hit a problem it can't retry (setup, credentials, or an outside service refusal). This needs a system fix, not an approval.");
    expect(parkExplanation("unknown", "error", "exhausted")).toBe("Stopped after using all retry attempts. The run details below show where and why.");
  });

  it("fails safe on junk", () => {
    expect(parkExplanation(undefined, 42)).toBeNull();
    expect(extractBelowFloorCuts(null)).toEqual([]);
    expect(extractBelowFloorCuts({ below_floor_cuts: "bad" })).toEqual([]);
  });
});

describe("extractBelowFloorCuts", () => {
  it("extracts array and keyed per-cut reasons", () => {
    const payload = { result: { below_floor_cuts: [{ cut_id: "cut14", reason: "Too generic" }] }, evidence: { below_floor_cuts: { cut2: { reason: "Low relevance" } } } };
    expect(extractBelowFloorCuts(payload)).toEqual([
      { cut: "cut14", reason: "Too generic" },
      { cut: "cut2", reason: "Low relevance" },
    ]);
    expect(extractBelowFloorReport(payload).reportedCount).toBe(2);
  });

  it("reports the receipt magnitude even when only some flagged ids are listed", () => {
    const payload = {
      below_floor_notice: {
        count: 17,
        cut_ids: ["cut19", "cut20", "cut21"],
      },
    };

    expect(extractBelowFloorReport(payload)).toEqual({
      hasData: true,
      reportedCount: 17,
      cuts: [
        { cut: "cut19", reason: null },
        { cut: "cut20", reason: null },
        { cut: "cut21", reason: null },
      ],
    });
  });
});
