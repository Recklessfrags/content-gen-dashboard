import { useEffect, useState, type ReactNode } from "react";
import { budgetStatus, getBudgetTarget, setBudgetTarget } from "@/lib/budget";
import { stageLabel } from "@/lib/plainLanguage";
import type { QueueJob } from "@/lib/jobs";
import type { Episode } from "@/lib/types";
import { formatUsd, Icon, type CostStats } from "./shared";
import { SpendEfficiencyReadout } from "./SpendEfficiencyReadout";

function CostSkeleton() {
  return (
    <div
      className="cost-skeleton cost-grid"
      aria-hidden="true"
      tabIndex={-1}
    >
      <section className="cost-summary">
        <div className="skeleton skeleton-card skeleton-hero-card">
          <div className="skeleton-row">
            <span className="skeleton skeleton-text skeleton-short" />
            <span className="skeleton skeleton-text skeleton-badge" />
          </div>
          <span className="skeleton skeleton-bar skeleton-money" />
          <span className="skeleton skeleton-text skeleton-wide" />
        </div>
        <div className="skeleton skeleton-card skeleton-parked-card">
          <span className="skeleton skeleton-text skeleton-short" />
          <span className="skeleton skeleton-bar" />
          <span className="skeleton skeleton-text skeleton-wide" />
          <span className="skeleton skeleton-text" />
        </div>
        <div className="skeleton skeleton-card skeleton-provider-card">
          <span className="skeleton skeleton-text skeleton-short" />
          {[0, 1, 2].map((row) => (
            <div className="skeleton-provider-row" key={row}>
              <div className="skeleton-row">
                <span className="skeleton skeleton-text" />
                <span className="skeleton skeleton-text skeleton-badge" />
              </div>
              <span className="skeleton skeleton-bar" />
            </div>
          ))}
        </div>
      </section>
      <section className="cost-audit skeleton-audit-panel">
        <div className="cost-panel-head">
          <span className="skeleton skeleton-text skeleton-short" />
          <span className="skeleton skeleton-text skeleton-badge" />
        </div>
        <div className="audit-list">
          {[0, 1, 2, 3].map((row) => (
            <div className="skeleton skeleton-card skeleton-audit-card" key={row}>
              <div className="skeleton-row">
                <span className="skeleton skeleton-text skeleton-wide" />
                <span className="skeleton skeleton-text skeleton-badge" />
              </div>
              <span className="skeleton skeleton-text" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CostViewFrame({
  status,
  jobs,
  jobsLoading,
  jobsError,
  children,
}: {
  status: string;
  jobs: readonly QueueJob[];
  jobsLoading: boolean;
  jobsError: string | null;
  children: ReactNode;
}) {
  return (
    <div className="cost" role="region" aria-label="Spend governance workspace">
      <div className="col-head">
        <h2>Cost</h2>
        <span className="count">{status}</span>
      </div>
      <div className="cap">
        <span className="eyebrow">Running spend, highest recorded per episode.</span>
      </div>
      <div className="cost-content">
        <SpendEfficiencyReadout jobs={jobs} loading={jobsLoading} error={jobsError} />
        {children}
      </div>
    </div>
  );
}

export function CostBoxDashboard({
  episodes,
  jobs,
  costStats,
  loading,
  jobsLoading,
  error,
  jobsError,
  receiptsLoaded,
  onRetry,
}: {
  episodes: Episode[];
  jobs: readonly QueueJob[];
  costStats: CostStats;
  loading: boolean;
  jobsLoading: boolean;
  error: string | null;
  jobsError: string | null;
  receiptsLoaded: boolean;
  onRetry: () => void;
}) {
  const [budgetTarget, setBudgetTargetState] = useState<number | null>(null);
  const [budgetInput, setBudgetInput] = useState("");

  useEffect(() => {
    const storedTarget = getBudgetTarget();
    setBudgetTargetState(storedTarget);
    setBudgetInput(storedTarget === null ? "" : String(storedTarget));
  }, []);

  const currentBudgetStatus = budgetStatus(costStats.grandTotal, budgetTarget);
  const budgetPercent =
    currentBudgetStatus.ratio === null
      ? null
      : Math.min(Math.round(currentBudgetStatus.ratio * 100), 999);
  const budgetProgressWidth =
    currentBudgetStatus.ratio === null
      ? 0
      : Math.min(Math.max(currentBudgetStatus.ratio * 100, 0), 100);

  const updateBudgetTarget = (rawValue: string) => {
    setBudgetInput(rawValue);
    const trimmedValue = rawValue.trim();
    if (trimmedValue.length === 0) {
      setBudgetTarget(null);
      setBudgetTargetState(null);
      return;
    }

    const parsedValue = Number(trimmedValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) return;

    setBudgetTarget(parsedValue);
    setBudgetTargetState(parsedValue);
  };

  const handleBudgetTargetBlur = (rawValue: string) => {
    const trimmedValue = rawValue.trim();
    if (trimmedValue.length === 0) {
      updateBudgetTarget(rawValue);
      return;
    }

    const parsedValue = Number(trimmedValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setBudgetInput(budgetTarget === null ? "" : String(budgetTarget));
      return;
    }

    updateBudgetTarget(rawValue);
  };

  const clearBudgetTarget = () => {
    setBudgetInput("");
    setBudgetTarget(null);
    setBudgetTargetState(null);
  };

  if (loading) {
    return (
      <CostViewFrame
        status="loading run details"
        jobs={jobs}
        jobsLoading={jobsLoading}
        jobsError={jobsError}
      >
        <CostSkeleton />
      </CostViewFrame>
    );
  }

  if (error) {
    return (
      <CostViewFrame
        status="run details unavailable"
        jobs={jobs}
        jobsLoading={jobsLoading}
        jobsError={jobsError}
      >
        <div className="cost-state">
          <h3>Spend data unavailable</h3>
          <p>Couldn&apos;t load spend data. Check your connection and retry.</p>
          <details className="error-details">
            <summary>Details</summary>
            {error}
          </details>
          <button className="btn" type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      </CostViewFrame>
    );
  }

  if (episodes.length === 0) {
    return (
      <CostViewFrame
        status="no episodes"
        jobs={jobs}
        jobsLoading={jobsLoading}
        jobsError={jobsError}
      >
        <div className="cost-state">
          <Icon name="cost" />
          <h3>No Episodes Yet</h3>
          <p>Pipeline episodes need to exist before receipt spend can be audited here.</p>
        </div>
      </CostViewFrame>
    );
  }

  if (receiptsLoaded && costStats.providerSplit.length === 0) {
    return (
      <CostViewFrame
        status="no run details"
        jobs={jobs}
        jobsLoading={jobsLoading}
        jobsError={jobsError}
      >
        <div className="cost-state">
          <Icon name="cost" />
          <h3>No Run Details Logged</h3>
          <p>Episodes are present, but the pipeline has not reported receipt spend yet.</p>
        </div>
      </CostViewFrame>
    );
  }

  return (
    <CostViewFrame
      status="read-only spend governance"
      jobs={jobs}
      jobsLoading={jobsLoading}
      jobsError={jobsError}
    >
        <div className="cost-disclosure" role="note">
          <span className="disclosure-mark" aria-hidden="true">!</span>
          <div>
            <span className="disclosure-tag">Pipeline disclosure</span>
            <p>
              Asset spend is not yet reported by the content pipeline. Today&apos;s ledger tracks
              LLM text-generation provider spend only, in USD.
            </p>
          </div>
        </div>

        <div className="cost-grid">
          <section className="cost-summary" aria-label="Spend summary">
            <div
              className={"metric-card hero-card" + (currentBudgetStatus.over ? " breached" : "")}
              role="group"
              aria-label={
                currentBudgetStatus.over && budgetTarget !== null
                  ? `Running total operational spend is ${formatUsd(costStats.grandTotal)}. Operational spend has breached the local target of ${formatUsd(budgetTarget)}.`
                  : `Running total operational spend is ${formatUsd(costStats.grandTotal)}.`
              }
            >
              <div className="metric-meta">
                <span className="metric-eyebrow">Total spend</span>
                <span className={currentBudgetStatus.over ? "metric-badge alert-badge" : "metric-badge"}>
                  {currentBudgetStatus.over ? "Over target" : "USD"}
                </span>
              </div>
              <div className="metric-value hero-value">{formatUsd(costStats.grandTotal)}</div>
              <div className="metric-breakdown">
                <span
                  className={"pulse-dot" + (currentBudgetStatus.over ? " breached" : "")}
                  aria-hidden="true"
                />
                Includes runs still in progress
              </div>
              {budgetTarget !== null && (
                <div className="budget-target-status">
                  <div className="progress-container" aria-hidden="true">
                    <div
                      className={"progress-bar " + (currentBudgetStatus.over ? "stamp" : "cleared")}
                      style={{ width: `${budgetProgressWidth}%` }}
                    />
                  </div>
                  <span className={currentBudgetStatus.over ? "budget-warning-text" : "metric-subtext"}>
                    {currentBudgetStatus.over
                      ? `Operational spend has breached your local target of ${formatUsd(budgetTarget)}.`
                      : `${budgetPercent}% of local target ${formatUsd(budgetTarget)}.`}
                  </span>
                </div>
              )}
            </div>

            <div className="metric-card budget-target-card" role="group" aria-labelledby="budget-target-title">
              <div className="metric-meta">
                <span className="metric-eyebrow">Budget target</span>
                <span className="metric-badge">Browser Local</span>
              </div>
              <label className="budget-target-label" htmlFor="budget-target-input" id="budget-target-title">
                Target budget (USD)
              </label>
              <div className="budget-target-controls">
                <input
                  id="budget-target-input"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={budgetInput}
                  placeholder="e.g. 50.00"
                  onChange={(event) => updateBudgetTarget(event.target.value)}
                  onBlur={(event) => handleBudgetTargetBlur(event.target.value)}
                />
                <button
                  className="btn ghost"
                  type="button"
                  onClick={clearBudgetTarget}
                  disabled={budgetTarget === null && budgetInput.trim().length === 0}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="metric-card parked-card redesigned" role="note">
              <div className="metric-meta">
                <span className="metric-eyebrow">Budget enforcement</span>
                <span className="metric-badge">Coming soon</span>
              </div>
              <div className="metric-value-date">Budget cap enforcement</div>
              <p className="metric-subtext">
                Spend capping is enforced directly at the content pipeline level
                (research → assembly). Live dashboard threshold monitoring is currently
                waiting on pipeline support for its internal threshold
                tables.
              </p>
            </div>

            <div className="metric-card provider-card" role="group" aria-label="API provider breakdown">
              <div className="metric-meta provider-head">
                <span className="metric-eyebrow">Spend by provider</span>
                <span className="metric-badge">Providers</span>
              </div>

              <div className="provider-list">
                {costStats.providerSplit.map((provider, index) => (
                  <div className="provider-row" key={provider.name}>
                    <div className="provider-row-top">
                      <span className="provider-name">{provider.name}</span>
                      <span className="provider-amount">{formatUsd(provider.amount, 3)}</span>
                    </div>
                    <div className="progress-container" aria-hidden="true">
                      <div
                        className={"progress-bar " + (index === 0 ? "cleared" : index === 1 ? "brass" : "stamp")}
                        style={{ width: `${provider.percentage}%` }}
                      />
                    </div>
                    <span className="provider-share">{provider.percentage}% share</span>
                  </div>
                ))}
              </div>
            </div>

            {costStats.characterSplit.length > 0 && (
              <div className="metric-card provider-card" role="group" aria-label="Per-character cost breakdown">
                <div className="metric-meta provider-head">
                  <span className="metric-eyebrow">Spend by character</span>
                  <span className="metric-badge">Characters</span>
                </div>

                <div className="provider-list">
                  {costStats.characterSplit.map((character, index) => (
                    <div className="provider-row" key={character.characterId ?? "unattributed"}>
                      <div className="provider-row-top">
                        <span className="provider-name">{character.label}</span>
                        <span className="provider-amount">{formatUsd(character.amount, 3)}</span>
                      </div>
                      <div className="progress-container" aria-hidden="true">
                        <div
                          className={
                            "progress-bar " +
                            (index % 3 === 0 ? "cleared" : index % 3 === 1 ? "brass" : "stamp")
                          }
                          style={{ width: `${character.percentage}%` }}
                        />
                      </div>
                      <span className="provider-share">
                        {character.percentage}% share · {character.episodeCount} eps
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="cost-audit" aria-labelledby="cost-audit-title">
            <div className="cost-panel-head">
              <h3 id="cost-audit-title">Per-Episode Cost Log</h3>
              <span className="count">{costStats.episodeCosts.length} tracked</span>
            </div>
            <div className="audit-list">
              {costStats.episodeCosts.map(({ episode, liveSpend, isInFlight }) => (
                <article
                  className={"audit-card" + (isInFlight ? " in-flight" : "")}
                  key={episode.episode_id}
                >
                  <div className="audit-main">
                    <div className="audit-title">
                      <span className="run-id">#{episode.episode_id.slice(0, 8).toUpperCase()}</span>
                      <h4>{episode.food}</h4>
                    </div>
                    <span className="audit-spend">{formatUsd(liveSpend)}</span>
                  </div>
                  <div className="audit-meta">
                    <span className="rmeta stat">{episode.status}</span>
                    {isInFlight && <span className="flight-badge">Running</span>}
                    {episode.final_stage && <span className="rmeta">Why it stopped · {stageLabel(episode.final_stage)}</span>}
                    <span className="rmeta">{new Date(episode.created_at).toLocaleDateString()}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
    </CostViewFrame>
  );
}
