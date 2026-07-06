// Empirical run-cost estimator (buildable-now slice, no pipeline dependency).
// Derives a "runs like this cost $X–$Y" estimate purely from the dashboard's own
// historical per-episode spend (receipts → costStats.episodeCosts[].liveSpend).
// No writes, no network — a pure function so it's unit-testable.

export type PerEpisodeStats = {
  min: number;
  p50: number;
  mean: number;
  p90: number;
  max: number;
};

export type RunCostEstimate = {
  // How many historical episodes fed the estimate (more = tighter/trustier).
  sampleSize: number;
  episodeCap: number;
  // null when there is no spend history to estimate from.
  perEpisode: PerEpisodeStats | null;
  // Per-episode stats scaled by episodeCap. low = p50, typical = mean, high = p90.
  run: { low: number; typical: number; high: number } | null;
};

/** Linear-interpolated percentile over a numeric sample (q in [0,1]). */
export function percentile(sortedAscending: number[], q: number): number {
  const n = sortedAscending.length;
  if (n === 0) return 0;
  if (n === 1) return sortedAscending[0];
  const clamped = Math.min(Math.max(q, 0), 1);
  const pos = clamped * (n - 1);
  const lowIndex = Math.floor(pos);
  const highIndex = Math.ceil(pos);
  const frac = pos - lowIndex;
  return sortedAscending[lowIndex] + (sortedAscending[highIndex] - sortedAscending[lowIndex]) * frac;
}

/**
 * Estimate a run's cost from historical per-episode costs.
 * `perEpisodeCosts` = liveSpend for each historical episode (any order; negatives
 * and non-finite values are dropped, zeros are kept as legitimately-cheap runs).
 * `episodeCap` scales a per-episode estimate up to a whole run.
 */
export function estimateRunCost(
  perEpisodeCosts: number[],
  episodeCap: number,
): RunCostEstimate {
  const cap = Number.isFinite(episodeCap) && episodeCap > 0 ? Math.floor(episodeCap) : 1;
  const sample = perEpisodeCosts
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);

  if (sample.length === 0) {
    return { sampleSize: 0, episodeCap: cap, perEpisode: null, run: null };
  }

  const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  const perEpisode: PerEpisodeStats = {
    min: sample[0],
    p50: percentile(sample, 0.5),
    mean,
    p90: percentile(sample, 0.9),
    max: sample[sample.length - 1],
  };

  return {
    sampleSize: sample.length,
    episodeCap: cap,
    perEpisode,
    run: {
      low: perEpisode.p50 * cap,
      typical: perEpisode.mean * cap,
      high: perEpisode.p90 * cap,
    },
  };
}
