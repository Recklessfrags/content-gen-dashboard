"use client";

import { useEffect, useMemo, useState } from "react";
import {
  canArchiveJob,
  partitionArchivableJobs,
  type JobArchiveOptions,
  type JobArchiveMutationResult,
  type QueueJob,
} from "@/lib/jobs";

type DeliberateArchiveMutation = (
  jobIds: readonly number[],
  options?: JobArchiveOptions,
) => Promise<JobArchiveMutationResult>;

type BareArchiveMutation = (
  jobIds: readonly number[],
) => Promise<JobArchiveMutationResult>;

export type JobArchiveControlsProps = {
  activeCount: number;
  archivedCount: number;
  currentJobs: readonly Pick<QueueJob, "id" | "status">[];
  noun: string;
  showArchived: boolean;
  onShowArchivedChange: (showArchived: boolean) => void;
  onArchive: BareArchiveMutation;
  onUnarchive: BareArchiveMutation;
};

type JobArchiveViewToggleProps = Pick<
  JobArchiveControlsProps,
  | "activeCount"
  | "archivedCount"
  | "noun"
  | "showArchived"
  | "onShowArchivedChange"
>;

type JobArchiveBulkControlProps = {
  currentJobs: readonly Pick<QueueJob, "id" | "status">[];
  noun: string;
  showArchived: boolean;
  onArchive: BareArchiveMutation;
  onUnarchive: BareArchiveMutation;
};

export function JobArchiveControls({
  activeCount,
  archivedCount,
  currentJobs,
  noun,
  showArchived,
  onShowArchivedChange,
  onArchive,
  onUnarchive,
}: JobArchiveControlsProps) {
  return (
    <div className="job-archive-tools">
      <JobArchiveViewToggle
        activeCount={activeCount}
        archivedCount={archivedCount}
        noun={noun}
        showArchived={showArchived}
        onShowArchivedChange={onShowArchivedChange}
      />
      <JobArchiveBulkControl
        currentJobs={currentJobs}
        noun={noun}
        showArchived={showArchived}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
      />
    </div>
  );
}

export function JobArchiveViewToggle({
  activeCount,
  archivedCount,
  noun,
  showArchived,
  onShowArchivedChange,
}: JobArchiveViewToggleProps) {
  return (
    <div className="job-archive-view-toggle" role="group" aria-label={`${noun} view`}>
      <button
        type="button"
        className={"btn ghost compact" + (!showArchived ? " is-active" : "")}
        aria-pressed={!showArchived}
        onClick={() => onShowArchivedChange(false)}
      >
        Active ({activeCount})
      </button>
      <button
        type="button"
        className={"btn ghost compact" + (showArchived ? " is-active" : "")}
        aria-pressed={showArchived}
        onClick={() => onShowArchivedChange(true)}
      >
        Archived ({archivedCount})
      </button>
    </div>
  );
}

export function JobArchiveBulkControl({
  currentJobs,
  noun,
  showArchived,
  onArchive,
  onUnarchive,
}: JobArchiveBulkControlProps) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const { archivable, skipped } = useMemo(
    () => partitionArchivableJobs(currentJobs),
    [currentJobs],
  );
  const heldOut = skipped.filter((job) => canArchiveJob(job));
  const refused = skipped.filter((job) => !canArchiveJob(job));
  const affectedCount = showArchived ? currentJobs.length : archivable.length;
  const targetIdentity = useMemo(
    () => (showArchived ? currentJobs : archivable)
      .map((job) => job.id)
      .sort((left, right) => left - right)
      .join(","),
    [archivable, currentJobs, showArchived],
  );
  useEffect(() => {
    setConfirming(false);
    setWriteError(null);
  }, [showArchived, targetIdentity]);

  const runBulkAction = async () => {
    if (submitting || affectedCount === 0) return;
    setSubmitting(true);
    setWriteError(null);
    const result = showArchived
      ? await onUnarchive(currentJobs.map((job) => job.id))
      : await onArchive(archivable.map((job) => job.id));
    setSubmitting(false);
    if (!result.ok) {
      setWriteError(result.error ?? `Could not ${showArchived ? "unarchive" : "archive"} ${noun}.`);
      return;
    }
    setConfirming(false);
  };

  return (
    <div className="job-archive-bulk-section">
      <div className="job-archive-bulk">
        <button
          type="button"
          className="btn ghost compact"
          disabled={affectedCount === 0 || submitting}
          onClick={() => {
            setWriteError(null);
            setConfirming(true);
          }}
        >
          {showArchived ? "Unarchive" : "Archive"} {affectedCount} {pluralize(noun, affectedCount)}
        </button>
        {!showArchived && heldOut.length > 0 ? (
          <span className="dim job-archive-skip-note">
            {heldOut.length} {pluralize(noun, heldOut.length)} {heldOut.length === 1 ? "is" : "are"} held out of bulk archive — {describeSkippedStatuses(heldOut)}. Archive {heldOut.length === 1 ? "it from the row" : "them from their rows"} if you mean to dismiss {heldOut.length === 1 ? "it" : "them"}.
          </span>
        ) : null}
        {!showArchived && refused.length > 0 ? (
          <span className="dim job-archive-skip-note">
            {archiveRefusalCopy(refused.length, noun)}
          </span>
        ) : null}
      </div>

      {confirming ? (
        <div className="job-archive-confirm" role="group" aria-label={`Confirm ${showArchived ? "unarchive" : "archive"}`}>
          <p>
            {showArchived ? (
              <>Bring {affectedCount} {pluralize(noun, affectedCount)} back to the active view?</>
            ) : (
              <>
                Hide {affectedCount} {pluralize(noun, affectedCount)}? Archiving does not approve,
                reject, cancel, or resolve them. You can bring them back from Archived.
                {heldOut.length > 0
                  ? ` ${heldOut.length} ${pluralize(noun, heldOut.length)} with ${describeSkippedStatuses(heldOut)} will be held out of bulk archive; use ${heldOut.length === 1 ? "its row Archive action" : "their row Archive actions"} to dismiss ${heldOut.length === 1 ? "it" : "them"}.`
                  : ""}
                {refused.length > 0
                  ? ` ${archiveRefusalCopy(refused.length, noun)}`
                  : ""}
              </>
            )}
          </p>
          <div className="job-archive-confirm-actions">
            <button
              type="button"
              className="btn ghost compact"
              disabled={submitting}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn compact"
              disabled={submitting}
              onClick={() => void runBulkAction()}
            >
              {submitting
                ? showArchived ? "Unarchiving…" : "Archiving…"
                : `${showArchived ? "Unarchive" : "Archive"} ${affectedCount}`}
            </button>
          </div>
        </div>
      ) : null}

      {writeError ? <p className="job-archive-error" role="alert">{writeError}</p> : null}
    </div>
  );
}

export function JobArchiveRowButton({
  job,
  showArchived,
  onArchive,
  onUnarchive,
}: {
  job: Pick<QueueJob, "id" | "status">;
  showArchived: boolean;
  onArchive: DeliberateArchiveMutation;
  onUnarchive: BareArchiveMutation;
}) {
  const [submitting, setSubmitting] = useState(false);

  if (!showArchived && !canArchiveJob(job)) return null;

  const label = showArchived ? "Unarchive" : "Archive";
  return (
    <button
      type="button"
      className="btn ghost compact job-archive-row-action"
      disabled={submitting}
      onClick={async () => {
        if (submitting || (!showArchived && !canArchiveJob(job))) return;
        setSubmitting(true);
        const result = showArchived
          ? await onUnarchive([job.id])
          : await onArchive([job.id], { allowDeliberateDismissal: true });
        if (!result.ok) setSubmitting(false);
      }}
    >
      {submitting ? `${label}…` : label}
    </button>
  );
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}

function archiveRefusalCopy(count: number, noun: string): string {
  return `${count} ${pluralize(noun, count)} ${count === 1 ? "is" : "are"} still queued or running and cannot be archived yet.`;
}

function describeSkippedStatuses(
  jobs: readonly Pick<QueueJob, "status">[],
): string {
  const statuses = [...new Set(jobs.map((job) => job.status))];
  return `${statuses.length === 1 ? "status" : "statuses"} ${statuses
    .map((status) => status.trim().toLowerCase() === "ready_for_review"
      ? "“ready for review — approval pending”"
      : `“${status}”`)
    .join(", ")}`;
}
