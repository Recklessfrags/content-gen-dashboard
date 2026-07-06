"use client";

import { useMemo, useState } from "react";
import { estimateRunCost } from "@/lib/costEstimate";

const DEFAULT_CAP = 5;

function formatUsd(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/**
 * Empirical run-cost estimate ("runs like this cost $X–$Y") derived purely from
 * the dashboard's own historical per-episode spend. Read-only decision lever;
 * no pipeline dependency. Ships ahead of the render-quality tier selector.
 */
export function RunCostEstimate({ perEpisodeCosts }: { perEpisodeCosts: number[] }) {
  // Raw string so the user can clear/retype the field; estimateRunCost() safely
  // falls back to a cap of 1 for empty/invalid input, so no forced clamp needed.
  const [capInput, setCapInput] = useState(String(DEFAULT_CAP));
  const estimate = useMemo(
    () => estimateRunCost(perEpisodeCosts, Number(capInput)),
    [perEpisodeCosts, capInput],
  );

  return (
    <section className="glass-panel run-cost-estimate" aria-labelledby="run-cost-estimate-title">
      <div className="run-cost-estimate__head">
        <div>
          <h3 id="run-cost-estimate-title" className="text-title">
            Estimate a run
          </h3>
          <p className="dim" style={{ fontSize: "0.875rem" }}>
            From your own history — an estimate, not a quote.
          </p>
        </div>
        <label className="run-cost-estimate__cap">
          Episodes per run
          <input
            type="number"
            min={1}
            max={50}
            step={1}
            inputMode="numeric"
            value={capInput}
            onChange={(event) => setCapInput(event.target.value)}
          />
        </label>
      </div>

      {estimate.perEpisode === null || estimate.run === null ? (
        <p className="dim">Not enough spend history yet to estimate. Estimates appear once runs record spend.</p>
      ) : (
        <div className="run-cost-estimate__body">
          <div className="run-cost-estimate__headline">
            <span className="run-cost-estimate__range">
              {formatUsd(estimate.run.low)} – {formatUsd(estimate.run.high)}
            </span>
            <span className="dim">
              typical {formatUsd(estimate.run.typical)} for a {estimate.episodeCap}-episode run
            </span>
          </div>
          <dl className="run-cost-estimate__grid">
            <div>
              <dt className="dim">Per episode (median)</dt>
              <dd>{formatUsd(estimate.perEpisode.p50, 3)}</dd>
            </div>
            <div>
              <dt className="dim">Per episode (typical range)</dt>
              <dd>
                {formatUsd(estimate.perEpisode.p50, 3)} – {formatUsd(estimate.perEpisode.p90, 3)}
              </dd>
            </div>
            <div>
              <dt className="dim">Seen range</dt>
              <dd>
                {formatUsd(estimate.perEpisode.min, 3)} – {formatUsd(estimate.perEpisode.max, 3)}
              </dd>
            </div>
          </dl>
          <p className="dim run-cost-estimate__note">
            Based on {estimate.sampleSize} past episode{estimate.sampleSize === 1 ? "" : "s"}. Range is
            the median-to-90th-percentile spread; render is the dominant cost, so a run that leans on
            generation trends toward the high end.
          </p>
        </div>
      )}
    </section>
  );
}
