import React, { useRef } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import type { QueueJob } from "./shared";

type QueueActionDialogProps = {
  job: QueueJob;
  action: "spend" | "publish" | "stale";
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
  const isSpend = action === "spend";
  const isPublish = action === "publish";
  const title = isSpend
    ? "APPROVE SPEND LIMITS"
    : isPublish
      ? "APPROVE PUBLISH"
      : "RE-RUN STRANDED JOB";
  const descriptionId = isSpend
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
        className={"restore-dialog" + (isSpend ? " spend-approval-dialog" : "")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="queue-action-title"
        aria-describedby={descriptionId}
      >
        <h2 id="queue-action-title">{title}</h2>
        {isSpend ? (
          <p id={descriptionId} className="spend-approval-copy">
            You are about to authorize extra-budgetary spend for topic:{" "}
            <span className="spend-approval-topic">&quot;{job.food}&quot;</span>. This will
            re-enqueue the job with spend_approved=true. A hard-cap check still protects
            against runaway loops. This re-runs the script live; you are approving the
            plan type, not a byte-identical render.
          </p>
        ) : isPublish ? (
          <p id={descriptionId} className="spend-approval-copy">
            You are about to approve publishing for topic:{" "}
            <span className="spend-approval-topic">&quot;{job.food}&quot;</span>. This will
            re-enqueue the job with publish_approved=true and spend_approved=true. It
            re-runs the whole pipeline live, re-renders, re-spends, and would post a
            different cut than the reviewed MP4 parked here. The exact reviewed-render
            publish path is coming; until then, with no Buffer adapter wired, this parks
            safely and posts nothing.
          </p>
        ) : (
          <p id={descriptionId} className="spend-approval-copy">
            This stranded job will be re-queued as a fresh pipeline job for topic:{" "}
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
            CANCEL
          </button>
          <button className="btn" type="button" onClick={onConfirm} disabled={submitting}>
            {submitting
              ? isSpend
                ? "TRANSMITTING APPROVAL..."
                : isPublish
                  ? "TRANSMITTING PUBLISH APPROVAL..."
                  : "TRANSMITTING RE-RUN..."
              : isSpend
                ? "AUTHORIZE & CONTINUE"
                : isPublish
                  ? "APPROVE & PUBLISH"
                  : "RE-RUN JOB"}
          </button>
        </div>
      </div>
    </div>
  );
}
