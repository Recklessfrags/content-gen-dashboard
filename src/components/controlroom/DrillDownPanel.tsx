import React, { useRef } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import type { Episode, Receipt } from "@/lib/types";

type DrillDownProps = {
  episode: Episode;
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
};

function hasJson(value: unknown) {
  return value !== null && value !== undefined;
}

function receiptVerdictClass(verdict: string | null) {
  const normalized = (verdict || "").toLowerCase();
  if (["pass", "cleared", "approved", "success"].includes(normalized)) return "pass";
  if (["warning", "pass_with_warning"].includes(normalized)) return "warning";
  if (["fail", "rejected", "error", "failed"].includes(normalized)) return "fail";
  return "none";
}

function RunDetailSkeleton() {
  return (
    <div
      className="timeline skeleton-timeline"
      aria-hidden="true"
      tabIndex={-1}
    >
      {[0, 1, 2].map((row) => (
        <div className="timeline-item" key={row}>
          <div className="timeline-node none skeleton-node" />
          <div className="receipt-card none skeleton-receipt-card">
            <div className="receipt-card-header">
              <span className="skeleton skeleton-text skeleton-wide" />
              <span className="skeleton skeleton-text skeleton-badge" />
            </div>
            <div className="receipt-meta-row">
              <span className="skeleton skeleton-text skeleton-button" />
              <span className="skeleton skeleton-text skeleton-button" />
            </div>
            <span className="skeleton skeleton-bar" />
            <span className="skeleton skeleton-text skeleton-wide" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DrillDownPanel({
  episode,
  receipts,
  loading,
  error,
  onClose,
  onRetry,
  restoreFocusRef,
}: DrillDownProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useScrollLock();

  useFocusTrap({
    active: true,
    containerRef: panelRef,
    onEscape: onClose,
    initialFocusRef: closeButtonRef,
    restoreFocusRef,
  });

  return (
    <div
      ref={panelRef}
      className="drilldown-panel"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail for run ${episode.food}`}
    >
      <div className="col-head">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            ref={closeButtonRef}
            className="btn ghost close-btn"
            onClick={onClose}
            aria-label="Close run detail"
          >
            ← Back
          </button>
          <h2>Run Detail</h2>
        </div>
        <span className="count">ID: {episode.episode_id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="detail-cap">
        <div className="topic-title">{episode.food}</div>
        <div className="detail-meta">
          <span className="rmeta stat">{episode.status}</span>
          {episode.final_stage && <span className="rmeta">stage · {episode.final_stage}</span>}
          {typeof episode.spend === "number" && episode.spend > 0 && (
            <span className="rmeta spend-total">Total Spend: ${episode.spend.toFixed(2)}</span>
          )}
          <span className="rmeta">{new Date(episode.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="drilldown-content">
        {loading ? (
          <RunDetailSkeleton />
        ) : error ? (
          <div className="empty">
            <h3>Comms Down</h3>
            <p>Couldn&apos;t reach the pipeline receipts database: {error}</p>
            <button className="btn" onClick={onRetry} style={{ marginTop: "12px" }}>
              Retry Connection
            </button>
          </div>
        ) : receipts.length === 0 ? (
          <div className="empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l4 4 10-10" />
            </svg>
            <h3>No receipts logged</h3>
            <p>This episode finished without producing step-by-step pipeline receipts.</p>
          </div>
        ) : (
          <div className="timeline">
            {receipts.map((receipt) => {
              const resolvedClass = receiptVerdictClass(receipt.verdict);
              return (
                <div key={receipt.id} className="timeline-item">
                  <div className={`timeline-node ${resolvedClass}`} aria-hidden="true" />
                  <div className={`receipt-card ${resolvedClass}`}>
                    <div className="receipt-card-header">
                      <div className="receipt-stage-title">
                        {receipt.stage || "unknown-stage"}
                        <span className="receipt-seq">seq · {receipt.seq}</span>
                      </div>
                      <span className="receipt-timestamp">
                        {receipt.ts
                          ? new Date(receipt.ts).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "no timestamp"}
                      </span>
                    </div>

                    <div className="receipt-meta-row">
                      <span className="rmeta model-badge">
                        {receipt.provider || "unknown"} · {receipt.model || "no-model"}
                      </span>
                      {receipt.effort_requested && (
                        <span className="rmeta effort-badge">
                          Effort: {receipt.effort_used || "0"}/{receipt.effort_requested}
                          {receipt.clamped && <span className="clamped-text"> (clamped)</span>}
                        </span>
                      )}
                      {typeof receipt.spend_so_far === "number" && (
                        <span className="rmeta spend-so-far-badge">
                          Accumulated Spend: ${receipt.spend_so_far.toFixed(3)}
                        </span>
                      )}
                    </div>

                    <div className="receipt-verdict-banner">
                      <span className={`receipt-verdict-label ${resolvedClass}`}>
                        {receipt.verdict || "UNKNOWN"}
                      </span>
                      <p className="receipt-reason-text">
                        {receipt.reason || "No written justification logged."}
                      </p>
                    </div>

                    <div className="receipt-json-disclosures">
                      {hasJson(receipt.evidence) && (
                        <details className="receipt-json-details">
                          <summary
                            className="receipt-json-summary"
                            aria-label="Toggle raw evidence JSON"
                          >
                            Evidence JSON
                          </summary>
                          <pre className="receipt-json-content">
                            <code>{JSON.stringify(receipt.evidence, null, 2)}</code>
                          </pre>
                        </details>
                      )}

                      {hasJson(receipt.result) && (
                        <details className="receipt-json-details">
                          <summary
                            className="receipt-json-summary"
                            aria-label="Toggle raw result JSON"
                          >
                            Result JSON
                          </summary>
                          <pre className="receipt-json-content">
                            <code>{JSON.stringify(receipt.result, null, 2)}</code>
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
