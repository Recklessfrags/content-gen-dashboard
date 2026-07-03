"use client";

import { useEffect, useRef } from "react";
import type { QueueJob } from "../controlroom/shared";

type QueueAction = "fact" | "spend" | "publish" | "stale";

type ActionCenterPark = {
  kind: "fact" | "spend" | "publish" | "unknown";
  loading: boolean;
  stage: string | null;
  error: string | null;
};

type ActionCenterProps = {
  jobs: QueueJob[];
  parkById: Record<QueueJob["id"], ActionCenterPark>;
  pending: { job: QueueJob; action: QueueAction } | null;
  submitting: boolean;
  onRequest: (job: QueueJob, action: QueueAction, trigger: HTMLButtonElement) => void;
  onConfirm: () => void;
  onCancel: () => void;
  canPublish: (job: QueueJob) => boolean;
  onBack: () => void;
  statusLabel: (job: QueueJob) => string;
};

export function ActionCenter({
  jobs,
  parkById,
  pending,
  submitting,
  onRequest,
  onConfirm,
  onCancel,
  canPublish,
  onBack,
  statusLabel,
}: ActionCenterProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previousPendingRef = useRef<typeof pending>(pending);

  useEffect(() => {
    if (previousPendingRef.current && !pending) {
      triggerRef.current?.focus();
    }
    previousPendingRef.current = pending;
  }, [pending]);

  const handleRequest: ActionCenterProps["onRequest"] = (job, action, trigger) => {
    triggerRef.current = trigger;
    onRequest(job, action, trigger);
  };

  return (
    <section aria-labelledby="action-center-title">
      <div className="action-header">
        <div>
          <p className="text-mono dim" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            // ACTION CENTER
          </p>
          <h1 id="action-center-title" className="text-display" style={{ fontSize: "2.5rem" }}>
            {jobs.length > 0 ? (
              <>
                <span className="au-pulse-dot" />
                {jobs.length} Approvals Awaiting
              </>
            ) : (
              "All clear"
            )}
          </h1>
        </div>
        <button type="button" className="action-button" onClick={onBack}>
          Back to Channels
        </button>
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
                  {hasSpend ? (
                    <div className="cost-readout">Spend: {formatUsd(job.spend ?? 0)}</div>
                  ) : null}
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
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
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
  onRequest: ActionCenterProps["onRequest"];
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
}: {
  job: QueueJob;
  action: QueueAction;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
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
            You are about to approve regulated-YELLOW claims for topic:{" "}
            <span className="spend-approval-topic">&quot;{job.food}&quot;</span>. This will
            re-enqueue a fresh row with fact_approved=true. The parked row stays as the audit
            record.
          </p>
          {job.spend_approved ? (
            <p className="restore-warning">
              ⚠ this job is already spend-approved - approving facts starts a run that will NOT
              park again before spending.
            </p>
          ) : (
            <p>The run may still park later at the spend gate.</p>
          )}
        </div>
      ) : isSpend ? (
        <p className="au-inline-confirm-copy">
          You are about to authorize extra-budgetary spend for topic:{" "}
          <span className="spend-approval-topic">&quot;{job.food}&quot;</span>. This will
          re-enqueue the job with spend_approved=true. A hard-cap check still protects against
          runaway loops. This re-runs the script live; you are approving the plan type, not a
          byte-identical render.
        </p>
      ) : isPublish ? (
        <p className="au-inline-confirm-copy">
          You are about to approve publishing for topic:{" "}
          <span className="spend-approval-topic">&quot;{job.food}&quot;</span>. This will resume
          distribution from the exact reviewed render with no re-render and no double-spend.
          Publishing is still double-gated: with no Buffer token wired, nothing posts.
        </p>
      ) : (
        <p className="au-inline-confirm-copy">
          This stranded job will be re-queued as a fresh pipeline job for topic:{" "}
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
    return "stranded - needs attention";
  }

  if (park?.loading) {
    return "Classifying parked gate...";
  }

  if (park?.kind === "fact") {
    return "Regulated-YELLOW claims awaiting sign-off";
  }

  if (park?.kind === "spend") {
    return `Parked to prevent runaway credit usage${park.stage ? ` - ${park.stage}` : ""}`;
  }

  if (park?.kind === "publish") {
    return "Distribution awaiting approval - posts the exact reviewed render, no re-render/double-spend; no Buffer wired so nothing posts";
  }

  return `The review gate could not be classified from the job or latest receipt. Spend approval is only correct for a spend park; check the run drill-down first if this might be a fact or publish park.${
    park?.error ? ` Receipt read failed: ${park.error}` : ""
  }`;
}

function confirmLabel(action: QueueAction, submitting: boolean) {
  if (submitting) {
    return action === "fact"
      ? "Transmitting fact approval..."
      : action === "spend"
        ? "Transmitting approval..."
        : action === "publish"
          ? "Transmitting publish approval..."
          : "Transmitting re-run...";
  }

  return action === "fact"
    ? "Approve facts"
    : action === "spend"
      ? "Authorize & continue"
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
