import { describe, expect, it } from "vitest";
import { extractBelowFloorCuts, parkExplanation } from "../parkExplanation";

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
    expect(extractBelowFloorCuts({ result: { below_floor_cuts: [{ cut_id: "cut14", reason: "Too generic" }] }, evidence: { below_floor_cuts: { cut2: { reason: "Low relevance" } } } })).toEqual([
      { cut: "cut14", reason: "Too generic" },
      { cut: "cut2", reason: "Low relevance" },
    ]);
  });

  it("extracts explained cuts from the production below_floor_notice shape", () => {
    const payload = {
      below_floor_notice: {
        count: 5,
        operator_watch: true,
        stock_vision_gate: true,
        cuts: [
          {
            cut_id: "cut22",
            shot_id: "beat_001",
            anchor_phrase: "21 CFR 133.128",
            relevance_score: 0.0,
            relevance_method: "grid_vision",
            vision_confirm: "vision_fail",
            escalation: {
              exhausted: true,
              accepted_tier: null,
              attempted_tiers: ["footage", "pixabay"],
            },
          },
        ],
      },
    };

    expect(extractBelowFloorCuts(payload)).toEqual([
      {
        cut: "cut22",
        reason: 'cut22 — "21 CFR 133.128", relevance 0.00, vision_fail, attempted tiers footage → pixabay, exhausted',
      },
    ]);
  });
});
