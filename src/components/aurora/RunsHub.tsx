"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JobStatus } from "@/lib/jobs";
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
                    {group.cards.map((card) => (
                      <RunCard key={card.id} card={card} loadDiagnostics={loadDiagnostics} />
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
        <span className="text-title">{open ? "▾" : "▸"} Worker reliability</span>
        {data ? (
          <span className="dim">
            {data.totalAttempts} attempts · {formatUsd(data.totalRetryCost, 3)} on retries · {windowLabel}
          </span>
        ) : (
          <span className="dim">retry / block rates + wasted spend per worker</span>
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
              <p className="dim">No per-worker telemetry recorded yet.</p>
            ) : (
              <div className="runs-hub__reliability-scroll">
                <table className="reliability-table">
                  <thead>
                    <tr>
                      <th scope="col">Worker</th>
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
                          <span className="reliability-stage">{row.stage}</span>
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
            Wasted $ = spend on attempts the pipeline had to retry — a cheap worker that retries a lot
            isn&apos;t cheap. Based on the {windowLabel}.
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
  loadDiagnostics,
}: {
  card: RunCardVM;
  loadDiagnostics: RunsHubProps["loadDiagnostics"];
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DiagnosticsState>({ loading: false, error: null, receipts: null });
  const inFlightRef = useRef(false);
  const bodyId = `run-diagnostics-${card.id}`;

  const canDiagnose = card.episodeId !== null;
  const parkKind = card.parkKind ?? null;
  const showParkReason = parkKind !== null;
  const belowFloorCuts = card.belowFloorCuts ?? [];

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
          <h4 className="text-title run-card__title">{card.title}</h4>
        </div>
        <div className="run-card__meta">
          {card.channel ? <span className="dim">{card.channel}</span> : null}
          {card.spend !== null ? <span className="dim">{formatUsd(card.spend)}</span> : null}
          <span className="dim">{formatCreatedAt(card.createdAt)}</span>
        </div>
      </div>

      {card.error ? (
        <div className="run-card__error" role="note">
          <span className="run-card__error-label">Run error</span>
          <p>{card.error}</p>
        </div>
      ) : null}

      {showParkReason ? (
        <div className="run-card__park">
          <div className="run-card__park-head">
            <span className="run-card__park-title">Why it parked</span>
            <span className="status-chip run-card__park-kind">
              {parkKindLabel(parkKind, card.parkKindColumn)}
            </span>
          </div>
          {card.finalStage ? (
            <p className="dim run-card__park-stage">stopped at · {card.finalStage}</p>
          ) : null}
          {belowFloorCuts.length > 0 ? (
            <div className="run-card__park-cuts" role="group" aria-label="Below-floor cuts">
              {belowFloorCuts.map((cut) => (
                <span key={cut} className="run-card__park-cut">
                  {cut}
                </span>
              ))}
            </div>
          ) : null}
          {card.parkReason ? <p className="dim run-card__park-reason">{card.parkReason}</p> : null}
        </div>
      ) : null}

      {canDiagnose ? (
        <div className="run-card__diagnostics">
          <button
            type="button"
            className="runs-hub__disclosure"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={toggle}
          >
            {open ? "▾" : "▸"} Why{card.needsAttention ? " did this need attention" : " / which worker"}?
          </button>

          {open ? (
            <div className="run-card__diagnostics-body" id={bodyId}>
              {state.loading ? (
                <p className="dim" aria-busy="true">
                  <span className="spin" aria-hidden="true" /> Loading per-worker log…
                </p>
              ) : null}

              {state.error ? (
                <div className="dim" role="alert">
                  <p>Couldn&apos;t load the per-worker log.</p>
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
                  <p className="dim">No per-worker log recorded for this run.</p>
                ) : (
                  <ol className="run-worker-log">
                    {state.receipts.map((row, index) => (
                      <li key={`${row.seq}-${index}`} className="run-worker-row">
                        <div className="run-worker-row__top">
                          <span className="run-worker-stage">{row.stage || "(stage)"}</span>
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
