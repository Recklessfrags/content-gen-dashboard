export const DEFAULT_REPEAT_LINEAGE_THRESHOLD = 3;

export type SpendEfficiencyWindow = "all" | "7d";

export type SpendEfficiencyJob = {
  channel: string | null;
  created_at: string;
  episode_id: string | null;
  food: string;
  spend: number | null;
};

export type RepeatLineage = {
  topic: string;
  runCount: number;
  totalSpend: number;
  distinctEpisodeCount: number;
};

export type SpendEfficiencyStats = {
  runCount: number;
  topicCount: number;
  totalSpend: number;
  spendPerTopic: number | null;
  runsPerTopic: number | null;
  repeatLineages: RepeatLineage[];
};

// A delivery-based efficiency metric becomes computable when publishing is enabled.
// Until then, ready_for_review is a human wait state rather than delivery, so no current
// job field can support an honest "undelivered" number.

type SpendEfficiencyOptions = {
  includeAbChannels?: boolean;
  channel?: string | null;
  window?: SpendEfficiencyWindow;
  repeatThreshold?: number;
  now?: Date;
};

export function isAbChannel(channel: string | null): boolean {
  return channel?.trim().toLowerCase().startsWith("ab_") ?? false;
}

function numericSpend(spend: number | null): number {
  return spend !== null && Number.isFinite(spend) ? spend : 0;
}

function isInWindow(
  createdAt: string,
  window: SpendEfficiencyWindow,
  now: Date,
): boolean {
  if (window === "all") return true;

  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return false;

  return createdAtMs >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
}

export function calculateSpendEfficiency(
  jobs: readonly SpendEfficiencyJob[],
  options: SpendEfficiencyOptions = {},
): SpendEfficiencyStats {
  const {
    includeAbChannels = false,
    channel,
    window = "all",
    repeatThreshold = DEFAULT_REPEAT_LINEAGE_THRESHOLD,
    now = new Date(),
  } = options;

  const filteredJobs = jobs.filter((job) => {
    if (job.food.trim().length === 0) return false;
    if (!includeAbChannels && isAbChannel(job.channel)) return false;
    if (channel !== undefined && job.channel !== channel) return false;
    return isInWindow(job.created_at, window, now);
  });

  const lineages = new Map<
    string,
    { topic: string; runCount: number; totalSpend: number; episodeIds: Set<string> }
  >();
  let totalSpend = 0;

  for (const job of filteredJobs) {
    const spend = numericSpend(job.spend);
    const topic = job.food.trim();
    totalSpend += spend;
    const lineage = lineages.get(topic) ?? {
      topic,
      runCount: 0,
      totalSpend: 0,
      episodeIds: new Set<string>(),
    };
    lineage.runCount += 1;
    lineage.totalSpend += spend;
    if (job.episode_id) lineage.episodeIds.add(job.episode_id);
    lineages.set(topic, lineage);
  }

  const topicCount = lineages.size;
  const repeatLineages = [...lineages.values()]
    .filter((lineage) => lineage.runCount > repeatThreshold)
    .map((lineage) => ({
      topic: lineage.topic,
      runCount: lineage.runCount,
      totalSpend: lineage.totalSpend,
      distinctEpisodeCount: lineage.episodeIds.size,
    }))
    .sort(
      (left, right) =>
        right.runCount - left.runCount ||
        right.totalSpend - left.totalSpend ||
        left.topic.localeCompare(right.topic),
    );

  return {
    runCount: filteredJobs.length,
    topicCount,
    totalSpend,
    spendPerTopic: topicCount > 0 ? totalSpend / topicCount : null,
    runsPerTopic: topicCount > 0 ? filteredJobs.length / topicCount : null,
    repeatLineages,
  };
}
