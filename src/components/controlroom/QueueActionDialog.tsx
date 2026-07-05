import React, { useRef } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import type { QueueJob } from "./shared";

type QueueActionDialogProps = {
  job: QueueJob;
  action: "fact" | "spend" | "publish" | "stale";
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  restoreFocusRef: React.RefObject<HTMLElement | null>;
};

export function QueueActionDialog({
  job,
  action,
  submitting,
  onCancel,
  onConfirm,
  restoreFocusRef,
}: QueueActionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const isFact = action === "fact";
  const isSpend = action === "spend";
  const isPublish = action === "publish";
  const title = isFact
    ? "Approve flagged claims"
    : isSpend
      ? "Approve extra spend"
      : isPublish
        ? "Publish this run"
        : "Re-run stalled job";
  const descriptionId = isFact
    ? "fact-approval-desc"
    : isSpend
      ? "spend-approval-desc"
      : isPublish
        ? "publish-approval-desc"
        : "stale-rerun-desc";

  useScrollLock();

  useFocusTrap({
    active: true,
    containerRef: dialogRef,
    onEscape: () => {
      if (!submitting) onCancel();
    },
    initialFocusRef: cancelButtonRef,
    restoreFocusRef,
  });

  return (
    <div className="restore-layer" role="presentation">
      <div
        ref={dialogRef}
        className={"restore-dialog" + (isFact || isSpend ? " spend-approval-dialog" : "")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="queue-action-title"
        aria-describedby={descriptionId}
      >
        <h2 id="queue-action-title">{title}</h2>
        {isFact ? (
          <div id={descriptionId} className="queue-action-desc">
            <p className="spend-approval-copy">
              Approve the flagged claims for{" "}
              <span className="spend-approval-topic">&quot;{job.food}&quot;</span>. This starts a
              fresh run marked fact-approved; the paused version is kept as an audit record.
            </p>
            {job.spend_approved ? (
              <p className="restore-warning">
                Heads up: spend is already approved, so approving facts starts a paid run
                without pausing again.
              </p>
            ) : (
              <p className="spend-approval-copy">
                The run may still pause later for spend approval.
              </p>
            )}
          </div>
        ) : isSpend ? (
          <p id={descriptionId} className="spend-approval-copy">
            Approve extra spend for{" "}
            <span className="spend-approval-topic">&quot;{job.food}&quot;</span>. This re-runs
            the script live and will incur cost — you&apos;re approving the plan, not a saved
            render. A spending cap still applies.
          </p>
        ) : isPublish ? (
          <p id={descriptionId} className="spend-approval-copy">
            Publish{" "}
            <span className="spend-approval-topic">&quot;{job.food}&quot;</span> from the exact
            render you reviewed — no re-render and no extra cost. Publishing isn&apos;t connected
            yet, so nothing will actually post.
          </p>
        ) : (
          <p id={descriptionId} className="spend-approval-copy">
            Re-queue this stalled job as a fresh run for{" "}
            <span className="spend-approval-topic">&quot;{job.food}&quot;</span>.
          </p>
        )}
        <div className="restore-actions">
          <button
            className="btn ghost"
            type="button"
            onClick={onCancel}
            disabled={submitting}
            ref={cancelButtonRef}
          >
            Cancel
          </button>
          <button className="btn" type="button" onClick={onConfirm} disabled={submitting}>
            {submitting
              ? isFact
                ? "Approving…"
                : isSpend
                ? "Approving spend…"
                : isPublish
                  ? "Publishing…"
                  : "Re-running…"
              : isFact
                ? "Approve facts"
                : isSpend
                ? "Approve spend"
                : isPublish
                  ? "Approve & publish"
                  : "Re-run job"}
          </button>
        </div>
      </div>
    </div>
  );
}
