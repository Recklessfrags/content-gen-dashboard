"use client";

import { useEffect, useMemo, useState } from "react";
import {
  canArchiveJob,
  partitionArchivableJobs,
  type JobArchiveMutationResult,
  type QueueJob,
} from "@/lib/jobs";

type ArchiveMutation = (jobIds: readonly number[]) => Promise<JobArchiveMutationResult>;

export type JobArchiveControlsProps = {
  activeCount: number;
  archivedCount: number;
  currentJobs: readonly Pick<QueueJob, "id" | "status">[];
  noun: string;
  showArchived: boolean;
  onShowArchivedChange: (showArchived: boolean) => void;
  onArchive: ArchiveMutation;
  onUnarchive: ArchiveMutation;
};

type JobArchiveViewToggleProps = Pick<
  JobArchiveControlsProps,
  | "activeCount"
  | "archivedCount"
  | "noun"
  | "showArchived"
  | "onShowArchivedChange"
>;

type JobArchiveBulkControlProps = Pick<
  JobArchiveControlsProps,
  "currentJobs" | "noun" | "showArchived" | "onArchive" | "onUnarchive"
>;

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
  const affectedCount = showArchived ? currentJobs.length : archivable.length;
  const skippedStatusCopy = describeSkippedStatuses(skipped);

  useEffect(() => {
    setConfirming(false);
    setWriteError(null);
  }, [showArchived]);

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
        {!showArchived && skipped.length > 0 ? (
          <span className="dim job-archive-skip-note">
            {skipped.length} {pluralize(noun, skipped.length)} with {skippedStatusCopy} cannot be archived.
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
                {skipped.length > 0
                  ? ` ${skipped.length} ${pluralize(noun, skipped.length)} with ${skippedStatusCopy} will be skipped.`
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
  onArchive: ArchiveMutation;
  onUnarchive: ArchiveMutation;
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
        const result = showArchived ? await onUnarchive([job.id]) : await onArchive([job.id]);
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

function describeSkippedStatuses(
  jobs: readonly Pick<QueueJob, "status">[],
): string {
  const statuses = [...new Set(jobs.map((job) => job.status))];
  return `${statuses.length === 1 ? "status" : "statuses"} ${statuses
    .map((status) => `“${status}”`)
    .join(", ")}`;
}
