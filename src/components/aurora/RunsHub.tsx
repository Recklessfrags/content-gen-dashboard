"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { JobArchiveControls } from "@/components/aurora/JobArchiveControls";
import { RenderPlayer } from "@/components/aurora/RenderPlayer";
import { useRenderProgress } from "@/lib/hooks/useRenderProgress";
import { isActionableStatus, type JobArchiveMutationResult, type JobStatus } from "@/lib/jobs";
import { stageLabel } from "@/lib/plainLanguage";
import { ALL_CHANNELS_KEY, cardMatchesChannel, channelFacets } from "@/lib/runsChannelFilter";
import type { ParkKind } from "@/lib/parkReason";
import type { WorkerReliability } from "@/lib/workerReliability";
import type { FailureClassId, TerminalState, TerminalStateSource } from "@/lib/failureClass";

export const RUN_STAGES = [
  { id: "researcher", short: "res" },
  { id: "fact_check", short: "fc" },
  { id: "gate", short: "gate" },
  { id: "script_writer", short: "scr" },
  { id: "lexicon", short: "lex" },
  { id: "visual_router", short: "vr" },
  { id: "voice_direction", short: "vo" },
  { id: "editor", short: "ed" },
  { id: "assembly", short: "asm" },
  { id: "virality", short: "vir" },
  { id: "distribution", short: "dist" },
] as const;

export type RunStage = (typeof RUN_STAGES)[number]["id"];
export type RunLifecycle = "parked" | "in_flight" | "finished";

const RUN_STAGE_IDS = new Set<string>(RUN_STAGES.map((stage) => stage.id));
const FINISHED_STATUSES = new Set(["done", "no_op", "error", "stale", "abandoned"]);

export function isRunStage(value: string | null | undefined): value is RunStage {
  return typeof value === "string" && RUN_STAGE_IDS.has(value.trim().toLowerCase());
}

export function lifecycleForRun(card: Pick<RunCardVM, "status" | "rawStatus">): RunLifecycle {
  const status = (card.rawStatus ?? card.status).trim().toLowerCase();
  if (status === "ready_for_review") return "parked";
  if (status === "queued" || status === "running") return "in_flight";
  if (FINISHED_STATUSES.has(status)) return "finished";
  // Unknown worker states remain visible as in-flight until the contract names them.
  return "in_flight";
}

export type RunCardVM = {
  id: string;
  jobId?: number;
  episodeId: string | null;
  title: string;
  channel: string | null;
  status: JobStatus;
  rawStatus?: string;
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
  attemptsByStage?: Partial<Record<RunStage, number>>;
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
  iteration?: number;
  spendSoFar?: number;
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
  archivedCards?: RunCardVM[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
  onReviewApprovals?: () => void;
  loadReliability: () => Promise<ReliabilityResult>;
  onArchiveJobs?: (jobIds: readonly number[]) => Promise<JobArchiveMutationResult>;
  onUnarchiveJobs?: (jobIds: readonly number[]) => Promise<JobArchiveMutationResult>;
};

const LIFECYCLE_TABS: Array<{ id: RunLifecycle; label: string }> = [
  { id: "parked", label: "Parked" },
  { id: "in_flight", label: "In flight" },
  { id: "finished", label: "Finished" },
];

function defaultLifecycle(cards: RunCardVM[]): RunLifecycle {
  if (cards.some((card) => lifecycleForRun(card) === "parked")) return "parked";
  if (cards.some((card) => lifecycleForRun(card) === "in_flight")) return "in_flight";
  return "finished";
}

export function RunsHub({
  cards,
  archivedCards = [],
  loading,
  error,
  onRetry,
  onBack,
  loadReliability,
  onArchiveJobs,
  onUnarchiveJobs,
}: RunsHubProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [lifecycle, setLifecycle] = useState<RunLifecycle>(() => defaultLifecycle(cards));
  const [tabChosen, setTabChosen] = useState(false);
  const [channelKey, setChannelKey] = useState<string>(ALL_CHANNELS_KEY);
  const viewCards = showArchived ? archivedCards : cards;

  const availableChannelFacets = useMemo(() => channelFacets(viewCards), [viewCards]);
  const effectiveChannelKey = availableChannelFacets.some((facet) => facet.key === channelKey)
    ? channelKey
    : ALL_CHANNELS_KEY;
  const channelFiltered = useMemo(
    () => viewCards.filter((card) => cardMatchesChannel(card, effectiveChannelKey)),
    [effectiveChannelKey, viewCards],
  );

  const counts = useMemo(
    () =>
      channelFiltered.reduce<Record<RunLifecycle, number>>(
        (current, card) => {
          current[lifecycleForRun(card)] += 1;
          return current;
        },
        { parked: 0, in_flight: 0, finished: 0 },
      ),
    [channelFiltered],
  );

  useEffect(() => {
    if (!loading && !tabChosen) setLifecycle(defaultLifecycle(channelFiltered));
  }, [channelFiltered, loading, tabChosen]);

  const lifecycleCards = useMemo(
    () => viewCards.filter((card) => lifecycleForRun(card) === lifecycle),
    [lifecycle, viewCards],
  );
  const facets = useMemo(() => channelFacets(lifecycleCards), [lifecycleCards]);
  const renderedCards = useMemo(
    () => channelFiltered.filter((card) => lifecycleForRun(card) === lifecycle),
    [channelFiltered, lifecycle],
  );
  const inFlightEpisodeIds = useMemo(
    () =>
      viewCards.flatMap((card) =>
        lifecycleForRun(card) === "in_flight" && card.episodeId ? [card.episodeId] : [],
      ),
    [viewCards],
  );
  const latestStageByEpisode = useRenderProgress(inFlightEpisodeIds);

  const showEmpty = !loading && error === null && renderedCards.length === 0;

  return (
    <section className="runs-hub scoped" aria-labelledby="runs-hub-title">
      <div className="section-header">
        <h3 id="runs-hub-title" className="text-display runs-hub__title">
          Runs
        </h3>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back to Channels
        </button>
      </div>

      <div className="runs-hub__lifecycle-tabs" role="tablist" aria-label="Run lifecycle">
        {LIFECYCLE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={lifecycle === tab.id}
            className={"runs-hub__lifecycle-tab" + (lifecycle === tab.id ? " is-active" : "")}
            onClick={() => {
              setLifecycle(tab.id);
              setTabChosen(true);
            }}
          >
            {tab.label} <span aria-hidden="true">·</span> {counts[tab.id]}
          </button>
        ))}
      </div>

      {onArchiveJobs && onUnarchiveJobs ? (
        <JobArchiveControls
          activeCount={cards.length}
          archivedCount={archivedCards.length}
          currentJobs={renderedCards.flatMap((card) =>
            card.jobId === undefined || (!showArchived && isActionableStatus(card.status))
              ? []
              : [{ id: card.jobId, status: lifecycleForRun(card) === "in_flight" ? "running" : card.status }],
          )}
          noun="run"
          showArchived={showArchived}
          onShowArchivedChange={(nextShowArchived) => {
            const nextCards = nextShowArchived ? archivedCards : cards;
            const nextChannelKey = channelFacets(nextCards).some((facet) => facet.key === channelKey)
              ? channelKey
              : ALL_CHANNELS_KEY;
            setShowArchived(nextShowArchived);
            setLifecycle(defaultLifecycle(nextCards.filter((card) => cardMatchesChannel(card, nextChannelKey))));
            setTabChosen(false);
          }}
          onArchive={onArchiveJobs}
          onUnarchive={onUnarchiveJobs}
        />
      ) : null}

      <WorkerReliabilityPanel loadReliability={loadReliability} />

      {facets.length > 2 ? (
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
          <button type="button" className="btn-secondary" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {showEmpty ? (
        <div className="glass-panel au-empty">
          <p className="text-title">
            {showArchived ? `No archived ${lifecycleLabel(lifecycle).toLowerCase()} runs` : `No ${lifecycleLabel(lifecycle).toLowerCase()} runs`}
          </p>
          <p className="dim">Choose another lifecycle tab{showArchived ? " or return to Active" : ""}.</p>
        </div>
      ) : null}

      {!loading && error === null && renderedCards.length > 0 ? (
        <div className="runs-hub__list" aria-label={`${lifecycleLabel(lifecycle)} runs`}>
          {renderedCards.map((card) => (
            <RunCard
              key={card.id}
              card={card}
              latestStage={card.episodeId ? latestStageByEpisode[card.episodeId] : undefined}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function lifecycleLabel(lifecycle: RunLifecycle): string {
  return LIFECYCLE_TABS.find((tab) => tab.id === lifecycle)?.label ?? "Runs";
}

function RunCard({
  card,
  latestStage,
}: {
  card: RunCardVM;
  latestStage?: string;
}) {
  const cardClass = [
    "glass-panel run-card",
    lifecycleForRun(card) === "parked" ? "run-card--parked" : "",
    lifecycleForRun(card) === "finished" && isFailedRun(card) ? "run-card--failed" : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={cardClass} data-run-id={card.id}>
      <div className="run-card__head">
        <div className="run-card__identity">
          <h4 className="text-title run-card__title">{card.title}</h4>
          {card.spend !== null ? <span className="cost-readout">{formatUsd(card.spend)}</span> : null}
        </div>
        <div className="run-card__meta">
          {card.channel ? <span>{card.channel}</span> : <span>Channel not recorded</span>}
          <span aria-hidden="true">·</span>
          <time dateTime={card.createdAt}>{formatCreatedAt(card.createdAt)}</time>
        </div>
      </div>

      <StepTrack card={card} latestStage={latestStage} />
      {card.episodeId ? <RenderPlayer episodeId={card.episodeId} /> : null}
    </article>
  );
}

function StepTrack({
  card,
  latestStage,
}: {
  card: RunCardVM;
  latestStage?: string;
}) {
  const labelIdPrefix = useId();

  return (
    <ol className="au-step-track" aria-label={`Progress for ${card.title}`}>
      {RUN_STAGES.map((stage) => {
        const state = stepState(card, stage.id, latestStage);
        const attemptCount = card.attemptsByStage?.[stage.id] ?? 0;
        const label = `${stageLabel(stage.id)}: ${stepStateLabel(state)}${attemptCount > 1 ? `, ${attemptCount} attempts` : ""}`;
        const labelId = `${labelIdPrefix}-${stage.id}`;
        return (
          <li
            key={stage.id}
            className={`au-step-node is-${state}`}
            aria-labelledby={labelId}
          >
            <span id={labelId} className="sr-only">{label}</span>
            <span className="au-step-node__mark" aria-hidden="true">
              {stepGlyph(state, attemptCount)}
            </span>
            <span className="au-step-node__short" aria-hidden="true">{stage.short}</span>
          </li>
        );
      })}
    </ol>
  );
}

type StepState = "passed" | "parked" | "running" | "failed" | "skipped" | "pending";

function stepState(
  card: RunCardVM,
  stage: RunStage,
  latestStage?: string,
): StepState {
  const receiptStages = new Set<RunStage>();
  for (const item of RUN_STAGES) {
    if ((card.attemptsByStage?.[item.id] ?? 0) > 0) receiptStages.add(item.id);
  }
  // The in-flight poll is also receipt-backed and can be fresher than the cost
  // receipt snapshot loaded with the card.
  if (isRunStage(latestStage)) receiptStages.add(latestStage.trim().toLowerCase() as RunStage);

  const currentIndex = RUN_STAGES.reduce(
    (furthest, item, index) => receiptStages.has(item.id) ? index : furthest,
    -1,
  );
  const stageIndex = RUN_STAGES.findIndex((item) => item.id === stage);

  if (!receiptStages.has(stage)) return stageIndex < currentIndex ? "skipped" : "pending";
  if (stageIndex < currentIndex) return "passed";
  if (stageIndex > currentIndex || currentIndex < 0) return "pending";
  if (lifecycleForRun(card) === "parked") return "parked";
  if (lifecycleForRun(card) === "in_flight") return "running";
  return isFailedRun(card) ? "failed" : "passed";
}

function stepStateLabel(state: StepState): string {
  if (state === "passed") return "passed";
  if (state === "parked") return "waiting on you";
  if (state === "running") return "running";
  if (state === "failed") return "failed";
  if (state === "skipped") return "skipped";
  return "not reached";
}

function stepGlyph(state: StepState, attemptCount: number): string {
  if (state === "passed" && attemptCount > 1) return String(attemptCount);
  if (state === "passed") return "●";
  if (state === "parked") return "◆";
  if (state === "running") return "◉";
  if (state === "failed") return "×";
  if (state === "skipped") return "—";
  return "○";
}

function isFailedRun(card: RunCardVM): boolean {
  const status = (card.rawStatus ?? card.status).trim().toLowerCase();
  return status === "error" || status === "stale" || status === "abandoned";
}

function formatCreatedAt(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Time not recorded";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatUsd(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: maxFractionDigits }).format(value);
}

function formatPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function WorkerReliabilityPanel({ loadReliability }: { loadReliability: RunsHubProps["loadReliability"] }) {
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

  useEffect(() => {
    if (open && data === null && !inFlightRef.current) void load();
  }, [data, load, open]);

  const rows = data?.rows.filter((row) => row.attempts > 0) ?? [];
  const windowLabel = windowDays ? `last ${windowDays} days` : "recent runs";
  return (
    <div className="glass-panel runs-hub__reliability">
      <button type="button" className="runs-hub__reliability-head" aria-expanded={open} aria-controls="worker-reliability-body" onClick={() => setOpen((value) => !value)}>
        <span className="text-title">{open ? "▾" : "▸"} Step reliability</span>
        {data ? <span className="dim">{data.totalAttempts} attempts · {formatUsd(data.totalRetryCost, 3)} on retries · {windowLabel}</span> : <span className="dim">retry / stop rates + wasted spend by step</span>}
      </button>
      {open ? (
        <div id="worker-reliability-body" className="runs-hub__reliability-body">
          {loading ? <p className="dim" aria-busy="true"><span className="spin" aria-hidden="true" /> Loading reliability…</p> : null}
          {error ? <div role="alert"><p>Couldn&apos;t load reliability.</p><button type="button" className="btn-secondary" onClick={() => void load()}>Retry</button></div> : null}
          {data && !loading && !error ? rows.length === 0 ? <p className="dim">No step history recorded yet.</p> : (
            <div className="runs-hub__reliability-scroll">
              <table className="reliability-table">
                <thead><tr><th scope="col">Step</th><th scope="col">Attempts</th><th scope="col">Retry</th><th scope="col">Blocked</th><th scope="col">Retry rate</th><th scope="col">Wasted $</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.stage} className={row.retry > 0 ? "reliability-row--warn" : ""}><th scope="row"><span className="reliability-stage">{stageLabel(row.stage)}</span>{row.models.length > 0 ? <span className="reliability-models dim">{row.models.join(" · ")}</span> : null}</th><td>{row.attempts}</td><td>{row.retry}</td><td>{row.blocked}</td><td>{formatPct(row.retryRate)}</td><td>{formatUsd(row.retryCost, 3)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : null}
          <p className="dim runs-hub__reliability-note">Wasted $ = spend on attempts the video system had to retry. Based on the {windowLabel}.</p>
        </div>
      ) : null}
    </div>
  );
}
