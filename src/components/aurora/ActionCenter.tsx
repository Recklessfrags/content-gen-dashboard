"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractBelowFloorCuts, parkExplanation } from "@/lib/parkExplanation";
import { plainLanguage, stageLabel } from "@/lib/plainLanguage";
import type { FactClaim } from "@/lib/factClaims";
import type { JobArchiveMutationResult } from "@/lib/jobs";
import { FactClaimsReviewSection } from "../controlroom/QueueActionDialog";
import type { QueueJob } from "../controlroom/shared";
import { JobArchiveControls, JobArchiveRowButton } from "./JobArchiveControls";
import { RenderPlayer } from "./RenderPlayer";
import type { RunDiagnosticsResult } from "./RunsHub";

type QueueAction = "fact" | "spend" | "publish" | "stale";
type TriggeredActionRequest = (job: QueueJob, action: QueueAction, trigger: HTMLButtonElement) => void;

type ActionCenterPark = {
  kind: "fact" | "spend" | "publish" | "reveal" | "unknown";
  loading: boolean;
  stage: string | null;
  error: string | null;
};

export type ActionCenterProps = {
  jobs: QueueJob[];
  erroredJobs?: QueueJob[];
  archivedJobs?: QueueJob[];
  archivedErroredJobs?: QueueJob[];
  parkById: Record<QueueJob["id"], ActionCenterPark>;
  loadDiagnostics?: (episodeId: string) => Promise<RunDiagnosticsResult>;
  pending: { job: QueueJob; action: QueueAction } | null;
  submitting: boolean;
  onRequest: (job: QueueJob, action: QueueAction) => void;
  onConfirm: () => void;
  onCancel: () => void;
  canPublish: (job: QueueJob) => boolean;
  onBack?: () => void;
  headingLevel?: 1 | 2;
  statusLabel: (job: QueueJob) => string;
  factClaims?: FactClaim[] | null;
  factClaimsLoading?: boolean;
  factClaimsError?: string | null;
  onArchiveJobs?: (jobIds: readonly number[]) => Promise<JobArchiveMutationResult>;
  onUnarchiveJobs?: (jobIds: readonly number[]) => Promise<JobArchiveMutationResult>;
};

export function ActionCenter({
  jobs,
  erroredJobs = [],
  archivedJobs = [],
  archivedErroredJobs = [],
  parkById,
  loadDiagnostics,
  pending,
  submitting,
  onRequest,
  onConfirm,
  onCancel,
  canPublish,
  onBack,
  headingLevel = 1,
  statusLabel,
  factClaims,
  factClaimsLoading = false,
  factClaimsError = null,
  onArchiveJobs,
  onUnarchiveJobs,
}: ActionCenterProps) {
  const Heading = headingLevel === 2 ? "h2" : "h1";
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const previousPendingRef = useRef<typeof pending>(pending);
  // One row open at a time: with a three-figure backlog, an accordion that lets every
  // row stay open just rebuilds the wall of text this screen was redesigned to remove.
  const [expandedId, setExpandedId] = useState<QueueJob["id"] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const viewJobs = showArchived ? archivedJobs : jobs;
  const viewErroredJobs = showArchived ? archivedErroredJobs : erroredJobs;
  const activeCount = jobs.length + erroredJobs.length;
  const archivedCount = archivedJobs.length + archivedErroredJobs.length;

  useEffect(() => {
    if (previousPendingRef.current && !pending) {
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
      else headingRef.current?.focus();
    }
    previousPendingRef.current = pending;
  }, [pending]);

  const handleRequest: TriggeredActionRequest = (job, action, trigger) => {
    triggerRef.current = trigger;
    onRequest(job, action);
  };

  return (
    <section aria-labelledby="action-center-title">
      <div className="action-header">
        <div>
          <p className="text-mono dim" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            // ACTION CENTER
          </p>
          <Heading
            ref={headingRef}
            id="action-center-title"
            className="text-display"
            style={{ fontSize: "2.5rem" }}
            tabIndex={-1}
          >
            {showArchived ? (
              `${archivedCount} Archived`
            ) : jobs.length > 0 ? (
              <>
                <span className="au-pulse-dot" />
                {jobs.length} Approvals Awaiting
              </>
            ) : (
              "All clear"
            )}
          </Heading>
        </div>
        {onBack ? (
          <div className="approval-actions">
            <button type="button" className="action-button" onClick={onBack}>
              Back to Channels
            </button>
          </div>
        ) : null}
      </div>

      {onArchiveJobs && onUnarchiveJobs ? (
        <JobArchiveControls
          activeCount={activeCount}
          archivedCount={archivedCount}
          currentJobs={[...viewJobs, ...viewErroredJobs]}
          noun="item"
          showArchived={showArchived}
          onShowArchivedChange={(next) => {
            setExpandedId(null);
            setShowArchived(next);
          }}
          onArchive={onArchiveJobs}
          onUnarchive={onUnarchiveJobs}
        />
      ) : null}

      {viewJobs.length === 0 ? (
        <div className="glass-panel au-empty">
          {showArchived ? "No archived approvals." : "All clear - no approvals awaiting."}
        </div>
      ) : (
        groupApprovals(viewJobs, parkById).map((group) => (
          <section
            className="au-approval-group"
            key={group.key}
            aria-labelledby={`approval-group-${group.key}`}
          >
            <div className="au-approval-group-head">
              <p
                id={`approval-group-${group.key}`}
                className="text-mono dim au-approval-group-title"
              >
                // {group.title} ({group.jobs.length})
              </p>
              {group.total !== null ? (
                <span className="cost-readout">{formatUsd(group.total)} held</span>
              ) : group.key === "fact" ? (
                <span className="dim au-approval-free">No cost to approve</span>
              ) : null}
            </div>

            <div className="glass-panel" role="list" aria-label={group.title}>
              {group.jobs.map((job) => {
                const park = parkById[job.id];
                const pendingForRow = pending?.job.id === job.id ? pending : null;
                const publishAllowed = canPublish(job);
                const isStale = job.status?.trim().toLowerCase() === "stale";
                const hasSpend = typeof job.spend === "number" && job.spend > 0;
                const isOpen = expandedId === job.id || pendingForRow !== null;
                const bodyId = `approval-body-${job.id}`;

                return (
                  <article className="au-approval" role="listitem" key={job.id}>
                    <button
                      type="button"
                      className="au-approval-summary"
                      aria-expanded={isOpen}
                      aria-controls={bodyId}
                      onClick={() => setExpandedId(isOpen ? null : job.id)}
                    >
                      <span className="au-approval-ident">
                        <span className="text-title au-approval-topic">
                          {job.food ?? job.channel ?? `Run ${job.id}`}
                        </span>
                        <span className="dim au-approval-sub">
                          {[job.channel, shortWhen(job.created_at)]
                            .filter(Boolean)
                            .join(" \u00b7 ")}
                        </span>
                      </span>
                      <span className="au-approval-value">
                        {hasSpend ? (
                          <span className="cost-readout">{formatUsd(job.spend ?? 0)}</span>
                        ) : (
                          <span className="dim">&mdash;</span>
                        )}
                        <span className="au-approval-caret" aria-hidden="true">
                          {isOpen ? "\u25be" : "\u25b8"}
                        </span>
                      </span>
                    </button>

                    <div id={bodyId} hidden={!isOpen} className="au-approval-body">
                      <div className="au-action-meta">
                        <span>{statusLabel(job)}</span>
                        <span>{formatCreatedAt(job.created_at)}</span>
                      </div>
                      <p className="dim">{parkLine(job, park)}</p>
                      <ParkContext job={job} park={park} loadDiagnostics={loadDiagnostics} />
                      {job.episode_id && groupShowsRender(group.key) ? (
                        <RenderPlayer episodeId={job.episode_id} />
                      ) : null}

                      <div className="approval-actions">
                        {!showArchived ? (
                          <PrimaryAction
                            job={job}
                            park={park}
                            isStale={isStale}
                            publishAllowed={publishAllowed}
                            onRequest={handleRequest}
                          />
                        ) : null}
                        {onArchiveJobs && onUnarchiveJobs ? (
                          <JobArchiveRowButton
                            job={job}
                            showArchived={showArchived}
                            onArchive={onArchiveJobs}
                            onUnarchive={onUnarchiveJobs}
                          />
                        ) : null}
                      </div>

                      {pendingForRow ? (
                        <InlineConfirm
                          job={pendingForRow.job}
                          action={pendingForRow.action}
                          submitting={submitting}
                          onCancel={onCancel}
                          onConfirm={onConfirm}
                          factClaims={factClaims}
                          factClaimsLoading={factClaimsLoading}
                          factClaimsError={factClaimsError}
                        />
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      {viewErroredJobs.length > 0 ? (
        <section className="au-error-jobs" aria-labelledby="errored-jobs-title">
          <h2 id="errored-jobs-title" className="text-title">Errored / stuck</h2>
          <div className="glass-panel" role="list" aria-label="Errored or stuck jobs">
            {viewErroredJobs.map((job) => {
              const park = parkById[job.id];
              return (
                <article className="approval-row" role="listitem" key={job.id}>
                  <div className="approval-context">
                    <strong className="text-title">{job.channel ?? job.food}</strong>
                    <div className="au-action-meta">
                      {job.channel ? <span className="status-chip">{job.channel}</span> : null}
                      <span>{statusLabel(job)}</span><span>{formatCreatedAt(job.created_at)}</span>
                    </div>
                    <p className="dim">{parkLine(job, park)}</p>
                    <ParkContext job={job} park={park} loadDiagnostics={loadDiagnostics} />
                    {job.episode_id ? <RenderPlayer episodeId={job.episode_id} /> : null}
                    {onArchiveJobs && onUnarchiveJobs ? (
                      <div className="approval-actions">
                        <JobArchiveRowButton
                          job={job}
                          showArchived={showArchived}
                          onArchive={onArchiveJobs}
                          onUnarchive={onUnarchiveJobs}
                        />
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function ParkContext({ job, park, loadDiagnostics }: {
  job: QueueJob;
  park: ActionCenterPark | undefined;
  loadDiagnostics: ActionCenterProps["loadDiagnostics"];
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ loading: boolean; error: string | null; receipts: RunDiagnosticsResult["receipts"] | null }>({ loading: false, error: null, receipts: null });
  const inFlightRef = useRef(false);
  const bodyId = `action-diagnostics-${job.id}`;
  const explanation = parkExplanation(park?.kind, job.status, job.park_kind);

  const load = useCallback(async () => {
    if (!job.episode_id || !loadDiagnostics || inFlightRef.current) return;
    inFlightRef.current = true;
    setState({ loading: true, error: null, receipts: null });
    const result = await loadDiagnostics(job.episode_id);
    inFlightRef.current = false;
    setState({ loading: false, error: result.error, receipts: result.receipts });
  }, [job.episode_id, loadDiagnostics]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && state.receipts === null && !inFlightRef.current) void load();
  };
  const latest = state.receipts?.at(-1);
  const cuts = latest ? extractBelowFloorCuts({ result: latest.result, evidence: latest.evidence }) : [];

  return (
    <div className="au-park-context">
      <div className="au-park-summary">
        <span className="status-chip">{parkChip(job, park)}</span>
        {explanation ? <p>{explanation}</p> : null}
      </div>
      <button type="button" className="au-park-disclosure" aria-expanded={open} aria-controls={bodyId} onClick={toggle} disabled={!job.episode_id || !loadDiagnostics}>
        {plainLanguage("receipts")} {open ? "▾" : "▸"}
      </button>
      {open ? <div id={bodyId} className="au-park-log">
        {state.loading ? <p className="dim" aria-busy="true"><span className="spin" aria-hidden="true" /> Loading run log…</p> : null}
        {state.error ? <p role="alert">Couldn&apos;t load the run log.</p> : null}
        {latest && !state.loading && !state.error ? <>
          <div className="au-park-receipt-head"><strong>{stageLabel(latest.stage)}</strong><span className="status-chip">{plainLanguage("verdict")}: {latest.verdict || "—"}</span></div>
          {latest.reason ? <p>{latest.reason}</p> : null}
          {cuts.length ? <div className="au-below-floor"><strong>{plainLanguage("below_floor")}: {cuts.length}</strong><ul>{cuts.map((cut) => <li key={cut.cut}><span>{cut.cut}</span>{cut.reason ? ` — ${cut.reason}` : ""}</li>)}</ul></div> : null}
        </> : null}
      </div> : null}
    </div>
  );
}

// --- triage -----------------------------------------------------------------
//
// The operator drives this on a phone, and the backlog runs into three figures. Sorted
// only by time, 107 near-identical rows are unreadable: the decision TYPE is what
// changes what he has to think about (money vs. a free fact call), so that is what the
// screen is grouped by. Money first, because it is the only group with a cost, and the
// ones we could not classify last, because they are the only ones he must open before
// acting — the copy in `parkLine` is explicit that approving spend is only right for a
// spend hold.

type ApprovalGroupKey = "spend" | "fact" | "publish" | "reveal" | "unknown";

const APPROVAL_GROUPS: Array<{ key: ApprovalGroupKey; title: string }> = [
  { key: "spend", title: "SPEND APPROVALS" },
  { key: "fact", title: "FACT CALLS" },
  { key: "publish", title: "PUBLISH" },
  { key: "reveal", title: "REVEAL SIGN-OFF" },
  { key: "unknown", title: "NEEDS A LOOK" },
];

function groupApprovals(
  jobs: QueueJob[],
  parkById: Record<QueueJob["id"], ActionCenterPark>,
): Array<{ key: ApprovalGroupKey; title: string; jobs: QueueJob[]; total: number | null }> {
  const buckets = new Map<ApprovalGroupKey, QueueJob[]>();
  for (const job of jobs) {
    const park = parkById[job.id];
    // A row still being classified is not "unknown" — it just has not resolved yet.
    // Bucketing it with the genuinely-unclassifiable ones would tell the operator to
    // go investigate something that is about to answer for itself.
    const key: ApprovalGroupKey = park?.loading
      ? "unknown"
      : ((park?.kind ?? "unknown") as ApprovalGroupKey);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(job);
    else buckets.set(key, [job]);
  }

  return APPROVAL_GROUPS.filter((group) => (buckets.get(group.key)?.length ?? 0) > 0).map(
    (group) => {
      const groupJobs = buckets.get(group.key) ?? [];
      return {
        ...group,
        jobs: groupJobs,
        // Only the money group carries a total, and it is what has ALREADY been spent
        // on these runs — not a forecast of what approving them will cost.
        total:
          group.key === "spend"
            ? groupJobs.reduce(
                (sum, job) => sum + (typeof job.spend === "number" ? job.spend : 0),
                0,
              )
            : null,
      };
    },
  );
}

/** A render only exists once a run has got far enough to make one. Mounting the player
 *  on a spend or fact hold just renders "No render available for this episode." */
function groupShowsRender(key: ApprovalGroupKey): boolean {
  return key === "publish" || key === "reveal";
}

/** Collapsed rows need a time, not just a topic: the same topic legitimately appears
 *  many times over (re-runs of one episode), so the topic alone does not identify a row. */
function shortWhen(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parkChip(job: QueueJob, park: ActionCenterPark | undefined): string {
  if (job.park_kind === "blocked") return "Blocked";
  if (job.park_kind === "exhausted") return "Retries exhausted";
  if (park?.kind === "fact") return "Fact call";
  if (park?.kind === "spend") return "Spend approval";
  if (park?.kind === "publish") return "Publish approval";
  if (park?.kind === "reveal") return "Reveal sign-off";
  return job.status?.trim().toLowerCase() === "error" ? "Error" : plainLanguage("parked");
}

function PrimaryAction({
  job,
  park,
  isStale,
  publishAllowed,
  onRequest,
}: {
  job: QueueJob;
  park: ActionCenterPark | undefined;
  isStale: boolean;
  publishAllowed: boolean;
  onRequest: TriggeredActionRequest;
}) {
  if (isStale) {
    return (
      <button
        className="btn ghost compact"
        type="button"
        onClick={(event) => onRequest(job, "stale", event.currentTarget)}
      >
        Re-run Job
      </button>
    );
  }

  if (park?.loading) {
    return (
      <button className="btn compact" type="button" disabled>
        Classifying...
      </button>
    );
  }

  if (park?.kind === "fact") {
    return (
      <button
        className="btn compact"
        type="button"
        onClick={(event) => onRequest(job, "fact", event.currentTarget)}
      >
        Approve facts &amp; continue
      </button>
    );
  }

  if (park?.kind === "publish") {
    const noteId = `publish-disabled-${job.id}`;

    return (
      <div className="au-action-stack">
        <button
          className="btn compact"
          type="button"
          onClick={(event) => onRequest(job, "publish", event.currentTarget)}
          disabled={!publishAllowed}
          aria-describedby={publishAllowed ? undefined : noteId}
        >
          Approve &amp; publish
        </button>
        {!publishAllowed ? (
          <small id={noteId} className="dim">
            No source episode yet.
          </small>
        ) : null}
      </div>
    );
  }

  if (park?.kind === "reveal") {
    return null;
  }

  return (
    <button
      className="btn compact"
      type="button"
      onClick={(event) => onRequest(job, "spend", event.currentTarget)}
    >
      Approve spend &amp; continue
    </button>
  );
}

function InlineConfirm({
  job,
  action,
  submitting,
  onCancel,
  onConfirm,
  factClaims,
  factClaimsLoading = false,
  factClaimsError = null,
}: {
  job: QueueJob;
  action: QueueAction;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  factClaims?: FactClaim[] | null;
  factClaimsLoading?: boolean;
  factClaimsError?: string | null;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isFact = action === "fact";
  const isSpend = action === "spend";
  const isPublish = action === "publish";

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className="au-inline-confirm"
      role="group"
      aria-live="polite"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !submitting) {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      {isFact ? (
        <div className="au-inline-confirm-copy">
          <p>
            Approve the flagged claims for{" "}
            <span className="spend-approval-topic">&quot;{job.food}&quot;</span>. This starts a
            fresh run marked fact-approved; the paused version is kept as an audit record.
          </p>
          {job.spend_approved ? (
            <p className="restore-warning">
              Heads up: spend is already approved, so approving facts starts a paid run without
              pausing again.
            </p>
          ) : (
            <p>The run may still pause later for spend approval.</p>
          )}
          <FactClaimsReviewSection
            claims={factClaims}
            loading={factClaimsLoading}
            error={factClaimsError}
          />
        </div>
      ) : isSpend ? (
        <p className="au-inline-confirm-copy">
          Approve extra spend for{" "}
          <span className="spend-approval-topic">&quot;{job.food}&quot;</span>. This re-runs the
          script live and will incur cost — you&apos;re approving the plan, not a saved render. A
          spending cap still applies.
        </p>
      ) : isPublish ? (
        <p className="au-inline-confirm-copy">
          Publish{" "}
          <span className="spend-approval-topic">&quot;{job.food}&quot;</span> from the exact
          render you reviewed — no re-render and no extra cost. Publishing isn&apos;t connected
          yet, so nothing will actually post.
        </p>
      ) : (
        <p className="au-inline-confirm-copy">
          Re-queue this stalled job as a fresh run for{" "}
          <span className="spend-approval-topic">&quot;{job.food}&quot;</span>.
        </p>
      )}
      <div className="au-inline-confirm-actions">
        <button
          ref={cancelRef}
          className="btn ghost compact"
          type="button"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          className="btn compact"
          type="button"
          onClick={() => {
            onConfirm();
          }}
          disabled={submitting}
        >
          {confirmLabel(action, submitting)}
        </button>
      </div>
    </div>
  );
}

function parkLine(job: QueueJob, park: ActionCenterPark | undefined) {
  if (job.status?.trim().toLowerCase() === "stale") {
    return "This run stalled and needs a re-run";
  }

  if (park?.loading) {
    return "Checking why this run paused…";
  }

  if (park?.kind === "fact") {
    return "Flagged claims need your sign-off";
  }

  if (park?.kind === "spend") {
    return `Waiting to avoid unexpected cost${park.stage ? ` — ${stageLabel(park.stage)}` : ""}`;
  }

  if (park?.kind === "publish") {
    return "Waiting to publish — posts the exact reviewed render (no re-render, no extra cost); publishing isn't connected yet, so nothing posts";
  }

  if (park?.kind === "reveal") {
    return "Reveal synthesis needs your decision before assembly";
  }

  return `We couldn't tell which approval this run needs. Open the run to check before approving — approving spend is only right for a spend hold.${
    park?.error ? " (Couldn't read the run details.)" : ""
  }`;
}

function confirmLabel(action: QueueAction, submitting: boolean) {
  if (submitting) {
    return action === "fact"
      ? "Approving…"
      : action === "spend"
        ? "Approving spend…"
        : action === "publish"
          ? "Publishing…"
          : "Re-running…";
  }

  return action === "fact"
    ? "Approve facts"
    : action === "spend"
      ? "Approve spend"
      : action === "publish"
        ? "Approve & publish"
        : "Re-run job";
}

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Created: unknown";

  return `Created: ${date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
