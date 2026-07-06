// Per-worker (stage) reliability + retry-cost rollup over the pipeline's receipts
// telemetry. Read-only analytics, no pipeline dependency. Pure + unit-testable.
//
// "retry-cost" = spend on attempts the pipeline had to RETRY (the output was
// discarded and the stage re-ran), so it is wasted money — a cheap model that
// retries a lot isn't actually cheap. Incremental spend per receipt is derived
// from the cumulative `spend_so_far` (diff within an episode, ordered by seq).

export type RawReceipt = {
  episodeId: string;
  seq: number;
  stage: string;
  model: string;
  provider: string;
  verdict: string;
  spendSoFar: number;
};

export type WorkerReliabilityRow = {
  stage: string;
  attempts: number;
  pass: number;
  retry: number;
  blocked: number;
  approvalRequired: number;
  retryRate: number; // retry / attempts, 0 when attempts === 0
  retryCost: number; // wasted spend on retried attempts
  models: string[]; // distinct non-empty models seen at this stage
};

export type WorkerReliability = {
  rows: WorkerReliabilityRow[]; // most wasteful first (retryCost, then retryRate)
  totalAttempts: number;
  totalRetryCost: number;
};

type Accumulator = {
  stage: string;
  attempts: number;
  pass: number;
  retry: number;
  blocked: number;
  approvalRequired: number;
  retryCost: number;
  models: Set<string>;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Incremental spend per receipt from the cumulative `spend_so_far`, per episode. */
function withIncrementalSpend(receipts: RawReceipt[]): Array<RawReceipt & { delta: number }> {
  const ordered = [...receipts].sort((a, b) => {
    if (a.episodeId !== b.episodeId) return a.episodeId < b.episodeId ? -1 : 1;
    return a.seq - b.seq;
  });
  const prevByEpisode = new Map<string, number>();
  return ordered.map((receipt) => {
    const prev = prevByEpisode.get(receipt.episodeId) ?? 0;
    const current = Number.isFinite(receipt.spendSoFar) ? receipt.spendSoFar : prev;
    const delta = Math.max(0, current - prev);
    prevByEpisode.set(receipt.episodeId, Math.max(prev, current));
    return { ...receipt, delta };
  });
}

export function computeWorkerReliability(receipts: RawReceipt[]): WorkerReliability {
  const byStage = new Map<string, Accumulator>();
  let totalRetryCost = 0;

  for (const receipt of withIncrementalSpend(receipts)) {
    const stage = receipt.stage.trim() === "" ? "(unlabeled)" : receipt.stage.trim();
    let acc = byStage.get(stage);
    if (!acc) {
      acc = {
        stage,
        attempts: 0,
        pass: 0,
        retry: 0,
        blocked: 0,
        approvalRequired: 0,
        retryCost: 0,
        models: new Set<string>(),
      };
      byStage.set(stage, acc);
    }

    acc.attempts += 1;
    const verdict = normalize(receipt.verdict);
    if (verdict === "pass") acc.pass += 1;
    else if (verdict === "retry") {
      acc.retry += 1;
      acc.retryCost += receipt.delta;
      totalRetryCost += receipt.delta;
    } else if (verdict === "blocked") acc.blocked += 1;
    else if (verdict === "approval_required") acc.approvalRequired += 1;

    const model = receipt.model.trim();
    if (model !== "") acc.models.add(model);
  }

  const rows: WorkerReliabilityRow[] = [...byStage.values()]
    .map((acc) => ({
      stage: acc.stage,
      attempts: acc.attempts,
      pass: acc.pass,
      retry: acc.retry,
      blocked: acc.blocked,
      approvalRequired: acc.approvalRequired,
      retryRate: acc.attempts === 0 ? 0 : acc.retry / acc.attempts,
      retryCost: acc.retryCost,
      models: [...acc.models].sort(),
    }))
    .sort((a, b) => b.retryCost - a.retryCost || b.retryRate - a.retryRate || b.attempts - a.attempts);

  const totalAttempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  return { rows, totalAttempts, totalRetryCost };
}
