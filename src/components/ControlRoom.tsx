"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Json } from "@/lib/database.types";
import { bibleToMarkdown, downloadMarkdown } from "@/lib/exportBible";
import { useDirtyState } from "@/lib/hooks/useDirtyState";
import { useEpisodes } from "@/lib/hooks/useEpisodes";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import {
  buildPublishApprovalReenqueue,
  buildSpendApprovalReenqueue,
  buildJobInsert,
  classifyJobStatus,
  detectParkKind,
  isActionableStatus,
  isTerminalStatus,
  JOB_STATUS_LABELS,
  type JobEnqueueInput,
} from "@/lib/jobs";
import { isCast } from "@/lib/casting";
import { createClient } from "@/lib/supabase/client";
import {
  CHANNELS,
  type Character,
  type CharacterBibleRevision,
  type Idea,
  type IdeaStatus,
  type Receipt,
} from "@/lib/types";
import { CastingStudioPanel } from "./controlroom/CastingStudioPanel";
import { CompareDialog } from "./controlroom/CompareDialog";
import { CostBoxDashboard } from "./controlroom/CostBoxDashboard";
import { DrillDownPanel } from "./controlroom/DrillDownPanel";
import { EnqueueIdeaPanel } from "./controlroom/EnqueueIdeaPanel";
import { HistoryDrawer } from "./controlroom/HistoryDrawer";
import { OverviewDashboard } from "./controlroom/OverviewDashboard";
import { QueueActionDialog } from "./controlroom/QueueActionDialog";
import {
  Icon,
  applyEditableSnapshot,
  computeCostStats,
  editableSnapshot,
  flatten,
  flattenRevision,
  formatRevisionDate,
  formatUsd,
  savedSnapshotsById,
  toBible,
  type CostReceipt,
  type EditableCharacterFields,
  type EnqueueSubmitResult,
  type FlatChar,
  type JobParkResolution,
  type PendingDirtyAction,
  type QueueJob,
  type WireIdea,
} from "./controlroom/shared";

type View = "roster" | "wire" | "queue" | "runs" | "overview" | "cost";
const VIEW_KEYS: View[] = ["roster", "wire", "queue", "runs", "overview", "cost"];
const VIEW_NAV_ITEMS: ReadonlyArray<{ key: View; label: string }> = [
  { key: "roster", label: "Roster" },
  { key: "wire", label: "The Wire" },
  { key: "queue", label: "Queue" },
  { key: "runs", label: "Runs" },
  { key: "overview", label: "Overview" },
  { key: "cost", label: "Cost" },
];
const PRIMARY_VIEW_PANEL_ID = "control-room-primary-view-panel";

function viewTabId(view: View) {
  return `control-room-tab-${view}`;
}

function isView(value: string | null): value is View {
  return value !== null && (VIEW_KEYS as string[]).includes(value);
}
// Active view persisted in the URL (?view=) so a refresh restores it.
function readViewFromUrl(): View | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("view");
  return isView(value) ? value : null;
}
function viewUrl(view: View): string {
  const params = new URLSearchParams(window.location.search);
  params.set("view", view);
  return `${window.location.pathname}?${params.toString()}${window.location.hash}`;
}


const IDEA_STATUS_OPTIONS: IdeaStatus[] = ["backlog", "active", "used"];
const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  backlog: "Backlog",
  active: "Active",
  used: "Used",
};



function formatQueueTimestamp(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return "unknown time";

  const deltaMs = Date.now() - timestamp;
  const absDeltaMs = Math.abs(deltaMs);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (absDeltaMs < minuteMs) return "just now";
  if (absDeltaMs < hourMs) {
    const minutes = Math.max(1, Math.round(absDeltaMs / minuteMs));
    return deltaMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`;
  }
  if (absDeltaMs < dayMs) {
    const hours = Math.max(1, Math.round(absDeltaMs / hourMs));
    return deltaMs >= 0 ? `${hours}h ago` : `in ${hours}h`;
  }

  return new Date(createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function normalizeJobInputArray(value: Json): Json[] {
  return Array.isArray(value) ? value : [];
}

function jobInputFromRow(
  job: QueueJob,
  overrides: {
    spendApproved?: boolean;
    publishApproved?: boolean;
    idempotencyKey?: string | null;
  } = {},
): JobEnqueueInput {
  return {
    food: job.food,
    character: job.character,
    anchor_citation: job.anchor_citation,
    anchor_url: job.anchor_url,
    inject_claims: normalizeJobInputArray(job.inject_claims),
    episode_cap: job.episode_cap,
    routes: job.routes,
    live_adapters: job.live_adapters,
    stub_upstream: job.stub_upstream,
    spend_approved: overrides.spendApproved ?? job.spend_approved,
    publish_approved: overrides.publishApproved ?? job.publish_approved,
    idempotency_key:
      "idempotencyKey" in overrides ? overrides.idempotencyKey : job.idempotency_key,
  };
}

// Module-level so editing a textarea does not remount the input (focus-safe).
function Field({
  id,
  label,
  hint,
  value,
  onChange,
  rows = 3,
  multiline = rows > 1,
  mono,
  readOnly = false,
  locked = false,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  multiline?: boolean;
  mono?: boolean;
  readOnly?: boolean;
  locked?: boolean;
}) {
  const controlStyle = mono ? { fontFamily: "var(--mono)", fontSize: "12.5px" } : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>
        <span className="eyebrow">{label}</span>
        <span className="field-label-side">
          {locked && <span className="badge lock-badge">LOCKED - PREVIEW</span>}
          {hint && <span className="hint">{hint}</span>}
        </span>
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          aria-readonly={readOnly}
          style={controlStyle}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          aria-readonly={readOnly}
          style={controlStyle}
        />
      )}
    </div>
  );
}



function fieldControlId(characterId: string | null, label: string) {
  const scopedCharacterId = (characterId ?? "no-character").replace(/[^a-zA-Z0-9_-]/g, "-");
  const scopedLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `field-${scopedCharacterId}-${scopedLabel || "manual"}`;
}

function markdownFilename(codename: string) {
  const trimmed = codename.trim();
  return `${trimmed.length > 0 ? trimmed.replace(/[\\/]+/g, "-") : "Untitled"}.md`;
}








type RestoreDialogProps = {
  revision: CharacterBibleRevision;
  onCancel: () => void;
  onConfirm: () => void;
  restoreFocusRef: React.RefObject<HTMLElement | null>;
};

function RestoreDialog({ revision, onCancel, onConfirm, restoreFocusRef }: RestoreDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useScrollLock();

  useFocusTrap({
    active: true,
    containerRef: dialogRef,
    onEscape: onCancel,
    initialFocusRef: cancelButtonRef,
    restoreFocusRef,
  });

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

type DiscardChangesDialogProps = {
  codename: string;
  onCancel: () => void;
  onConfirm: () => void;
  restoreFocusRef: React.RefObject<HTMLElement | null>;
};

function DiscardChangesDialog({
  codename,
  onCancel,
  onConfirm,
  restoreFocusRef,
}: DiscardChangesDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);

  useScrollLock();

  useFocusTrap({
    active: true,
    containerRef: dialogRef,
    onEscape: onCancel,
    initialFocusRef: keepButtonRef,
    restoreFocusRef,
  });

  return (
    <div className="restore-layer" role="presentation">
      <div
        ref={dialogRef}
        className="restore-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-title"
        aria-describedby="discard-desc"
      >
        <h2 id="discard-title">UNSAVED CHANGES IN BUFFER</h2>
        <p id="discard-desc">
          You have uncommitted modifications in the field manual for {codename}.
          Leaving this screen will erase these changes permanently.
        </p>
        <div className="restore-actions">
          <button className="btn ghost" type="button" onClick={onConfirm}>
            DISCARD CHANGES
          </button>
          <button ref={keepButtonRef} className="btn" type="button" onClick={onCancel}>
            KEEP EDITING
          </button>
        </div>
      </div>
    </div>
  );
}



export default function ControlRoom({ userEmail }: { userEmail: string }) {
  const supabase = useMemo(() => createClient(), []);
  const {
    episodes,
    loading: episodesLoading,
    error: episodesError,
    refetch: fetchEpisodes,
  } = useEpisodes(supabase);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [chars, setChars] = useState<FlatChar[]>([]);
  const [ideas, setIdeas] = useState<WireIdea[]>([]);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [jobParkById, setJobParkById] = useState<Record<number, JobParkResolution>>({});
  const [costReceipts, setCostReceipts] = useState<CostReceipt[]>([]);
  const [costReceiptsLoading, setCostReceiptsLoading] = useState(true);
  const [costReceiptsError, setCostReceiptsError] = useState<string | null>(null);
  const [costReceiptsLoaded, setCostReceiptsLoaded] = useState(false);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [activeEnqueueIdeaId, setActiveEnqueueIdeaId] = useState<string | null>(null);
  const [castingOpen, setCastingOpen] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, EditableCharacterFields>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<CharacterBibleRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [previewingRevisionId, setPreviewingRevisionId] = useState<string | null>(null);
  const [compareRevision, setCompareRevision] = useState<CharacterBibleRevision | null>(null);
  const [pendingRestore, setPendingRestore] = useState<CharacterBibleRevision | null>(null);
  const [pendingDirtyAction, setPendingDirtyAction] = useState<PendingDirtyAction | null>(null);
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);
  const [view, setView] = useState<View>("roster");
  const [draftIdea, setDraftIdea] = useState("");
  const [draftIdeaNote, setDraftIdeaNote] = useState("");
  const [ideaNoteFocused, setIdeaNoteFocused] = useState(false);
  const [ideaSubmittingTitle, setIdeaSubmittingTitle] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pendingQueueAction, setPendingQueueAction] = useState<{
    job: QueueJob;
    action: "spend" | "publish" | "stale";
  } | null>(null);
  const [queueActionSubmitting, setQueueActionSubmitting] = useState(false);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewTabRefs = useRef<Record<View, HTMLButtonElement | null>>({
    roster: null,
    wire: null,
    queue: null,
    runs: null,
    overview: null,
    cost: null,
  });
  const runButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const enqueueButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastRunTriggerRef = useRef<string | null>(null);
  const lastEnqueueTriggerRef = useRef<string | null>(null);
  const runDetailRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const enqueueRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const receiptRequestRef = useRef(0);
  const headerHistoryButtonRef = useRef<HTMLButtonElement>(null);
  const castingTriggerRef = useRef<HTMLButtonElement | null>(null);
  const savebarHistoryButtonRef = useRef<HTMLButtonElement>(null);
  const lastHistoryTriggerRef = useRef<"header" | "savebar" | null>(null);
  const historyRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const compareRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const previewRestoreButtonRef = useRef<HTMLButtonElement>(null);
  const lastRestoreTriggerRef = useRef<"history" | "preview" | null>(null);
  const restoreDialogRestoreFocusRef = useRef<HTMLElement | null>(null);
  const characterRequestRef = useRef(0);
  const ideaRequestRef = useRef(0);
  const revisionRequestRef = useRef(0);
  const costReceiptRequestRef = useRef(0);
  const jobsRequestRef = useRef(0);
  const lastManualFocusRef = useRef<HTMLElement | null>(null);
  const lastDirtyTriggerRef = useRef<HTMLElement | null>(null);
  const discardDialogRestoreFocusRef = useRef<HTMLElement | null>(null);
  const queueActionRestoreFocusRef = useRef<HTMLElement | null>(null);
  const exitFormRef = useRef<HTMLFormElement>(null);
  const ideaTitleRef = useRef<HTMLTextAreaElement>(null);
  const ideaSubmittingTitleRef = useRef<string | null>(null);
  const showFlash = (msg: string, err = false) => {
    setFlash({ msg, err });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  };

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) &&
        event.target.closest(".sheet")
      ) {
        lastManualFocusRef.current = event.target;
      }
    };

    window.addEventListener("focusin", handleFocusIn);
    return () => window.removeEventListener("focusin", handleFocusIn);
  }, []);

  const fetchCharacters = useCallback(async () => {
    const requestId = characterRequestRef.current + 1;
    characterRequestRef.current = requestId;
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<Character[]>();

    if (characterRequestRef.current !== requestId) return;
    setLoading(false);
    if (error) {
      setChars([]);
      setSavedSnapshots({});
      setActiveId(null);
      setLoadError(error.message);
      return;
    }

    const flat = (data ?? []).map(flatten);
    setChars(flat);
    setSavedSnapshots(savedSnapshotsById(flat));
    setActiveId((current) =>
      current && flat.some((character) => character.id === current)
        ? current
        : (flat[0]?.id ?? null),
    );
  }, [supabase]);

  const fetchIdeas = useCallback(async () => {
    const requestId = ideaRequestRef.current + 1;
    ideaRequestRef.current = requestId;
    setIdeasLoading(true);
    setIdeasError(null);

    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Idea[]>();

    if (ideaRequestRef.current !== requestId) return;
    setIdeasLoading(false);
    if (error) {
      setIdeasError(error.message);
      return;
    }

    setIdeas((current) => {
      const localOnly = current.filter((idea) => idea.clientWriteState);
      const localIds = new Set(localOnly.map((idea) => idea.id));
      const remote = (data ?? []).filter((idea) => !localIds.has(idea.id));
      return [...localOnly, ...remote];
    });
  }, [supabase]);

  const fetchJobs = useCallback(async () => {
    const requestId = jobsRequestRef.current + 1;
    jobsRequestRef.current = requestId;
    setJobsLoading(true);
    setJobsError(null);

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<QueueJob[]>();

    if (jobsRequestRef.current !== requestId) return;
    setJobsLoading(false);
    if (error) {
      setJobs([]);
      setJobsError(error.message);
      return;
    }
    setJobs(data ?? []);
  }, [supabase]);

  const fetchCostReceipts = useCallback(async () => {
    const requestId = costReceiptRequestRef.current + 1;
    costReceiptRequestRef.current = requestId;
    setCostReceiptsLoading(true);
    setCostReceiptsError(null);

    const { data, error } = await supabase
      .from("receipts")
      .select("episode_id,seq,provider,stage,spend_so_far")
      .order("episode_id", { ascending: true })
      .order("seq", { ascending: true })
      .returns<CostReceipt[]>();

    if (costReceiptRequestRef.current !== requestId) return;
    setCostReceiptsLoading(false);
    setCostReceiptsLoaded(true);
    if (error) {
      setCostReceipts([]);
      setCostReceiptsError(error.message);
      return;
    }
    setCostReceipts(data ?? []);
  }, [supabase]);

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    void fetchCharacters();
    void fetchIdeas();
    void fetchJobs();
    void fetchCostReceipts();
  }, [fetchCharacters, fetchCostReceipts, fetchIdeas, fetchJobs]);

  useEffect(() => {
    const readyJobs = jobs.filter((job) => {
      const status = classifyJobStatus(job.status);
      return status === "ready_for_review" && jobParkById[job.id] === undefined;
    });

    if (readyJobs.length === 0) return undefined;

    setJobParkById((current) => {
      const next = { ...current };
      for (const job of readyJobs) {
        next[job.id] = { kind: "unknown", loading: true, stage: null, error: null };
      }
      return next;
    });

    for (const job of readyJobs) {
      if (!job.episode_id) {
        setJobParkById((current) => ({
          ...current,
          [job.id]: { kind: "unknown", loading: false, stage: null, error: null },
        }));
        continue;
      }

      const episodeId = job.episode_id;
      void (async () => {
        const { data, error } = await supabase
          .from("receipts")
          .select("stage,seq")
          .eq("episode_id", episodeId)
          .order("seq", { ascending: false })
          .limit(1)
          .returns<Array<Pick<Receipt, "stage" | "seq">>>();

        const latestStage = data?.[0]?.stage ?? null;
        setJobParkById((current) => ({
          ...current,
          [job.id]: {
            kind: error ? "unknown" : detectParkKind(latestStage),
            loading: false,
            stage: latestStage,
            error: error?.message ?? null,
          },
        }));
      })();
    }
    return undefined;
  }, [jobParkById, jobs, supabase]);

  const active = chars.find((c) => c.id === activeId) ?? null;
  const previewingRevision =
    revisions.find((revision) => revision.id === previewingRevisionId) ?? null;
  const displayedActive =
    active && previewingRevision ? flattenRevision(previewingRevision, active) : active;
  const activeEpisode = episodes.find((e) => e.episode_id === activeEpisodeId) ?? null;
  const activeEnqueueIdea =
    ideas.find((idea) => idea.id === activeEnqueueIdeaId) ?? null;
  const activeEnqueueCharacter =
    activeEnqueueIdea?.character_id
      ? (chars.find((character) => character.id === activeEnqueueIdea.character_id) ?? null)
      : null;
  const costStats = useMemo(
    () => computeCostStats(episodes, costReceipts, chars),
    [chars, costReceipts, episodes],
  );
  const currentEditableFields = useMemo(() => (active ? editableSnapshot(active) : null), [active]);
  const savedEditableFields = activeId
    ? (savedSnapshots[activeId] ?? currentEditableFields)
    : null;
  const dirty = useDirtyState(currentEditableFields, savedEditableFields);

  const set = (field: keyof FlatChar, val: string) =>
    setChars((cs) =>
      cs.map((c) => (c.id === activeId ? { ...c, [field]: val } : c)),
    );

  const revertActiveEdits = useCallback(() => {
    if (!activeId) return;
    const snapshot = savedSnapshots[activeId];
    if (!snapshot) return;
    setChars((cs) => cs.map((c) => (c.id === activeId ? applyEditableSnapshot(c, snapshot) : c)));
    setPreviewingRevisionId(null);
    setIsRestoredDraft(false);
  }, [activeId, savedSnapshots]);

  const guardDirtyAction = useCallback(
    (action: () => void, cancel?: () => void) => {
      if (dirty && active) {
        if (document.activeElement instanceof HTMLElement) {
          lastDirtyTriggerRef.current = document.activeElement;
        }
        discardDialogRestoreFocusRef.current =
          lastManualFocusRef.current ?? lastDirtyTriggerRef.current;
        setPendingDirtyAction({ run: action, cancel });
        return;
      }

      action();
    },
    [active, dirty],
  );

  const cancelDirtyAction = useCallback(() => {
    discardDialogRestoreFocusRef.current =
      lastManualFocusRef.current ?? lastDirtyTriggerRef.current;
    const pending = pendingDirtyAction;
    setPendingDirtyAction(null);
    pending?.cancel?.();
  }, [pendingDirtyAction]);

  const confirmDirtyAction = useCallback(() => {
    const action = pendingDirtyAction;
    discardDialogRestoreFocusRef.current =
      lastManualFocusRef.current ?? lastDirtyTriggerRef.current;
    revertActiveEdits();
    setPendingDirtyAction(null);
    action?.run();
  }, [pendingDirtyAction, revertActiveEdits]);

  const guardedSetActiveId = useCallback(
    (nextId: string) => {
      if (nextId === activeId) return;
      guardDirtyAction(() => setActiveId(nextId));
    },
    [activeId, guardDirtyAction],
  );

  const guardedSetView = useCallback(
    (nextView: View, cancel?: () => void) => {
      if (nextView === view) return;
      // In-app nav: push a history entry (after the dirty guard approves) so
      // the URL reflects the view AND browser back/forward moves between views.
      guardDirtyAction(() => {
        setView(nextView);
        if (typeof window !== "undefined") {
          window.history.pushState(null, "", viewUrl(nextView));
        }
      }, cancel);
    },
    [guardDirtyAction, view],
  );

  const focusSelectedViewTab = useCallback(() => {
    window.requestAnimationFrame(() => {
      viewTabRefs.current[view]?.focus();
    });
  }, [view]);

  const activateViewTab = useCallback(
    (nextView: View) => {
      guardedSetView(nextView, focusSelectedViewTab);
    },
    [focusSelectedViewTab, guardedSetView],
  );

  const focusViewTab = useCallback((nextView: View) => {
    viewTabRefs.current[nextView]?.focus();
  }, []);

  const handleViewTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentView: View) => {
      const currentIndex = VIEW_KEYS.indexOf(currentView);
      if (currentIndex === -1) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (currentIndex + direction + VIEW_KEYS.length) % VIEW_KEYS.length;
        focusViewTab(VIEW_KEYS[nextIndex]);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusViewTab(VIEW_KEYS[0]);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        focusViewTab(VIEW_KEYS[VIEW_KEYS.length - 1]);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateViewTab(currentView);
      }
    },
    [activateViewTab, focusViewTab],
  );

  // Restore the active view from the URL on mount (client-only effect, not a
  // lazy state initializer, to avoid an SSR/hydration mismatch). Normalize the
  // URL so the first history entry carries the resolved ?view= param.
  useEffect(() => {
    const fromUrl = readViewFromUrl();
    if (fromUrl && fromUrl !== view) setView(fromUrl);
    window.history.replaceState(null, "", viewUrl(fromUrl ?? view));
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser back/forward: sync the view to the URL. Routed through the dirty
  // guard (no pushState here — the browser already changed history). If the user
  // chooses "keep editing", revert the URL to the still-current view so URL and
  // view stay consistent.
  useEffect(() => {
    const onPopState = () => {
      const fromUrl = readViewFromUrl() ?? "roster";
      if (fromUrl === view) return;
      guardDirtyAction(
        () => setView(fromUrl),
        () => window.history.replaceState(null, "", viewUrl(view)),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [guardDirtyAction, view]);

  useEffect(() => {
    setHistoryOpen(false);
    setRevisions([]);
    setRevisionsError(null);
    setPreviewingRevisionId(null);
    setCompareRevision(null);
    setPendingRestore(null);
    setIsRestoredDraft(false);
  }, [activeId]);

  const setHistoryRestoreFocusTarget = useCallback(() => {
    const trigger = lastHistoryTriggerRef.current;
    historyRestoreFocusRef.current =
      trigger === "savebar" ? savebarHistoryButtonRef.current : headerHistoryButtonRef.current;
  }, []);

  const setRestoreDialogFocusTarget = useCallback((confirmed = false) => {
    const trigger = lastRestoreTriggerRef.current;
    if (!confirmed && trigger === "preview" && previewRestoreButtonRef.current) {
      restoreDialogRestoreFocusRef.current = previewRestoreButtonRef.current;
      return;
    }
    restoreDialogRestoreFocusRef.current =
      historyRestoreFocusRef.current ?? headerHistoryButtonRef.current;
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
    compareRestoreFocusRef.current = null;
    setHistoryRestoreFocusTarget();
    setHistoryOpen(true);
    void fetchRevisions(active.id);
  };

  const closeHistory = useCallback(() => {
    revisionRequestRef.current += 1;
    setHistoryOpen(false);
    setCompareRevision(null);
    compareRestoreFocusRef.current = null;
    setRevisionsLoading(false);
    setRevisionsError(null);
    setHistoryRestoreFocusTarget();
  }, [setHistoryRestoreFocusTarget]);

  const exitPreview = useCallback(() => {
    setPreviewingRevisionId(null);
  }, []);

  const previewRevision = (revision: CharacterBibleRevision) => {
    guardDirtyAction(() => setPreviewingRevisionId(revision.id));
  };

  const compareWithRevision = (
    revision: CharacterBibleRevision,
    trigger: HTMLButtonElement,
  ) => {
    compareRestoreFocusRef.current = trigger;
    setCompareRevision(revision);
  };

  const closeCompare = useCallback(() => {
    setCompareRevision(null);
  }, []);

  const requestRestore = (revision: CharacterBibleRevision) => {
    guardDirtyAction(() => {
      lastRestoreTriggerRef.current = historyOpen ? "history" : "preview";
      setHistoryOpen(false);
      setPendingRestore(revision);
    });
  };

  const requestRestoreFromCompare = (revision: CharacterBibleRevision) => {
    setCompareRevision(null);
    setHistoryOpen(false);
    requestRestore(revision);
  };

  const cancelRestore = useCallback(() => {
    setRestoreDialogFocusTarget();
    setPendingRestore(null);
  }, [setRestoreDialogFocusTarget]);

  const confirmRestore = () => {
    if (!active || !pendingRestore) return;
    setRestoreDialogFocusTarget(true);
    // Revisions snapshot the bible only, not the cast — preserve the live
    // voice_id / voice_settings so restoring a bible draft never wipes casting.
    const restored: FlatChar = {
      ...flattenRevision(pendingRestore, active),
      voice_id: active.voice_id,
      voice_settings: active.voice_settings,
    };
    setChars((cs) => cs.map((c) => (c.id === active.id ? restored : c)));
    setPendingRestore(null);
    setPreviewingRevisionId(null);
    setHistoryOpen(false);
    setIsRestoredDraft(true);
    showFlash("Draft loaded from history — click Save to write new version");
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
    runDetailRestoreFocusRef.current = runButtonRefs.current.get(episodeId) ?? null;
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
    runDetailRestoreFocusRef.current = triggerId
      ? (runButtonRefs.current.get(triggerId) ?? null)
      : null;
  }, []);

  const openEnqueuePanel = (ideaId: string, trigger: HTMLButtonElement) => {
    lastEnqueueTriggerRef.current = ideaId;
    enqueueRestoreFocusRef.current = trigger;
    setActiveEnqueueIdeaId(ideaId);
  };

  const closeEnqueuePanel = useCallback(() => {
    const triggerId = lastEnqueueTriggerRef.current;
    setActiveEnqueueIdeaId(null);
    enqueueRestoreFocusRef.current = triggerId
      ? (enqueueButtonRefs.current.get(triggerId) ?? null)
      : null;
  }, []);

  const enqueueJob = async (input: JobEnqueueInput): Promise<EnqueueSubmitResult> => {
    let payload: ReturnType<typeof buildJobInsert>;
    try {
      payload = buildJobInsert(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid job enqueue payload";
      showFlash(message, true);
      return { kind: "error", message };
    }

    const { error } = await supabase.from("jobs").insert(payload);

    if (!error) {
      showFlash("Queued as run");
      return { kind: "success" };
    }

    if (error.code === "23505") {
      showFlash("Already queued");
      return { kind: "duplicate" };
    }

    showFlash("Could not queue run — " + error.message, true);
    return { kind: "error", message: error.message };
  };

  const requestQueueAction = (
    job: QueueJob,
    action: "spend" | "publish" | "stale",
    trigger: HTMLButtonElement,
  ) => {
    queueActionRestoreFocusRef.current = trigger;
    setPendingQueueAction({ job, action });
  };

  const cancelQueueAction = useCallback(() => {
    if (queueActionSubmitting) return;
    setPendingQueueAction(null);
  }, [queueActionSubmitting]);

  const confirmQueueAction = async () => {
    if (!pendingQueueAction || queueActionSubmitting) return;

    setQueueActionSubmitting(true);
    const { job, action } = pendingQueueAction;
    const input =
      action === "spend" || action === "publish"
        ? jobInputFromRow(job)
        : jobInputFromRow(job, {
            idempotencyKey: `job_rerun_${job.id}_${Date.now()}`,
          });

    let payload: ReturnType<typeof buildJobInsert>;
    try {
      if (action === "spend") {
        payload = buildSpendApprovalReenqueue(input);
      } else if (action === "publish") {
        payload = buildPublishApprovalReenqueue(input);
      } else {
        payload = buildJobInsert(input);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid job enqueue payload";
      setQueueActionSubmitting(false);
      showFlash(message, true);
      return;
    }

    const { error } = await supabase.from("jobs").insert(payload);
    setQueueActionSubmitting(false);

    if (error) {
      showFlash(
        action === "spend"
          ? "Spend approval failed — " + error.message
          : action === "publish"
            ? "Publish approval failed — " + error.message
          : "Re-run failed — " + error.message,
        true,
      );
      return;
    }

    setPendingQueueAction(null);
    showFlash(
      action === "spend"
        ? "✓ Spend approved. Job re-entered the pipeline."
        : action === "publish"
          ? "✓ Publish approved. Job re-entered the pipeline."
        : "✓ Stranded job re-queued for execution",
    );
    void fetchJobs();
  };

  // Casting writes voice_id / voice_settings straight to the row (outside the
  // bible save/dirty flow), so sync local state directly without a snapshot.
  const patchCharacter = (
    id: string,
    patch: { voice_id?: string | null; voice_settings?: Json | null },
  ) => {
    setChars((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  // ── persist character ───────────────────────────────────────────────────
  const save = async () => {
    if (!active || saving || !dirty) return;
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

    setSavedSnapshots((snapshots) => ({
      ...snapshots,
      [snapshot.character_id]: {
        codename: snapshot.codename,
        concept: snapshot.concept,
        status: snapshot.status,
        bible: snapshot.bible,
      },
    }));

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
    setSavedSnapshots((snapshots) => ({ ...snapshots, [flat.id]: editableSnapshot(flat) }));
    setActiveId(flat.id);
    setView("roster");
    // Keep the URL in sync with this programmatic view switch (a refresh would
    // otherwise restore a stale ?view=).
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", viewUrl("roster"));
    }
  };

  const guardedAddChar = () => {
    guardDirtyAction(() => {
      void addChar();
    });
  };

  const toggleStatus = () => {
    if (!active) return;
    set("status", active.status === "active" ? "draft" : "active");
  };

  const handleExport = () => {
    if (!active) return;
    const markdown = bibleToMarkdown({
      codename: active.codename,
      concept: active.concept,
      status: active.status,
      bible: toBible(active),
    });
    downloadMarkdown(markdownFilename(active.codename), markdown);
  };

  // ── ideas (the wire) ──────────────────────────────────────────────────────
  const makeTempIdeaId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const startIdeaInsert = async (
    tempId: string,
    title: string,
    note: string,
    characterId: string | null,
    channel: string,
  ) => {
    if (ideaSubmittingTitleRef.current === title) return;
    ideaSubmittingTitleRef.current = title;
    setIdeaSubmittingTitle(title);

    setIdeas((xs) =>
      xs.map((idea) =>
        idea.id === tempId
          ? { ...idea, clientWriteState: "saving", clientError: undefined }
          : idea,
      ),
    );

    const { data, error } = await supabase
      .from("ideas")
      .insert({
        title,
        note,
        character_id: characterId,
        channel,
        status: "backlog",
      })
      .select("*")
      .single();

    ideaSubmittingTitleRef.current = null;
    setIdeaSubmittingTitle(null);

    if (error || !data) {
      const message = error?.message ?? "Unknown database error";
      showFlash("Could not log idea — " + message, true);
      setIdeas((xs) =>
        xs.map((idea) =>
          idea.id === tempId
            ? { ...idea, clientWriteState: "failed", clientError: message }
            : idea,
        ),
      );
      return;
    }

    const savedIdea: WireIdea = { ...(data as Idea), clientKey: tempId };
    // Dedup-aware swap: if a concurrent refetch already supplied the real row
    // while this insert was in flight, drop that duplicate and keep only the
    // swapped optimistic card (stable key = tempId). Prevents two cards sharing
    // the same real id when "retry"/refetch overlaps an in-flight insert.
    setIdeas((xs) => {
      const withoutDup = xs.filter(
        (idea) => idea.id !== savedIdea.id || idea.id === tempId,
      );
      return withoutDup.map((idea) => (idea.id === tempId ? savedIdea : idea));
    });
  };

  const logIdea = async () => {
    const title = draftIdea.trim();
    const note = draftIdeaNote.trim();
    if (!title || ideaSubmittingTitleRef.current === title) return;

    const tempId = makeTempIdeaId();
    const optimisticIdea: WireIdea = {
      id: tempId,
      owner: "",
      title,
      note,
      character_id: activeId,
      channel: CHANNELS[0],
      status: "backlog",
      created_at: new Date().toISOString(),
      clientKey: tempId,
      clientWriteState: "saving",
    };

    setIdeasError(null);
    setIdeasLoading(false);
    setIdeas((xs) => [optimisticIdea, ...xs]);
    setDraftIdea("");
    setDraftIdeaNote("");
    window.requestAnimationFrame(() => {
      ideaTitleRef.current?.focus();
    });
    await startIdeaInsert(tempId, title, note, optimisticIdea.character_id, optimisticIdea.channel);
  };

  const retryIdea = (idea: WireIdea) => {
    if (!idea.clientWriteState || idea.clientWriteState !== "failed") return;
    void startIdeaInsert(
      idea.id,
      idea.title.trim(),
      idea.note.trim(),
      idea.character_id,
      idea.channel,
    );
  };

  const dismissIdea = (id: string) => {
    setIdeas((xs) => xs.filter((idea) => idea.id !== id));
  };

  const handleIdeaTitleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void logIdea();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void logIdea();
    }
  };

  const handleIdeaNoteKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void logIdea();
    }
  };

  const setIdeaStatus = async (id: string, targetStatus: IdeaStatus) => {
    const idea = ideas.find((x) => x.id === id);
    if (!idea || idea.clientWriteState) return;
    if (idea.status === targetStatus) return;
    setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: targetStatus } : x)));
    const { error } = await supabase.from("ideas").update({ status: targetStatus }).eq("id", id);
    if (error) {
      // revert on failure
      setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: idea.status } : x)));
      showFlash("Status update failed", true);
    }
  };

  const setIdeaField = async (id: string, f: "character_id" | "channel", v: string) => {
    const prev = ideas.find((x) => x.id === id);
    if (!prev || prev.clientWriteState) return;
    const valueToPersist = f === "character_id" && v === "" ? null : v;
    setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, [f]: valueToPersist } : x)));
    const { error } =
      f === "character_id"
        ? await supabase.from("ideas").update({ character_id: valueToPersist }).eq("id", id)
        : await supabase.from("ideas").update({ channel: v }).eq("id", id);
    if (error && prev) {
      setIdeas((xs) => xs.map((x) => (x.id === id ? prev : x)));
      showFlash("Tag update failed", true);
    }
  };

  const openIdeas = ideas.filter((i) => i.status !== "used").length;
  const activeQueueJobs = jobs.filter((job) => !isTerminalStatus(classifyJobStatus(job.status))).length;
  const ideaCaptureDisabled = Boolean(ideaSubmittingTitle);
  const canSubmitIdea = draftIdea.trim().length > 0 && !ideaCaptureDisabled;
  const dirtyCodename = active?.codename.trim() ? active.codename : "Untitled";
  const mobileActiveManuals = useMemo(
    () =>
      chars
        .filter((c) => c.status === "active")
        .sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId)),
    [activeId, chars],
  );
  const mobileDraftManuals = useMemo(
    () =>
      chars
        .filter((c) => c.status === "draft")
        .sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId)),
    [activeId, chars],
  );

  const handleExitSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!dirty || !active) return;
    event.preventDefault();
    guardDirtyAction(() => {
      exitFormRef.current?.submit();
    });
  };

  const mobileRoster = (
    <div className="mobile-roster">
      <label className="eyebrow" htmlFor="mobile-roster-select">
        SELECT DOSSIER
      </label>
      <select
        id="mobile-roster-select"
        className="mobile-roster-select"
        value={activeId ?? ""}
        onChange={(event) => {
          if (event.target.value) guardedSetActiveId(event.target.value);
        }}
        disabled={chars.length === 0 || saving}
        aria-label="Select dossier"
      >
        {chars.length === 0 ? (
          <option value="">NO DOSSIERS ON FILE</option>
        ) : (
          <>
            <optgroup label="ACTIVE FIELD MANUALS">
              {mobileActiveManuals.map((c) => (
                <option key={c.id} value={c.id}>
                  ● {c.codename || "Untitled"}
                </option>
              ))}
            </optgroup>
            <optgroup label="DRAFT FIELD MANUALS">
              {mobileDraftManuals.map((c) => (
                <option key={c.id} value={c.id}>
                  ○ {c.codename || "Untitled"}
                </option>
              ))}
            </optgroup>
          </>
        )}
      </select>
      <button
        className="mobile-roster-new"
        type="button"
        onClick={guardedAddChar}
        disabled={adding || saving}
        aria-label="Create new character"
      >
        {adding ? "CREATING..." : "+ NEW"}
      </button>
    </div>
  );

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="cr">
      <div className="toast-region" aria-atomic="true">
        {flash && (
          <div
            className={"toast " + (flash.err ? "toast--error" : "toast--success")}
            role={flash.err ? "alert" : "status"}
            aria-live={flash.err ? "assertive" : "polite"}
          >
            {flash.msg}
          </div>
        )}
      </div>

      <nav className="rail">
        <div className="brand" style={{ marginBottom: "8px" }}>
          CONTROL<b>·</b>ROOM
        </div>
        <button
          className={"chip " + (active?.status === "draft" ? "draft" : active ? "active" : "")}
          type="button"
          onClick={() => guardedSetView("roster")}
          disabled={!active}
          title={active ? `ACTIVE: ${active.codename || "Untitled"}${dirty ? "*" : ""}` : "No active operator"}
          aria-label={
            active
              ? `Current operator: ${active.codename || "Untitled"}${dirty ? ", unsaved changes" : ""}. Return to roster.`
              : "No active operator"
          }
          style={{
            width: "68px",
            minHeight: "30px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            background: "transparent",
          }}
        >
          {active ? (
            <>
              <span aria-hidden="true">{active.status === "active" ? "● " : "○ "}</span>
              ACTIVE: {active.codename || "Untitled"}
              {dirty ? "*" : ""}
            </>
          ) : (
            "NO ACTIVE"
          )}
        </button>
        <div role="tablist" aria-orientation="vertical" aria-label="Primary views">
          {VIEW_NAV_ITEMS.map(({ key: k, label }) => (
            <button
              key={k}
              ref={(node) => {
                viewTabRefs.current[k] = node;
              }}
              id={viewTabId(k)}
              className={"navbtn" + (view === k ? " on" : "")}
              type="button"
              role="tab"
              aria-selected={view === k}
              aria-controls={PRIMARY_VIEW_PANEL_ID}
              tabIndex={view === k ? 0 : -1}
              onClick={() => activateViewTab(k)}
              onKeyDown={(event) => handleViewTabKeyDown(event, k)}
            >
              <Icon name={k} />
              <span>{label}</span>
              <div className="dot" />
            </button>
          ))}
        </div>
        <form
          ref={exitFormRef}
          action="/auth/signout"
          method="post"
          className="railspacer"
          onSubmit={handleExitSubmit}
        >
          <button className="navbtn" type="submit" title={`Sign out · ${userEmail}`}>
            <Icon name="exit" />
            <span>Exit</span>
            <div className="dot" />
          </button>
        </form>
      </nav>

      <main
        id={PRIMARY_VIEW_PANEL_ID}
        role="tabpanel"
        aria-labelledby={viewTabId(view)}
        tabIndex={0}
      >
        {loading ? (
          <div className="loading">
            <span className="spin" /> Loading field manuals…
          </div>
        ) : loadError ? (
          <div className="empty">
            <h3>Comms down</h3>
            <p>Couldn&apos;t reach the database: {loadError}</p>
            <button className="btn" type="button" onClick={() => void fetchCharacters()}>
              Retry Roster
            </button>
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
                      onClick={() => guardedSetActiveId(c.id)}
                    >
                      <div className="codename">
                        {c.codename || "Untitled"}
                        {c.id === activeId && dirty ? "*" : ""}
                      </div>
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
                  <button className="addbtn" onClick={guardedAddChar} disabled={adding}>
                    {adding ? "Creating…" : "+ New character"}
                  </button>
                </div>
              </aside>

              {active && displayedActive ? (
                <section className={"dossier" + (historyOpen ? " history-open" : "")}>
                  {mobileRoster}
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
                          ref={previewRestoreButtonRef}
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
                    <div className={"casting-stamp" + (isCast(active) ? " is-cast" : "")}>
                      {isCast(active) ? "Cast" : "Uncast"}
                    </div>
                  </header>

                  <div className={"sheet" + (previewingRevision ? " preview-active" : "")}>
                    <Field
                      id={fieldControlId(activeId, "codename")}
                      label="Codename"
                      value={displayedActive.codename}
                      onChange={(v) => set("codename", v)}
                      rows={1}
                      multiline={false}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <Field
                      id={fieldControlId(activeId, "concept")}
                      label="One-line concept"
                      hint="The logline the writer reads first"
                      value={displayedActive.concept}
                      onChange={(v) => set("concept", v)}
                      rows={2}
                      multiline={false}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <Field
                      id={fieldControlId(activeId, "voice")}
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
                        id={fieldControlId(activeId, "cadence")}
                        label="Cadence & delivery"
                        value={displayedActive.cadence}
                        onChange={(v) => set("cadence", v)}
                        rows={5}
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                      <Field
                        id={fieldControlId(activeId, "vocab")}
                        label="Vocabulary & catchphrases"
                        value={displayedActive.vocab}
                        onChange={(v) => set("vocab", v)}
                        rows={5}
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                    </div>
                    <Field
                      id={fieldControlId(activeId, "offlimits")}
                      label="Off-limits"
                      hint="Hard rules — what they never say (keeps you monetizable & on-brand)"
                      value={displayedActive.offlimits}
                      onChange={(v) => set("offlimits", v)}
                      rows={3}
                      readOnly={Boolean(previewingRevision)}
                      locked={Boolean(previewingRevision)}
                    />
                    <Field
                      id={fieldControlId(activeId, "lines")}
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
                        id={fieldControlId(activeId, "beats")}
                        label="Beat template"
                        value={displayedActive.beats}
                        onChange={(v) => set("beats", v)}
                        rows={6}
                        mono
                        readOnly={Boolean(previewingRevision)}
                        locked={Boolean(previewingRevision)}
                      />
                      <Field
                        id={fieldControlId(activeId, "runtime")}
                        label="Runtime target"
                        hint="Enforced at script + render"
                        value={displayedActive.runtime}
                        onChange={(v) => set("runtime", v)}
                        rows={2}
                        multiline={false}
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
                      {dirty && (
                        <span className="savebar-dirty-label chip draft" role="status">
                          • UNPERSISTED CHANGES IN BUFFER
                        </span>
                      )}
                      <button
                        className={"btn" + (isRestoredDraft ? " save-highlight" : "")}
                        onClick={save}
                        disabled={saving || !dirty}
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
                      <button
                        ref={castingTriggerRef}
                        className={"btn ghost" + (isCast(active) ? "" : " save-highlight")}
                        type="button"
                        onClick={() => setCastingOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={castingOpen}
                      >
                        {isCast(active) ? "🎙 Casting Studio" : "🎙 Cast a voice"}
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={handleExport}
                        disabled={saving || loading || !active}
                      >
                        EXPORT MANUAL (MD)
                      </button>
                      <button className="btn ghost" onClick={() => guardedSetView("wire")}>
                        Log an idea →
                      </button>
                    </div>
                  )}
                  {historyOpen && (
                    <HistoryDrawer
                      revisions={revisions}
                      loading={revisionsLoading}
                      error={revisionsError}
                      previewingRevisionId={previewingRevisionId}
                      focusTrapActive={!compareRevision}
                      onClose={closeHistory}
                      onRetry={() => {
                        void fetchRevisions(active.id);
                      }}
                      onPreview={previewRevision}
                      onRestore={requestRestore}
                      onCompare={compareWithRevision}
                      initialFocusRef={compareRestoreFocusRef}
                      restoreFocusRef={historyRestoreFocusRef}
                    />
                  )}
                  {compareRevision && (
                    <CompareDialog
                      current={active}
                      revision={compareRevision}
                      onClose={closeCompare}
                      onRestore={requestRestoreFromCompare}
                      restoreFocusRef={compareRestoreFocusRef}
                    />
                  )}
                  {pendingRestore && (
                    <RestoreDialog
                      revision={pendingRestore}
                      onCancel={cancelRestore}
                      onConfirm={confirmRestore}
                      restoreFocusRef={restoreDialogRestoreFocusRef}
                    />
                  )}
                </section>
              ) : (
                <section className="dossier">
                  {mobileRoster}
                  <div className="empty">
                    <Icon name="roster" />
                    <h3>No characters yet</h3>
                    <p>Create your first character to start building a field manual.</p>
                    <button className="btn" onClick={guardedAddChar} disabled={adding}>
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
                  TRANSMITTING FREQUENCY · LOG NEW BEAT
                </span>
                <div className="field" style={{ marginTop: 12 }}>
                  <textarea
                    ref={ideaTitleRef}
                    rows={2}
                    value={draftIdea}
                    placeholder={'Dossier title (e.g. "Acoustic Kitty target extraction")...'}
                    onChange={(e) => setDraftIdea(e.target.value)}
                    onKeyDown={handleIdeaTitleKeyDown}
                    disabled={ideaCaptureDisabled}
                    aria-label="New idea title"
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="field" style={{ marginTop: 10 }}>
                  <textarea
                    rows={ideaNoteFocused || draftIdeaNote ? 4 : 1}
                    value={draftIdeaNote}
                    placeholder="Tactical notes, dialogue fragments, or scene beats (optional)..."
                    onChange={(e) => setDraftIdeaNote(e.target.value)}
                    onFocus={() => setIdeaNoteFocused(true)}
                    onBlur={() => setIdeaNoteFocused(false)}
                    onKeyDown={handleIdeaNoteKeyDown}
                    disabled={ideaCaptureDisabled}
                    aria-label="New idea note"
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="row" style={{ marginTop: 10, alignItems: "center" }}>
                  <select
                    className="tag-select"
                    value={activeId ?? ""}
                    disabled
                    aria-label="Idea character assignment"
                  >
                    {active ? (
                      <option value={active.id}>{active.codename || "Untitled"}</option>
                    ) : (
                      <option value="">No dossier assigned</option>
                    )}
                  </select>
                  <select
                    className="tag-select"
                    value={CHANNELS[0]}
                    disabled
                    aria-label="Idea channel assignment"
                  >
                    <option value={CHANNELS[0]}>{CHANNELS[0]}</option>
                  </select>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => void logIdea()}
                    disabled={!canSubmitIdea}
                  >
                    {ideaSubmittingTitle ? "TRANSMITTING..." : "LOG IT"}
                  </button>
                </div>
              </div>
              {ideasError && ideas.length > 0 && (
                <div className="cap" role="alert">
                  <span className="eyebrow">Wire read degraded</span>
                  <div className="row" style={{ marginTop: 9, alignItems: "center" }}>
                    <span className="note">Couldn&apos;t refresh logged ideas: {ideasError}</span>
                    <button className="btn" type="button" onClick={() => void fetchIdeas()}>
                      Retry Wire
                    </button>
                  </div>
                </div>
              )}
              {ideasLoading && ideas.length === 0 ? (
                <div className="loading">
                  <span className="spin" /> Loading wire queue…
                </div>
              ) : ideasError && ideas.length === 0 ? (
                <div className="empty">
                  <h3>Wire unavailable</h3>
                  <p>Couldn&apos;t read logged ideas: {ideasError}</p>
                  <button className="btn" type="button" onClick={() => void fetchIdeas()}>
                    Retry Wire
                  </button>
                </div>
              ) : ideas.length === 0 ? (
                <div className="empty">
                  <h3>The wire&apos;s quiet</h3>
                  <p>Nothing logged yet. Drop the next idea above the moment it lands.</p>
                </div>
              ) : (
                <div className="wire-list">
                  {ideas.map((i) => {
                    const writeState = i.clientWriteState;
                    const isWriteBlocked = Boolean(writeState);
                    const currentDossier = activeId
                      ? chars.find((c) => c.id === activeId)
                      : undefined;
                    const groupedDossiers = chars.filter((c) => c.id !== currentDossier?.id);
                    const activeDossiers = groupedDossiers.filter((c) => c.status === "active");
                    const draftDossiers = groupedDossiers.filter((c) => c.status !== "active");
                    const borderLeftColor =
                      writeState === "failed"
                        ? "var(--stamp)"
                        : writeState === "saving"
                          ? "var(--line-soft)"
                          : i.status === "active"
                            ? "var(--brass)"
                            : i.status === "used"
                              ? "var(--cleared)"
                              : "var(--line)";
                    return (
                      <div
                        key={i.clientKey ?? i.id}
                        className="icard"
                        aria-busy={writeState === "saving"}
                        style={{
                          borderLeftColor,
                          borderColor: writeState === "failed" ? "var(--stamp-deep)" : undefined,
                          opacity: writeState === "saving" ? 0.65 : undefined,
                        }}
                      >
                        <div className="body">
                          <div className="title">{i.title}</div>
                          {i.note && <div className="note">{i.note}</div>}
                          <div className="tags">
                            {writeState === "saving" ? (
                              <span className="statusbtn">[TRANSMITTING...]</span>
                            ) : writeState === "failed" ? (
                              <>
                                <button
                                  className="statusbtn"
                                  type="button"
                                  onClick={() => retryIdea(i)}
                                  disabled={ideaCaptureDisabled}
                                >
                                  [TRANSMISSION FAILED - RETRY]
                                </button>
                                <button
                                  className="statusbtn"
                                  type="button"
                                  onClick={() => dismissIdea(i.id)}
                                >
                                  Dismiss
                                </button>
                              </>
                            ) : (
                              <div
                                className="status-segmented-control"
                                role="group"
                                aria-label="Update idea status"
                              >
                                {IDEA_STATUS_OPTIONS.map((status) => {
                                  const isActiveStatus = i.status === status;
                                  return (
                                    <button
                                      key={status}
                                      className={
                                        "segment-btn" +
                                        (isActiveStatus ? " active-segment s-" + status : "")
                                      }
                                      type="button"
                                      aria-pressed={isActiveStatus}
                                      disabled={isWriteBlocked}
                                      onClick={() => setIdeaStatus(i.id, status)}
                                    >
                                      {IDEA_STATUS_LABELS[status]}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {!isWriteBlocked && i.status !== "used" && (
                              <button
                                ref={(node) => {
                                  if (node) enqueueButtonRefs.current.set(i.id, node);
                                  else enqueueButtonRefs.current.delete(i.id);
                                }}
                                className="statusbtn enqueue-trigger"
                                type="button"
                                onClick={(event) => openEnqueuePanel(i.id, event.currentTarget)}
                                aria-haspopup="dialog"
                                aria-expanded={activeEnqueueIdeaId === i.id}
                              >
                                [ Queue as run ]
                              </button>
                            )}
                            <select
                              className="tag-select"
                              value={chars.length === 0 ? "" : i.character_id ?? ""}
                              onChange={(e) =>
                                setIdeaField(i.id, "character_id", e.target.value)
                              }
                              disabled={isWriteBlocked || chars.length === 0}
                              aria-label="Assign character"
                            >
                              {chars.length === 0 ? (
                                <option value="">[ No characters on file ]</option>
                              ) : (
                                <>
                                  <option value="">[ -- Unassigned -- ]</option>
                                  {currentDossier && (
                                    <option value={currentDossier.id}>
                                      ⚡ Current Dossier: {currentDossier.codename || "Untitled"}
                                    </option>
                                  )}
                                  {activeDossiers.length > 0 && (
                                    <optgroup label="Active Field Manuals">
                                      {activeDossiers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          ● {c.codename || "Untitled"}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {draftDossiers.length > 0 && (
                                    <optgroup label="Draft Field Manuals">
                                      {draftDossiers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          ○ {c.codename || "Untitled"}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </>
                              )}
                            </select>
                            <select
                              className="tag-select"
                              value={i.channel}
                              onChange={(e) =>
                                setIdeaField(i.id, "channel", e.target.value)
                              }
                              disabled={isWriteBlocked}
                              aria-label="Assign channel"
                            >
                              {CHANNELS.map((ch) => (
                                <option key={ch} value={ch}>
                                  {ch}
                                </option>
                              ))}
                            </select>
                          </div>
                          {writeState === "failed" && i.clientError && (
                            <div className="note" role="alert" style={{ color: "var(--stamp)" }}>
                              {i.clientError}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === "queue" && (
            <div className="wire">
              <div className="col-head">
                <h2>Queue</h2>
                <span className="count">
                  {jobsLoading
                    ? "interrogating pipeline"
                    : `pipeline queue · ${activeQueueJobs} active job${activeQueueJobs === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="cap">
                <span className="eyebrow">
                  Upstream jobs before production. Runs are finished episodes after the worker
                  pipeline writes output.
                </span>
              </div>

              {jobsLoading ? (
                <div className="wire-list" aria-label="Loading queued jobs">
                  <div className="queue-card-meta">Interrogating pipeline database...</div>
                  {[0, 1, 2].map((row) => (
                    <div
                      key={row}
                      className="icard job-card skeleton skeleton-card"
                      aria-hidden="true"
                    >
                      <div className="queue-card-head">
                        <span className="skeleton skeleton-text skeleton-wide" />
                        <span className="skeleton skeleton-text skeleton-badge" />
                      </div>
                      <span className="skeleton skeleton-text" />
                      <span className="skeleton skeleton-text skeleton-short" />
                    </div>
                  ))}
                </div>
              ) : jobsError ? (
                <div className="queue-error-banner" role="alert">
                  <h3>Comms Down</h3>
                  <p>Couldn&apos;t reach the pipeline jobs database: {jobsError}</p>
                  <button className="btn" type="button" onClick={() => void fetchJobs()}>
                    Retry Queue Connection
                  </button>
                </div>
              ) : jobs.length === 0 ? (
                <div className="empty">
                  <Icon name="queue" />
                  <h3>The queue is clear</h3>
                  <p>
                    No jobs are currently registered in the pipeline. Dispatch a target run
                    from The Wire to engage the worker engines.
                  </p>
                </div>
              ) : (
                <div className="wire-list" aria-label="Pipeline jobs">
                  {jobs.map((job) => {
                    const status = classifyJobStatus(job.status);
                    const actionable = isActionableStatus(status);
                    const terminal = isTerminalStatus(status);
                    const park = jobParkById[job.id];
                    const hasSpend = typeof job.spend === "number" && job.spend > 0;
                    const episodeKnown = job.episode_id
                      ? episodes.some((episode) => episode.episode_id === job.episode_id)
                      : false;
                    const cardClass =
                      "icard job-card status-" +
                      status +
                      (status === "running" ? " running-pulse" : "");

                    return (
                      <article
                        key={job.id}
                        className={cardClass}
                        aria-label={`${JOB_STATUS_LABELS[status]} job for ${job.food}`}
                      >
                        <div className="body">
                          <div className="queue-card-head">
                            <div>
                              <div className="title">{job.food}</div>
                              <div className="queue-card-meta">
                                <span>OPERATOR: {job.character ?? "default"}</span>
                                <span>CREATED: {formatQueueTimestamp(job.created_at)}</span>
                                <span>Attempts: {job.attempts}/3</span>
                                {terminal && <span>Terminal</span>}
                              </div>
                            </div>
                            <span className={`status-badge ${status}`}>
                              [ {JOB_STATUS_LABELS[status].toUpperCase()} ]
                            </span>
                          </div>

                          {hasSpend && (
                            <div className="queue-card-spend">
                              Spend: {formatUsd(job.spend ?? 0)}
                            </div>
                          )}

                          {actionable && status === "ready_for_review" && (
                            <>
                              {park?.loading ? (
                                <div className="job-review-panel" role="status">
                                  <h4>Review Park Detected</h4>
                                  <p>Reading latest receipt to classify the parked gate.</p>
                                </div>
                              ) : park?.kind === "publish" ? (
                                <div className="job-review-panel">
                                  <h4>Publish Park Detected</h4>
                                  <p>
                                    Distribution is waiting on human approval.
                                    {park.stage ? ` Last receipt stage: ${park.stage}.` : ""}
                                  </p>
                                  <p className="queue-card-substatus">
                                    No Buffer adapter is wired yet; approval parks safely before any real post.
                                  </p>
                                  <button
                                    className="btn compact"
                                    type="button"
                                    onClick={(event) =>
                                      requestQueueAction(job, "publish", event.currentTarget)
                                    }
                                  >
                                    Approve &amp; publish
                                  </button>
                                </div>
                              ) : park?.kind === "spend" ? (
                                <div className="job-review-panel">
                                  <h4>Spend Park Detected</h4>
                                  <p>
                                    This job was parked to prevent runaway credit usage.
                                    {park.stage ? ` Last receipt stage: ${park.stage}.` : ""}
                                  </p>
                                  <button
                                    className="btn compact"
                                    type="button"
                                    onClick={(event) =>
                                      requestQueueAction(job, "spend", event.currentTarget)
                                    }
                                  >
                                    Approve spend &amp; continue
                                  </button>
                                </div>
                              ) : (
                                <div className="job-review-panel">
                                  <h4>Review Park Unresolved</h4>
                                  <p>
                                    No episode receipt could classify this parked job yet.
                                    {park?.error ? ` Receipt read failed: ${park.error}` : ""}
                                  </p>
                                  <button
                                    className="btn compact"
                                    type="button"
                                    onClick={(event) =>
                                      requestQueueAction(job, "spend", event.currentTarget)
                                    }
                                  >
                                    Approve spend &amp; continue safely
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {actionable && status === "stale" && (
                            <div className="stale-affordance">
                              <h4>Stranded Job</h4>
                              <p className="queue-card-substatus">stranded - needs attention</p>
                              <button
                                className="btn ghost compact"
                                type="button"
                                onClick={(event) =>
                                  requestQueueAction(job, "stale", event.currentTarget)
                                }
                              >
                                Re-run Job
                              </button>
                            </div>
                          )}

                          <div className="queue-card-actions">
                            {job.episode_id && (
                              <button
                                ref={(node) => {
                                  if (!job.episode_id) return;
                                  if (node) runButtonRefs.current.set(job.episode_id, node);
                                  else runButtonRefs.current.delete(job.episode_id);
                                }}
                                className="btn ghost compact"
                                type="button"
                                onClick={() => {
                                  if (job.episode_id) openRunDetail(job.episode_id);
                                }}
                                aria-haspopup="dialog"
                                aria-expanded={activeEpisodeId === job.episode_id}
                                title={
                                  episodeKnown
                                    ? "Open run detail"
                                    : "Episode id is present; run detail opens when the episode row is available."
                                }
                              >
                                Open Run Detail
                              </button>
                            )}
                            {job.spend_approved && (
                              <span className="queue-card-substatus">spend authorized</span>
                            )}
                          </div>
                        </div>
                      </article>
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
                  restoreFocusRef={runDetailRestoreFocusRef}
                />
              )}
            </div>
          )}

          {view === "runs" && (
            <div className="wire">
              <div className="col-head">
                <h2>Runs</h2>
                <span className="count">
                  {episodesLoading
                    ? "loading pipeline output"
                    : `pipeline output · ${episodes.length} episode${episodes.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="cap"><span className="eyebrow">Operation-wide pipeline output — every character&apos;s finished episodes.</span></div>
              {episodesLoading ? (
                <div className="loading">
                  <span className="spin" /> Loading pipeline output…
                </div>
              ) : episodesError ? (
                <div className="empty">
                  <Icon name="runs" />
                  <h3>Runs unavailable</h3>
                  <p>Couldn&apos;t read pipeline episodes: {episodesError}</p>
                  <button className="btn" type="button" onClick={() => void fetchEpisodes()}>
                    Retry Runs
                  </button>
                </div>
              ) : episodes.length === 0 ? (
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
                  restoreFocusRef={runDetailRestoreFocusRef}
                />
              )}
            </div>
          )}

          {view === "overview" && (
            <OverviewDashboard
              chars={chars}
              ideas={ideas}
              episodes={episodes}
              costStats={costStats}
              costReceiptsLoading={costReceiptsLoading}
              costReceiptsError={costReceiptsError}
            />
          )}

          {view === "cost" && (
            <CostBoxDashboard
              episodes={episodes}
              costStats={costStats}
              loading={costReceiptsLoading}
              error={costReceiptsError}
              receiptsLoaded={costReceiptsLoaded}
              onRetry={() => void fetchCostReceipts()}
            />
          )}
          </>
        )}
      </main>
      {activeEnqueueIdea && (
        <EnqueueIdeaPanel
          idea={activeEnqueueIdea}
          character={activeEnqueueCharacter}
          characters={chars}
          onClose={closeEnqueuePanel}
          onSubmit={enqueueJob}
          restoreFocusRef={enqueueRestoreFocusRef}
        />
      )}
      {castingOpen && active && (
        <CastingStudioPanel
          character={active}
          supabase={supabase}
          onClose={() => setCastingOpen(false)}
          onCharacterPatched={patchCharacter}
          showFlash={showFlash}
          restoreFocusRef={castingTriggerRef}
        />
      )}
      {pendingDirtyAction && active && (
        <DiscardChangesDialog
          codename={dirtyCodename}
          onCancel={cancelDirtyAction}
          onConfirm={confirmDirtyAction}
          restoreFocusRef={discardDialogRestoreFocusRef}
        />
      )}
      {pendingQueueAction && (
        <QueueActionDialog
          job={pendingQueueAction.job}
          action={pendingQueueAction.action}
          submitting={queueActionSubmitting}
          onCancel={cancelQueueAction}
          onConfirm={() => {
            void confirmQueueAction();
          }}
          restoreFocusRef={queueActionRestoreFocusRef}
        />
      )}
    </div>
  );
}
