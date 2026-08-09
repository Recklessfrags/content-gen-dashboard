"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractBelowFloorCuts, parkExplanation } from "@/lib/parkExplanation";
import { plainLanguage, stageLabel } from "@/lib/plainLanguage";
import type { FactClaim } from "@/lib/factClaims";
import { FactClaimsReviewSection } from "../controlroom/QueueActionDialog";
import type { QueueJob } from "../controlroom/shared";
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
};

export function ActionCenter({
  jobs,
  erroredJobs = [],
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
}: ActionCenterProps) {
  const Heading = headingLevel === 2 ? "h2" : "h1";
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previousPendingRef = useRef<typeof pending>(pending);

  useEffect(() => {
    if (previousPendingRef.current && !pending) {
      triggerRef.current?.focus();
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
          <Heading id="action-center-title" className="text-display" style={{ fontSize: "2.5rem" }}>
            {jobs.length > 0 ? (
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

      {jobs.length === 0 ? (
        <div className="glass-panel au-empty">All clear - no approvals awaiting.</div>
      ) : (
        <div className="glass-panel" role="list" aria-label="Approvals awaiting action">
          {jobs.map((job) => {
            const park = parkById[job.id];
            const pendingForRow = pending?.job.id === job.id ? pending : null;
            const publishAllowed = canPublish(job);
            const isStale = job.status?.trim().toLowerCase() === "stale";
            const hasSpend = typeof job.spend === "number" && job.spend > 0;

            return (
              <article className="approval-row" role="listitem" key={job.id}>
                <div className="approval-context">
                  <strong className="text-title">{job.channel ?? job.food}</strong>
                  <div className="au-action-meta">
                    {job.channel ? <span className="status-chip">{job.channel}</span> : null}
                    <span>{statusLabel(job)}</span>
                    <span>{formatCreatedAt(job.created_at)}</span>
                  </div>
                  <p className="dim">{parkLine(job, park)}</p>
                  <ParkContext job={job} park={park} loadDiagnostics={loadDiagnostics} />
                  {hasSpend ? (
                    <div className="cost-readout">Spend: {formatUsd(job.spend ?? 0)}</div>
                  ) : null}
                  {job.episode_id ? <RenderPlayer episodeId={job.episode_id} /> : null}
                </div>

                <div className="approval-actions">
                  <PrimaryAction
                    job={job}
                    park={park}
                    isStale={isStale}
                    publishAllowed={publishAllowed}
                    onRequest={handleRequest}
                  />
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
              </article>
            );
          })}
        </div>
      )}

      {erroredJobs.length > 0 ? (
        <section className="au-error-jobs" aria-labelledby="errored-jobs-title">
          <h2 id="errored-jobs-title" className="text-title">Errored / stuck</h2>
          <div className="glass-panel" role="list" aria-label="Errored or stuck jobs">
            {erroredJobs.map((job) => {
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
