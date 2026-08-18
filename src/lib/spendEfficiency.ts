export const DEFAULT_REPEAT_LINEAGE_THRESHOLD = 3;
export const DELIVERED_JOB_STATUS = "done";

export type SpendEfficiencyWindow = "all" | "7d";

export type SpendEfficiencyJob = {
  channel: string | null;
  created_at: string;
  episode_id: string | null;
  food: string;
  spend: number | null;
  status: string;
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
  undeliveredSpend: number;
  undeliveredSpendShare: number | null;
  repeatLineages: RepeatLineage[];
};

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
    if (!includeAbChannels && isAbChannel(job.channel)) return false;
    if (channel !== undefined && job.channel !== channel) return false;
    return isInWindow(job.created_at, window, now);
  });

  const lineages = new Map<
    string,
    { topic: string; runCount: number; totalSpend: number; episodeIds: Set<string> }
  >();
  let totalSpend = 0;
  let undeliveredSpend = 0;

  for (const job of filteredJobs) {
    const spend = numericSpend(job.spend);
    const topic = job.food.trim();
    totalSpend += spend;
    if (job.status.trim().toLowerCase() !== DELIVERED_JOB_STATUS) {
      undeliveredSpend += spend;
    }

    if (topic.length === 0) continue;
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
    undeliveredSpend,
    undeliveredSpendShare: totalSpend > 0 ? undeliveredSpend / totalSpend : null,
    repeatLineages,
  };
}
