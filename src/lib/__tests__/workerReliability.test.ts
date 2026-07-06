import { describe, expect, it } from "vitest";
import { computeWorkerReliability, type RawReceipt } from "@/lib/workerReliability";

function receipt(partial: Partial<RawReceipt>): RawReceipt {
  return {
    episodeId: "ep1",
    seq: 0,
    stage: "script_writer",
    model: "claude-sonnet-4-6",
    provider: "anthropic",
    verdict: "pass",
    spendSoFar: 0,
    ...partial,
  };
}

describe("computeWorkerReliability", () => {
  it("returns empty rollup for no receipts", () => {
    expect(computeWorkerReliability([])).toEqual({ rows: [], totalAttempts: 0, totalRetryCost: 0 });
  });

  it("counts verdicts per stage", () => {
    const result = computeWorkerReliability([
      receipt({ seq: 0, verdict: "pass" }),
      receipt({ seq: 1, verdict: "retry" }),
      receipt({ seq: 2, verdict: "retry" }),
      receipt({ seq: 3, verdict: "blocked" }),
      receipt({ seq: 4, verdict: "approval_required" }),
    ]);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.stage).toBe("script_writer");
    expect(row.attempts).toBe(5);
    expect(row.pass).toBe(1);
    expect(row.retry).toBe(2);
    expect(row.blocked).toBe(1);
    expect(row.approvalRequired).toBe(1);
    expect(row.retryRate).toBeCloseTo(2 / 5, 6);
  });

  it("derives incremental retry-cost from cumulative spend_so_far within an episode", () => {
    // cumulative: 0.10 (pass) -> 0.25 (retry, +0.15) -> 0.30 (pass, +0.05)
    const result = computeWorkerReliability([
      receipt({ episodeId: "e", seq: 0, verdict: "pass", spendSoFar: 0.1, stage: "a" }),
      receipt({ episodeId: "e", seq: 1, verdict: "retry", spendSoFar: 0.25, stage: "b" }),
      receipt({ episodeId: "e", seq: 2, verdict: "pass", spendSoFar: 0.3, stage: "b" }),
    ]);
    const b = result.rows.find((r) => r.stage === "b");
    expect(b?.retryCost).toBeCloseTo(0.15, 6);
    expect(result.totalRetryCost).toBeCloseTo(0.15, 6);
  });

  it("keeps spend deltas independent per episode (no cross-episode diffing)", () => {
    const result = computeWorkerReliability([
      receipt({ episodeId: "e1", seq: 0, verdict: "retry", spendSoFar: 0.2, stage: "s" }),
      receipt({ episodeId: "e2", seq: 0, verdict: "retry", spendSoFar: 0.3, stage: "s" }),
    ]);
    // each episode's first receipt diffs from 0, not from the other episode.
    expect(result.rows[0].retryCost).toBeCloseTo(0.5, 6);
  });

  it("sorts most-wasteful stage first and collects distinct models", () => {
    const result = computeWorkerReliability([
      receipt({ episodeId: "e", seq: 0, stage: "cheap", verdict: "retry", spendSoFar: 0.05, model: "haiku" }),
      receipt({ episodeId: "e", seq: 1, stage: "pricey", verdict: "retry", spendSoFar: 0.55, model: "sonnet" }),
      receipt({ episodeId: "e", seq: 2, stage: "pricey", verdict: "pass", spendSoFar: 0.6, model: "gemini-2.5-pro" }),
    ]);
    expect(result.rows[0].stage).toBe("pricey"); // 0.50 retry-cost > cheap's 0.05
    expect(result.rows[0].models).toEqual(["gemini-2.5-pro", "sonnet"]);
  });

  it("buckets empty/blank stage under (unlabeled) and ignores empty models", () => {
    const result = computeWorkerReliability([receipt({ stage: "  ", model: "" })]);
    expect(result.rows[0].stage).toBe("(unlabeled)");
    expect(result.rows[0].models).toEqual([]);
  });
});
