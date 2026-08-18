"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JobArchiveControls } from "@/components/aurora/JobArchiveControls";
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
const FACT_CLAIM_LIMIT = 8;
const RESEARCH_SOURCE_LIMIT = 6;

const indexedScalarPaths = (
  alias: string,
  path: string,
  count: number,
  fields: readonly string[],
) => Array.from(
  { length: count },
  (_, index) => fields.map((field) => `${alias}_${index}_${field}:${path}->${index}->>${field}`).join(","),
).join(",");

/**
 * Every selector projects only the fields the drawer renders. In particular, assembly
 * reads scalar audit evidence and never transfers its RenderManifest (which can be 795KB).
 */
export const STAGE_DETAIL_SELECTS: Record<RunStage, string> = {
  researcher: [
    "seq",
    "source_count:evidence->sources",
    indexedScalarPaths("source", "result->sources", RESEARCH_SOURCE_LIMIT, ["id", "type", "citation", "url"]),
  ].join(","),
  fact_check: [
    "seq",
    "gate_summary:result->gate_summary",
    indexedScalarPaths("claim", "result->claims", FACT_CLAIM_LIMIT, ["id", "claim", "status", "safe_phrasing"]),
    indexedScalarPaths("claim_source", "result->claims", FACT_CLAIM_LIMIT, ["citation", "url", "type"])
      .replaceAll("->>citation", "->source->>citation")
      .replaceAll("->>url", "->source->>url")
      .replaceAll("->>type", "->source->>type"),
  ].join(","),
  gate: "seq,allowed_claims:result->allowed_claims",
  script_writer:
    "seq,title:result->>title,hook:result->>hook,beats:result->beats,cta:result->>cta,disclosure:result->>disclosure,word_count:result->word_count,est_duration_sec:result->est_duration_sec",
  lexicon:
    "seq,title:result->>title,hook:result->>hook,beats:result->beats,cta:result->>cta,disclosure:result->>disclosure,word_count:result->word_count,est_duration_sec:result->est_duration_sec",
  visual_router:
    "seq,shots:evidence->shots,cuts:evidence->cuts,by_source:evidence->by_source,generated_used:evidence->generated_used,generation_cap:evidence->cap",
  voice_direction:
    "seq,segment_count:evidence->n_settings,energies:evidence->energies,lufs:evidence->lufs,word_count:evidence->n_words,contour:evidence->>contour",
  editor:
    "seq,cut_count:evidence->cut_count,generated_cut_count:evidence->generated_cut_count,by_source:evidence->by_source,cut_rhythm:evidence->cut_rhythm,problems:evidence->problems,duration_sec:result->duration_sec",
  assembly:
    "seq,scene_count:evidence->scenes,cut_count:evidence->visual_cuts,duration_sec:evidence->duration_sec,actual_spend:evidence->actual_spend,estimated_spend:evidence->estimated_cost_live,render_status:evidence->>render_status",
  virality: "seq,virality:evidence->virality,below_threshold:evidence->below_threshold",
  distribution:
    "seq,targets:result->targets,publish_status:result->>publish_status,notes:result->notes,eligible:evidence->eligible,dropped:evidence->dropped",
};

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
  iteration?: number;
  spendSoFar?: number;
  result?: unknown;
  evidence?: unknown;
};

export type RunDiagnosticsResult = { receipts: RunReceiptRow[]; error: string | null };
export type RunStageDetailResult = {
  payload: Record<string, unknown> | null;
  error: string | null;
};

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
  loadDiagnostics: (episodeId: string) => Promise<RunDiagnosticsResult>;
  loadStageDetail?: (
    episodeId: string,
    stage: RunStage,
    seq: number | null,
  ) => Promise<RunStageDetailResult>;
  loadReliability: () => Promise<ReliabilityResult>;
  onArchiveJobs?: (jobIds: readonly number[]) => Promise<JobArchiveMutationResult>;
  onUnarchiveJobs?: (jobIds: readonly number[]) => Promise<JobArchiveMutationResult>;
};

type DiagnosticsState = {
  loading: boolean;
  error: string | null;
  receipts: RunReceiptRow[] | null;
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
  loadDiagnostics,
  loadStageDetail,
  loadReliability,
  onArchiveJobs,
  onUnarchiveJobs,
}: RunsHubProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [lifecycle, setLifecycle] = useState<RunLifecycle>(() => defaultLifecycle(cards));
  const [tabChosen, setTabChosen] = useState(false);
  const [channelKey, setChannelKey] = useState<string>(ALL_CHANNELS_KEY);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [openStage, setOpenStage] = useState<RunStage | null>(null);

  const counts = useMemo(
    () =>
      cards.reduce<Record<RunLifecycle, number>>(
        (current, card) => {
          current[lifecycleForRun(card)] += 1;
          return current;
        },
        { parked: 0, in_flight: 0, finished: 0 },
      ),
    [cards],
  );

  useEffect(() => {
    if (!loading && !tabChosen) setLifecycle(defaultLifecycle(cards));
  }, [cards, loading, tabChosen]);

  const viewCards = showArchived ? archivedCards : cards;
  const lifecycleCards = useMemo(
    () => viewCards.filter((card) => lifecycleForRun(card) === lifecycle),
    [lifecycle, viewCards],
  );
  const facets = useMemo(() => channelFacets(lifecycleCards), [lifecycleCards]);
  const effectiveChannelKey = facets.some((facet) => facet.key === channelKey)
    ? channelKey
    : ALL_CHANNELS_KEY;
  const channelFiltered = useMemo(
    () => lifecycleCards.filter((card) => cardMatchesChannel(card, effectiveChannelKey)),
    [effectiveChannelKey, lifecycleCards],
  );
  const inFlightEpisodeIds = useMemo(
    () =>
      viewCards.flatMap((card) =>
        lifecycleForRun(card) === "in_flight" && card.episodeId ? [card.episodeId] : [],
      ),
    [viewCards],
  );
  const latestStageByEpisode = useRenderProgress(inFlightEpisodeIds);

  useEffect(() => {
    if (openRunId && !channelFiltered.some((card) => card.id === openRunId)) {
      setOpenRunId(null);
      setOpenStage(null);
    }
  }, [channelFiltered, openRunId]);

  const selectStage = useCallback((runId: string, stage: RunStage | null) => {
    if (stage !== null && openRunId === runId && openStage === stage) {
      setOpenRunId(null);
      setOpenStage(null);
      return;
    }
    setOpenRunId(stage === null ? null : runId);
    setOpenStage(stage);
  }, [openRunId, openStage]);

  const showEmpty = !loading && error === null && channelFiltered.length === 0;

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
              setOpenRunId(null);
              setOpenStage(null);
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
          currentJobs={channelFiltered.flatMap((card) =>
            card.jobId === undefined || (!showArchived && isActionableStatus(card.status))
              ? []
              : [{ id: card.jobId, status: lifecycleForRun(card) === "in_flight" ? "running" : card.status }],
          )}
          noun="run"
          showArchived={showArchived}
          onShowArchivedChange={(next) => {
            setShowArchived(next);
            setOpenRunId(null);
            setOpenStage(null);
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

      {!loading && error === null && channelFiltered.length > 0 ? (
        <div className="runs-hub__list" aria-label={`${lifecycleLabel(lifecycle)} runs`}>
          {channelFiltered.map((card) => (
            <RunCard
              key={card.id}
              card={card}
              latestStage={card.episodeId ? latestStageByEpisode[card.episodeId] : undefined}
              openStage={openRunId === card.id ? openStage : null}
              onSelectStage={(stage) => selectStage(card.id, stage)}
              loadDiagnostics={loadDiagnostics}
              loadStageDetail={loadStageDetail}
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
  openStage,
  onSelectStage,
  loadDiagnostics,
  loadStageDetail,
}: {
  card: RunCardVM;
  latestStage?: string;
  openStage: RunStage | null;
  onSelectStage: (stage: RunStage | null) => void;
  loadDiagnostics: RunsHubProps["loadDiagnostics"];
  loadStageDetail: RunsHubProps["loadStageDetail"];
}) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    loading: false,
    error: null,
    receipts: null,
  });
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, RunStageDetailResult>>({});
  const [autoSelectNote, setAutoSelectNote] = useState<string | null>(null);
  const metadataCache = useRef<RunDiagnosticsResult | null>(null);
  const metadataInFlight = useRef<Promise<RunDiagnosticsResult> | null>(null);
  const detailCacheRef = useRef<Record<string, RunStageDetailResult>>({});
  const detailInFlight = useRef(new Set<string>());

  const loadMetadata = useCallback(async () => {
    if (card.episodeId === null) return { receipts: [], error: "This run has no episode yet." };
    if (metadataCache.current) return metadataCache.current;
    if (metadataInFlight.current) return metadataInFlight.current;

    setDiagnostics({ loading: true, error: null, receipts: null });
    const request = loadDiagnostics(card.episodeId);
    metadataInFlight.current = request;
    const result = await request;
    metadataInFlight.current = null;
    metadataCache.current = result;
    setDiagnostics({ loading: false, error: result.error, receipts: result.receipts });
    return result;
  }, [card.episodeId, loadDiagnostics]);

  const stageAttempts = useMemo(
    () =>
      (diagnostics.receipts ?? [])
        .filter((receipt) => receipt.stage.trim().toLowerCase() === openStage)
        .sort((a, b) => a.seq - b.seq),
    [diagnostics.receipts, openStage],
  );

  const loadDetail = useCallback(
    async (stage: RunStage, seq: number | null) => {
      if (!loadStageDetail || card.episodeId === null) return;
      const key = detailKey(stage, seq);
      if (detailCacheRef.current[key] || detailInFlight.current.has(key)) return;
      detailInFlight.current.add(key);
      const result = await loadStageDetail(card.episodeId, stage, seq);
      detailInFlight.current.delete(key);
      detailCacheRef.current = { ...detailCacheRef.current, [key]: result };
      setDetailCache((current) => ({ ...current, [key]: result }));
    },
    [card.episodeId, loadStageDetail],
  );

  useEffect(() => {
    if (openStage === null) return;
    let cancelled = false;
    void loadMetadata().then((result) => {
      if (cancelled) return;
      const attempts = result.receipts
        .filter((receipt) => receipt.stage.trim().toLowerCase() === openStage)
        .sort((a, b) => a.seq - b.seq);
      const seq = attempts.at(-1)?.seq ?? null;
      setSelectedSeq(seq);
      void loadDetail(openStage, seq);
    });
    return () => {
      cancelled = true;
    };
  }, [loadDetail, loadMetadata, openStage]);

  const autoSelectParkedStage = async () => {
    setAutoSelectNote(null);
    if (openStage !== null) {
      onSelectStage(openStage);
      return;
    }
    const result = await loadMetadata();
    const lastNonPass = [...result.receipts]
      .sort((a, b) => a.seq - b.seq)
      .filter((receipt) => receipt.verdict.trim().toLowerCase() !== "pass")
      .at(-1);
    if (lastNonPass) {
      const exact = lastNonPass.stage.trim().toLowerCase();
      if (isRunStage(exact)) {
        onSelectStage(exact);
      } else {
        setAutoSelectNote("The stopped step is not one of the visualized stages. Choose a step to inspect.");
      }
      return;
    }

    if (result.receipts.length === 0 || result.error) {
      const fallback = parkKindFallback(card.parkKind ?? null);
      if (fallback) onSelectStage(fallback);
      else setAutoSelectNote("The stopped step was not recorded. Choose a step to inspect.");
      return;
    }
    setAutoSelectNote("No non-passing receipt was recorded. Choose a step to inspect.");
  };

  const selectedAttempt = stageAttempts.find((attempt) => attempt.seq === selectedSeq) ?? null;
  const selectedDetailKey = openStage ? detailKey(openStage, selectedSeq) : "";
  const selectedDetail = selectedDetailKey ? detailCache[selectedDetailKey] : undefined;
  const cardClass = [
    "glass-panel run-card",
    lifecycleForRun(card) === "parked" ? "run-card--parked" : "",
    lifecycleForRun(card) === "finished" && isFailedRun(card) ? "run-card--failed" : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={cardClass} data-run-id={card.id}>
      <div className="run-card__head">
        <div className="run-card__identity">
          {lifecycleForRun(card) === "parked" ? (
            <button
              type="button"
              className="run-card__park-open"
              aria-expanded={openStage !== null}
              onClick={() => void autoSelectParkedStage()}
            >
              <span className="text-title run-card__title">{card.title}</span>
              <span aria-hidden="true">{openStage ? "▾" : "▸"}</span>
              <span className="sr-only">Open stopped step</span>
            </button>
          ) : (
            <h4 className="text-title run-card__title">{card.title}</h4>
          )}
          {card.spend !== null ? <span className="cost-readout">{formatUsd(card.spend)}</span> : null}
        </div>
        <div className="run-card__meta">
          {card.channel ? <span>{card.channel}</span> : <span>Channel not recorded</span>}
          <span aria-hidden="true">·</span>
          <time dateTime={card.createdAt}>{formatCreatedAt(card.createdAt)}</time>
        </div>
      </div>

      <StepTrack
        card={card}
        latestStage={latestStage}
        receipts={diagnostics.receipts}
        openStage={openStage}
        onSelectStage={onSelectStage}
      />

      {autoSelectNote ? <p className="dim au-step-note" role="status">{autoSelectNote}</p> : null}

      {openStage ? (
        <StepDrawer
          stage={openStage}
          attempts={stageAttempts}
          allReceipts={diagnostics.receipts ?? []}
          selectedSeq={selectedSeq}
          onSelectSeq={(seq) => {
            setSelectedSeq(seq);
            void loadDetail(openStage, seq);
          }}
          selectedAttempt={selectedAttempt}
          diagnostics={diagnostics}
          detail={selectedDetail}
          onRetryMetadata={() => {
            metadataCache.current = null;
            setDiagnostics({ loading: false, error: null, receipts: null });
            queueMicrotask(() => void loadMetadata());
          }}
          onRetryDetail={() => {
            const nextCache = { ...detailCacheRef.current };
            delete nextCache[selectedDetailKey];
            detailCacheRef.current = nextCache;
            setDetailCache((current) => {
              const next = { ...current };
              delete next[selectedDetailKey];
              return next;
            });
            queueMicrotask(() => void loadDetail(openStage, selectedSeq));
          }}
        />
      ) : null}
    </article>
  );
}

function StepTrack({
  card,
  latestStage,
  receipts,
  openStage,
  onSelectStage,
}: {
  card: RunCardVM;
  latestStage?: string;
  receipts: RunReceiptRow[] | null;
  openStage: RunStage | null;
  onSelectStage: (stage: RunStage | null) => void;
}) {
  return (
    <div className="au-step-track" role="group" aria-label={`Steps for ${card.title}`}>
      {RUN_STAGES.map((stage) => {
        const attempts = (receipts ?? []).filter(
          (receipt) => receipt.stage.trim().toLowerCase() === stage.id,
        );
        const state = stepState(card, stage.id, attempts, receipts, latestStage);
        const attemptCount = attempts.length;
        const label = `${stageLabel(stage.id)}: ${stepStateLabel(state)}${attemptCount > 1 ? `, ${attemptCount} attempts` : ""}`;
        return (
          <button
            key={stage.id}
            type="button"
            className={`au-step-node is-${state}` + (openStage === stage.id ? " is-open" : "")}
            aria-label={label}
            aria-expanded={openStage === stage.id}
            onClick={() => onSelectStage(stage.id)}
          >
            <span className="au-step-node__mark" aria-hidden="true">
              {stepGlyph(state, attemptCount)}
            </span>
            <span className="au-step-node__short" aria-hidden="true">{stage.short}</span>
          </button>
        );
      })}
    </div>
  );
}

type StepState = "passed" | "parked" | "running" | "failed" | "pending";

function stepState(
  card: RunCardVM,
  stage: RunStage,
  attempts: RunReceiptRow[],
  receipts: RunReceiptRow[] | null,
  latestStage?: string,
): StepState {
  if (receipts !== null) {
    if (attempts.length === 0) return "pending";
    const last = attempts.at(-1);
    if (isSuccessfulVerdict(last?.verdict)) return "passed";
    if (lifecycleForRun(card) === "parked" && lastNonPassStage(receipts) === stage) return "parked";
    if (lifecycleForRun(card) === "in_flight" && latestStage?.trim().toLowerCase() === stage) return "running";
    return "failed";
  }

  const finalStage = isRunStage(card.finalStage) ? card.finalStage.trim().toLowerCase() as RunStage : null;
  const currentStage = isRunStage(latestStage) ? latestStage.trim().toLowerCase() as RunStage : finalStage;
  const currentIndex = currentStage ? RUN_STAGES.findIndex((item) => item.id === currentStage) : -1;
  const stageIndex = RUN_STAGES.findIndex((item) => item.id === stage);

  if (card.status === "done") return "passed";
  if (stageIndex < currentIndex) return "passed";
  if (stageIndex > currentIndex || currentIndex < 0) return "pending";
  if (lifecycleForRun(card) === "parked") return "parked";
  if (lifecycleForRun(card) === "in_flight") return "running";
  return "failed";
}

function lastNonPassStage(receipts: RunReceiptRow[]): RunStage | null {
  const last = [...receipts]
    .sort((a, b) => a.seq - b.seq)
    .filter((receipt) => receipt.verdict.trim().toLowerCase() !== "pass")
    .at(-1);
  const normalized = last?.stage.trim().toLowerCase();
  return isRunStage(normalized) ? normalized : null;
}

function stepStateLabel(state: StepState): string {
  if (state === "passed") return "passed";
  if (state === "parked") return "waiting on you";
  if (state === "running") return "running";
  if (state === "failed") return "failed";
  return "not reached";
}

function isSuccessfulVerdict(verdict: string | undefined): boolean {
  const normalized = verdict?.trim().toLowerCase();
  return normalized === "pass" || normalized === "clean_no_op" || normalized === "no_op";
}

function stepGlyph(state: StepState, attemptCount: number): string {
  if (state === "passed" && attemptCount > 1) return String(attemptCount);
  if (state === "passed") return "●";
  if (state === "parked") return "◆";
  if (state === "running") return "◉";
  if (state === "failed") return "×";
  return "○";
}

function StepDrawer({
  stage,
  attempts,
  allReceipts,
  selectedSeq,
  onSelectSeq,
  selectedAttempt,
  diagnostics,
  detail,
  onRetryMetadata,
  onRetryDetail,
}: {
  stage: RunStage;
  attempts: RunReceiptRow[];
  allReceipts: RunReceiptRow[];
  selectedSeq: number | null;
  onSelectSeq: (seq: number) => void;
  selectedAttempt: RunReceiptRow | null;
  diagnostics: DiagnosticsState;
  detail: RunStageDetailResult | undefined;
  onRetryMetadata: () => void;
  onRetryDetail: () => void;
}) {
  const attemptNumber = attempts.findIndex((attempt) => attempt.seq === selectedSeq) + 1;
  const attemptSpend = selectedAttempt ? incrementalSpend(allReceipts, selectedAttempt.seq) : null;

  return (
    <section className="au-step-drawer" aria-label={`${stageLabel(stage)} details`}>
      <div className="au-step-drawer__head">
        <div>
          <p className="text-title">{stageLabel(stage)}</p>
          {selectedAttempt ? (
            <p className="au-receipt-meta text-mono">
              {verdictLabel(selectedAttempt.verdict)}
              {attemptSpend !== null ? ` · ${formatUsd(attemptSpend, 3)} this attempt` : ""}
              {selectedAttempt.provider || selectedAttempt.model
                ? ` · ${[selectedAttempt.provider, selectedAttempt.model].filter(Boolean).join(" / ")}`
                : ""}
            </p>
          ) : null}
        </div>
        {attempts.length > 1 ? (
          <label className="au-attempt-select">
            Attempt
            <select
              value={selectedSeq ?? ""}
              onChange={(event) => onSelectSeq(Number(event.target.value))}
            >
              {attempts.map((attempt, index) => (
                <option key={attempt.seq} value={attempt.seq}>
                  {index + 1} of {attempts.length} · {verdictLabel(attempt.verdict)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {diagnostics.loading ? <p className="dim" aria-busy="true"><span className="spin" aria-hidden="true" /> Loading step history…</p> : null}
      {diagnostics.error ? (
        <div role="alert" className="au-step-error">
          <p>Couldn&apos;t load step history.</p>
          <button type="button" className="btn-secondary" onClick={onRetryMetadata}>Retry</button>
        </div>
      ) : null}
      {!diagnostics.loading && !diagnostics.error && attempts.length === 0 ? (
        <p className="dim">No receipt was recorded for this step.</p>
      ) : null}
      {selectedAttempt?.reason ? <p className="au-step-reason">{selectedAttempt.reason}</p> : null}
      {selectedAttempt && detail === undefined ? <p className="dim" aria-busy="true"><span className="spin" aria-hidden="true" /> Loading attempt {attemptNumber || 1}…</p> : null}
      {detail?.error ? (
        <div role="alert" className="au-step-error">
          <p>Couldn&apos;t load this attempt.</p>
          <button type="button" className="btn-secondary" onClick={onRetryDetail}>Retry</button>
        </div>
      ) : null}
      {detail?.payload ? <StageView stage={stage} payload={detail.payload} /> : null}
    </section>
  );
}

function StageView({ stage, payload }: { stage: RunStage; payload: Record<string, unknown> }) {
  if (stage === "script_writer" || stage === "lexicon") return <ScriptView payload={payload} />;
  if (stage === "fact_check") return <FactCheckView payload={payload} />;
  if (stage === "researcher") return <ResearcherView payload={payload} />;
  if (stage === "gate") return <GateView payload={payload} />;
  if (stage === "distribution") return <DistributionView payload={payload} />;
  if (stage === "virality") return <ViralityView payload={payload} />;
  return <SummaryView stage={stage} payload={payload} />;
}

function ScriptView({ payload }: { payload: Record<string, unknown> }) {
  const beats = recordArray(payload.beats);
  return (
    <div className="au-script-view">
      {text(payload.title) ? <h5>{text(payload.title)}</h5> : null}
      {text(payload.hook) ? <p className="au-script-view__hook"><strong>Hook</strong> {text(payload.hook)}</p> : null}
      {beats.map((beat, index) => (
        <div className="au-script-beat" key={`${text(beat.label) || "beat"}-${index}`}>
          <p className="text-mono">{text(beat.label) || `Beat ${index + 1}`}{text(beat.timecode) ? ` · ${text(beat.timecode)}` : ""}</p>
          {text(beat.voiceover) ? <p>{text(beat.voiceover)}</p> : null}
          {text(beat.on_screen) ? <p className="dim">On screen: {text(beat.on_screen)}</p> : null}
        </div>
      ))}
      {text(payload.cta) ? <p><strong>CTA</strong> {text(payload.cta)}</p> : null}
      {beats.length === 0 && !text(payload.hook) && !text(payload.cta) ? <UnavailableSummary /> : null}
    </div>
  );
}

function FactCheckView({ payload }: { payload: Record<string, unknown> }) {
  const claims = Array.from({ length: FACT_CLAIM_LIMIT }, (_, index) => ({
    id: payload[`claim_${index}_id`],
    claim: payload[`claim_${index}_claim`],
    status: payload[`claim_${index}_status`],
    safe_phrasing: payload[`claim_${index}_safe_phrasing`],
    source: {
      citation: payload[`claim_source_${index}_citation`],
      url: payload[`claim_source_${index}_url`],
      type: payload[`claim_source_${index}_type`],
    },
  })).filter((claim) => text(claim.id) || text(claim.claim));
  const summary = record(payload.gate_summary);
  const total = summary
    ? [summary.green, summary.yellow, summary.red].reduce<number>((sum, value) => sum + number(value), 0)
    : claims.length;
  return (
    <div className="au-claim-ledger">
      {claims.map((claim, index) => {
        const source = claim.source;
        const status = text(claim.status).toLowerCase();
        return (
          <article className="au-claim" key={text(claim.id) || index}>
            <div className="au-claim__head">
              <span className={`status-chip au-claim__status is-${claimStatus(status)}`}>{status || "unknown"}</span>
              {text(claim.id) ? <span className="text-mono">{text(claim.id)}</span> : null}
            </div>
            <p>{text(claim.claim) || "Claim text not recorded."}</p>
            {source ? <SourceLine source={source} /> : null}
            {text(claim.safe_phrasing) ? <p className="dim">Safe phrasing: {text(claim.safe_phrasing)}</p> : null}
          </article>
        );
      })}
      {claims.length === 0 ? <UnavailableSummary /> : null}
      {total > claims.length ? <p className="dim">Showing {claims.length} of {total} claims to keep this view lightweight.</p> : null}
    </div>
  );
}

function ResearcherView({ payload }: { payload: Record<string, unknown> }) {
  const sources = Array.from({ length: RESEARCH_SOURCE_LIMIT }, (_, index) => ({
    id: payload[`source_${index}_id`],
    type: payload[`source_${index}_type`],
    citation: payload[`source_${index}_citation`],
    url: payload[`source_${index}_url`],
  })).filter((source) => text(source.id) || text(source.citation) || text(source.url));
  const total = number(payload.source_count);
  return (
    <div className="au-source-list">
      {sources.map((source, index) => <SourceLine key={text(source.id) || index} source={source} />)}
      {sources.length === 0 ? <UnavailableSummary /> : null}
      {total > sources.length ? <p className="dim">Showing {sources.length} of {total} sources to keep this view lightweight.</p> : null}
    </div>
  );
}

function SourceLine({ source }: { source: Record<string, unknown> }) {
  const url = safeHttpUrl(text(source.url));
  const label = text(source.citation) || text(source.title) || text(source.id) || "Source";
  return (
    <p className="au-source-row">
      {url ? <a href={url} target="_blank" rel="noreferrer">{label}</a> : <span>{label}</span>}
      {text(source.type) ? <span className="text-mono">{text(source.type)}</span> : null}
    </p>
  );
}

function GateView({ payload }: { payload: Record<string, unknown> }) {
  const claims = recordArray(payload.allowed_claims);
  return claims.length > 0 ? (
    <ul className="au-allowed-claims">
      {claims.map((claim, index) => <li key={text(claim.id) || index}>{text(claim.text) || "Allowed claim"}</li>)}
    </ul>
  ) : <UnavailableSummary />;
}

function DistributionView({ payload }: { payload: Record<string, unknown> }) {
  const targets = recordArray(payload.targets);
  return targets.length > 0 ? (
    <div className="au-platform-list">
      {targets.map((target, index) => (
        <article className="au-platform-row" key={text(target.platform) || index}>
          <div><strong>{text(target.label) || text(target.platform) || "Platform"}</strong><span className="text-mono">{text(target.publish_status)}</span></div>
          {stringArray(target.issues).length > 0 ? <ul>{stringArray(target.issues).map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="dim">No format issues.</p>}
        </article>
      ))}
    </div>
  ) : <UnavailableSummary />;
}

function ViralityView({ payload }: { payload: Record<string, unknown> }) {
  const score = record(payload.virality);
  return score ? (
    <div className="au-virality-score">
      <strong>{typeof score.score === "number" ? Math.round(score.score) : "—"}</strong>
      <span className="dim">{text(score.status) || "Score not recorded"}</span>
    </div>
  ) : <UnavailableSummary />;
}

function SummaryView({ stage, payload }: { stage: RunStage; payload: Record<string, unknown> }) {
  const rows: Array<[string, unknown]> = stage === "visual_router"
    ? [["Shots", payload.shots], ["Cuts", payload.cuts], ["Sources", payload.by_source], ["Paid generations", `${number(payload.generated_used)} / ${number(payload.generation_cap)}`]]
    : stage === "voice_direction"
      ? [["Segments", payload.segment_count], ["Energy", payload.energies], ["LUFS", payload.lufs], ["Words", payload.word_count]]
      : stage === "editor"
        ? [["Cuts", payload.cut_count], ["Duration", seconds(payload.duration_sec)], ["Source mix", payload.by_source], ["Retry reasons", payload.problems]]
        : [["Scenes", payload.scene_count], ["Cuts", payload.cut_count], ["Duration", seconds(payload.duration_sec)], ["Spend", money(payload.actual_spend ?? payload.estimated_spend)]];
  return (
    <dl className="au-stage-summary">
      {rows.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{displayValue(value)}</dd></div>
      ))}
      {stage === "visual_router" ? <p className="dim au-stage-summary__note">Per-beat detail is not transferred because the receipt has no compact server-side summary.</p> : null}
    </dl>
  );
}

function UnavailableSummary() {
  return <p className="dim">A compact summary is not available for this attempt.</p>;
}

function parkKindFallback(kind: ParkKind | null): RunStage | null {
  if (kind === "fact") return "fact_check";
  if (kind === "spend") return "assembly";
  if (kind === "publish") return "distribution";
  return null;
}

function isFailedRun(card: RunCardVM): boolean {
  const status = (card.rawStatus ?? card.status).trim().toLowerCase();
  return status === "error" || status === "stale" || status === "abandoned";
}

function detailKey(stage: RunStage, seq: number | null): string {
  return `${stage}:${seq ?? "latest"}`;
}

function incrementalSpend(receipts: RunReceiptRow[], seq: number): number | null {
  const ordered = [...receipts].sort((a, b) => a.seq - b.seq);
  const index = ordered.findIndex((receipt) => receipt.seq === seq);
  const current = index >= 0 ? ordered[index].spendSoFar : undefined;
  if (typeof current !== "number") return null;
  const previous = index > 0 ? ordered[index - 1].spendSoFar : 0;
  return Math.max(0, current - (typeof previous === "number" ? previous : 0));
}

function verdictLabel(verdict: string): string {
  const normalized = verdict.trim().toLowerCase();
  if (normalized === "pass") return "Pass";
  if (normalized === "retry") return "Retry";
  if (normalized === "blocked") return "Blocked";
  if (normalized === "approval_required") return "Needs approval";
  if (normalized === "exhausted") return "Budget exhausted";
  if (normalized === "clean_no_op" || normalized === "no_op") return "No work needed";
  return verdict.trim() || "Not recorded";
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => record(item) !== null) : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function displayValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Not recorded";
  const valueRecord = record(value);
  return valueRecord
    ? Object.entries(valueRecord).map(([key, item]) => `${key}: ${String(item)}`).join(" · ") || "Not recorded"
    : "Not recorded";
}

function seconds(value: unknown): string {
  return typeof value === "number" ? `${Math.round(value)}s` : "Not recorded";
}

function money(value: unknown): string {
  return typeof value === "number" ? formatUsd(value) : "Not recorded";
}

function claimStatus(status: string): "green" | "yellow" | "red" | "unknown" {
  return status === "green" || status === "yellow" || status === "red" ? status : "unknown";
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
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
