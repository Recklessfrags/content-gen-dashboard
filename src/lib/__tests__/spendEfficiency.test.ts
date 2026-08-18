import { describe, expect, it } from "vitest";
import {
  calculateSpendEfficiency,
  type SpendEfficiencyJob,
} from "@/lib/spendEfficiency";

function job(overrides: Partial<SpendEfficiencyJob> = {}): SpendEfficiencyJob {
  return {
    channel: "history",
    created_at: "2026-08-18T00:00:00.000Z",
    episode_id: "episode-1",
    food: "Topic A",
    spend: 1,
    ...overrides,
  };
}

describe("calculateSpendEfficiency", () => {
  it("excludes ab_* channels by default and includes them when the toggle is on", () => {
    const jobs = [
      job({ channel: "history", spend: 2 }),
      job({ channel: "ab_hook_a", food: "Experiment", spend: 10 }),
    ];

    expect(calculateSpendEfficiency(jobs)).toMatchObject({
      runCount: 1,
      topicCount: 1,
      totalSpend: 2,
    });
    expect(calculateSpendEfficiency(jobs, { includeAbChannels: true })).toMatchObject({
      runCount: 2,
      topicCount: 2,
      totalSpend: 12,
    });
  });

  it("calculates spend and runs per distinct topic", () => {
    const stats = calculateSpendEfficiency([
      job({ food: "Topic A", spend: 1 }),
      job({ food: "Topic A", spend: 3, episode_id: "episode-2" }),
      job({ food: "Topic B", spend: 2, episode_id: "episode-3" }),
      job({ food: "Topic B", spend: 2, episode_id: "episode-4" }),
    ]);

    expect(stats.spendPerTopic).toBe(4);
    expect(stats.runsPerTopic).toBe(2);
  });

  it("includes only topics with more runs than the repeat-lineage threshold", () => {
    const jobs = [
      ...Array.from({ length: 4 }, (_, index) =>
        job({ food: "Repeated", episode_id: `repeat-${index}` }),
      ),
      ...Array.from({ length: 3 }, (_, index) =>
        job({ food: "At threshold", episode_id: `threshold-${index}` }),
      ),
    ];

    expect(calculateSpendEfficiency(jobs).repeatLineages).toEqual([
      {
        topic: "Repeated",
        runCount: 4,
        totalSpend: 4,
        distinctEpisodeCount: 4,
      },
    ]);
  });

  it("ignores null spend in sums without dropping its run or topic", () => {
    const stats = calculateSpendEfficiency([
      job({ food: "Topic A", spend: null }),
      job({ food: "Topic A", spend: 2, episode_id: "episode-2" }),
      job({ food: "Topic B", spend: 2, episode_id: "episode-3" }),
    ]);

    expect(stats.totalSpend).toBe(4);
    expect(stats.spendPerTopic).toBe(2);
    expect(stats.runsPerTopic).toBe(1.5);
  });

  it("excludes empty topics from both spend and run numerators", () => {
    const stats = calculateSpendEfficiency([
      job({ food: "Topic A", spend: 2 }),
      job({ food: "", spend: 50, episode_id: "empty-topic" }),
      job({ food: "   ", spend: 75, episode_id: "whitespace-topic" }),
    ]);

    expect(stats).toMatchObject({
      runCount: 1,
      topicCount: 1,
      totalSpend: 2,
      spendPerTopic: 2,
      runsPerTopic: 1,
    });
  });

  it("uses null ratios when no topic-bearing jobs match", () => {
    const stats = calculateSpendEfficiency([job({ food: "", spend: 10 })]);

    expect(stats.spendPerTopic).toBeNull();
    expect(stats.runsPerTopic).toBeNull();
  });
});
