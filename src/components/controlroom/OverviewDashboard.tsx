import React, { useMemo } from "react";
import type { Episode, Idea } from "@/lib/types";
import {
  formatMoney,
  formatUsd,
  isClearedStatus,
  isFailedStatus,
  type CostStats,
  type FlatChar,
} from "./shared";

const PASS_VERDICTS = new Set(["pass", "cleared", "approved", "success"]);

function formatOverviewDate(createdAt: string) {
  return new Date(createdAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleCaseStatus(status: string) {
  const normalized = status.trim();
  if (!normalized) return "Unknown";
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

// Tiny decorative inline-SVG sparkline (no deps). Returns null below 2 points.
function Sparkline({ values, variant }: { values: number[]; variant: "spend" | "runs" }) {
  if (values.length < 2 || values.some((v) => !Number.isFinite(v))) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const flat = max - min === 0; // all-equal series -> center the line, don't divide by 0
  const pts = values.map((v, i) => {
    const x = (i / (n - 1)) * 116 + 2;
    const y = flat ? 17 : 30 - ((v - min) / span) * 26;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });
  const line = pts.map(([x, y]) => `${x} ${y}`).join(" L ");
  const [lastX, lastY] = pts[n - 1];
  const area = `M ${pts[0][0]} 34 L ${line} L ${lastX} 34 Z`;
  // Theme-swappable series colors: the Aurora overview scope redefines --spark-*;
  // the legacy .cr overview falls back to the parchment brass/stamp.
  const color =
    variant === "spend"
      ? "var(--spark-spend, var(--brass))"
      : "var(--spark-runs, var(--stamp))";
  const gradId = `spark-${variant}-grad`;
  return (
    <svg className="sparkline-svg" viewBox="0 0 120 34" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="sparkline-area" d={area} fill={`url(#${gradId})`} />
      <path className={`sparkline-stroke s-${variant}`} d={`M ${line}`} />
      <circle className={`sparkline-dot s-${variant}`} cx={lastX} cy={lastY} r="3" />
    </svg>
  );
}

export function OverviewDashboard({
  chars,
  ideas,
  episodes,
  costStats,
  costReceiptsLoading,
  costReceiptsError,
}: {
  chars: FlatChar[];
  ideas: Idea[];
  episodes: Episode[];
  costStats: CostStats;
  costReceiptsLoading: boolean;
  costReceiptsError: string | null;
}) {
  const rosterStats = useMemo(() => {
    const total = chars.length;
    const active = chars.filter((c) => c.status === "active").length;
    const draft = chars.filter((c) => c.status === "draft").length;
    const activeRatio = total > 0 ? Math.round((active / total) * 100) : 0;
    return { total, active, draft, activeRatio };
  }, [chars]);

  const wireStats = useMemo(() => {
    const total = ideas.length;
    const backlog = ideas.filter((i) => i.status === "backlog").length;
    const active = ideas.filter((i) => i.status === "active").length;
    const used = ideas.filter((i) => i.status === "used").length;
    const conversionRate = total > 0 ? Math.round((used / total) * 100) : 0;
    return { total, backlog, active, used, conversionRate };
  }, [ideas]);

  const runsStats = useMemo(() => {
    const total = episodes.length;
    const totalSpend = costStats.grandTotal;
    const avgSpend = total > 0 ? totalSpend / total : 0;
    const statusCounts = episodes.reduce<Record<string, number>>((counts, episode) => {
      const status = (episode.status || "unknown").trim().toLowerCase() || "unknown";
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {});
    const sortedStatusCounts = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
    const cleared = episodes.filter((episode) => isClearedStatus(episode.status)).length;
    const failed = episodes.filter((episode) => isFailedStatus(episode.status)).length;
    const active = Math.max(total - cleared - failed, 0);
    const passedSentinels = episodes.filter((episode) => {
      const sentinels = episode.sentinels ?? [];
      const gate = sentinels.length > 0 ? sentinels[sentinels.length - 1] : undefined;
      return PASS_VERDICTS.has((gate?.verdict || "").toLowerCase());
    }).length;
    const passRate = total > 0 ? Math.round((passedSentinels / total) * 100) : 0;
    const lastEpisode =
      episodes.reduce<Episode | null>((latest, episode) => {
        if (!latest) return episode;
        return new Date(episode.created_at).getTime() > new Date(latest.created_at).getTime()
          ? episode
          : latest;
      }, null) ?? null;

    return {
      total,
      totalSpend,
      avgSpend,
      cleared,
      failed,
      active,
      statusCounts: sortedStatusCounts,
      passRate,
      passedSentinels,
      lastEpisode,
    };
  }, [costStats.grandTotal, episodes]);

  // Sparkline series: episodes sorted by created_at, then cumulative spend and
  // cumulative run count over time. Invalid timestamps sort last; <2 points -> no line.
  const sparkSeries = useMemo(() => {
    // Only episodes with a valid timestamp contribute to the time series.
    const valid = episodes.filter((e) =>
      Number.isFinite(e.created_at ? new Date(e.created_at).getTime() : NaN),
    );
    valid.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    let cumSpend = 0;
    const spend: number[] = [];
    valid.forEach((e) => {
      cumSpend += typeof e.spend === "number" ? e.spend : 0;
      spend.push(cumSpend);
    });
    return { spend };
  }, [episodes]);

  return (
    <div className="overview" role="region" aria-label="Overview dashboard">
      <div className="col-head">
        <h2>Overview</h2>
        <span className="count">operations summary</span>
      </div>

      <div className="cap">
        <span className="eyebrow">A summary across your characters, ideas, and runs.</span>
      </div>

      <div className="overview-content">
        <div className="overview-grid">
          <section className="overview-column" aria-labelledby="overview-roster-title">
            <div className="overview-column-header">
              <span className="eyebrow">Domain 01</span>
              <h3 id="overview-roster-title">Characters</h3>
            </div>
            <div className="overview-cards">
              <div
                className={"metric-card" + (rosterStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Total characters: ${rosterStats.total}. ${rosterStats.active} active, ${rosterStats.draft} draft.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Total characters</span>
                  <span className="metric-indicator cleared" aria-hidden="true" />
                </div>
                <div className="metric-value">{rosterStats.total}</div>
                <div className="metric-breakdown">
                  <span className="accent-cleared">{rosterStats.active} active</span>
                  <span className="divider">-</span>
                  <span className="accent-dim">{rosterStats.draft} drafts</span>
                </div>
                {rosterStats.total === 0 && (
                  <p className="metric-empty">No characters yet.</p>
                )}
              </div>

              <div
                className={"metric-card" + (rosterStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Active characters: ${rosterStats.activeRatio} percent of the roster.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Active characters</span>
                  <span className="metric-badge">Active ratio</span>
                </div>
                <div className="metric-value">{rosterStats.activeRatio}%</div>
                <div className="metric-breakdown">
                  <div className="progress-container" aria-hidden="true">
                    <div
                      className="progress-bar cleared"
                      style={{ width: `${rosterStats.activeRatio}%` }}
                    />
                  </div>
                  <span className="metric-subtext">
                    {rosterStats.total === 0
                      ? "Waiting on your first character."
                      : "Share of characters marked active."}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="overview-column" aria-labelledby="overview-wire-title">
            <div className="overview-column-header">
              <span className="eyebrow">Domain 02</span>
              <h3 id="overview-wire-title">Ideas</h3>
            </div>
            <div className="overview-cards">
              <div
                className={"metric-card" + (wireStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Total logged ideas: ${wireStats.total}. ${wireStats.backlog} backlog, ${wireStats.active} active, ${wireStats.used} used.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Total logged ideas</span>
                  <span className="metric-indicator brass" aria-hidden="true" />
                </div>
                <div className="metric-value">{wireStats.total}</div>
                <div className="metric-breakdown">
                  <span className="accent-dim">{wireStats.backlog} backlog</span>
                  <span className="divider">-</span>
                  <span className="accent-brass">{wireStats.active} active</span>
                  <span className="divider">-</span>
                  <span className="accent-cleared">{wireStats.used} used</span>
                </div>
                {wireStats.total === 0 && (
                  <p className="metric-empty">No ideas logged yet.</p>
                )}
              </div>

              <div
                className={"metric-card" + (wireStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Idea conversion: ${wireStats.conversionRate} percent of ideas converted.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Idea conversion</span>
                  <span className="metric-badge">Used rate</span>
                </div>
                <div className="metric-value">{wireStats.conversionRate}%</div>
                <div className="metric-breakdown">
                  <div className="progress-container" aria-hidden="true">
                    <div
                      className="progress-bar stamp"
                      style={{ width: `${wireStats.conversionRate}%` }}
                    />
                  </div>
                  <span className="metric-subtext">
                    {wireStats.used} ideas implemented as runs.
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="overview-column" aria-labelledby="overview-runs-title">
            <div className="overview-column-header">
              <span className="eyebrow">Domain 03</span>
              <h3 id="overview-runs-title">Runs</h3>
            </div>
            <div className="overview-cards">
              <div
                className={"metric-card" + (runsStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Total runs: ${runsStats.total}. ${runsStats.cleared} cleared, ${runsStats.failed} failed, ${runsStats.active} active or other.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Total runs</span>
                  <span className="metric-indicator stamp" aria-hidden="true" />
                </div>
                <div className="metric-value">{runsStats.total}</div>
                <div className="metric-breakdown">
                  <span className="accent-cleared">{runsStats.cleared} cleared</span>
                  <span className="divider">-</span>
                  <span className={runsStats.failed > 0 ? "accent-failed" : "accent-dim"}>{runsStats.failed} failed</span>
                  <span className="divider">-</span>
                  <span className="accent-brass">{runsStats.active} other</span>
                </div>
                {runsStats.statusCounts.length > 0 ? (
                  <div className="status-breakdown" aria-label="Episode status counts">
                    {runsStats.statusCounts.map(([status, count]) => (
                      <span key={status} className="status-pill">
                        {titleCaseStatus(status)}: {count}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="metric-empty">No runs yet.</p>
                )}
              </div>

              <div
                className={"metric-card" + (runsStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={
                  costReceiptsLoading
                    ? "Total spend is loading."
                    : costReceiptsError
                      ? `Total spend is unavailable: ${costReceiptsError}.`
                      : `Total spend: ${formatUsd(runsStats.totalSpend)}. Average cost per episode is ${formatUsd(runsStats.avgSpend)}.`
                }
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Total spend</span>
                  <span className="metric-badge">Cost</span>
                </div>
                <div className="metric-row">
                  <div className="metric-value metric-money">
                    {costReceiptsLoading ? "Loading" : costReceiptsError ? "Unavailable" : formatMoney(runsStats.totalSpend)}
                  </div>
                  {!costReceiptsLoading && !costReceiptsError && (
                    <Sparkline values={sparkSeries.spend} variant="spend" />
                  )}
                </div>
                <div className="metric-breakdown">
                  <span className="metric-subtext">
                    {costReceiptsLoading
                      ? "Reading the latest spend."
                      : costReceiptsError
                        ? "Couldn't read the spend source."
                        : <>Avg. cost: <b>{formatMoney(runsStats.avgSpend)}</b> / episode</>}
                  </span>
                </div>
              </div>

              <div
                className={"metric-card" + (runsStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Fact-check pass rate: ${runsStats.passRate} percent. ${runsStats.passedSentinels} of ${runsStats.total} episodes passed.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Fact-check pass rate</span>
                  <span className="metric-badge">Quality gate</span>
                </div>
                <div className="metric-value">{runsStats.passRate}%</div>
                <div className="metric-breakdown">
                  <div className="progress-container" aria-hidden="true">
                    <div
                      className="progress-bar cleared"
                      style={{ width: `${runsStats.passRate}%` }}
                    />
                  </div>
                  <span className="metric-subtext">
                    {runsStats.passedSentinels} of {runsStats.total} episodes passed fact-checks.
                  </span>
                </div>
              </div>

              <div
                className={"metric-card" + (runsStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={
                  runsStats.lastEpisode
                    ? `Last run operated on ${formatOverviewDate(runsStats.lastEpisode.created_at)}. Subject: ${runsStats.lastEpisode.food}.`
                    : "No runs executed yet."
                }
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Last run</span>
                  <span className="metric-badge">Freshness</span>
                </div>
                {runsStats.lastEpisode ? (
                  <>
                    <div className="metric-value-date">
                      {formatOverviewDate(runsStats.lastEpisode.created_at)}
                    </div>
                    <div className="metric-breakdown">
                      <span className="metric-subtext truncated">
                        ID: <b>{runsStats.lastEpisode.episode_id.slice(0, 8).toUpperCase()}</b>
                        {" - "}
                        {runsStats.lastEpisode.food}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="metric-value-date">No runs</div>
                    <div className="metric-breakdown">
                      <span className="metric-subtext">No recent pipeline activity.</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
