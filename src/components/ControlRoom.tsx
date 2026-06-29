"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { budgetStatus, getBudgetTarget, setBudgetTarget } from "@/lib/budget";
import { bibleToMarkdown, downloadMarkdown } from "@/lib/exportBible";
import { useDirtyState } from "@/lib/hooks/useDirtyState";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { createClient } from "@/lib/supabase/client";
import {
  BIBLE_FIELDS,
  CHANNELS,
  type Bible,
  type Character,
  type CharacterBibleRevision,
  type CharacterStatus,
  type Episode,
  type Idea,
  type IdeaStatus,
  type Receipt,
} from "@/lib/types";

// A flattened, editable view of a character: scalar columns + bible keys hoisted
// to the top level so the editor can address every section as `c[field]`.
type FlatChar = {
  id: string;
  codename: string;
  concept: string;
  status: CharacterStatus;
  created_at: string;
} & { [K in (typeof BIBLE_FIELDS)[number]]: string };

type View = "roster" | "wire" | "runs" | "overview" | "cost";
const VIEW_KEYS: View[] = ["roster", "wire", "runs", "overview", "cost"];
function isView(value: string | null): value is View {
  return value !== null && (VIEW_KEYS as string[]).includes(value);
}
// Active view persisted in the URL (?view=) so a refresh restores it.
function readViewFromUrl(): View | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("view");
  return isView(value) ? value : null;
}
function viewUrl(view: View): string {
  const params = new URLSearchParams(window.location.search);
  params.set("view", view);
  return `${window.location.pathname}?${params.toString()}${window.location.hash}`;
}
type CostReceipt = Pick<Receipt, "episode_id" | "seq" | "provider" | "stage" | "spend_so_far">;
type IdeaWriteState = "saving" | "failed";
type WireIdea = Idea & {
  clientKey?: string;
  clientWriteState?: IdeaWriteState;
  clientError?: string;
};

type ProviderCost = {
  name: string;
  amount: number;
  percentage: number;
};

type EpisodeCost = {
  episode: Episode;
  liveSpend: number;
  isInFlight: boolean;
};

type CostStats = {
  grandTotal: number;
  providerSplit: ProviderCost[];
  episodeCosts: EpisodeCost[];
};

type EditableCharacterFields = Pick<FlatChar, "codename" | "concept" | "status"> & {
  bible: Bible;
};

type PendingDirtyAction = {
  run: () => void;
  cancel?: () => void;
};

function flatten(row: Character): FlatChar {
  const bible = row.bible || {};
  const flat: Record<string, string> & Pick<FlatChar, "status"> = {
    id: row.id,
    codename: row.codename ?? "",
    concept: row.concept ?? "",
    status: row.status ?? "draft",
    created_at: row.created_at,
  };
  for (const f of BIBLE_FIELDS) flat[f] = bible[f] ?? "";
  return flat as FlatChar;
}

function toBible(c: FlatChar): Bible {
  const bible: Bible = {};
  for (const f of BIBLE_FIELDS) bible[f] = c[f] ?? "";
  return bible;
}

function editableSnapshot(c: FlatChar): EditableCharacterFields {
  return {
    codename: c.codename,
    concept: c.concept,
    status: c.status,
    bible: toBible(c),
  };
}

function savedSnapshotsById(chars: FlatChar[]): Record<string, EditableCharacterFields> {
  return Object.fromEntries(chars.map((c) => [c.id, editableSnapshot(c)]));
}

function applyEditableSnapshot(c: FlatChar, snapshot: EditableCharacterFields): FlatChar {
  const next: FlatChar = {
    ...c,
    codename: snapshot.codename,
    concept: snapshot.concept,
    status: snapshot.status,
  };
  for (const f of BIBLE_FIELDS) next[f] = snapshot.bible[f] ?? "";
  return next;
}

function flattenRevision(row: CharacterBibleRevision, character: Pick<FlatChar, "id" | "created_at">): FlatChar {
  const bible = row.bible || {};
  const flat: Record<string, string> & Pick<FlatChar, "status"> = {
    id: character.id,
    codename: row.codename ?? "",
    concept: row.concept ?? "",
    status: row.status === "active" ? "active" : "draft",
    created_at: character.created_at,
  };
  for (const f of BIBLE_FIELDS) flat[f] = bible[f] ?? "";
  return flat as FlatChar;
}

const FIELD_LABELS: Record<(typeof BIBLE_FIELDS)[number], string> = {
  voice: "Voice & identity",
  cadence: "Cadence",
  vocab: "Vocabulary",
  offlimits: "Off-limits",
  lines: "Gold-standard lines",
  beats: "Beat template",
  runtime: "Runtime target",
};

const IDEA_STATUS_OPTIONS: IdeaStatus[] = ["backlog", "active", "used"];
const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  backlog: "Backlog",
  active: "Active",
  used: "Used",
};

function formatRevisionDate(createdAt: string) {
  return new Date(createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function Icon({ name }: { name: string }) {
  const p =
    {
      roster: "M4 20v-2a4 4 0 014-4h0M16 14a4 4 0 014 4v2M12 4a4 4 0 100 8 4 4 0 000-8z",
      wire: "M4 6h16M4 12h16M4 18h10",
      runs: "M5 12l4 4 10-10",
      overview: "M4 4h6v6H4V4zm10 0h6v6h-6V4zm-10 10h6v6H4v-6zm10 0h6v6h-6v-6z",
      cost: "M12 8c-3.31 0-6 2.24-6 5s2.69 5 6 5 6-2.24 6-5-2.69-5-6-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-10c-3.31 0-6 2.24-6 5h12c0-2.76-2.69-5-6-5z",
      exit: "M14 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2M9 12h12m0 0l-3-3m3 3l-3 3",
      clock: "M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    }[name] || "";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={p} />
    </svg>
  );
}

// Module-level so editing a textarea does not remount the input (focus-safe).
function Field({
  id,
  label,
  hint,
  value,
  onChange,
  rows = 3,
  multiline = rows > 1,
  mono,
  readOnly = false,
  locked = false,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  multiline?: boolean;
  mono?: boolean;
  readOnly?: boolean;
  locked?: boolean;
}) {
  const controlStyle = mono ? { fontFamily: "var(--mono)", fontSize: "12.5px" } : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>
        <span className="eyebrow">{label}</span>
        <span className="field-label-side">
          {locked && <span className="badge lock-badge">LOCKED - PREVIEW</span>}
          {hint && <span className="hint">{hint}</span>}
        </span>
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          aria-readonly={readOnly}
          style={controlStyle}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          aria-readonly={readOnly}
          style={controlStyle}
        />
      )}
    </div>
  );
}

type DrillDownProps = {
  episode: Episode;
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
};

function hasJson(value: unknown) {
  return value !== null && value !== undefined;
}

function receiptVerdictClass(verdict: string | null) {
  const normalized = (verdict || "").toLowerCase();
  if (["pass", "cleared", "approved", "success"].includes(normalized)) return "pass";
  if (["warning", "pass_with_warning"].includes(normalized)) return "warning";
  if (["fail", "rejected", "error", "failed"].includes(normalized)) return "fail";
  return "none";
}

const PASS_VERDICTS = new Set(["pass", "cleared", "approved", "success"]);
const CLEARED_STATUSES = new Set(["success", "cleared", "approved", "complete", "completed", "done"]);
const FAILED_STATUSES = new Set(["failed", "fail", "rejected", "error"]);

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUsd(value: number, digits = 2) {
  return `${new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} USD`;
}

function fieldControlId(characterId: string | null, label: string) {
  const scopedCharacterId = (characterId ?? "no-character").replace(/[^a-zA-Z0-9_-]/g, "-");
  const scopedLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `field-${scopedCharacterId}-${scopedLabel || "manual"}`;
}

function markdownFilename(codename: string) {
  const trimmed = codename.trim();
  return `${trimmed.length > 0 ? trimmed.replace(/[\\/]+/g, "-") : "Untitled"}.md`;
}

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

function providerBucket(provider: string | null) {
  const cleaned = (provider ?? "").trim();
  return cleaned.length > 0 ? cleaned : "Deterministic / None";
}

function isInFlightStatus(status: string) {
  const normalized = (status || "").trim().toLowerCase();
  return normalized !== "success" && normalized !== "failed";
}

function computeCostStats(episodes: Episode[], receipts: CostReceipt[]): CostStats {
  const receiptGroups = new Map<string, CostReceipt[]>();
  for (const receipt of receipts) {
    const existing = receiptGroups.get(receipt.episode_id);
    if (existing) existing.push(receipt);
    else receiptGroups.set(receipt.episode_id, [receipt]);
  }

  const providerTotals = new Map<string, number>();
  const episodeCosts: EpisodeCost[] = [];
  let grandTotal = 0;

  for (const episode of episodes) {
    const sortedReceipts = [...(receiptGroups.get(episode.episode_id) ?? [])].sort(
      (a, b) => Number(a.seq ?? 0) - Number(b.seq ?? 0),
    );
    let previousSpend = 0;
    let maxSpend = 0;

    for (const receipt of sortedReceipts) {
      const currentSpend = Number(receipt.spend_so_far ?? 0);
      const delta = Math.max(0, currentSpend - previousSpend);
      const provider = providerBucket(receipt.provider);
      providerTotals.set(provider, (providerTotals.get(provider) ?? 0) + delta);
      if (currentSpend > maxSpend) maxSpend = currentSpend;
      previousSpend = currentSpend;
    }

    grandTotal += maxSpend;
    episodeCosts.push({
      episode,
      liveSpend: maxSpend,
      isInFlight: isInFlightStatus(episode.status) && maxSpend > 0,
    });
  }

  const providerSplit = Array.from(providerTotals.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));

  return { grandTotal, providerSplit, episodeCosts };
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
  const color = variant === "spend" ? "var(--brass)" : "var(--stamp)";
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

function OverviewDashboard({
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
    const cleared = episodes.filter((episode) =>
      CLEARED_STATUSES.has((episode.status || "").toLowerCase()),
    ).length;
    const failed = episodes.filter((episode) =>
      FAILED_STATUSES.has((episode.status || "").toLowerCase()),
    ).length;
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
        <span className="eyebrow">Aggregate operational intelligence across active assets.</span>
      </div>

      <div className="overview-content">
        <div className="overview-grid">
          <section className="overview-column" aria-labelledby="overview-roster-title">
            <div className="overview-column-header">
              <span className="eyebrow">Domain 01</span>
              <h3 id="overview-roster-title">Roster Dossier</h3>
            </div>
            <div className="overview-cards">
              <div
                className={"metric-card" + (rosterStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Total characters: ${rosterStats.total}. ${rosterStats.active} active, ${rosterStats.draft} draft.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Total Characters</span>
                  <span className="metric-indicator cleared" aria-hidden="true" />
                </div>
                <div className="metric-value">{rosterStats.total}</div>
                <div className="metric-breakdown">
                  <span className="accent-cleared">{rosterStats.active} Active</span>
                  <span className="divider">-</span>
                  <span className="accent-dim">{rosterStats.draft} Drafts</span>
                </div>
                {rosterStats.total === 0 && (
                  <p className="metric-empty">No character manuals are on file yet.</p>
                )}
              </div>

              <div
                className={"metric-card" + (rosterStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Roster integrity: ${rosterStats.activeRatio} percent active characters.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Roster Integrity</span>
                  <span className="metric-badge">Active Ratio</span>
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
                      ? "Waiting on the first dossier."
                      : "Percentage of finalized dossier manuals."}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="overview-column" aria-labelledby="overview-wire-title">
            <div className="overview-column-header">
              <span className="eyebrow">Domain 02</span>
              <h3 id="overview-wire-title">The Wire Queue</h3>
            </div>
            <div className="overview-cards">
              <div
                className={"metric-card" + (wireStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Total logged ideas: ${wireStats.total}. ${wireStats.backlog} backlog, ${wireStats.active} active, ${wireStats.used} used.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Total Logged Ideas</span>
                  <span className="metric-indicator brass" aria-hidden="true" />
                </div>
                <div className="metric-value">{wireStats.total}</div>
                <div className="metric-breakdown">
                  <span className="accent-dim">{wireStats.backlog} Backlog</span>
                  <span className="divider">-</span>
                  <span className="accent-brass">{wireStats.active} Active</span>
                  <span className="divider">-</span>
                  <span className="accent-cleared">{wireStats.used} Used</span>
                </div>
                {wireStats.total === 0 && (
                  <p className="metric-empty">No ideas have been logged into the queue.</p>
                )}
              </div>

              <div
                className={"metric-card" + (wireStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Inspiration conversion: ${wireStats.conversionRate} percent of ideas converted.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Inspiration Conversion</span>
                  <span className="metric-badge">Used Rate</span>
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
              <h3 id="overview-runs-title">Runs Pipeline</h3>
            </div>
            <div className="overview-cards">
              <div
                className={"metric-card" + (runsStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Total pipeline runs: ${runsStats.total}. ${runsStats.cleared} cleared, ${runsStats.failed} failed, ${runsStats.active} active or other.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Total Pipeline Runs</span>
                  <span className="metric-indicator stamp" aria-hidden="true" />
                </div>
                <div className="metric-value">{runsStats.total}</div>
                <div className="metric-breakdown">
                  <span className="accent-cleared">{runsStats.cleared} Cleared</span>
                  <span className="divider">-</span>
                  <span className="accent-failed">{runsStats.failed} Failed</span>
                  <span className="divider">-</span>
                  <span className="accent-brass">{runsStats.active} Other</span>
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
                  <p className="metric-empty">No pipeline output has landed yet.</p>
                )}
              </div>

              <div
                className={"metric-card" + (runsStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={
                  costReceiptsLoading
                    ? "Total operational spend is loading from receipts."
                    : costReceiptsError
                      ? `Total operational spend is unavailable: ${costReceiptsError}.`
                      : `Total operational spend: ${formatUsd(runsStats.totalSpend)}. Average cost per episode is ${formatUsd(runsStats.avgSpend)}.`
                }
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Total Operational Spend</span>
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
                      ? "Reading the live receipts spend source."
                      : costReceiptsError
                        ? "Receipt spend source could not be read."
                        : <>Avg. Cost: <b>{formatMoney(runsStats.avgSpend)}</b> / episode</>}
                  </span>
                </div>
              </div>

              <div
                className={"metric-card" + (runsStats.total === 0 ? " is-empty" : "")}
                role="group"
                aria-label={`Sentinel pass rate: ${runsStats.passRate} percent. ${runsStats.passedSentinels} of ${runsStats.total} episodes passed.`}
              >
                <div className="metric-meta">
                  <span className="metric-eyebrow">Sentinel Pass Rate</span>
                  <span className="metric-badge">Quality Gate</span>
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
                  <span className="metric-eyebrow">Last Run Operated</span>
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
                    <div className="metric-value-date">No Runs</div>
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

function HistorySkeleton() {
  return (
    <div
      className="history-skeleton revision-list"
      aria-hidden="true"
      tabIndex={-1}
    >
      {[0, 1, 2].map((row) => (
        <div className="skeleton skeleton-card skeleton-revision-card" key={row}>
          <div className="skeleton-row">
            <span className="skeleton skeleton-text" />
            <span className="skeleton skeleton-text skeleton-badge" />
          </div>
          <div className="skeleton-revision-identity">
            <span className="skeleton skeleton-text skeleton-wide" />
            <span className="skeleton skeleton-text" />
          </div>
          <span className="skeleton skeleton-text skeleton-wide" />
          <div className="skeleton-row">
            <span className="skeleton skeleton-text skeleton-button" />
            <span className="skeleton skeleton-text skeleton-button" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RunDetailSkeleton() {
  return (
    <div
      className="timeline skeleton-timeline"
      aria-hidden="true"
      tabIndex={-1}
    >
      {[0, 1, 2].map((row) => (
        <div className="timeline-item" key={row}>
          <div className="timeline-node none skeleton-node" />
          <div className="receipt-card none skeleton-receipt-card">
            <div className="receipt-card-header">
              <span className="skeleton skeleton-text skeleton-wide" />
              <span className="skeleton skeleton-text skeleton-badge" />
            </div>
            <div className="receipt-meta-row">
              <span className="skeleton skeleton-text skeleton-button" />
              <span className="skeleton skeleton-text skeleton-button" />
            </div>
            <span className="skeleton skeleton-bar" />
            <span className="skeleton skeleton-text skeleton-wide" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CostBoxDashboard({
  episodes,
  costStats,
  loading,
  error,
  receiptsLoaded,
  onRetry,
}: {
  episodes: Episode[];
  costStats: CostStats;
  loading: boolean;
  error: string | null;
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
      <div className="cost" role="region" aria-label="Spend governance workspace">
        <div className="col-head">
          <h2>Cost</h2>
          <span className="count">loading receipts</span>
        </div>
        <div className="cost-content">
          <CostSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cost" role="region" aria-label="Spend governance workspace">
        <div className="col-head">
          <h2>Cost</h2>
          <span className="count">receipt read failed</span>
        </div>
        <div className="cost-content">
          <div className="cost-state">
            <h3>Cost Box Unavailable</h3>
            <p>Couldn&apos;t read the pipeline receipts source: {error}</p>
            <button className="btn" type="button" onClick={onRetry}>
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="cost" role="region" aria-label="Spend governance workspace">
        <div className="col-head">
          <h2>Cost</h2>
          <span className="count">no episodes</span>
        </div>
        <div className="cost-content">
          <div className="cost-state">
            <Icon name="cost" />
            <h3>No Episodes Yet</h3>
            <p>Pipeline episodes need to exist before spend can be audited here.</p>
          </div>
        </div>
      </div>
    );
  }

  if (receiptsLoaded && costStats.providerSplit.length === 0) {
    return (
      <div className="cost" role="region" aria-label="Spend governance workspace">
        <div className="col-head">
          <h2>Cost</h2>
          <span className="count">no receipts</span>
        </div>
        <div className="cost-content">
          <div className="cost-state">
            <Icon name="cost" />
            <h3>No Receipts Logged</h3>
            <p>Episodes are present, but the pipeline has not reported spend receipts yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cost" role="region" aria-label="Spend governance workspace">
      <div className="col-head">
        <h2>Cost</h2>
        <span className="count">read-only spend governance</span>
      </div>

      <div className="cap">
        <span className="eyebrow">Running spend from max(spend_so_far) per episode.</span>
      </div>

      <div className="cost-content">
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
                <span className="metric-eyebrow">Running Total Operational Spend</span>
                <span className={currentBudgetStatus.over ? "metric-badge alert-badge" : "metric-badge"}>
                  {currentBudgetStatus.over ? "[LIMIT EXCEEDED]" : "USD"}
                </span>
              </div>
              <div className="metric-value hero-value">{formatUsd(costStats.grandTotal)}</div>
              <div className="metric-breakdown">
                <span
                  className={"pulse-dot" + (currentBudgetStatus.over ? " breached" : "")}
                  aria-hidden="true"
                />
                Live &amp; In-Flight Aware · Includes running pipeline operations
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
                <span className="metric-eyebrow">LOCAL SPEND GOVERNANCE</span>
                <span className="metric-badge">Browser Local</span>
              </div>
              <label className="budget-target-label" htmlFor="budget-target-input" id="budget-target-title">
                SET TARGET GOAL (USD)
              </label>
              <div className="budget-target-controls">
                <input
                  id="budget-target-input"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={budgetInput}
                  placeholder="No local target set..."
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
                <span className="metric-eyebrow">SYSTEM REGULATION</span>
                <span className="metric-badge">[AWAITING PIPELINE UPGRADE]</span>
              </div>
              <div className="metric-value-date">BUDGET CAP ENFORCEMENT</div>
              <p className="metric-subtext">
                Spend capping is enforced directly at the content pipeline level
                (research → assembly). Live dashboard threshold monitoring is currently
                parked, awaiting schema exposure of the pipeline&apos;s internal threshold
                tables.
              </p>
            </div>

            <div className="metric-card provider-card" role="group" aria-label="API provider breakdown">
              <div className="metric-meta provider-head">
                <span className="metric-eyebrow">API PROVIDER BREAKDOWN</span>
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
              <p className="cost-attribution-disclosure">
                SYSTEM NOTE: Character attribution is currently deferred. LLM token expenses
                are grouped by provider. Mapping specific costs to individual manuals requires
                future pipeline metadata that links executions back to character manuals.
              </p>
            </div>
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
                    {isInFlight && <span className="flight-badge">IN-FLIGHT</span>}
                    {episode.final_stage && <span className="rmeta">stage · {episode.final_stage}</span>}
                    <span className="rmeta">{new Date(episode.created_at).toLocaleDateString()}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DrillDownPanel({
  episode,
  receipts,
  loading,
  error,
  onClose,
  onRetry,
  restoreFocusRef,
}: DrillDownProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap({
    active: true,
    containerRef: panelRef,
    onEscape: onClose,
    initialFocusRef: closeButtonRef,
    restoreFocusRef,
  });

  return (
    <div
      ref={panelRef}
      className="drilldown-panel"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail for run ${episode.food}`}
    >
      <div className="col-head">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            ref={closeButtonRef}
            className="btn ghost close-btn"
            onClick={onClose}
            aria-label="Close run detail"
          >
            ← Back
          </button>
          <h2>Run Detail</h2>
        </div>
        <span className="count">ID: {episode.episode_id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="detail-cap">
        <div className="topic-title">{episode.food}</div>
        <div className="detail-meta">
          <span className="rmeta stat">{episode.status}</span>
          {episode.final_stage && <span className="rmeta">stage · {episode.final_stage}</span>}
          {typeof episode.spend === "number" && episode.spend > 0 && (
            <span className="rmeta spend-total">Total Spend: ${episode.spend.toFixed(2)}</span>
          )}
          <span className="rmeta">{new Date(episode.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="drilldown-content">
        {loading ? (
          <RunDetailSkeleton />
        ) : error ? (
          <div className="empty">
            <h3>Comms Down</h3>
            <p>Couldn&apos;t reach the pipeline receipts database: {error}</p>
            <button className="btn" onClick={onRetry} style={{ marginTop: "12px" }}>
              Retry Connection
            </button>
          </div>
        ) : receipts.length === 0 ? (
          <div className="empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l4 4 10-10" />
            </svg>
            <h3>No receipts logged</h3>
            <p>This episode finished without producing step-by-step pipeline receipts.</p>
          </div>
        ) : (
          <div className="timeline">
            {receipts.map((receipt) => {
              const resolvedClass = receiptVerdictClass(receipt.verdict);
              return (
                <div key={receipt.id} className="timeline-item">
                  <div className={`timeline-node ${resolvedClass}`} aria-hidden="true" />
                  <div className={`receipt-card ${resolvedClass}`}>
                    <div className="receipt-card-header">
                      <div className="receipt-stage-title">
                        {receipt.stage || "unknown-stage"}
                        <span className="receipt-seq">seq · {receipt.seq}</span>
                      </div>
                      <span className="receipt-timestamp">
                        {receipt.ts
                          ? new Date(receipt.ts).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "no timestamp"}
                      </span>
                    </div>

                    <div className="receipt-meta-row">
                      <span className="rmeta model-badge">
                        {receipt.provider || "unknown"} · {receipt.model || "no-model"}
                      </span>
                      {receipt.effort_requested && (
                        <span className="rmeta effort-badge">
                          Effort: {receipt.effort_used || "0"}/{receipt.effort_requested}
                          {receipt.clamped && <span className="clamped-text"> (clamped)</span>}
                        </span>
                      )}
                      {typeof receipt.spend_so_far === "number" && (
                        <span className="rmeta spend-so-far-badge">
                          Accumulated Spend: ${receipt.spend_so_far.toFixed(3)}
                        </span>
                      )}
                    </div>

                    <div className="receipt-verdict-banner">
                      <span className={`receipt-verdict-label ${resolvedClass}`}>
                        {receipt.verdict || "UNKNOWN"}
                      </span>
                      <p className="receipt-reason-text">
                        {receipt.reason || "No written justification logged."}
                      </p>
                    </div>

                    <div className="receipt-json-disclosures">
                      {hasJson(receipt.evidence) && (
                        <details className="receipt-json-details">
                          <summary
                            className="receipt-json-summary"
                            aria-label="Toggle raw evidence JSON"
                          >
                            Evidence JSON
                          </summary>
                          <pre className="receipt-json-content">
                            <code>{JSON.stringify(receipt.evidence, null, 2)}</code>
                          </pre>
                        </details>
                      )}

                      {hasJson(receipt.result) && (
                        <details className="receipt-json-details">
                          <summary
                            className="receipt-json-summary"
                            aria-label="Toggle raw result JSON"
                          >
                            Result JSON
                          </summary>
                          <pre className="receipt-json-content">
                            <code>{JSON.stringify(receipt.result, null, 2)}</code>
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type HistoryDrawerProps = {
  revisions: CharacterBibleRevision[];
  loading: boolean;
  error: string | null;
  previewingRevisionId: string | null;
  onClose: () => void;
  onRetry: () => void;
  onPreview: (revision: CharacterBibleRevision) => void;
  onRestore: (revision: CharacterBibleRevision) => void;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
};

function changedFields(
  revision: CharacterBibleRevision,
  previousRevision: CharacterBibleRevision | undefined,
) {
  if (!previousRevision) return "Initial baseline";
  const changed = BIBLE_FIELDS.filter(
    (field) => (revision.bible?.[field] ?? "") !== (previousRevision.bible?.[field] ?? ""),
  ).map((field) => FIELD_LABELS[field]);
  if (changed.length === 0) return "No bible text changes";
  if (changed.length <= 3) return `Changed: ${changed.join(", ")}`;
  return `+${changed.length} edits: ${changed.slice(0, 3).join(", ")}`;
}

function HistoryDrawer({
  revisions,
  loading,
  error,
  previewingRevisionId,
  onClose,
  onRetry,
  onPreview,
  onRestore,
  restoreFocusRef,
}: HistoryDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap({
    active: true,
    containerRef: drawerRef,
    onEscape: onClose,
    initialFocusRef: closeButtonRef,
    restoreFocusRef,
  });

  return (
    <div className="history-layer" role="presentation">
      <button
        className="history-backdrop"
        type="button"
        aria-label="Close version history"
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        className="history-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Bible version history"
      >
        <div className="history-head">
          <button
            ref={closeButtonRef}
            className="btn ghost close-btn"
            type="button"
            onClick={onClose}
          >
            ← Back
          </button>
          <div>
            <h2>History</h2>
            <span className="count">{revisions.length} revision{revisions.length === 1 ? "" : "s"}</span>
          </div>
          <button
            className="history-x"
            type="button"
            aria-label="Close version history"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="history-body">
          {loading ? (
            <HistorySkeleton />
          ) : error ? (
            <div className="history-error">
              <h3>History unavailable</h3>
              <p>Couldn&apos;t load saved revisions: {error}</p>
              <button className="btn" type="button" onClick={onRetry}>
                Retry Connection
              </button>
            </div>
          ) : revisions.length === 0 ? (
            <div className="empty history-empty">
              <Icon name="clock" />
              <h3>No history logged</h3>
              <p>Save this character dossier to create your first permanent manual revision snapshot.</p>
            </div>
          ) : (
            <div className="revision-list" aria-label="Saved bible revisions">
              {revisions.map((revision, index) => {
                const isLatest = index === 0;
                const isPreviewing = revision.id === previewingRevisionId;
                const previousRevision = revisions[index + 1];
                return (
                  <div
                    key={revision.id}
                    className={"revision-card" + (isPreviewing ? " preview-on" : "")}
                  >
                    <div className="revision-card-top">
                      <span className="revision-time">{formatRevisionDate(revision.created_at)}</span>
                      <span className={"chip " + (isLatest ? "latest-badge" : "archive-badge")}>
                        {isLatest ? "Latest saved" : "Archived revision"}
                      </span>
                    </div>
                    <div className="revision-identity">
                      <span>Codename: {revision.codename || "Untitled"}</span>
                      <span>Status: {revision.status === "active" ? "Active" : "Draft"}</span>
                    </div>
                    <p className="revision-diff">{changedFields(revision, previousRevision)}</p>
                    <div className="revision-actions">
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => onPreview(revision)}
                        aria-pressed={isPreviewing}
                      >
                        {isPreviewing ? "Previewing" : "Preview"}
                      </button>
                      <button className="btn" type="button" onClick={() => onRestore(revision)}>
                        Restore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

type RestoreDialogProps = {
  revision: CharacterBibleRevision;
  onCancel: () => void;
  onConfirm: () => void;
  restoreFocusRef: React.RefObject<HTMLElement | null>;
};

function RestoreDialog({ revision, onCancel, onConfirm, restoreFocusRef }: RestoreDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap({
    active: true,
    containerRef: dialogRef,
    onEscape: onCancel,
    initialFocusRef: cancelButtonRef,
    restoreFocusRef,
  });

  return (
    <div className="restore-layer" role="presentation">
      <div
        ref={dialogRef}
        className="restore-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="restore-title"
        aria-describedby="restore-desc"
      >
        <h2 id="restore-title">Confirm Restore</h2>
        <p id="restore-desc">
          Are you sure you want to restore the revision from {formatRevisionDate(revision.created_at)}?
          This will replace all current unsaved edits in your editor. You must click Save dossier to
          write this restored version back to your live manual.
        </p>
        <div className="restore-actions">
          <button className="btn restore-confirm" type="button" onClick={onConfirm}>
            Yes, Restore Draft
          </button>
          <button ref={cancelButtonRef} className="btn ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

type DiscardChangesDialogProps = {
  codename: string;
  onCancel: () => void;
  onConfirm: () => void;
  restoreFocusRef: React.RefObject<HTMLElement | null>;
};

function DiscardChangesDialog({
  codename,
  onCancel,
  onConfirm,
  restoreFocusRef,
}: DiscardChangesDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap({
    active: true,
    containerRef: dialogRef,
    onEscape: onCancel,
    initialFocusRef: keepButtonRef,
    restoreFocusRef,
  });

  return (
    <div className="restore-layer" role="presentation">
      <div
        ref={dialogRef}
        className="restore-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-title"
        aria-describedby="discard-desc"
      >
        <h2 id="discard-title">UNSAVED CHANGES IN BUFFER</h2>
        <p id="discard-desc">
          You have uncommitted modifications in the field manual for {codename}.
          Leaving this screen will erase these changes permanently.
        </p>
        <div className="restore-actions">
          <button className="btn ghost" type="button" onClick={onConfirm}>
            DISCARD CHANGES
          </button>
          <button ref={keepButtonRef} className="btn" type="button" onClick={onCancel}>
            KEEP EDITING
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ControlRoom({ userEmail }: { userEmail: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [episodesError, setEpisodesError] = useState<string | null>(null);

  const [chars, setChars] = useState<FlatChar[]>([]);
  const [ideas, setIdeas] = useState<WireIdea[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [costReceipts, setCostReceipts] = useState<CostReceipt[]>([]);
  const [costReceiptsLoading, setCostReceiptsLoading] = useState(true);
  const [costReceiptsError, setCostReceiptsError] = useState<string | null>(null);
  const [costReceiptsLoaded, setCostReceiptsLoaded] = useState(false);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, EditableCharacterFields>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<CharacterBibleRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [previewingRevisionId, setPreviewingRevisionId] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<CharacterBibleRevision | null>(null);
  const [pendingDirtyAction, setPendingDirtyAction] = useState<PendingDirtyAction | null>(null);
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);
  const [view, setView] = useState<View>("roster");
  const [draftIdea, setDraftIdea] = useState("");
  const [draftIdeaNote, setDraftIdeaNote] = useState("");
  const [ideaNoteFocused, setIdeaNoteFocused] = useState(false);
  const [ideaSubmittingTitle, setIdeaSubmittingTitle] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastRunTriggerRef = useRef<string | null>(null);
  const runDetailRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const receiptRequestRef = useRef(0);
  const headerHistoryButtonRef = useRef<HTMLButtonElement>(null);
  const savebarHistoryButtonRef = useRef<HTMLButtonElement>(null);
  const lastHistoryTriggerRef = useRef<"header" | "savebar" | null>(null);
  const historyRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const previewRestoreButtonRef = useRef<HTMLButtonElement>(null);
  const lastRestoreTriggerRef = useRef<"history" | "preview" | null>(null);
  const restoreDialogRestoreFocusRef = useRef<HTMLElement | null>(null);
  const characterRequestRef = useRef(0);
  const ideaRequestRef = useRef(0);
  const episodeRequestRef = useRef(0);
  const revisionRequestRef = useRef(0);
  const costReceiptRequestRef = useRef(0);
  const lastManualFocusRef = useRef<HTMLElement | null>(null);
  const lastDirtyTriggerRef = useRef<HTMLElement | null>(null);
  const discardDialogRestoreFocusRef = useRef<HTMLElement | null>(null);
  const exitFormRef = useRef<HTMLFormElement>(null);
  const ideaTitleRef = useRef<HTMLTextAreaElement>(null);
  const ideaSubmittingTitleRef = useRef<string | null>(null);
  const showFlash = (msg: string, err = false) => {
    setFlash({ msg, err });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  };

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) &&
        event.target.closest(".sheet")
      ) {
        lastManualFocusRef.current = event.target;
      }
    };

    window.addEventListener("focusin", handleFocusIn);
    return () => window.removeEventListener("focusin", handleFocusIn);
  }, []);

  const fetchCharacters = useCallback(async () => {
    const requestId = characterRequestRef.current + 1;
    characterRequestRef.current = requestId;
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<Character[]>();

    if (characterRequestRef.current !== requestId) return;
    setLoading(false);
    if (error) {
      setChars([]);
      setSavedSnapshots({});
      setActiveId(null);
      setLoadError(error.message);
      return;
    }

    const flat = (data ?? []).map(flatten);
    setChars(flat);
    setSavedSnapshots(savedSnapshotsById(flat));
    setActiveId((current) =>
      current && flat.some((character) => character.id === current)
        ? current
        : (flat[0]?.id ?? null),
    );
  }, [supabase]);

  const fetchIdeas = useCallback(async () => {
    const requestId = ideaRequestRef.current + 1;
    ideaRequestRef.current = requestId;
    setIdeasLoading(true);
    setIdeasError(null);

    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Idea[]>();

    if (ideaRequestRef.current !== requestId) return;
    setIdeasLoading(false);
    if (error) {
      setIdeasError(error.message);
      return;
    }

    setIdeas((current) => {
      const localOnly = current.filter((idea) => idea.clientWriteState);
      const localIds = new Set(localOnly.map((idea) => idea.id));
      const remote = (data ?? []).filter((idea) => !localIds.has(idea.id));
      return [...localOnly, ...remote];
    });
  }, [supabase]);

  const fetchEpisodes = useCallback(async () => {
    const requestId = episodeRequestRef.current + 1;
    episodeRequestRef.current = requestId;
    setEpisodesLoading(true);
    setEpisodesError(null);

    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Episode[]>();

    if (episodeRequestRef.current !== requestId) return;
    setEpisodesLoading(false);
    if (error) {
      setEpisodes([]);
      setEpisodesError(error.message);
      return;
    }
    setEpisodes(data ?? []);
  }, [supabase]);

  const fetchCostReceipts = useCallback(async () => {
    const requestId = costReceiptRequestRef.current + 1;
    costReceiptRequestRef.current = requestId;
    setCostReceiptsLoading(true);
    setCostReceiptsError(null);

    const { data, error } = await supabase
      .from("receipts")
      .select("episode_id,seq,provider,stage,spend_so_far")
      .order("episode_id", { ascending: true })
      .order("seq", { ascending: true })
      .returns<CostReceipt[]>();

    if (costReceiptRequestRef.current !== requestId) return;
    setCostReceiptsLoading(false);
    setCostReceiptsLoaded(true);
    if (error) {
      setCostReceipts([]);
      setCostReceiptsError(error.message);
      return;
    }
    setCostReceipts(data ?? []);
  }, [supabase]);

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    void fetchCharacters();
    void fetchIdeas();
    void fetchEpisodes();
    void fetchCostReceipts();
  }, [fetchCharacters, fetchCostReceipts, fetchEpisodes, fetchIdeas]);

  const active = chars.find((c) => c.id === activeId) ?? null;
  const previewingRevision =
    revisions.find((revision) => revision.id === previewingRevisionId) ?? null;
  const displayedActive =
    active && previewingRevision ? flattenRevision(previewingRevision, active) : active;
  const activeEpisode = episodes.find((e) => e.episode_id === activeEpisodeId) ?? null;
  const costStats = useMemo(
    () => computeCostStats(episodes, costReceipts),
    [costReceipts, episodes],
  );
  const currentEditableFields = useMemo(() => (active ? editableSnapshot(active) : null), [active]);
  const savedEditableFields = activeId
    ? (savedSnapshots[activeId] ?? currentEditableFields)
    : null;
  const dirty = useDirtyState(currentEditableFields, savedEditableFields);

  const set = (field: keyof FlatChar, val: string) =>
    setChars((cs) =>
      cs.map((c) => (c.id === activeId ? { ...c, [field]: val } : c)),
    );

  const revertActiveEdits = useCallback(() => {
    if (!activeId) return;
    const snapshot = savedSnapshots[activeId];
    if (!snapshot) return;
    setChars((cs) => cs.map((c) => (c.id === activeId ? applyEditableSnapshot(c, snapshot) : c)));
    setPreviewingRevisionId(null);
    setIsRestoredDraft(false);
  }, [activeId, savedSnapshots]);

  const guardDirtyAction = useCallback(
    (action: () => void, cancel?: () => void) => {
      if (dirty && active) {
        if (document.activeElement instanceof HTMLElement) {
          lastDirtyTriggerRef.current = document.activeElement;
        }
        discardDialogRestoreFocusRef.current =
          lastManualFocusRef.current ?? lastDirtyTriggerRef.current;
        setPendingDirtyAction({ run: action, cancel });
        return;
      }

      action();
    },
    [active, dirty],
  );

  const cancelDirtyAction = useCallback(() => {
    discardDialogRestoreFocusRef.current =
      lastManualFocusRef.current ?? lastDirtyTriggerRef.current;
    const pending = pendingDirtyAction;
    setPendingDirtyAction(null);
    pending?.cancel?.();
  }, [pendingDirtyAction]);

  const confirmDirtyAction = useCallback(() => {
    const action = pendingDirtyAction;
    discardDialogRestoreFocusRef.current =
      lastManualFocusRef.current ?? lastDirtyTriggerRef.current;
    revertActiveEdits();
    setPendingDirtyAction(null);
    action?.run();
  }, [pendingDirtyAction, revertActiveEdits]);

  const guardedSetActiveId = useCallback(
    (nextId: string) => {
      if (nextId === activeId) return;
      guardDirtyAction(() => setActiveId(nextId));
    },
    [activeId, guardDirtyAction],
  );

  const guardedSetView = useCallback(
    (nextView: View) => {
      if (nextView === view) return;
      // In-app nav: push a history entry (after the dirty guard approves) so
      // the URL reflects the view AND browser back/forward moves between views.
      guardDirtyAction(() => {
        setView(nextView);
        if (typeof window !== "undefined") {
          window.history.pushState(null, "", viewUrl(nextView));
        }
      });
    },
    [guardDirtyAction, view],
  );

  // Restore the active view from the URL on mount (client-only effect, not a
  // lazy state initializer, to avoid an SSR/hydration mismatch). Normalize the
  // URL so the first history entry carries the resolved ?view= param.
  useEffect(() => {
    const fromUrl = readViewFromUrl();
    if (fromUrl && fromUrl !== view) setView(fromUrl);
    window.history.replaceState(null, "", viewUrl(fromUrl ?? view));
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser back/forward: sync the view to the URL. Routed through the dirty
  // guard (no pushState here — the browser already changed history). If the user
  // chooses "keep editing", revert the URL to the still-current view so URL and
  // view stay consistent.
  useEffect(() => {
    const onPopState = () => {
      const fromUrl = readViewFromUrl() ?? "roster";
      if (fromUrl === view) return;
      guardDirtyAction(
        () => setView(fromUrl),
        () => window.history.replaceState(null, "", viewUrl(view)),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [guardDirtyAction, view]);

  useEffect(() => {
    setHistoryOpen(false);
    setRevisions([]);
    setRevisionsError(null);
    setPreviewingRevisionId(null);
    setPendingRestore(null);
    setIsRestoredDraft(false);
  }, [activeId]);

  const setHistoryRestoreFocusTarget = useCallback(() => {
    const trigger = lastHistoryTriggerRef.current;
    historyRestoreFocusRef.current =
      trigger === "savebar" ? savebarHistoryButtonRef.current : headerHistoryButtonRef.current;
  }, []);

  const setRestoreDialogFocusTarget = useCallback((confirmed = false) => {
    const trigger = lastRestoreTriggerRef.current;
    if (!confirmed && trigger === "preview" && previewRestoreButtonRef.current) {
      restoreDialogRestoreFocusRef.current = previewRestoreButtonRef.current;
      return;
    }
    restoreDialogRestoreFocusRef.current =
      historyRestoreFocusRef.current ?? headerHistoryButtonRef.current;
  }, []);

  const fetchRevisions = useCallback(
    async (characterId: string) => {
      const requestId = revisionRequestRef.current + 1;
      revisionRequestRef.current = requestId;
      setRevisionsLoading(true);
      setRevisionsError(null);
      const { data, error } = await supabase
        .from("character_bible_revisions")
        .select("*")
        .eq("character_id", characterId)
        .order("created_at", { ascending: false })
        .returns<CharacterBibleRevision[]>();
      if (revisionRequestRef.current !== requestId) return;
      setRevisionsLoading(false);
      if (error) {
        setRevisions([]);
        setRevisionsError(error.message);
        return;
      }
      setRevisions(data ?? []);
    },
    [supabase],
  );

  const openHistory = (trigger: "header" | "savebar") => {
    if (!active) return;
    lastHistoryTriggerRef.current = trigger;
    setHistoryRestoreFocusTarget();
    setHistoryOpen(true);
    void fetchRevisions(active.id);
  };

  const closeHistory = useCallback(() => {
    revisionRequestRef.current += 1;
    setHistoryOpen(false);
    setRevisionsLoading(false);
    setRevisionsError(null);
    setHistoryRestoreFocusTarget();
  }, [setHistoryRestoreFocusTarget]);

  const exitPreview = useCallback(() => {
    setPreviewingRevisionId(null);
  }, []);

  const previewRevision = (revision: CharacterBibleRevision) => {
    guardDirtyAction(() => setPreviewingRevisionId(revision.id));
  };

  const requestRestore = (revision: CharacterBibleRevision) => {
    guardDirtyAction(() => {
      lastRestoreTriggerRef.current = historyOpen ? "history" : "preview";
      setHistoryOpen(false);
      setPendingRestore(revision);
    });
  };

  const cancelRestore = useCallback(() => {
    setRestoreDialogFocusTarget();
    setPendingRestore(null);
  }, [setRestoreDialogFocusTarget]);

  const confirmRestore = () => {
    if (!active || !pendingRestore) return;
    setRestoreDialogFocusTarget(true);
    const restored = flattenRevision(pendingRestore, active);
    setChars((cs) => cs.map((c) => (c.id === active.id ? restored : c)));
    setPendingRestore(null);
    setPreviewingRevisionId(null);
    setHistoryOpen(false);
    setIsRestoredDraft(true);
    showFlash("Draft loaded from history — click Save to write new version");
  };

  const fetchReceipts = useCallback(
    async (episodeId: string) => {
      const requestId = receiptRequestRef.current + 1;
      receiptRequestRef.current = requestId;
      setReceiptsLoading(true);
      setReceiptsError(null);
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("episode_id", episodeId)
        .order("seq", { ascending: true })
        .returns<Receipt[]>();
      if (receiptRequestRef.current !== requestId) return;
      setReceiptsLoading(false);
      if (error) {
        setReceipts([]);
        setReceiptsError(error.message);
        return;
      }
      setReceipts(data ?? []);
    },
    [supabase],
  );

  const openRunDetail = (episodeId: string) => {
    lastRunTriggerRef.current = episodeId;
    runDetailRestoreFocusRef.current = runButtonRefs.current.get(episodeId) ?? null;
    setActiveEpisodeId(episodeId);
    setReceipts([]);
    void fetchReceipts(episodeId);
  };

  const closeRunDetail = useCallback(() => {
    const triggerId = lastRunTriggerRef.current;
    receiptRequestRef.current += 1;
    setActiveEpisodeId(null);
    setReceipts([]);
    setReceiptsError(null);
    setReceiptsLoading(false);
    runDetailRestoreFocusRef.current = triggerId
      ? (runButtonRefs.current.get(triggerId) ?? null)
      : null;
  }, []);

  // ── persist character ───────────────────────────────────────────────────
  const save = async () => {
    if (!active || saving || !dirty) return;
    const snapshot = {
      character_id: active.id,
      codename: active.codename,
      concept: active.concept,
      status: active.status,
      bible: toBible(active),
    };
    setSaving(true);
    const { error } = await supabase
      .from("characters")
      .update({
        codename: snapshot.codename,
        concept: snapshot.concept,
        status: snapshot.status,
        bible: snapshot.bible,
      })
      .eq("id", snapshot.character_id);
    if (error) {
      setSaving(false);
      showFlash("Save failed — " + error.message, true);
      return;
    }

    setSavedSnapshots((snapshots) => ({
      ...snapshots,
      [snapshot.character_id]: {
        codename: snapshot.codename,
        concept: snapshot.concept,
        status: snapshot.status,
        bible: snapshot.bible,
      },
    }));

    const { error: revisionError } = await supabase
      .from("character_bible_revisions")
      .insert(snapshot);

    setSaving(false);
    if (revisionError) {
      showFlash("Saved, but history snapshot failed — " + revisionError.message, true);
      return;
    }

    setIsRestoredDraft(false);
    showFlash("✓ Saved · revision snapshot logged");
    if (historyOpen) void fetchRevisions(snapshot.character_id);
  };

  const addChar = async () => {
    if (adding) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("characters")
      .insert({ codename: "New character", status: "draft", bible: {} })
      .select("*")
      .single();
    setAdding(false);
    if (error || !data) {
      showFlash("Could not create character — " + (error?.message ?? ""), true);
      return;
    }
    const flat = flatten(data as Character);
    setChars((cs) => [...cs, flat]);
    setSavedSnapshots((snapshots) => ({ ...snapshots, [flat.id]: editableSnapshot(flat) }));
    setActiveId(flat.id);
    setView("roster");
    // Keep the URL in sync with this programmatic view switch (a refresh would
    // otherwise restore a stale ?view=).
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", viewUrl("roster"));
    }
  };

  const guardedAddChar = () => {
    guardDirtyAction(() => {
      void addChar();
    });
  };

  const toggleStatus = () => {
    if (!active) return;
    set("status", active.status === "active" ? "draft" : "active");
  };

  const handleExport = () => {
    if (!active) return;
    const markdown = bibleToMarkdown({
      codename: active.codename,
      concept: active.concept,
      status: active.status,
      bible: toBible(active),
    });
    downloadMarkdown(markdownFilename(active.codename), markdown);
  };

  // ── ideas (the wire) ──────────────────────────────────────────────────────
  const makeTempIdeaId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const startIdeaInsert = async (
    tempId: string,
    title: string,
    note: string,
    characterId: string | null,
    channel: string,
  ) => {
    if (ideaSubmittingTitleRef.current === title) return;
    ideaSubmittingTitleRef.current = title;
    setIdeaSubmittingTitle(title);

    setIdeas((xs) =>
      xs.map((idea) =>
        idea.id === tempId
          ? { ...idea, clientWriteState: "saving", clientError: undefined }
          : idea,
      ),
    );

    const { data, error } = await supabase
      .from("ideas")
      .insert({
        title,
        note,
        character_id: characterId,
        channel,
        status: "backlog",
      })
      .select("*")
      .single();

    ideaSubmittingTitleRef.current = null;
    setIdeaSubmittingTitle(null);

    if (error || !data) {
      const message = error?.message ?? "Unknown database error";
      showFlash("Could not log idea — " + message, true);
      setIdeas((xs) =>
        xs.map((idea) =>
          idea.id === tempId
            ? { ...idea, clientWriteState: "failed", clientError: message }
            : idea,
        ),
      );
      return;
    }

    const savedIdea: WireIdea = { ...(data as Idea), clientKey: tempId };
    // Dedup-aware swap: if a concurrent refetch already supplied the real row
    // while this insert was in flight, drop that duplicate and keep only the
    // swapped optimistic card (stable key = tempId). Prevents two cards sharing
    // the same real id when "retry"/refetch overlaps an in-flight insert.
    setIdeas((xs) => {
      const withoutDup = xs.filter(
        (idea) => idea.id !== savedIdea.id || idea.id === tempId,
      );
      return withoutDup.map((idea) => (idea.id === tempId ? savedIdea : idea));
    });
  };

  const logIdea = async () => {
    const title = draftIdea.trim();
    const note = draftIdeaNote.trim();
    if (!title || ideaSubmittingTitleRef.current === title) return;

    const tempId = makeTempIdeaId();
    const optimisticIdea: WireIdea = {
      id: tempId,
      owner: "",
      title,
      note,
      character_id: activeId,
      channel: CHANNELS[0],
      status: "backlog",
      created_at: new Date().toISOString(),
      clientKey: tempId,
      clientWriteState: "saving",
    };

    setIdeasError(null);
    setIdeasLoading(false);
    setIdeas((xs) => [optimisticIdea, ...xs]);
    setDraftIdea("");
    setDraftIdeaNote("");
    window.requestAnimationFrame(() => {
      ideaTitleRef.current?.focus();
    });
    await startIdeaInsert(tempId, title, note, optimisticIdea.character_id, optimisticIdea.channel);
  };

  const retryIdea = (idea: WireIdea) => {
    if (!idea.clientWriteState || idea.clientWriteState !== "failed") return;
    void startIdeaInsert(
      idea.id,
      idea.title.trim(),
      idea.note.trim(),
      idea.character_id,
      idea.channel,
    );
  };

  const dismissIdea = (id: string) => {
    setIdeas((xs) => xs.filter((idea) => idea.id !== id));
  };

  const handleIdeaTitleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void logIdea();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void logIdea();
    }
  };

  const handleIdeaNoteKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void logIdea();
    }
  };

  const setIdeaStatus = async (id: string, targetStatus: IdeaStatus) => {
    const idea = ideas.find((x) => x.id === id);
    if (!idea || idea.clientWriteState) return;
    if (idea.status === targetStatus) return;
    setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: targetStatus } : x)));
    const { error } = await supabase.from("ideas").update({ status: targetStatus }).eq("id", id);
    if (error) {
      // revert on failure
      setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: idea.status } : x)));
      showFlash("Status update failed", true);
    }
  };

  const setIdeaField = async (id: string, f: "character_id" | "channel", v: string) => {
    const prev = ideas.find((x) => x.id === id);
    if (!prev || prev.clientWriteState) return;
    const valueToPersist = f === "character_id" && v === "" ? null : v;
    setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, [f]: valueToPersist } : x)));
    const { error } = await supabase.from("ideas").update({ [f]: valueToPersist }).eq("id", id);
    if (error && prev) {
      setIdeas((xs) => xs.map((x) => (x.id === id ? prev : x)));
      showFlash("Tag update failed", true);
    }
  };

  const openIdeas = ideas.filter((i) => i.status !== "used").length;
  const ideaCaptureDisabled = Boolean(ideaSubmittingTitle);
  const canSubmitIdea = draftIdea.trim().length > 0 && !ideaCaptureDisabled;
  const dirtyCodename = active?.codename.trim() ? active.codename : "Untitled";
  const mobileActiveManuals = useMemo(
    () =>
      chars
        .filter((c) => c.status === "active")
        .sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId)),
    [activeId, chars],
  );
  const mobileDraftManuals = useMemo(
    () =>
      chars
        .filter((c) => c.status === "draft")
        .sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId)),
    [activeId, chars],
  );

  const handleExitSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!dirty || !active) return;
    event.preventDefault();
    guardDirtyAction(() => {
      exitFormRef.current?.submit();
    });
  };

  const mobileRoster = (
    <div className="mobile-roster">
      <label className="eyebrow" htmlFor="mobile-roster-select">
        SELECT DOSSIER
      </label>
      <select
        id="mobile-roster-select"
        className="mobile-roster-select"
        value={activeId ?? ""}
        onChange={(event) => {
          if (event.target.value) guardedSetActiveId(event.target.value);
        }}
        disabled={chars.length === 0 || saving}
        aria-label="Select dossier"
      >
        {chars.length === 0 ? (
          <option value="">NO DOSSIERS ON FILE</option>
        ) : (
          <>
            <optgroup label="ACTIVE FIELD MANUALS">
              {mobileActiveManuals.map((c) => (
                <option key={c.id} value={c.id}>
                  ● {c.codename || "Untitled"}
                </option>
              ))}
            </optgroup>
            <optgroup label="DRAFT FIELD MANUALS">
              {mobileDraftManuals.map((c) => (
                <option key={c.id} value={c.id}>
                  ○ {c.codename || "Untitled"}
                </option>
              ))}
            </optgroup>
          </>
        )}
      </select>
      <button
        className="mobile-roster-new"
        type="button"
        onClick={guardedAddChar}
        disabled={adding || saving}
        aria-label="Create new character"
      >
        {adding ? "CREATING..." : "+ NEW"}
      </button>
    </div>
  );

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="cr">
      <div className="toast-region" aria-atomic="true">
        {flash && (
          <div
            className={"toast " + (flash.err ? "toast--error" : "toast--success")}
            role={flash.err ? "alert" : "status"}
            aria-live={flash.err ? "assertive" : "polite"}
          >
            {flash.msg}
          </div>
        )}
      </div>

      <nav className="rail">
        <div className="brand" style={{ marginBottom: "8px" }}>
          CONTROL<b>·</b>ROOM
        </div>
        <button
          className={"chip " + (active?.status === "draft" ? "draft" : active ? "active" : "")}
          type="button"
          onClick={() => guardedSetView("roster")}
          disabled={!active}
          title={active ? `ACTIVE: ${active.codename || "Untitled"}${dirty ? "*" : ""}` : "No active operator"}
          aria-label={
            active
              ? `Current operator: ${active.codename || "Untitled"}${dirty ? ", unsaved changes" : ""}. Return to roster.`
              : "No active operator"
          }
          style={{
            width: "68px",
            minHeight: "30px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            background: "transparent",
          }}
        >
          {active ? (
            <>
              <span aria-hidden="true">{active.status === "active" ? "● " : "○ "}</span>
              ACTIVE: {active.codename || "Untitled"}
              {dirty ? "*" : ""}
            </>
          ) : (
            "NO ACTIVE"
          )}
        </button>
        {(
          [
            ["roster", "Roster"],
            ["wire", "The Wire"],
            ["runs", "Runs"],
            ["overview", "Overview"],
            ["cost", "Cost"],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            className={"navbtn" + (view === k ? " on" : "")}
            onClick={() => guardedSetView(k)}
            aria-pressed={view === k}
          >
            <Icon name={k} />
            <span>{lbl}</span>
            <div className="dot" />
          </button>
        ))}
        <form
          ref={exitFormRef}
          action="/auth/signout"
          method="post"
          className="railspacer"
          onSubmit={handleExitSubmit}
        >
          <button className="navbtn" type="submit" title={`Sign out · ${userEmail}`}>
            <Icon name="exit" />
            <span>Exit</span>
            <div className="dot" />
          </button>
        </form>
      </nav>

      {loading ? (
        <div className="loading">
          <span className="spin" /> Loading field manuals…
        </div>
      ) : loadError ? (
        <div className="empty">
          <h3>Comms down</h3>
          <p>Couldn&apos;t reach the database: {loadError}</p>
          <button className="btn" type="button" onClick={() => void fetchCharacters()}>
            Retry Roster
          </button>
        </div>
      ) : (
        <>
          {view === "roster" && (
            <div className="main">
              <aside className="roster">
                <div className="col-head">
                  <h2>Roster</h2>
                  <span className="count">{chars.length} on file</span>
                </div>
                <div className="roster-list">
                  {chars.map((c) => (
                    <button
                      key={c.id}
                      className={"pcard" + (c.id === activeId ? " on" : "")}
                      onClick={() => guardedSetActiveId(c.id)}
                    >
                      <div className="codename">
                        {c.codename || "Untitled"}
                        {c.id === activeId && dirty ? "*" : ""}
                      </div>
                      <div className="concept">
                        {c.concept || "No concept logged yet."}
                      </div>
                      <div className="meta">
                        {c.id === activeId && (
                          <span className="chip active">● Casting</span>
                        )}
                        {c.status === "draft" && (
                          <span className="chip draft">Draft</span>
                        )}
                      </div>
                    </button>
                  ))}
                  <button className="addbtn" onClick={guardedAddChar} disabled={adding}>
                    {adding ? "Creating…" : "+ New character"}
                  </button>
                </div>
              </aside>

              {active && displayedActive ? (
                <section className={"dossier" + (historyOpen ? " history-open" : "")}>
                  {mobileRoster}
                  {previewingRevision && (
                    <div className="preview-banner" role="status">
                      <div className="preview-banner-copy">
                        <span className="preview-mark">!</span>
                        <span>
                          Previewing revision from {formatRevisionDate(previewingRevision.created_at)}
                        </span>
                      </div>
                      <div className="preview-actions">
                        <button
                          ref={previewRestoreButtonRef}
                          className="btn dark"
                          type="button"
                          onClick={() => requestRestore(previewingRevision)}
                        >
                          Restore this Version
                        </button>
                        <button className="btn dark-ghost" type="button" onClick={exitPreview}>
                          Exit Preview
                        </button>
                      </div>
                    </div>
                  )}
                  <header className="dossier-head">
                    <div className="filecode">
                      <span>FILE · {displayedActive.id.slice(0, 8).toUpperCase()}</span>
                      <button
                        ref={headerHistoryButtonRef}
                        className="history-trigger"
                        type="button"
                        onClick={() => openHistory("header")}
                        aria-haspopup="dialog"
                        aria-expanded={historyOpen}
                        disabled={!active}
                      >
                        <Icon name="clock" />
                        <span>History</span>
                      </button>
                      <span className="live">
                        ● {displayedActive.status === "active" ? "ACTIVE FIELD MANUAL" : "DRAFT FIELD MANUAL"}
                      </span>
                    </div>
                    <h1>{displayedActive.codename || "Untitled"}</h1>
                    <p className="sub">
                      {displayedActive.concept ||
                        "Add a one-line concept below to anchor this character."}
                    </p>
                    <div className="casting-stamp">Casting</div>
                  </header>

                  <div className={"sheet" + (previewingRevision ? " preview-active" : "")}>
                    <Field
                      id={fieldControlId(activeId, "codename")}
                      label="Codename"
                      value={displayedActive.codename}
                      onChange={(v) => set("codename", v)}
                      rows={1}
                      multiline={false}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <Field
                      id={fieldControlId(activeId, "concept")}
                      label="One-line concept"
                      hint="The logline the writer reads first"
                      value={displayedActive.concept}
                      onChange={(v) => set("concept", v)}
                      rows={2}
                      multiline={false}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <Field
                      id={fieldControlId(activeId, "voice")}
                      label="Voice & identity"
                      hint="Who they are — keep it original, never a real person"
                      value={displayedActive.voice}
                      onChange={(v) => set("voice", v)}
                      rows={4}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <div className="grid2">
                      <Field
                        id={fieldControlId(activeId, "cadence")}
                        label="Cadence & delivery"
                        value={displayedActive.cadence}
                        onChange={(v) => set("cadence", v)}
                        rows={5}
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                      <Field
                        id={fieldControlId(activeId, "vocab")}
                        label="Vocabulary & catchphrases"
                        value={displayedActive.vocab}
                        onChange={(v) => set("vocab", v)}
                        rows={5}
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                    </div>
                    <Field
                      id={fieldControlId(activeId, "offlimits")}
                      label="Off-limits"
                      hint="Hard rules — what they never say (keeps you monetizable & on-brand)"
                      value={displayedActive.offlimits}
                      onChange={(v) => set("offlimits", v)}
                      rows={3}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <Field
                      id={fieldControlId(activeId, "lines")}
                      label="Gold-standard lines"
                      hint="2–4 example lines — the writer imitates these more than any instruction"
                      value={displayedActive.lines}
                      onChange={(v) => set("lines", v)}
                      rows={5}
                      mono
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <div className="grid2">
                      <Field
                        id={fieldControlId(activeId, "beats")}
                        label="Beat template"
                        value={displayedActive.beats}
                        onChange={(v) => set("beats", v)}
                        rows={6}
                        mono
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                      <Field
                        id={fieldControlId(activeId, "runtime")}
                        label="Runtime target"
                        hint="Enforced at script + render"
                        value={displayedActive.runtime}
                        onChange={(v) => set("runtime", v)}
                        rows={2}
                        multiline={false}
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                    </div>
                  </div>

                  {!previewingRevision && (
                    <div className="savebar">
                      {isRestoredDraft && (
                        <div className="restore-warning">
                          ⚠ UNSAVED RESTORED DRAFT — You are viewing a restored manual. Click
                          Save dossier to make these changes live.
                        </div>
                      )}
                      {dirty && (
                        <span className="savebar-dirty-label chip draft" role="status">
                          • UNPERSISTED CHANGES IN BUFFER
                        </span>
                      )}
                      <button
                        className={"btn" + (isRestoredDraft ? " save-highlight" : "")}
                        onClick={save}
                        disabled={saving || !dirty}
                      >
                        {saving ? "Saving…" : "Save dossier"}
                      </button>
                      <button className="btn ghost" onClick={toggleStatus}>
                        {active.status === "active" ? "● Active" : "○ Draft"}
                      </button>
                      <button
                        ref={savebarHistoryButtonRef}
                        className="btn ghost"
                        type="button"
                        onClick={() => openHistory("savebar")}
                        aria-haspopup="dialog"
                        aria-expanded={historyOpen}
                      >
                        View History
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={handleExport}
                        disabled={saving || loading || !active}
                      >
                        EXPORT MANUAL (MD)
                      </button>
                      <button className="btn ghost" onClick={() => guardedSetView("wire")}>
                        Log an idea →
                      </button>
                    </div>
                  )}
                  {historyOpen && (
                    <HistoryDrawer
                      revisions={revisions}
                      loading={revisionsLoading}
                      error={revisionsError}
                      previewingRevisionId={previewingRevisionId}
                      onClose={closeHistory}
                      onRetry={() => {
                        void fetchRevisions(active.id);
                      }}
                      onPreview={previewRevision}
                      onRestore={requestRestore}
                      restoreFocusRef={historyRestoreFocusRef}
                    />
                  )}
                  {pendingRestore && (
                    <RestoreDialog
                      revision={pendingRestore}
                      onCancel={cancelRestore}
                      onConfirm={confirmRestore}
                      restoreFocusRef={restoreDialogRestoreFocusRef}
                    />
                  )}
                </section>
              ) : (
                <section className="dossier">
                  {mobileRoster}
                  <div className="empty">
                    <Icon name="roster" />
                    <h3>No characters yet</h3>
                    <p>Create your first character to start building a field manual.</p>
                    <button className="btn" onClick={guardedAddChar} disabled={adding}>
                      {adding ? "Creating…" : "+ New character"}
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {view === "wire" && (
            <div className="wire">
              <div className="col-head">
                <h2>The Wire</h2>
                <span className="count">
                  {ideas.length} logged · {openIdeas} open
                </span>
              </div>
              <div className="cap">
                <span className="eyebrow">
                  TRANSMITTING FREQUENCY · LOG NEW BEAT
                </span>
                <div className="field" style={{ marginTop: 12 }}>
                  <textarea
                    ref={ideaTitleRef}
                    rows={2}
                    value={draftIdea}
                    placeholder={'Dossier title (e.g. "Acoustic Kitty target extraction")...'}
                    onChange={(e) => setDraftIdea(e.target.value)}
                    onKeyDown={handleIdeaTitleKeyDown}
                    disabled={ideaCaptureDisabled}
                    aria-label="New idea title"
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="field" style={{ marginTop: 10 }}>
                  <textarea
                    rows={ideaNoteFocused || draftIdeaNote ? 4 : 1}
                    value={draftIdeaNote}
                    placeholder="Tactical notes, dialogue fragments, or scene beats (optional)..."
                    onChange={(e) => setDraftIdeaNote(e.target.value)}
                    onFocus={() => setIdeaNoteFocused(true)}
                    onBlur={() => setIdeaNoteFocused(false)}
                    onKeyDown={handleIdeaNoteKeyDown}
                    disabled={ideaCaptureDisabled}
                    aria-label="New idea note"
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="row" style={{ marginTop: 10, alignItems: "center" }}>
                  <select
                    className="tag-select"
                    value={activeId ?? ""}
                    disabled
                    aria-label="Idea character assignment"
                  >
                    {active ? (
                      <option value={active.id}>{active.codename || "Untitled"}</option>
                    ) : (
                      <option value="">No dossier assigned</option>
                    )}
                  </select>
                  <select
                    className="tag-select"
                    value={CHANNELS[0]}
                    disabled
                    aria-label="Idea channel assignment"
                  >
                    <option value={CHANNELS[0]}>{CHANNELS[0]}</option>
                  </select>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => void logIdea()}
                    disabled={!canSubmitIdea}
                  >
                    {ideaSubmittingTitle ? "TRANSMITTING..." : "LOG IT"}
                  </button>
                </div>
              </div>
              {ideasError && ideas.length > 0 && (
                <div className="cap" role="alert">
                  <span className="eyebrow">Wire read degraded</span>
                  <div className="row" style={{ marginTop: 9, alignItems: "center" }}>
                    <span className="note">Couldn&apos;t refresh logged ideas: {ideasError}</span>
                    <button className="btn" type="button" onClick={() => void fetchIdeas()}>
                      Retry Wire
                    </button>
                  </div>
                </div>
              )}
              {ideasLoading && ideas.length === 0 ? (
                <div className="loading">
                  <span className="spin" /> Loading wire queue…
                </div>
              ) : ideasError && ideas.length === 0 ? (
                <div className="empty">
                  <h3>Wire unavailable</h3>
                  <p>Couldn&apos;t read logged ideas: {ideasError}</p>
                  <button className="btn" type="button" onClick={() => void fetchIdeas()}>
                    Retry Wire
                  </button>
                </div>
              ) : ideas.length === 0 ? (
                <div className="empty">
                  <h3>The wire&apos;s quiet</h3>
                  <p>Nothing logged yet. Drop the next idea above the moment it lands.</p>
                </div>
              ) : (
                <div className="wire-list">
                  {ideas.map((i) => {
                    const writeState = i.clientWriteState;
                    const isWriteBlocked = Boolean(writeState);
                    const currentDossier = activeId
                      ? chars.find((c) => c.id === activeId)
                      : undefined;
                    const groupedDossiers = chars.filter((c) => c.id !== currentDossier?.id);
                    const activeDossiers = groupedDossiers.filter((c) => c.status === "active");
                    const draftDossiers = groupedDossiers.filter((c) => c.status !== "active");
                    const borderLeftColor =
                      writeState === "failed"
                        ? "var(--stamp)"
                        : writeState === "saving"
                          ? "var(--line-soft)"
                          : i.status === "active"
                            ? "var(--brass)"
                            : i.status === "used"
                              ? "var(--cleared)"
                              : "var(--line)";
                    return (
                      <div
                        key={i.clientKey ?? i.id}
                        className="icard"
                        aria-busy={writeState === "saving"}
                        style={{
                          borderLeftColor,
                          borderColor: writeState === "failed" ? "var(--stamp-deep)" : undefined,
                          opacity: writeState === "saving" ? 0.65 : undefined,
                        }}
                      >
                        <div className="body">
                          <div className="title">{i.title}</div>
                          {i.note && <div className="note">{i.note}</div>}
                          <div className="tags">
                            {writeState === "saving" ? (
                              <span className="statusbtn">[TRANSMITTING...]</span>
                            ) : writeState === "failed" ? (
                              <>
                                <button
                                  className="statusbtn"
                                  type="button"
                                  onClick={() => retryIdea(i)}
                                  disabled={ideaCaptureDisabled}
                                >
                                  [TRANSMISSION FAILED - RETRY]
                                </button>
                                <button
                                  className="statusbtn"
                                  type="button"
                                  onClick={() => dismissIdea(i.id)}
                                >
                                  Dismiss
                                </button>
                              </>
                            ) : (
                              <div
                                className="status-segmented-control"
                                role="group"
                                aria-label="Update idea status"
                              >
                                {IDEA_STATUS_OPTIONS.map((status) => {
                                  const isActiveStatus = i.status === status;
                                  return (
                                    <button
                                      key={status}
                                      className={
                                        "segment-btn" +
                                        (isActiveStatus ? " active-segment s-" + status : "")
                                      }
                                      type="button"
                                      aria-pressed={isActiveStatus}
                                      disabled={isWriteBlocked}
                                      onClick={() => setIdeaStatus(i.id, status)}
                                    >
                                      {IDEA_STATUS_LABELS[status]}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            <select
                              className="tag-select"
                              value={chars.length === 0 ? "" : i.character_id ?? ""}
                              onChange={(e) =>
                                setIdeaField(i.id, "character_id", e.target.value)
                              }
                              disabled={isWriteBlocked || chars.length === 0}
                              aria-label="Assign character"
                            >
                              {chars.length === 0 ? (
                                <option value="">[ No characters on file ]</option>
                              ) : (
                                <>
                                  <option value="">[ -- Unassigned -- ]</option>
                                  {currentDossier && (
                                    <option value={currentDossier.id}>
                                      ⚡ Current Dossier: {currentDossier.codename || "Untitled"}
                                    </option>
                                  )}
                                  {activeDossiers.length > 0 && (
                                    <optgroup label="Active Field Manuals">
                                      {activeDossiers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          ● {c.codename || "Untitled"}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {draftDossiers.length > 0 && (
                                    <optgroup label="Draft Field Manuals">
                                      {draftDossiers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          ○ {c.codename || "Untitled"}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </>
                              )}
                            </select>
                            <select
                              className="tag-select"
                              value={i.channel}
                              onChange={(e) =>
                                setIdeaField(i.id, "channel", e.target.value)
                              }
                              disabled={isWriteBlocked}
                              aria-label="Assign channel"
                            >
                              {CHANNELS.map((ch) => (
                                <option key={ch} value={ch}>
                                  {ch}
                                </option>
                              ))}
                            </select>
                          </div>
                          {writeState === "failed" && i.clientError && (
                            <div className="note" role="alert" style={{ color: "var(--stamp)" }}>
                              {i.clientError}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === "runs" && (
            <div className="wire">
              <div className="col-head">
                <h2>Runs</h2>
                <span className="count">
                  {episodesLoading
                    ? "loading pipeline output"
                    : `pipeline output · ${episodes.length} episode${episodes.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="cap"><span className="eyebrow">Operation-wide pipeline output — every character&apos;s finished episodes.</span></div>
              {episodesLoading ? (
                <div className="loading">
                  <span className="spin" /> Loading pipeline output…
                </div>
              ) : episodesError ? (
                <div className="empty">
                  <Icon name="runs" />
                  <h3>Runs unavailable</h3>
                  <p>Couldn&apos;t read pipeline episodes: {episodesError}</p>
                  <button className="btn" type="button" onClick={() => void fetchEpisodes()}>
                    Retry Runs
                  </button>
                </div>
              ) : episodes.length === 0 ? (
                <div className="empty">
                  <Icon name="runs" />
                  <h3>No runs yet</h3>
                  <p>
                    Finished episodes land here — each with its fact-check verdict
                    and the provider that gated it. The content pipeline writes them
                    to the same Supabase this dashboard reads.
                  </p>
                </div>
              ) : (
                <div className="wire-list">
                  {episodes.map((e) => {
                    const gate = e.sentinels?.[e.sentinels.length - 1];
                    return (
                      <button
                        key={e.episode_id}
                        ref={(node) => {
                          if (node) runButtonRefs.current.set(e.episode_id, node);
                          else runButtonRefs.current.delete(e.episode_id);
                        }}
                        className="runcard"
                        onClick={() => openRunDetail(e.episode_id)}
                        aria-haspopup="dialog"
                        aria-expanded={activeEpisodeId === e.episode_id}
                      >
                        <div className="topic">{e.food}</div>
                        <div className="runmeta">
                          <span className="rmeta stat">{e.status}</span>
                          {e.final_stage && (
                            <span className="rmeta">stage · {e.final_stage}</span>
                          )}
                          {gate?.provider && (
                            <span className="rmeta gate">
                              gated by {gate.provider}
                              {gate.verdict ? ` · ${gate.verdict}` : ""}
                            </span>
                          )}
                          {typeof e.spend === "number" && e.spend > 0 && (
                            <span className="rmeta">${e.spend.toFixed(2)}</span>
                          )}
                          <span className="rmeta">
                            {new Date(e.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {activeEpisode && (
                <DrillDownPanel
                  episode={activeEpisode}
                  receipts={receipts}
                  loading={receiptsLoading}
                  error={receiptsError}
                  onClose={closeRunDetail}
                  onRetry={() => {
                    void fetchReceipts(activeEpisode.episode_id);
                  }}
                  restoreFocusRef={runDetailRestoreFocusRef}
                />
              )}
            </div>
          )}

          {view === "overview" && (
            <OverviewDashboard
              chars={chars}
              ideas={ideas}
              episodes={episodes}
              costStats={costStats}
              costReceiptsLoading={costReceiptsLoading}
              costReceiptsError={costReceiptsError}
            />
          )}

          {view === "cost" && (
            <CostBoxDashboard
              episodes={episodes}
              costStats={costStats}
              loading={costReceiptsLoading}
              error={costReceiptsError}
              receiptsLoaded={costReceiptsLoaded}
              onRetry={() => void fetchCostReceipts()}
            />
          )}
        </>
      )}
      {pendingDirtyAction && active && (
        <DiscardChangesDialog
          codename={dirtyCodename}
          onCancel={cancelDirtyAction}
          onConfirm={confirmDirtyAction}
          restoreFocusRef={discardDialogRestoreFocusRef}
        />
      )}
    </div>
  );
}
