"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RenderPlayer } from "@/components/aurora/RenderPlayer";
import { RenderProgress } from "@/components/aurora/RenderProgress";
import { useRenderProgress } from "@/lib/hooks/useRenderProgress";
import { isActionableStatus, isInFlightStatus, type JobStatus } from "@/lib/jobs";
import { plainLanguage, stageLabel } from "@/lib/plainLanguage";
import {
  classifyFailure,
  failureClassLabel,
  resolveTerminalState,
  summarizeFailures,
  terminalStateLabel,
  type FailureClassId,
  type TerminalState,
  type TerminalStateSource,
} from "@/lib/failureClass";
import { parkKindLabel, type ParkKind } from "@/lib/parkReason";
import { ALL_CHANNELS_KEY, cardMatchesChannel, channelFacets } from "@/lib/runsChannelFilter";
import { groupRunCards, type RunGroupKey } from "@/lib/runsGrouping";
import type { WorkerReliability } from "@/lib/workerReliability";

export type RunCardVM = {
  id: string;
  episodeId: string | null;
  title: string;
  channel: string | null;
  status: JobStatus;
  statusLabel: string;
  createdAt: string;
  spend: number | null;
  error: string | null;
  needsAttention: boolean;
  parkKind?: ParkKind | null;
  parkKindColumn?: string | null;
  failureClass?: FailureClassId | null;
  terminalState?: TerminalState | null;
  terminalStateSource?: TerminalStateSource | null;
  finalStage?: string | null;
  parkReason?: string | null;
  belowFloorCuts?: string[];
};

export type RunReceiptRow = {
  seq: number;
  stage: string;
  verdict: string;
  reason: string;
  model: string;
  provider: string;
  result?: unknown;
  evidence?: unknown;
};

export type RunDiagnosticsResult = { receipts: RunReceiptRow[]; error: string | null };

export type ReliabilityResult = {
  reliability: WorkerReliability | null;
  error: string | null;
  windowDays?: number;
};

export type RunsHubProps = {
  cards: RunCardVM[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
  onReviewApprovals?: () => void;
  loadDiagnostics: (episodeId: string) => Promise<RunDiagnosticsResult>;
  loadReliability: () => Promise<ReliabilityResult>;
};

type DiagnosticsState = {
  loading: boolean;
  error: string | null;
  receipts: RunReceiptRow[] | null;
};

export function RunsHub({
  cards,
  loading,
  error,
  onRetry,
  onBack,
  onReviewApprovals,
  loadDiagnostics,
  loadReliability,
}: RunsHubProps) {
  const attentionCount = cards.filter((card) => card.needsAttention).length;
  const [channelKey, setChannelKey] = useState<string>(ALL_CHANNELS_KEY);
  const [groupOpen, setGroupOpen] = useState<Partial<Record<RunGroupKey, boolean>>>({});
  const facets = useMemo(() => channelFacets(cards), [cards]);
  const effectiveChannelKey = facets.some((facet) => facet.key === channelKey) ? channelKey : ALL_CHANNELS_KEY;
  const channelFiltered = useMemo(
    () => cards.filter((card) => cardMatchesChannel(card, effectiveChannelKey)),
    [cards, effectiveChannelKey],
  );
  const groups = useMemo(() => groupRunCards(channelFiltered), [channelFiltered]);
  const inFlightEpisodeIds = useMemo(
    () => cards.filter((card) => isInFlightStatus(card.status)).flatMap((card) => card.episodeId ? [card.episodeId] : []),
    [cards],
  );
  const latestStageByEpisode = useRenderProgress(inFlightEpisodeIds);

  const showEmpty = !loading && error === null && cards.length === 0;
  const showList = !loading && error === null && cards.length > 0;

  return (
    <section className="runs-hub scoped" aria-labelledby="runs-hub-title">
      <div className="section-header">
        <div>
          <h3 id="runs-hub-title" className="text-display" style={{ fontSize: "2rem" }}>
            Runs
          </h3>
          <p className="dim" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {cards.length} run{cards.length === 1 ? "" : "s"}
            {attentionCount > 0 ? ` · ${attentionCount} need${attentionCount === 1 ? "s" : ""} attention` : ""}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back to Channels
        </button>
      </div>

      <WorkerReliabilityPanel loadReliability={loadReliability} />

      {showList && facets.length > 2 ? (
        <div className="runs-hub__filters runs-hub__filter--channel" role="group" aria-label="Filter by channel">
          {facets.map((facet) => (
            <button
              key={facet.key}
              type="button"
              className={"runs-hub__filter" + (effectiveChannelKey === facet.key ? " is-active" : "")}
              aria-pressed={effectiveChannelKey === facet.key}
              onClick={() => setChannelKey(facet.key)}
            >
              {facet.label} ({facet.count})
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="glass-panel au-empty" aria-busy="true">
          <span className="spin" aria-hidden="true" /> Loading runs…
        </div>
      ) : null}

      {error !== null ? (
        <div className="glass-panel au-empty" role="alert">
          <p className="text-title">Couldn&apos;t load runs</p>
          <p className="dim">Check your connection and try again.</p>
          {error ? (
            <details className="error-details">
              <summary>Details</summary>
              {error}
            </details>
          ) : null}
          <div style={{ marginTop: "1rem" }}>
            <button type="button" className="btn-secondary" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {showEmpty ? (
        <div className="glass-panel au-empty">
          <p className="text-title">No runs yet</p>
          <p>Runs appear here once the pipeline picks up queued jobs.</p>
        </div>
      ) : null}

      {showList ? (
        <div className="runs-hub__list" aria-label="Runs">
          {groups.map((group) => {
            const open = groupOpen[group.key] ?? group.defaultOpen;
            const headerId = `runs-hub-group-${group.key}-header`;
            const bodyId = `runs-hub-group-${group.key}-body`;

            return (
              <section key={group.key} className="runs-hub__group">
                <button
                  type="button"
                  id={headerId}
                  className="runs-hub__group-head"
                  aria-expanded={open}
                  aria-controls={bodyId}
                  onClick={() =>
                    setGroupOpen((current) => ({
                      ...current,
                      [group.key]: !(current[group.key] ?? group.defaultOpen),
                    }))
                  }
                >
                  <span className="text-title">
                    {open ? "▾" : "▸"} {group.label} · {group.cards.length}
                  </span>
                </button>

                {open ? (
                  <div
                    id={bodyId}
                    className="runs-hub__group-body"
                    role="region"
                    aria-labelledby={headerId}
                  >
                    {group.key === "attention" ? <FailureRollup cards={group.cards} /> : null}
                    {group.cards.map((card) => (
                      <RunCard
                        key={card.id}
                        card={card}
                        latestStage={card.episodeId ? latestStageByEpisode[card.episodeId] : undefined}
                        loadDiagnostics={loadDiagnostics}
                        onReviewApprovals={onReviewApprovals}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
          {channelFiltered.length === 0 ? (
            <div className="glass-panel au-empty">
              <p>No runs in this channel right now.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function formatPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function WorkerReliabilityPanel({
  loadReliability,
}: {
  loadReliability: RunsHubProps["loadReliability"];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WorkerReliability | null>(null);
  const [windowDays, setWindowDays] = useState<number | undefined>(undefined);
  const inFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    const result = await loadReliability();
    inFlightRef.current = false;
    setLoading(false);
    setError(result.error);
    setData(result.reliability);
    setWindowDays(result.windowDays);
  }, [loadReliability]);

  const windowLabel = windowDays ? `last ${windowDays} days` : "recent runs";

  useEffect(() => {
    if (open && data === null && !inFlightRef.current) void load();
  }, [open, data, load]);

  const rows = data?.rows.filter((row) => row.attempts > 0) ?? [];

  return (
    <div className="glass-panel runs-hub__reliability">
      <button
        type="button"
        className="runs-hub__reliability-head"
        aria-expanded={open}
        aria-controls="worker-reliability-body"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-title">{open ? "▾" : "▸"} Step reliability</span>
        {data ? (
          <span className="dim">
            {data.totalAttempts} attempts · {formatUsd(data.totalRetryCost, 3)} on retries · {windowLabel}
          </span>
        ) : (
          <span className="dim">retry / stop rates + wasted spend by step</span>
        )}
      </button>

      {open ? (
        <div id="worker-reliability-body" className="runs-hub__reliability-body">
          {loading ? (
            <p className="dim" aria-busy="true">
              <span className="spin" aria-hidden="true" /> Loading reliability…
            </p>
          ) : null}

          {error ? (
            <div className="dim" role="alert">
              <p>Couldn&apos;t load reliability.</p>
              <details className="error-details">
                <summary>Details</summary>
                {error}
              </details>
              <button type="button" className="btn-secondary" onClick={() => void load()}>
                Retry
              </button>
            </div>
          ) : null}

          {data && !loading && !error ? (
            rows.length === 0 ? (
              <p className="dim">No step history recorded yet.</p>
            ) : (
              <div className="runs-hub__reliability-scroll">
                <table className="reliability-table">
                  <thead>
                    <tr>
                      <th scope="col">Step</th>
                      <th scope="col">Attempts</th>
                      <th scope="col">Retry</th>
                      <th scope="col">Blocked</th>
                      <th scope="col">Retry rate</th>
                      <th scope="col">Wasted $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.stage} className={row.retry > 0 ? "reliability-row--warn" : ""}>
                        <th scope="row">
                          <span className="reliability-stage">{stageLabel(row.stage)}</span>
                          {row.models.length > 0 ? (
                            <span className="reliability-models dim">{row.models.join(" · ")}</span>
                          ) : null}
                        </th>
                        <td>{row.attempts}</td>
                        <td>{row.retry}</td>
                        <td>{row.blocked}</td>
                        <td>{formatPct(row.retryRate)}</td>
                        <td>{formatUsd(row.retryCost, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
          <p className="dim runs-hub__reliability-note">
            Wasted $ = spend on attempts the video system had to retry. Based on the {windowLabel}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function statusChipClass(status: JobStatus): string {
  if (status === "error") return "status-chip runs-hub__status runs-hub__status--error";
  if (status === "stale") return "status-chip runs-hub__status runs-hub__status--warn";
  if (status === "ready_for_review") return "status-chip runs-hub__status runs-hub__status--review";
  if (status === "done") return "status-chip status-cast";
  return "status-chip runs-hub__status";
}

function RunCard({
  card,
  latestStage,
  loadDiagnostics,
  onReviewApprovals,
}: {
  card: RunCardVM;
  latestStage?: string;
  loadDiagnostics: RunsHubProps["loadDiagnostics"];
  onReviewApprovals: RunsHubProps["onReviewApprovals"];
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DiagnosticsState>({ loading: false, error: null, receipts: null });
  const inFlightRef = useRef(false);
  const bodyId = `run-diagnostics-${card.id}`;

  const canDiagnose = card.episodeId !== null;
  const isFailure = card.status === "error";
  const parkKind = card.parkKind ?? null;
  const showParkReason = parkKind !== null;
  const belowFloorCuts = card.belowFloorCuts ?? [];
  const failureClass = isFailure ? (card.failureClass ?? classifyFailure(card.error)) : null;
  const terminalStateResult = isFailure
    ? card.terminalState && card.terminalStateSource
      ? { state: card.terminalState, source: card.terminalStateSource }
      : resolveTerminalState(card.parkKindColumn, card.error)
    : null;
  const needsApprovalReview = isActionableStatus(card.status);

  const runDiagnostics = useCallback(async () => {
    if (card.episodeId === null || inFlightRef.current) return;
    inFlightRef.current = true;
    setState({ loading: true, error: null, receipts: null });
    const result = await loadDiagnostics(card.episodeId);
    inFlightRef.current = false;
    setState({ loading: false, error: result.error, receipts: result.receipts });
  }, [card.episodeId, loadDiagnostics]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && canDiagnose && state.receipts === null && !inFlightRef.current) {
      void runDiagnostics();
    }
  };

  const cardClass =
    "glass-panel run-card" + (card.needsAttention ? " run-card--attention" : "");

  return (
    <article className={cardClass}>
      <div className="run-card__head">
        <div className="run-card__main">
          <span className={statusChipClass(card.status)}>{card.statusLabel}</span>
          {isFailure && failureClass ? (
            <span className="status-chip run-card__failure-class-chip">
              {failureClassLabel(failureClass)}
            </span>
          ) : null}
          <h4 className="text-title run-card__title">{card.title}</h4>
        </div>
        <div className="run-card__meta">
          {card.channel ? <span className="dim">{card.channel}</span> : null}
          {card.spend !== null ? <span className="dim">{formatUsd(card.spend)}</span> : null}
          <span className="dim">{formatCreatedAt(card.createdAt)}</span>
        </div>
      </div>

      {isFailure ? (
        <div className="run-card__failure" role="note" aria-label="Failure summary">
          <div className="run-card__failure-head">
            <span className="run-card__failure-title">Failure summary</span>
            {terminalStateResult ? (
              <span
                className="status-chip run-card__failure-terminal"
                title={
                  terminalStateResult.source === "derived"
                    ? "worked out from the error text"
                    : terminalStateResult.source === "unavailable"
                      ? "stop reason not recorded"
                      : undefined
                }
              >
                {terminalStateLabel(terminalStateResult.state)}
                {terminalStateResult.source === "derived" ? " (worked out from the error text)" : ""}
              </span>
            ) : (
              <span className="status-chip run-card__failure-terminal" title="stop reason not recorded">
                Unclassified
              </span>
            )}
          </div>
          <p className="dim run-card__failure-stage">
            {plainLanguage("final_stage")} · {stageLabel(card.finalStage)}
          </p>
        </div>
      ) : null}

      {needsApprovalReview && onReviewApprovals ? (
        <button type="button" className="btn ghost compact" onClick={onReviewApprovals}>
          Review approvals →
        </button>
      ) : null}

      {card.error ? (
        <div className="run-card__error" role="note">
          <span className="run-card__error-label">Run error</span>
          <p>{card.error}</p>
        </div>
      ) : null}

      {showParkReason ? (
        <div className="run-card__park">
          <div className="run-card__park-head">
            <span className="run-card__park-title">{plainLanguage("parked")}</span>
            <span className="status-chip run-card__park-kind">
              {parkKindLabel(parkKind, card.parkKindColumn)}
            </span>
          </div>
          {card.finalStage ? (
            <p className="dim run-card__park-stage">{plainLanguage("final_stage")} · {stageLabel(card.finalStage)}</p>
          ) : null}
          {belowFloorCuts.length > 0 ? (
            <div className="run-card__park-cuts" role="group" aria-label={plainLanguage("below_floor")}>
              {belowFloorCuts.map((cut) => (
                <span key={cut} className="run-card__park-cut">
                  {cut}
                </span>
              ))}
            </div>
          ) : null}
          {card.parkReason ? (
            <details className="error-details run-card__park-reason">
              <summary>Technical details</summary>
              <p className="dim">{card.parkReason}</p>
            </details>
          ) : null}
        </div>
      ) : null}

      {isInFlightStatus(card.status) ? <RenderProgress latestStage={latestStage} /> : null}

      {card.episodeId ? <RenderPlayer episodeId={card.episodeId} /> : null}

      {canDiagnose ? (
        <div className="run-card__diagnostics">
          <button
            type="button"
            className="runs-hub__disclosure"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={toggle}
          >
            {open ? "▾" : "▸"} {plainLanguage("receipts")}
          </button>

          {open ? (
            <div className="run-card__diagnostics-body" id={bodyId}>
              {state.loading ? (
                <p className="dim" aria-busy="true">
                  <span className="spin" aria-hidden="true" /> Loading run details…
                </p>
              ) : null}

              {state.error ? (
                <div className="dim" role="alert">
                  <p>Couldn&apos;t load the run details.</p>
                  <details className="error-details">
                    <summary>Details</summary>
                    {state.error}
                  </details>
                  <button type="button" className="btn-secondary" onClick={() => void runDiagnostics()}>
                    Retry
                  </button>
                </div>
              ) : null}

              {state.receipts !== null && !state.loading && state.error === null ? (
                state.receipts.length === 0 ? (
                  <p className="dim">No step history recorded for this run.</p>
                ) : (
                  <ol className="run-worker-log">
                    {state.receipts.map((row, index) => (
                      <li key={`${row.seq}-${index}`} className="run-worker-row">
                        <div className="run-worker-row__top">
                          <span className="run-worker-stage">{stageLabel(row.stage)}</span>
                          <span className={verdictBadgeClass(row.verdict)}>
                            {verdictLabel(row.verdict)}
                          </span>
                        </div>
                        {row.reason ? <p className="run-worker-reason">{row.reason}</p> : null}
                        {row.model || row.provider ? (
                          <p className="run-worker-model dim">
                            {[row.provider, row.model].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function FailureRollup({ cards }: { cards: RunCardVM[] }) {
  const failures = cards.filter((card) => card.status === "error");
  if (failures.length === 0) return null;

  const rows = summarizeFailures(
    failures.map((card) => ({
      error: card.error,
      spend: card.spend,
      stage: card.finalStage ?? null,
    })),
  );

  if (rows.length === 0) return null;

  return (
    <div className="glass-panel runs-hub__failure-rollup" role="note" aria-label="Error rollup">
      <p className="text-title runs-hub__failure-rollup-title">Errors by cause</p>
      <div className="runs-hub__failure-rollup-rows">
        {rows.map((row) => (
          <div key={row.classId} className="runs-hub__failure-rollup-row">
            <span className="runs-hub__failure-rollup-label">{row.label}</span>
            <span className="dim runs-hub__failure-rollup-metrics">
              {row.count} · {formatUsd(row.spend)} burned
              {row.spendUnrecorded > 0
                ? ` · ${row.spendUnrecorded} run${row.spendUnrecorded === 1 ? "" : "s"} have no recorded spend`
                : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function verdictLabel(verdict: string): string {
  const v = verdict.trim().toLowerCase();
  if (v === "pass") return "Pass";
  if (v === "retry") return "Retry";
  if (v === "blocked") return "Blocked";
  if (v === "approval_required") return "Needs approval";
  return verdict.trim() === "" ? "—" : verdict;
}

function verdictBadgeClass(verdict: string): string {
  const v = verdict.trim().toLowerCase();
  const base = "run-verdict";
  if (v === "pass") return `${base} run-verdict--pass`;
  if (v === "retry") return `${base} run-verdict--retry`;
  if (v === "blocked") return `${base} run-verdict--blocked`;
  if (v === "approval_required") return `${base} run-verdict--approval`;
  return base;
}

function formatCreatedAt(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatUsd(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}
