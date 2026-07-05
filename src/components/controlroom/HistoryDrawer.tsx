import React, { useRef } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import { BIBLE_FIELDS, type CharacterBibleRevision } from "@/lib/types";
import { FIELD_LABELS, formatRevisionDate, Icon } from "./shared";

function HistorySkeleton() {
  return (
    <div
      className="history-skeleton revision-list"
      aria-hidden="true"
      tabIndex={-1}
    >
      {[0, 1, 2].map((row) => (
        <div className="skeleton skeleton-card skeleton-revision-card" key={row}>
          <div className="skeleton-row">
            <span className="skeleton skeleton-text" />
            <span className="skeleton skeleton-text skeleton-badge" />
          </div>
          <div className="skeleton-revision-identity">
            <span className="skeleton skeleton-text skeleton-wide" />
            <span className="skeleton skeleton-text" />
          </div>
          <span className="skeleton skeleton-text skeleton-wide" />
          <div className="skeleton-row">
            <span className="skeleton skeleton-text skeleton-button" />
            <span className="skeleton skeleton-text skeleton-button" />
          </div>
        </div>
      ))}
    </div>
  );
}

type HistoryDrawerProps = {
  revisions: CharacterBibleRevision[];
  loading: boolean;
  error: string | null;
  previewingRevisionId: string | null;
  focusTrapActive: boolean;
  onClose: () => void;
  onRetry: () => void;
  onPreview: (revision: CharacterBibleRevision) => void;
  onRestore: (revision: CharacterBibleRevision) => void;
  onCompare: (revision: CharacterBibleRevision, trigger: HTMLButtonElement) => void;
  initialFocusRef?: React.RefObject<HTMLButtonElement | null>;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
};

function changedFields(
  revision: CharacterBibleRevision,
  previousRevision: CharacterBibleRevision | undefined,
) {
  if (!previousRevision) return "Initial baseline";
  const changed = BIBLE_FIELDS.filter(
    (field) => (revision.bible?.[field] ?? "") !== (previousRevision.bible?.[field] ?? ""),
  ).map((field) => FIELD_LABELS[field]);
  if (changed.length === 0) return "No profile text changes";
  if (changed.length <= 3) return `Changed: ${changed.join(", ")}`;
  return `+${changed.length} edits: ${changed.slice(0, 3).join(", ")}`;
}

export function HistoryDrawer({
  revisions,
  loading,
  error,
  previewingRevisionId,
  focusTrapActive,
  onClose,
  onRetry,
  onPreview,
  onRestore,
  onCompare,
  initialFocusRef,
  restoreFocusRef,
}: HistoryDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useScrollLock();

  useFocusTrap({
    active: focusTrapActive,
    containerRef: drawerRef,
    onEscape: onClose,
    initialFocusRef: initialFocusRef ?? closeButtonRef,
    restoreFocusRef,
  });

  return (
    <div className="history-layer" role="presentation">
      <button
        className="history-backdrop"
        type="button"
        aria-label="Close version history"
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        className="history-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Profile version history"
      >
        <div className="history-head">
          <button
            ref={closeButtonRef}
            className="btn ghost close-btn"
            type="button"
            onClick={onClose}
          >
            ← Back
          </button>
          <div>
            <h2>History</h2>
            <span className="count">{revisions.length} revision{revisions.length === 1 ? "" : "s"}</span>
          </div>
          <button
            className="history-x"
            type="button"
            aria-label="Close version history"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="history-body">
          {loading ? (
            <HistorySkeleton />
          ) : error ? (
            <div className="history-error">
              <h3>History unavailable</h3>
              <p>Couldn&apos;t load saved revisions: {error}</p>
              <button className="btn" type="button" onClick={onRetry}>
                Retry Connection
              </button>
            </div>
          ) : revisions.length === 0 ? (
            <div className="empty history-empty">
              <Icon name="clock" />
              <h3>No history logged</h3>
              <p>Save this character profile to create your first saved version.</p>
            </div>
          ) : (
            <div className="revision-list" aria-label="Saved profile versions">
              {revisions.map((revision, index) => {
                const isLatest = index === 0;
                const isPreviewing = revision.id === previewingRevisionId;
                const previousRevision = revisions[index + 1];
                return (
                  <div
                    key={revision.id}
                    className={"revision-card" + (isPreviewing ? " preview-on" : "")}
                  >
                    <div className="revision-card-top">
                      <span className="revision-time">{formatRevisionDate(revision.created_at)}</span>
                      <span className={"chip " + (isLatest ? "latest-badge" : "archive-badge")}>
                        {isLatest ? "Latest saved" : "Archived revision"}
                      </span>
                    </div>
                    <div className="revision-identity">
                      <span>Name: {revision.codename || "Untitled"}</span>
                      <span>Status: {revision.status === "active" ? "Active" : "Draft"}</span>
                    </div>
                    <p className="revision-diff">{changedFields(revision, previousRevision)}</p>
                    <div className="revision-actions">
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={(event) => onCompare(revision, event.currentTarget)}
                        aria-label={`Compare the current profile to the version from ${formatRevisionDate(
                          revision.created_at,
                        )}`}
                      >
                        Compare
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => onPreview(revision)}
                        aria-pressed={isPreviewing}
                      >
                        {isPreviewing ? "Previewing" : "Preview"}
                      </button>
                      <button className="btn" type="button" onClick={() => onRestore(revision)}>
                        Restore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
