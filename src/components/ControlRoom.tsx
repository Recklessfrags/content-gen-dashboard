"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BIBLE_FIELDS,
  CHANNELS,
  STATUS_CYCLE,
  STATUS_LABEL,
  type Bible,
  type Character,
  type CharacterBibleRevision,
  type CharacterStatus,
  type Episode,
  type Idea,
  type IdeaStatus,
  type Receipt,
} from "@/lib/types";

// A flattened, editable view of a character: scalar columns + bible keys hoisted
// to the top level so the editor can address every section as `c[field]`.
type FlatChar = {
  id: string;
  codename: string;
  concept: string;
  status: CharacterStatus;
  created_at: string;
} & { [K in (typeof BIBLE_FIELDS)[number]]: string };

function flatten(row: Character): FlatChar {
  const bible = row.bible || {};
  const flat: Record<string, string> & Pick<FlatChar, "status"> = {
    id: row.id,
    codename: row.codename ?? "",
    concept: row.concept ?? "",
    status: row.status ?? "draft",
    created_at: row.created_at,
  };
  for (const f of BIBLE_FIELDS) flat[f] = bible[f] ?? "";
  return flat as FlatChar;
}

function toBible(c: FlatChar): Bible {
  const bible: Bible = {};
  for (const f of BIBLE_FIELDS) bible[f] = c[f] ?? "";
  return bible;
}

function flattenRevision(row: CharacterBibleRevision, characterId: string): FlatChar {
  const bible = row.bible || {};
  const flat: Record<string, string> & Pick<FlatChar, "status"> = {
    id: characterId,
    codename: row.codename ?? "",
    concept: row.concept ?? "",
    status: row.status === "active" ? "active" : "draft",
    created_at: row.created_at,
  };
  for (const f of BIBLE_FIELDS) flat[f] = bible[f] ?? "";
  return flat as FlatChar;
}

const FIELD_LABELS: Record<(typeof BIBLE_FIELDS)[number], string> = {
  voice: "Voice & identity",
  cadence: "Cadence",
  vocab: "Vocabulary",
  offlimits: "Off-limits",
  lines: "Gold-standard lines",
  beats: "Beat template",
  runtime: "Runtime target",
};

function formatRevisionDate(createdAt: string) {
  return new Date(createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not(:disabled), summary, [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

function Icon({ name }: { name: string }) {
  const p =
    {
      roster: "M4 20v-2a4 4 0 014-4h0M16 14a4 4 0 014 4v2M12 4a4 4 0 100 8 4 4 0 000-8z",
      wire: "M4 6h16M4 12h16M4 18h10",
      runs: "M5 12l4 4 10-10",
      exit: "M14 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2M9 12h12m0 0l-3-3m3 3l-3 3",
      clock: "M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    }[name] || "";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={p} />
    </svg>
  );
}

// Module-level so editing a textarea does not remount the input (focus-safe).
function Field({
  label,
  hint,
  value,
  onChange,
  rows = 3,
  mono,
  readOnly = false,
  locked = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
  readOnly?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="field">
      <label>
        <span className="eyebrow">{label}</span>
        <span className="field-label-side">
          {locked && <span className="badge lock-badge">LOCKED - PREVIEW</span>}
          {hint && <span className="hint">{hint}</span>}
        </span>
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        aria-readonly={readOnly}
        style={mono ? { fontFamily: "var(--mono)", fontSize: "12.5px" } : undefined}
      />
    </div>
  );
}

type DrillDownProps = {
  episode: Episode;
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
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

function DrillDownPanel({
  episode,
  receipts,
  loading,
  error,
  onClose,
  onRetry,
}: DrillDownProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = getFocusable(panel);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!panel.contains(activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
          <div className="loading">
            <span className="spin" /> Loading run receipts…
          </div>
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

type HistoryDrawerProps = {
  revisions: CharacterBibleRevision[];
  loading: boolean;
  error: string | null;
  previewingRevisionId: string | null;
  onClose: () => void;
  onRetry: () => void;
  onPreview: (revision: CharacterBibleRevision) => void;
  onRestore: (revision: CharacterBibleRevision) => void;
};

function changedFields(
  revision: CharacterBibleRevision,
  previousRevision: CharacterBibleRevision | undefined,
) {
  if (!previousRevision) return "Initial baseline";
  const changed = BIBLE_FIELDS.filter(
    (field) => (revision.bible?.[field] ?? "") !== (previousRevision.bible?.[field] ?? ""),
  ).map((field) => FIELD_LABELS[field]);
  if (changed.length === 0) return "No bible text changes";
  if (changed.length <= 3) return `Changed: ${changed.join(", ")}`;
  return `+${changed.length} edits: ${changed.slice(0, 3).join(", ")}`;
}

function HistoryDrawer({
  revisions,
  loading,
  error,
  previewingRevisionId,
  onClose,
  onRetry,
  onPreview,
  onRestore,
}: HistoryDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = getFocusable(drawer);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!drawer.contains(activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
        aria-label="Bible version history"
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
            <div className="loading history-loading">
              <span className="spin" /> Loading version history…
            </div>
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
              <p>Save this character dossier to create your first permanent manual revision snapshot.</p>
            </div>
          ) : (
            <div className="revision-list" aria-label="Saved bible revisions">
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
                      <span>Codename: {revision.codename || "Untitled"}</span>
                      <span>Status: {revision.status === "active" ? "Active" : "Draft"}</span>
                    </div>
                    <p className="revision-diff">{changedFields(revision, previousRevision)}</p>
                    <div className="revision-actions">
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

type RestoreDialogProps = {
  revision: CharacterBibleRevision;
  onCancel: () => void;
  onConfirm: () => void;
};

function RestoreDialog({ revision, onCancel, onConfirm }: RestoreDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusable(dialog);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!dialog.contains(activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="restore-layer" role="presentation">
      <div
        ref={dialogRef}
        className="restore-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="restore-title"
        aria-describedby="restore-desc"
      >
        <h2 id="restore-title">Confirm Restore</h2>
        <p id="restore-desc">
          Are you sure you want to restore the revision from {formatRevisionDate(revision.created_at)}?
          This will replace all current unsaved edits in your editor. You must click Save dossier to
          write this restored version back to your live manual.
        </p>
        <div className="restore-actions">
          <button className="btn restore-confirm" type="button" onClick={onConfirm}>
            Yes, Restore Draft
          </button>
          <button ref={cancelButtonRef} className="btn ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ControlRoom({ userEmail }: { userEmail: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chars, setChars] = useState<FlatChar[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<CharacterBibleRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [previewingRevisionId, setPreviewingRevisionId] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<CharacterBibleRevision | null>(null);
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);
  const [view, setView] = useState<"roster" | "wire" | "runs">("roster");
  const [draftIdea, setDraftIdea] = useState("");
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastRunTriggerRef = useRef<string | null>(null);
  const receiptRequestRef = useRef(0);
  const headerHistoryButtonRef = useRef<HTMLButtonElement>(null);
  const savebarHistoryButtonRef = useRef<HTMLButtonElement>(null);
  const lastHistoryTriggerRef = useRef<"header" | "savebar" | null>(null);
  const revisionRequestRef = useRef(0);
  const showFlash = (msg: string, err = false) => {
    setFlash({ msg, err });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  };

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, i, e] = await Promise.all([
        supabase.from("characters").select("*").order("created_at", { ascending: true }),
        supabase.from("ideas").select("*").order("created_at", { ascending: false }),
        supabase.from("episodes").select("*").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const firstErr = c.error || i.error || e.error;
      if (firstErr) {
        setLoadError(firstErr.message);
        setLoading(false);
        return;
      }
      const flat = (c.data as Character[]).map(flatten);
      setChars(flat);
      setIdeas((i.data as Idea[]) ?? []);
      setEpisodes((e.data as Episode[]) ?? []);
      setActiveId(flat[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const active = chars.find((c) => c.id === activeId) ?? null;
  const previewingRevision =
    revisions.find((revision) => revision.id === previewingRevisionId) ?? null;
  const displayedActive =
    active && previewingRevision ? flattenRevision(previewingRevision, active.id) : active;
  const activeEpisode = episodes.find((e) => e.episode_id === activeEpisodeId) ?? null;

  const set = (field: keyof FlatChar, val: string) =>
    setChars((cs) =>
      cs.map((c) => (c.id === activeId ? { ...c, [field]: val } : c)),
    );

  useEffect(() => {
    setHistoryOpen(false);
    setRevisions([]);
    setRevisionsError(null);
    setPreviewingRevisionId(null);
    setPendingRestore(null);
    setIsRestoredDraft(false);
  }, [activeId]);

  const restoreHistoryFocus = useCallback(() => {
    const trigger = lastHistoryTriggerRef.current;
    window.requestAnimationFrame(() => {
      if (trigger === "header") headerHistoryButtonRef.current?.focus();
      if (trigger === "savebar") savebarHistoryButtonRef.current?.focus();
    });
  }, []);

  const fetchRevisions = useCallback(
    async (characterId: string) => {
      const requestId = revisionRequestRef.current + 1;
      revisionRequestRef.current = requestId;
      setRevisionsLoading(true);
      setRevisionsError(null);
      const { data, error } = await supabase
        .from("character_bible_revisions")
        .select("*")
        .eq("character_id", characterId)
        .order("created_at", { ascending: false })
        .returns<CharacterBibleRevision[]>();
      if (revisionRequestRef.current !== requestId) return;
      setRevisionsLoading(false);
      if (error) {
        setRevisions([]);
        setRevisionsError(error.message);
        return;
      }
      setRevisions(data ?? []);
    },
    [supabase],
  );

  const openHistory = (trigger: "header" | "savebar") => {
    if (!active) return;
    lastHistoryTriggerRef.current = trigger;
    setHistoryOpen(true);
    void fetchRevisions(active.id);
  };

  const closeHistory = useCallback(() => {
    revisionRequestRef.current += 1;
    setHistoryOpen(false);
    setRevisionsLoading(false);
    setRevisionsError(null);
    restoreHistoryFocus();
  }, [restoreHistoryFocus]);

  const exitPreview = useCallback(() => {
    setPreviewingRevisionId(null);
  }, []);

  const previewRevision = (revision: CharacterBibleRevision) => {
    setPreviewingRevisionId(revision.id);
  };

  const requestRestore = (revision: CharacterBibleRevision) => {
    setPendingRestore(revision);
  };

  const confirmRestore = () => {
    if (!active || !pendingRestore) return;
    const restored = flattenRevision(pendingRestore, active.id);
    setChars((cs) => cs.map((c) => (c.id === active.id ? restored : c)));
    setPendingRestore(null);
    setPreviewingRevisionId(null);
    setHistoryOpen(false);
    setIsRestoredDraft(true);
    showFlash("Draft loaded from history — click Save to write new version");
    restoreHistoryFocus();
  };

  const fetchReceipts = useCallback(
    async (episodeId: string) => {
      const requestId = receiptRequestRef.current + 1;
      receiptRequestRef.current = requestId;
      setReceiptsLoading(true);
      setReceiptsError(null);
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("episode_id", episodeId)
        .order("seq", { ascending: true })
        .returns<Receipt[]>();
      if (receiptRequestRef.current !== requestId) return;
      setReceiptsLoading(false);
      if (error) {
        setReceipts([]);
        setReceiptsError(error.message);
        return;
      }
      setReceipts(data ?? []);
    },
    [supabase],
  );

  const openRunDetail = (episodeId: string) => {
    lastRunTriggerRef.current = episodeId;
    setActiveEpisodeId(episodeId);
    setReceipts([]);
    void fetchReceipts(episodeId);
  };

  const closeRunDetail = useCallback(() => {
    const triggerId = lastRunTriggerRef.current;
    receiptRequestRef.current += 1;
    setActiveEpisodeId(null);
    setReceipts([]);
    setReceiptsError(null);
    setReceiptsLoading(false);
    window.requestAnimationFrame(() => {
      if (triggerId) runButtonRefs.current.get(triggerId)?.focus();
    });
  }, []);

  // ── persist character ───────────────────────────────────────────────────
  const save = async () => {
    if (!active || saving) return;
    const snapshot = {
      character_id: active.id,
      codename: active.codename,
      concept: active.concept,
      status: active.status,
      bible: toBible(active),
    };
    setSaving(true);
    const { error } = await supabase
      .from("characters")
      .update({
        codename: snapshot.codename,
        concept: snapshot.concept,
        status: snapshot.status,
        bible: snapshot.bible,
      })
      .eq("id", snapshot.character_id);
    if (error) {
      setSaving(false);
      showFlash("Save failed — " + error.message, true);
      return;
    }

    const { error: revisionError } = await supabase
      .from("character_bible_revisions")
      .insert(snapshot);

    setSaving(false);
    if (revisionError) {
      showFlash("Saved, but history snapshot failed — " + revisionError.message, true);
      return;
    }

    setIsRestoredDraft(false);
    showFlash("✓ Saved · revision snapshot logged");
    if (historyOpen) void fetchRevisions(snapshot.character_id);
  };

  const addChar = async () => {
    if (adding) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("characters")
      .insert({ codename: "New character", status: "draft", bible: {} })
      .select("*")
      .single();
    setAdding(false);
    if (error || !data) {
      showFlash("Could not create character — " + (error?.message ?? ""), true);
      return;
    }
    const flat = flatten(data as Character);
    setChars((cs) => [...cs, flat]);
    setActiveId(flat.id);
    setView("roster");
  };

  const toggleStatus = () => {
    if (!active) return;
    set("status", active.status === "active" ? "draft" : "active");
  };

  // ── ideas (the wire) ──────────────────────────────────────────────────────
  const logIdea = async () => {
    const t = draftIdea.trim();
    if (!t) return;
    setDraftIdea("");
    const { data, error } = await supabase
      .from("ideas")
      .insert({
        title: t,
        note: "",
        character_id: activeId,
        channel: CHANNELS[0],
        status: "backlog",
      })
      .select("*")
      .single();
    if (error || !data) {
      showFlash("Could not log idea — " + (error?.message ?? ""), true);
      setDraftIdea(t);
      return;
    }
    setIdeas((xs) => [data as Idea, ...xs]);
  };

  const cycleStatus = async (id: string) => {
    const idea = ideas.find((x) => x.id === id);
    if (!idea) return;
    const next: IdeaStatus = STATUS_CYCLE[idea.status];
    setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: next } : x)));
    const { error } = await supabase.from("ideas").update({ status: next }).eq("id", id);
    if (error) {
      // revert on failure
      setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: idea.status } : x)));
      showFlash("Status update failed", true);
    }
  };

  const setIdeaField = async (id: string, f: "character_id" | "channel", v: string) => {
    const prev = ideas.find((x) => x.id === id);
    setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, [f]: v } : x)));
    const { error } = await supabase.from("ideas").update({ [f]: v }).eq("id", id);
    if (error && prev) {
      setIdeas((xs) => xs.map((x) => (x.id === id ? prev : x)));
      showFlash("Tag update failed", true);
    }
  };

  const openIdeas = ideas.filter((i) => i.status !== "used").length;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="cr">
      <nav className="rail">
        <div className="brand">
          CONTROL<b>·</b>ROOM
        </div>
        {(
          [
            ["roster", "Roster"],
            ["wire", "The Wire"],
            ["runs", "Runs"],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            className={"navbtn" + (view === k ? " on" : "")}
            onClick={() => setView(k)}
            aria-pressed={view === k}
          >
            <Icon name={k} />
            <span>{lbl}</span>
            <div className="dot" />
          </button>
        ))}
        <form action="/auth/signout" method="post" className="railspacer">
          <button className="navbtn" type="submit" title={`Sign out · ${userEmail}`}>
            <Icon name="exit" />
            <span>Exit</span>
            <div className="dot" />
          </button>
        </form>
      </nav>

      {loading ? (
        <div className="loading">
          <span className="spin" /> Loading field manuals…
        </div>
      ) : loadError ? (
        <div className="empty">
          <h3>Comms down</h3>
          <p>Couldn&apos;t reach the database: {loadError}</p>
        </div>
      ) : (
        <>
          {view === "roster" && (
            <div className="main">
              <aside className="roster">
                <div className="col-head">
                  <h2>Roster</h2>
                  <span className="count">{chars.length} on file</span>
                </div>
                <div className="roster-list">
                  {chars.map((c) => (
                    <button
                      key={c.id}
                      className={"pcard" + (c.id === activeId ? " on" : "")}
                      onClick={() => setActiveId(c.id)}
                    >
                      <div className="codename">{c.codename || "Untitled"}</div>
                      <div className="concept">
                        {c.concept || "No concept logged yet."}
                      </div>
                      <div className="meta">
                        {c.id === activeId && (
                          <span className="chip active">● Casting</span>
                        )}
                        {c.status === "draft" && (
                          <span className="chip draft">Draft</span>
                        )}
                      </div>
                    </button>
                  ))}
                  <button className="addbtn" onClick={addChar} disabled={adding}>
                    {adding ? "Creating…" : "+ New character"}
                  </button>
                </div>
              </aside>

              {active && displayedActive ? (
                <section className={"dossier" + (historyOpen ? " history-open" : "")}>
                  {previewingRevision && (
                    <div className="preview-banner" role="status">
                      <div className="preview-banner-copy">
                        <span className="preview-mark">!</span>
                        <span>
                          Previewing revision from {formatRevisionDate(previewingRevision.created_at)}
                        </span>
                      </div>
                      <div className="preview-actions">
                        <button
                          className="btn dark"
                          type="button"
                          onClick={() => requestRestore(previewingRevision)}
                        >
                          Restore this Version
                        </button>
                        <button className="btn dark-ghost" type="button" onClick={exitPreview}>
                          Exit Preview
                        </button>
                      </div>
                    </div>
                  )}
                  <header className="dossier-head">
                    <div className="filecode">
                      <span>FILE · {displayedActive.id.slice(0, 8).toUpperCase()}</span>
                      <button
                        ref={headerHistoryButtonRef}
                        className="history-trigger"
                        type="button"
                        onClick={() => openHistory("header")}
                        aria-haspopup="dialog"
                        aria-expanded={historyOpen}
                        disabled={!active}
                      >
                        <Icon name="clock" />
                        <span>History</span>
                      </button>
                      <span className="live">
                        ● {displayedActive.status === "active" ? "ACTIVE FIELD MANUAL" : "DRAFT FIELD MANUAL"}
                      </span>
                    </div>
                    <h1>{displayedActive.codename || "Untitled"}</h1>
                    <p className="sub">
                      {displayedActive.concept ||
                        "Add a one-line concept below to anchor this character."}
                    </p>
                    <div className="stamp">Casting</div>
                  </header>

                  <div className={"sheet" + (previewingRevision ? " preview-active" : "")}>
                    <Field
                      label="Codename"
                      value={displayedActive.codename}
                      onChange={(v) => set("codename", v)}
                      rows={1}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <Field
                      label="One-line concept"
                      hint="The logline the writer reads first"
                      value={displayedActive.concept}
                      onChange={(v) => set("concept", v)}
                      rows={2}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <Field
                      label="Voice & identity"
                      hint="Who they are — keep it original, never a real person"
                      value={displayedActive.voice}
                      onChange={(v) => set("voice", v)}
                      rows={4}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <div className="grid2">
                      <Field
                        label="Cadence & delivery"
                        value={displayedActive.cadence}
                        onChange={(v) => set("cadence", v)}
                        rows={5}
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                      <Field
                        label="Vocabulary & catchphrases"
                        value={displayedActive.vocab}
                        onChange={(v) => set("vocab", v)}
                        rows={5}
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                    </div>
                    <Field
                      label="Off-limits"
                      hint="Hard rules — what they never say (keeps you monetizable & on-brand)"
                      value={displayedActive.offlimits}
                      onChange={(v) => set("offlimits", v)}
                      rows={3}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <Field
                      label="Gold-standard lines"
                      hint="2–4 example lines — the writer imitates these more than any instruction"
                      value={displayedActive.lines}
                      onChange={(v) => set("lines", v)}
                      rows={5}
                      mono
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <div className="grid2">
                      <Field
                        label="Beat template"
                        value={displayedActive.beats}
                        onChange={(v) => set("beats", v)}
                        rows={6}
                        mono
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                      <Field
                        label="Runtime target"
                        hint="Enforced at script + render"
                        value={displayedActive.runtime}
                        onChange={(v) => set("runtime", v)}
                        rows={2}
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                    </div>
                  </div>

                  {!previewingRevision && (
                    <div className="savebar">
                      {isRestoredDraft && (
                        <div className="restore-warning">
                          ⚠ UNSAVED RESTORED DRAFT — You are viewing a restored manual. Click
                          Save dossier to make these changes live.
                        </div>
                      )}
                      <button
                        className={"btn" + (isRestoredDraft ? " save-highlight" : "")}
                        onClick={save}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save dossier"}
                      </button>
                      <button className="btn ghost" onClick={toggleStatus}>
                        {active.status === "active" ? "● Active" : "○ Draft"}
                      </button>
                      <button
                        ref={savebarHistoryButtonRef}
                        className="btn ghost"
                        type="button"
                        onClick={() => openHistory("savebar")}
                        aria-haspopup="dialog"
                        aria-expanded={historyOpen}
                      >
                        View History
                      </button>
                      <button className="btn ghost" onClick={() => setView("wire")}>
                        Log an idea →
                      </button>
                      <span className={"flash" + (flash ? " show" : "") + (flash?.err ? " err" : "")}>
                        {flash?.msg}
                      </span>
                    </div>
                  )}
                  {historyOpen && (
                    <HistoryDrawer
                      revisions={revisions}
                      loading={revisionsLoading}
                      error={revisionsError}
                      previewingRevisionId={previewingRevisionId}
                      onClose={closeHistory}
                      onRetry={() => {
                        void fetchRevisions(active.id);
                      }}
                      onPreview={previewRevision}
                      onRestore={requestRestore}
                    />
                  )}
                  {pendingRestore && (
                    <RestoreDialog
                      revision={pendingRestore}
                      onCancel={() => setPendingRestore(null)}
                      onConfirm={confirmRestore}
                    />
                  )}
                </section>
              ) : (
                <section className="dossier">
                  <div className="empty">
                    <Icon name="roster" />
                    <h3>No characters yet</h3>
                    <p>Create your first character to start building a field manual.</p>
                    <button className="btn" onClick={addChar} disabled={adding}>
                      {adding ? "Creating…" : "+ New character"}
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {view === "wire" && (
            <div className="wire">
              <div className="col-head">
                <h2>The Wire</h2>
                <span className="count">
                  {ideas.length} logged · {openIdeas} open
                </span>
              </div>
              <div className="cap">
                <span className="eyebrow">
                  Inspiration just hit — get it down before it&apos;s gone
                </span>
                <div className="row" style={{ marginTop: 9 }}>
                  <input
                    value={draftIdea}
                    placeholder="An idea, a headline, a half-thought…"
                    onChange={(e) => setDraftIdea(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && logIdea()}
                    aria-label="New idea"
                  />
                  <button className="btn" onClick={logIdea}>
                    Log it
                  </button>
                </div>
              </div>
              {ideas.length === 0 ? (
                <div className="empty">
                  <h3>The wire&apos;s quiet</h3>
                  <p>Nothing logged yet. Drop the next idea above the moment it lands.</p>
                </div>
              ) : (
                <div className="wire-list">
                  {ideas.map((i) => (
                    <div
                      key={i.id}
                      className="icard"
                      style={{
                        borderLeftColor:
                          i.status === "active"
                            ? "var(--brass)"
                            : i.status === "used"
                              ? "var(--cleared)"
                              : "var(--line)",
                      }}
                    >
                      <div className="body">
                        <div className="title">{i.title}</div>
                        {i.note && <div className="note">{i.note}</div>}
                        <div className="tags">
                          <button
                            className={"statusbtn s-" + i.status}
                            onClick={() => cycleStatus(i.id)}
                          >
                            {STATUS_LABEL[i.status]}
                          </button>
                          <select
                            className="tag-select"
                            value={i.character_id ?? ""}
                            onChange={(e) =>
                              setIdeaField(i.id, "character_id", e.target.value)
                            }
                            aria-label="Assign character"
                          >
                            {chars.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.codename || "Untitled"}
                              </option>
                            ))}
                          </select>
                          <select
                            className="tag-select"
                            value={i.channel}
                            onChange={(e) =>
                              setIdeaField(i.id, "channel", e.target.value)
                            }
                            aria-label="Assign channel"
                          >
                            {CHANNELS.map((ch) => (
                              <option key={ch} value={ch}>
                                {ch}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "runs" && (
            <div className="wire">
              <div className="col-head">
                <h2>Runs</h2>
                <span className="count">
                  pipeline output · {episodes.length} episode
                  {episodes.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="cap"><span className="eyebrow">Operation-wide pipeline output — every character&apos;s finished episodes.</span></div>
              {episodes.length === 0 ? (
                <div className="empty">
                  <Icon name="runs" />
                  <h3>No runs yet</h3>
                  <p>
                    Finished episodes land here — each with its fact-check verdict
                    and the provider that gated it. The content pipeline writes them
                    to the same Supabase this dashboard reads.
                  </p>
                </div>
              ) : (
                <div className="wire-list">
                  {episodes.map((e) => {
                    const gate = e.sentinels?.[e.sentinels.length - 1];
                    return (
                      <button
                        key={e.episode_id}
                        ref={(node) => {
                          if (node) runButtonRefs.current.set(e.episode_id, node);
                          else runButtonRefs.current.delete(e.episode_id);
                        }}
                        className="runcard"
                        onClick={() => openRunDetail(e.episode_id)}
                        aria-haspopup="dialog"
                        aria-expanded={activeEpisodeId === e.episode_id}
                      >
                        <div className="topic">{e.food}</div>
                        <div className="runmeta">
                          <span className="rmeta stat">{e.status}</span>
                          {e.final_stage && (
                            <span className="rmeta">stage · {e.final_stage}</span>
                          )}
                          {gate?.provider && (
                            <span className="rmeta gate">
                              gated by {gate.provider}
                              {gate.verdict ? ` · ${gate.verdict}` : ""}
                            </span>
                          )}
                          {typeof e.spend === "number" && e.spend > 0 && (
                            <span className="rmeta">${e.spend.toFixed(2)}</span>
                          )}
                          <span className="rmeta">
                            {new Date(e.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {activeEpisode && (
                <DrillDownPanel
                  episode={activeEpisode}
                  receipts={receipts}
                  loading={receiptsLoading}
                  error={receiptsError}
                  onClose={closeRunDetail}
                  onRetry={() => {
                    void fetchReceipts(activeEpisode.episode_id);
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
