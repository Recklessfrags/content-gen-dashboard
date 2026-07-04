"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bibleToMarkdown, downloadMarkdown } from "@/lib/exportBible";
import { useChannelProfiles } from "@/lib/hooks/useChannelProfiles";
import {
  DRAFT_CHARACTER_ID,
  isDraftCharacterId,
  useCharacters,
} from "@/lib/hooks/useCharacters";
import { useCostReceipts } from "@/lib/hooks/useCostReceipts";
import { useDirtyState } from "@/lib/hooks/useDirtyState";
import { useEpisodes } from "@/lib/hooks/useEpisodes";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useIdeas } from "@/lib/hooks/useIdeas";
import { useJobs } from "@/lib/hooks/useJobs";
import { usePolling } from "@/lib/hooks/usePolling";
import { useReceipts } from "@/lib/hooks/useReceipts";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import {
  buildFactApprovalReenqueue,
  buildPublishApprovalReenqueue,
  buildSpendApprovalReenqueue,
  buildJobInsert,
  classifyJobStatus,
  detectParkKind,
  isActionableStatus,
  isTerminalStatus,
  jobInputFromRow,
  JOB_STATUS_LABELS,
  publishSourceEpisodeId,
  resolveParkKind,
  type JobEnqueueInput,
} from "@/lib/jobs";
import { isCast } from "@/lib/casting";
import { isVisuallyCast, signedRefImageUrl } from "@/lib/castingVisual";
import { createClient } from "@/lib/supabase/client";
import { suggestPersonaForChannel } from "@/lib/suggestPersona";
import {
  CHANNELS,
  type CharacterBibleRevision,
  type IdeaStatus,
  type Receipt,
} from "@/lib/types";
import { AuroraShell } from "./aurora/AuroraShell";
import { ActionCenter } from "./aurora/ActionCenter";
import { HubLanding } from "./aurora/HubLanding";
import type { ChannelCardVM } from "./aurora/ChannelsHub";
import { CastingStudioPanel } from "./controlroom/CastingStudioPanel";
import { ChannelProfilesPanel } from "./controlroom/ChannelProfilesPanel";
import { CompareDialog } from "./controlroom/CompareDialog";
import { CostBoxDashboard } from "./controlroom/CostBoxDashboard";
import { DrillDownPanel } from "./controlroom/DrillDownPanel";
import { EnqueueIdeaPanel } from "./controlroom/EnqueueIdeaPanel";
import { HistoryDrawer } from "./controlroom/HistoryDrawer";
import { OverviewDashboard } from "./controlroom/OverviewDashboard";
import { QueueActionDialog } from "./controlroom/QueueActionDialog";
import { VisualIdentityPanel } from "./controlroom/VisualIdentityPanel";
import {
  DEFAULT_HUB,
  DEFAULT_TAB,
  WORKSPACE_TABS,
  parseScope,
  scopeToSearch,
  scopeToUrl,
  scopesEqual,
  type AppScope,
  type WorkspaceTab,
} from "@/lib/route";
import {
  Icon,
  Field,
  computeCostStats,
  editableSnapshot,
  flattenRevision,
  formatRevisionDate,
  formatUsd,
  isClearedStatus,
  isFailedStatus,
  toBible,
  type CostReceipt,
  type EnqueueSubmitResult,
  type FlatChar,
  type JobParkResolution,
  type PendingDirtyAction,
  type QueueJob,
} from "./controlroom/shared";

type View = "roster" | "channels" | "wire" | "queue" | "runs" | "overview" | "cost";
const VIEW_KEYS: View[] = ["roster", "channels", "wire", "queue", "runs", "overview", "cost"];
const VIEW_NAV_ITEMS: ReadonlyArray<{ key: View; label: string }> = [
  { key: "roster", label: "Roster" },
  { key: "channels", label: "Channels" },
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

function workspaceTabId(tab: WorkspaceTab) {
  return `workspace-tab-${tab}`;
}

function workspacePanelId(tab: WorkspaceTab) {
  return `workspace-panel-${tab}`;
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
  return `${window.location.pathname}?view=${view}${window.location.hash}`;
}

function isApprovalParkKind(
  parkKind: string | null | undefined,
): parkKind is "fact" | "spend" | "publish" {
  return parkKind === "fact" || parkKind === "spend" || parkKind === "publish";
}


const IDEA_STATUS_OPTIONS: IdeaStatus[] = ["backlog", "active", "used"];
const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  backlog: "Backlog",
  active: "Active",
  used: "Used",
};

type QueueFilter = "all" | "review" | "errors" | "running" | "done";
type RunsFilter = "all" | "success" | "running" | "failed";

const QUEUE_FILTERS: ReadonlyArray<{ key: QueueFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "review", label: "Needs review" },
  { key: "errors", label: "Errors" },
  { key: "running", label: "Running" },
  { key: "done", label: "Done" },
];

const RUNS_FILTERS: ReadonlyArray<{ key: RunsFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "success", label: "Success" },
  { key: "running", label: "Running" },
  { key: "failed", label: "Failed" },
];

const WORKSPACE_TAB_LABELS: Record<WorkspaceTab, string> = {
  production: "Production",
  character: "Character",
  guidelines: "Guidelines",
  cost: "Cost",
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

function timestampMs(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function queueActionPriority(job: QueueJob) {
  const status = classifyJobStatus(job.status);
  if (status === "ready_for_review") return 0;
  if (status === "error" || status === "stale") return 1;
  return 2;
}

function queueJobMatchesFilter(job: QueueJob, filter: QueueFilter) {
  const status = classifyJobStatus(job.status);
  if (filter === "all") return true;
  if (filter === "review") return status === "ready_for_review";
  if (filter === "errors") return status === "error" || status === "stale";
  if (filter === "running") return status === "queued" || status === "running";
  return status === "done" || status === "no_op";
}

function runMatchesFilter(status: string, filter: RunsFilter) {
  if (filter === "all") return true;
  if (filter === "success") return isClearedStatus(status);
  if (filter === "failed") return isFailedStatus(status);
  return !isClearedStatus(status) && !isFailedStatus(status);
}

function channelInitials(channel: string, character: string | null | undefined) {
  const source = `${channel} ${character ?? ""}`;
  const chars = source.match(/[a-z0-9]/gi) ?? [];
  return chars.slice(0, 2).join("").toUpperCase() || "CH";
}

function characterInitials(codename: string) {
  const tokens = codename.trim().split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return `${tokens[0]?.[0] ?? ""}${tokens[1]?.[0] ?? ""}`.toUpperCase() || "CH";
  }
  const chars = codename.match(/[a-z0-9]/gi) ?? [];
  return chars.slice(0, 2).join("").toUpperCase() || "CH";
}

function comparableChannel(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function operatorInitialsFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  const chars = localPart.match(/[a-z0-9]/gi) ?? [];
  return chars.slice(0, 2).join("").toUpperCase() || "OP";
}

function splitQueueErrorText(error: string) {
  const trimmed = error.trim();
  const [firstRaw, ...restLines] = trimmed.split(/\r?\n/);
  if (restLines.length > 0) {
    const firstLine =
      firstRaw.length > 160 ? `${firstRaw.slice(0, 160).trimEnd()}...` : firstRaw;

    return {
      firstLine,
      rest: trimmed,
    };
  }
  if (firstRaw.length <= 160) {
    return { firstLine: firstRaw, rest: "" };
  }
  return {
    firstLine: `${firstRaw.slice(0, 160).trimEnd()}...`,
    rest: firstRaw,
  };
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

function DossierVisualAttachment({
  character,
  supabase,
}: {
  character: FlatChar;
  supabase: ReturnType<typeof createClient>;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const path = character.reference_image_url?.trim() || null;

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      setMissing(false);
      return undefined;
    }

    let cancelled = false;
    setSignedUrl(null);
    setMissing(false);
    void signedRefImageUrl(supabase, path)
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });

    return () => {
      cancelled = true;
    };
  }, [path, supabase]);

  if (!path) {
    return (
      <div className="dossier-visual-attachment dossier-visual-attachment--empty">
        <span>NO VISUAL ID ON FILE</span>
      </div>
    );
  }

  return (
    <figure className={"dossier-visual-attachment" + (missing ? " dossier-visual-attachment--missing" : "")}>
      {signedUrl && !missing ? (
        <img src={signedUrl} alt="" />
      ) : (
        <div className="dossier-visual-placeholder" aria-hidden="true" />
      )}
      <figcaption>{missing ? "VISUAL ID MISSING" : character.visual_style || "VISUAL ID LOCKED"}</figcaption>
    </figure>
  );
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
    poll: pollEpisodes,
  } = useEpisodes(supabase);
  const {
    jobs,
    loading: jobsLoading,
    error: jobsError,
    refetch: fetchJobs,
    poll: pollJobs,
  } = useJobs(supabase);
  const {
    costReceipts,
    loading: costReceiptsLoading,
    error: costReceiptsError,
    loaded: costReceiptsLoaded,
    refetch: fetchCostReceipts,
  } = useCostReceipts(supabase);
  const {
    profiles: channelProfiles,
    loading: channelProfilesLoading,
    error: channelProfilesError,
    refetch: refetchChannelProfiles,
  } = useChannelProfiles(supabase);
  const {
    receipts,
    loading: receiptsLoading,
    error: receiptsError,
    load: fetchReceipts,
    clear: clearReceipts,
    reset: resetReceipts,
  } = useReceipts(supabase);
  const {
    chars,
    loading,
    loadError,
    savedSnapshots,
    refetch: refetchCharacters,
    setField,
    applySnapshot,
    applyCharacter,
    patchCharacter,
    createDraftCharacter,
    persistDraftCharacter,
    discardDraftCharacter,
    commitSnapshot,
  } = useCharacters(supabase);
  const channelCharacterOptions = useMemo(
    () => chars.map((character) => ({ id: character.id, codename: character.codename })),
    [chars],
  );
  const [jobParkById, setJobParkById] = useState<Record<number, JobParkResolution>>({});
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [activeEnqueueIdeaId, setActiveEnqueueIdeaId] = useState<string | null>(null);
  const [castingOpen, setCastingOpen] = useState(false);
  const [visualCastingOpen, setVisualCastingOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
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
  const [scope, setScope] = useState<AppScope>({ kind: "hub", hub: DEFAULT_HUB });
  const [legacyShellOpen, setLegacyShellOpen] = useState(false);
  const [channelsAutoNew, setChannelsAutoNew] = useState(false);
  const [draftIdea, setDraftIdea] = useState("");
  const [draftIdeaNote, setDraftIdeaNote] = useState("");
  const [draftIdeaCharacterId, setDraftIdeaCharacterId] = useState<string | null>(null);
  const [draftIdeaChannel, setDraftIdeaChannel] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [runsFilter, setRunsFilter] = useState<RunsFilter>("all");
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const adding = false;
  const [pendingQueueAction, setPendingQueueAction] = useState<{
    job: QueueJob;
    action: "fact" | "spend" | "publish" | "stale";
  } | null>(null);
  const [queueActionSubmitting, setQueueActionSubmitting] = useState(false);
  useEffect(() => {
    setPendingQueueAction(null);
  }, [scope]);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewTabRefs = useRef<Record<View, HTMLButtonElement | null>>({
    roster: null,
    channels: null,
    wire: null,
    queue: null,
    runs: null,
    overview: null,
    cost: null,
  });
  const workspaceTabRefs = useRef<Record<WorkspaceTab, HTMLButtonElement | null>>({
    production: null,
    character: null,
    guidelines: null,
    cost: null,
  });
  const runButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const enqueueButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastRunTriggerRef = useRef<string | null>(null);
  const lastEnqueueTriggerRef = useRef<string | null>(null);
  const runDetailRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const enqueueRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const headerHistoryButtonRef = useRef<HTMLButtonElement>(null);
  const castingTriggerRef = useRef<HTMLButtonElement | null>(null);
  const visualCastingTriggerRef = useRef<HTMLButtonElement | null>(null);
  const inlineCastingRestoreRef = useRef<HTMLButtonElement>(null);
  const savebarHistoryButtonRef = useRef<HTMLButtonElement>(null);
  const lastHistoryTriggerRef = useRef<"header" | "savebar" | null>(null);
  const historyRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const compareRestoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const previewRestoreButtonRef = useRef<HTMLButtonElement>(null);
  const lastRestoreTriggerRef = useRef<"history" | "preview" | null>(null);
  const restoreDialogRestoreFocusRef = useRef<HTMLElement | null>(null);
  const revisionRequestRef = useRef(0);
  const lastManualFocusRef = useRef<HTMLElement | null>(null);
  const lastDirtyTriggerRef = useRef<HTMLElement | null>(null);
  const discardDialogRestoreFocusRef = useRef<HTMLElement | null>(null);
  const queueActionRestoreFocusRef = useRef<HTMLElement | null>(null);
  const exitFormRef = useRef<HTMLFormElement>(null);
  const ideaTitleRef = useRef<HTMLTextAreaElement>(null);
  const didInitScopeRef = useRef(false);
  const showFlash = useCallback((msg: string, err = false) => {
    setFlash({ msg, err });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  }, []);
  const writeIdeaJobMap = async ({
    key,
    ideaId,
    channel,
  }: {
    key: string;
    ideaId: string | null;
    channel: string | null;
  }) => {
    const { error } = await supabase.from("idea_job_map").insert({
      idempotency_key: key,
      idea_id: ideaId,
      channel,
    });

    if (error) {
      console.error("Could not record idea/job provenance", error);
      showFlash("Run queued (thread link skipped)");
    }
  };
  const {
    ideas,
    loading: ideasLoading,
    error: ideasError,
    submittingTitle: ideaSubmittingTitle,
    refetch: fetchIdeas,
    addIdea,
    retryIdea,
    dismissIdea,
    setIdeaStatus,
    setIdeaField,
  } = useIdeas(supabase, { showFlash });
  const fetchCharacters = useCallback(async () => {
    const result = await refetchCharacters((flat) => {
      setActiveId((current) =>
        current && flat.some((character) => character.id === current)
          ? current
          : (flat[0]?.id ?? null),
      );
    });
    if (result?.ok === false) setActiveId(null);
  }, [refetchCharacters]);

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

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    void fetchCharacters();
    void fetchIdeas();
  }, [fetchCharacters, fetchIdeas]);

  useEffect(() => {
    const readyJobs = jobs.filter((job) => {
      const status = classifyJobStatus(job.status);
      if (status !== "ready_for_review") return false;

      const cachedPark = jobParkById[job.id];
      return (
        cachedPark === undefined ||
        (!cachedPark.loading &&
          isApprovalParkKind(job.park_kind) &&
          cachedPark.kind !== job.park_kind)
      );
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
      const columnKind = resolveParkKind(job.park_kind, null);
      if (columnKind !== "unknown") {
        setJobParkById((current) => ({
          ...current,
          [job.id]: { kind: columnKind, loading: false, stage: null, error: null },
        }));
        continue;
      }

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
  const activeIsDraft = isDraftCharacterId(active?.id);
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
  const knownChannels = useMemo(
    () => channelProfiles.map((profile) => profile.channel),
    [channelProfiles],
  );
  const operatorInitials = useMemo(() => operatorInitialsFromEmail(userEmail), [userEmail]);
  const currentEditableFields = useMemo(() => (active ? editableSnapshot(active) : null), [active]);
  const savedEditableFields = activeId
    ? (savedSnapshots[activeId] ?? currentEditableFields)
    : null;
  const dirty = useDirtyState(currentEditableFields, savedEditableFields);
  const overlayOpen = activeEpisodeId !== null || pendingQueueAction !== null;
  const POLL_MS = 5000;

  usePolling(pollJobs, {
    enabled: ((!legacyShellOpen) || view === "queue") && !overlayOpen,
    intervalMs: POLL_MS,
  });
  usePolling(pollEpisodes, {
    enabled: ((!legacyShellOpen) || view === "runs" || view === "queue") && !overlayOpen,
    intervalMs: POLL_MS,
  });

  const set = (field: keyof FlatChar, val: string) => setField(activeId, field, val);

  const revertActiveEdits = useCallback(() => {
    if (!activeId) return;
    const snapshot = savedSnapshots[activeId];
    if (!snapshot) return;
    applySnapshot(activeId, snapshot);
    setPreviewingRevisionId(null);
    setIsRestoredDraft(false);
  }, [activeId, applySnapshot, savedSnapshots]);

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
      guardDirtyAction(() => {
        if (isDraftCharacterId(activeId)) discardDraftCharacter();
        setActiveId(nextId);
      });
    },
    [activeId, discardDraftCharacter, guardDirtyAction],
  );

  const guardedSetView = useCallback(
    (nextView: View, cancel?: () => void) => {
      if (nextView === view) return;
      // In-app nav: push a history entry (after the dirty guard approves) so
      // the URL reflects the view AND browser back/forward moves between views.
      guardDirtyAction(() => {
        if (isDraftCharacterId(activeId)) discardDraftCharacter();
        setView(nextView);
        if (typeof window !== "undefined") {
          window.history.pushState(null, "", viewUrl(nextView));
        }
      }, cancel);
    },
    [activeId, discardDraftCharacter, guardDirtyAction, view],
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

  const focusWorkspaceTab = useCallback((nextTab: WorkspaceTab) => {
    workspaceTabRefs.current[nextTab]?.focus();
  }, []);

  const navigate = useCallback(
    (next: AppScope) => {
      if (activeId === DRAFT_CHARACTER_ID) discardDraftCharacter();
      didInitScopeRef.current = true;
      setLegacyShellOpen(false);
      setPendingQueueAction(null);
      setChannelsAutoNew(false);
      setScope(next);
      if (typeof window !== "undefined") {
        window.history.pushState(
          null,
          "",
          scopeToUrl(next, window.location.pathname, window.location.hash),
        );
      }
    },
    [activeId, discardDraftCharacter],
  );

  const openLegacyConsole = useCallback(
    (nextView: View = "roster") => {
      guardDirtyAction(() => {
        if (activeId === DRAFT_CHARACTER_ID) discardDraftCharacter();
        didInitScopeRef.current = true;
        setLegacyShellOpen(true);
        setPendingQueueAction(null);
        setView(nextView);
        if (typeof window !== "undefined") {
          window.history.pushState(null, "", viewUrl(nextView));
        }
      });
    },
    [activeId, discardDraftCharacter, guardDirtyAction],
  );

  const activateWorkspaceTab = useCallback(
    (channel: string, nextTab: WorkspaceTab) => {
      if (scope.kind === "workspace" && scope.channel === channel && scope.tab === nextTab) {
        return;
      }
      navigate({ kind: "workspace", channel, tab: nextTab });
    },
    [navigate, scope],
  );

  const handleWorkspaceTabKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      channel: string,
      currentTab: WorkspaceTab,
    ) => {
      const currentIndex = WORKSPACE_TABS.indexOf(currentTab);
      if (currentIndex === -1) return;

      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex =
          (currentIndex + direction + WORKSPACE_TABS.length) % WORKSPACE_TABS.length;
        focusWorkspaceTab(WORKSPACE_TABS[nextIndex]);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusWorkspaceTab(WORKSPACE_TABS[0]);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        focusWorkspaceTab(WORKSPACE_TABS[WORKSPACE_TABS.length - 1]);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateWorkspaceTab(channel, currentTab);
      }
    },
    [activateWorkspaceTab, focusWorkspaceTab],
  );

  useEffect(() => {
    if (didInitScopeRef.current) return;

    if (channelProfilesLoading) return;

    didInitScopeRef.current = true;
    const { scope: nextScope, canonicalize } = parseScope(window.location.search, {
      knownChannels: channelProfilesError !== null ? undefined : knownChannels,
    });

    setScope((current) => (scopesEqual(current, nextScope) ? current : nextScope));
    setLegacyShellOpen(false);

    if (canonicalize) {
      window.history.replaceState(
        null,
        "",
        scopeToUrl(nextScope, window.location.pathname, window.location.hash),
      );
    }
  }, [channelProfilesError, channelProfilesLoading, knownChannels]);

  useEffect(() => {
    if (
      !didInitScopeRef.current ||
      legacyShellOpen ||
      channelProfilesLoading ||
      channelProfilesError !== null ||
      scope.kind !== "workspace" ||
      knownChannels.includes(scope.channel)
    ) {
      return;
    }

    const nextScope: AppScope = { kind: "hub", hub: DEFAULT_HUB };
    setScope(nextScope);
    window.history.replaceState(
      null,
      "",
      scopeToUrl(nextScope, window.location.pathname, window.location.hash),
    );
  }, [channelProfilesError, channelProfilesLoading, knownChannels, legacyShellOpen, scope]);

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = readViewFromUrl();
      const cancelUrl = legacyShellOpen
        ? viewUrl(view)
        : scopeToUrl(scope, window.location.pathname, window.location.hash);

      if (fromUrl !== null) {
        if (legacyShellOpen && fromUrl === view) return;
        guardDirtyAction(
          () => {
            setPendingQueueAction(null);
            setView(fromUrl);
            setLegacyShellOpen(true);
          },
          () => window.history.replaceState(null, "", cancelUrl),
        );
        return;
      }

      const { scope: nextScope, canonicalize } = parseScope(window.location.search, {
        knownChannels:
          channelProfilesLoading || channelProfilesError !== null ? undefined : knownChannels,
      });

      if (scopesEqual(nextScope, scope) && !canonicalize && !legacyShellOpen) return;

      guardDirtyAction(
        () => {
          setLegacyShellOpen(false);
          setPendingQueueAction(null);
          setScope(nextScope);
          if (canonicalize) {
            window.history.replaceState(
              null,
              "",
              scopeToUrl(nextScope, window.location.pathname, window.location.hash),
            );
          }
        },
        () => window.history.replaceState(null, "", cancelUrl),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [
    channelProfilesError,
    channelProfilesLoading,
    guardDirtyAction,
    knownChannels,
    legacyShellOpen,
    scope,
    view,
  ]);

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
    // voice_id / voice_settings / voice_recipe so restoring a bible draft never wipes casting.
    const restored: FlatChar = {
      ...flattenRevision(pendingRestore, active),
      voice_id: active.voice_id,
      voice_settings: active.voice_settings,
      voice_recipe: active.voice_recipe,
    };
    applyCharacter(active.id, restored);
    setPendingRestore(null);
    setPreviewingRevisionId(null);
    setHistoryOpen(false);
    setIsRestoredDraft(true);
    showFlash("Draft loaded from history — click Save to write new version");
  };

  const openRunDetail = (episodeId: string) => {
    lastRunTriggerRef.current = episodeId;
    runDetailRestoreFocusRef.current = runButtonRefs.current.get(episodeId) ?? null;
    setActiveEpisodeId(episodeId);
    clearReceipts();
    void fetchReceipts(episodeId);
  };

  const closeRunDetail = useCallback(() => {
    const triggerId = lastRunTriggerRef.current;
    setActiveEpisodeId(null);
    resetReceipts();
    runDetailRestoreFocusRef.current = triggerId
      ? (runButtonRefs.current.get(triggerId) ?? null)
      : null;
  }, [resetReceipts]);

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
      if (payload.idempotency_key) {
        await writeIdeaJobMap({
          key: payload.idempotency_key,
          ideaId: activeEnqueueIdeaId ?? null,
          channel: payload.channel ?? null,
        });
      } else {
        console.error("Queued job payload did not include an idempotency_key", payload);
        showFlash("Run queued (thread link skipped)");
      }
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
    action: "fact" | "spend" | "publish" | "stale",
    trigger: HTMLButtonElement,
  ) => {
    if (queueActionSubmitting) return;
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
    const rerunKey = `job_rerun_${job.id}_${Date.now()}`;
    const input = jobInputFromRow(job, { idempotencyKey: rerunKey });

    let payload: ReturnType<typeof buildJobInsert>;
    try {
      if (action === "fact") {
        payload = buildFactApprovalReenqueue(input);
      } else if (action === "spend") {
        payload = buildSpendApprovalReenqueue(input);
      } else if (action === "publish") {
        const sourceEpisodeId = publishSourceEpisodeId(job);
        if (!sourceEpisodeId) {
          setQueueActionSubmitting(false);
          setPendingQueueAction(null);
          showFlash("Cannot publish-approve: this job has no source episode yet.", true);
          return;
        }
        payload = buildPublishApprovalReenqueue(input, sourceEpisodeId);
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

    if (error) {
      setQueueActionSubmitting(false);
      showFlash(
        action === "fact"
          ? "Fact approval failed — " + error.message
          : action === "spend"
          ? "Spend approval failed — " + error.message
          : action === "publish"
            ? "Publish approval failed — " + error.message
          : "Re-run failed — " + error.message,
        true,
      );
      return;
    }

    let recoveredIdeaId: string | null = null;
    if (job.idempotency_key) {
      const { data, error: mapLookupError } = await supabase
        .from("idea_job_map")
        .select("idea_id")
        .eq("idempotency_key", job.idempotency_key)
        .maybeSingle();

      if (mapLookupError) {
        console.error("Could not recover idea provenance for re-enqueue", mapLookupError);
      }
      recoveredIdeaId = data?.idea_id ?? null;
    }

    setPendingQueueAction(null);
    setQueueActionSubmitting(false);
    showFlash(
      action === "fact"
        ? "✓ Facts approved. Job re-entered the pipeline."
        : action === "spend"
        ? "✓ Spend approved. Job re-entered the pipeline."
        : action === "publish"
          ? "✓ Publish approved. Job re-entered the pipeline."
        : "✓ Stranded job re-queued for execution",
    );
    await writeIdeaJobMap({
      key: rerunKey,
      ideaId: recoveredIdeaId,
      channel: payload.channel ?? null,
    });
    void fetchJobs();
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
    if (isDraftCharacterId(active.id)) {
      const { data, error } = await persistDraftCharacter({
        codename: snapshot.codename,
        concept: snapshot.concept,
        status: snapshot.status,
        bible: snapshot.bible,
      });
      if (error || !data) {
        setSaving(false);
        showFlash("Could not create character — " + (error?.message ?? ""), true);
        return;
      }

      const savedId = data.id;
      const savedSnapshot = {
        character_id: savedId,
        codename: snapshot.codename,
        concept: snapshot.concept,
        status: snapshot.status,
        bible: snapshot.bible,
      };
      setActiveId(savedId);
      commitSnapshot(savedId, {
        codename: savedSnapshot.codename,
        concept: savedSnapshot.concept,
        status: savedSnapshot.status,
        bible: savedSnapshot.bible,
      });

      const { error: revisionError } = await supabase
        .from("character_bible_revisions")
        .insert(savedSnapshot);

      setSaving(false);
      if (revisionError) {
        showFlash("Saved, but history snapshot failed — " + revisionError.message, true);
        return;
      }

      setIsRestoredDraft(false);
      showFlash("✓ Saved · revision snapshot logged");
      if (historyOpen) void fetchRevisions(savedId);
      return;
    }

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

    commitSnapshot(snapshot.character_id, {
      codename: snapshot.codename,
      concept: snapshot.concept,
      status: snapshot.status,
      bible: snapshot.bible,
    });

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

  const addChar = () => {
    if (adding) return;
    discardDraftCharacter();
    const draft = createDraftCharacter();
    setActiveId(draft.id);
    setView("roster");
    // Keep the URL in sync with this programmatic view switch (a refresh would
    // otherwise restore a stale ?view=).
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", viewUrl("roster"));
    }
  };

  const guardedAddChar = () => {
    guardDirtyAction(() => {
      addChar();
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
  const logIdea = async () => {
    const title = draftIdea.trim();
    const note = draftIdeaNote.trim();
    if (!title || ideaSubmittingTitle === title) return;
    const characterId = selectedDraftIdeaCharacterId === "" ? null : selectedDraftIdeaCharacterId;
    const channel = selectedDraftIdeaChannel;

    setDraftIdea("");
    setDraftIdeaNote("");
    setDraftIdeaCharacterId(null);
    setDraftIdeaChannel(null);
    window.requestAnimationFrame(() => {
      ideaTitleRef.current?.focus();
    });
    await addIdea(title, note, characterId, channel);
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

  const openIdeas = ideas.filter((i) => i.status !== "used").length;
  const activeQueueJobs = jobs.filter((job) => !isTerminalStatus(classifyJobStatus(job.status))).length;
  const filteredQueueJobs = useMemo(
    () =>
      [...jobs]
        .sort(
          (a, b) =>
            queueActionPriority(a) - queueActionPriority(b) ||
            timestampMs(b.created_at) - timestampMs(a.created_at),
        )
        .filter((job) => queueJobMatchesFilter(job, queueFilter)),
    [jobs, queueFilter],
  );
  const filteredEpisodes = useMemo(
    () => episodes.filter((episode) => runMatchesFilter(episode.status, runsFilter)),
    [episodes, runsFilter],
  );
  const actionableJobs = useMemo(
    () => jobs.filter((job) => isActionableStatus(classifyJobStatus(job.status))),
    [jobs],
  );
  const hubChannelCards = useMemo<ChannelCardVM[]>(
    () =>
      channelProfiles.map((profile) => ({
        channel: profile.channel,
        displayName: profile.display_name?.trim() || profile.channel,
        cast: Boolean(profile.character_id || profile.character?.trim()),
        avatarUrl: null,
        initials: channelInitials(profile.channel, profile.character),
        activeJobs: jobs.filter((job) => {
          const jobChannel = comparableChannel(job.channel);
          return (
            jobChannel !== "" &&
            jobChannel === comparableChannel(profile.channel) &&
            !isTerminalStatus(classifyJobStatus(job.status))
          );
        }).length,
      })),
    [channelProfiles, jobs],
  );
  const activeRuns = useMemo(
    () => episodes.filter((episode) => runMatchesFilter(episode.status, "running")).length,
    [episodes],
  );
  const spend30d = useMemo(() => {
    if (!costReceiptsLoaded || costReceiptsLoading || costReceiptsError) return null;

    const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const total = costStats.episodeCosts.reduce((sum, episodeCost) => {
      const createdMs = new Date(episodeCost.episode.created_at).getTime();
      if (!Number.isFinite(createdMs) || createdMs < cutoffMs) return sum;
      return sum + episodeCost.liveSpend;
    }, 0);

    return formatUsd(total);
  }, [costReceiptsError, costReceiptsLoaded, costReceiptsLoading, costStats.episodeCosts]);
  const hubActionItems = useMemo(
    () =>
      actionableJobs.slice(0, 2).map((job) => ({
        id: job.id,
        title: job.channel ?? job.food,
        detail: job.channel
          ? `${JOB_STATUS_LABELS[classifyJobStatus(job.status)]} · ${job.food}`
          : JOB_STATUS_LABELS[classifyJobStatus(job.status)],
      })),
    [actionableJobs],
  );
  const hubLandingProps = {
    channels: {
      cards: hubChannelCards,
      loading: channelProfilesLoading,
      error: channelProfilesError,
      onOpenChannel: (channel: string) =>
        navigate({ kind: "workspace", channel, tab: DEFAULT_TAB }),
      onNewChannel: () => {
        setChannelsAutoNew(true);
        openLegacyConsole("channels");
      },
    },
    glance: {
      activeChannels: channelProfiles.length,
      activeRuns,
      spend30d,
    },
    actions: {
      pendingCount: actionableJobs.length,
      items: hubActionItems,
      onReviewAll: () => navigate({ kind: "hub", hub: "actions" }),
      onOpenLegacyConsole: () => openLegacyConsole("roster"),
    },
    operatorInitials,
  };
  const ideaCaptureDisabled = Boolean(ideaSubmittingTitle);
  const canSubmitIdea = draftIdea.trim().length > 0 && !ideaCaptureDisabled;
  const selectedDraftIdeaCharacterId = draftIdeaCharacterId ?? activeId ?? "";
  const selectedDraftIdeaChannel = draftIdeaChannel ?? CHANNELS[0];
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

  const closeVisualCasting = useCallback(() => {
    setVisualCastingOpen(false);
  }, []);
  const noopClose = useCallback(() => {}, []);

  const globalOverlays = (
    <>
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
      {pendingDirtyAction && active && (
        <DiscardChangesDialog
          codename={dirtyCodename}
          onCancel={cancelDirtyAction}
          onConfirm={confirmDirtyAction}
          restoreFocusRef={discardDialogRestoreFocusRef}
        />
      )}
    </>
  );

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
  if (!legacyShellOpen && scope.kind === "hub" && scope.hub === DEFAULT_HUB) {
    return (
      <>
        {globalOverlays}
        <HubLanding {...hubLandingProps} />
      </>
    );
  }

  if (!legacyShellOpen && scope.kind === "hub" && scope.hub === "actions") {
    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials}>
          <ActionCenter
            jobs={actionableJobs}
            parkById={jobParkById}
            pending={pendingQueueAction}
            submitting={queueActionSubmitting}
            onRequest={requestQueueAction}
            onConfirm={confirmQueueAction}
            onCancel={cancelQueueAction}
            canPublish={(job) => publishSourceEpisodeId(job) !== null}
            onBack={() => navigate({ kind: "hub", hub: DEFAULT_HUB })}
            statusLabel={(job) => JOB_STATUS_LABELS[classifyJobStatus(job.status)]}
          />
        </AuroraShell>
      </>
    );
  }

  if (!legacyShellOpen && scope.kind === "hub" && scope.hub === "overview") {
    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials}>
          <section className="glass-panel au-empty" aria-labelledby="system-overview-title">
            <p className="text-mono dim" style={{ fontSize: "0.875rem" }}>
              {scopeToSearch({ kind: "hub", hub: "overview" })}
            </p>
            <h1 id="system-overview-title" className="text-display" style={{ fontSize: "2rem" }}>
              System Overview
            </h1>
            <p>System Overview — next lane.</p>
            <button
              type="button"
              className="action-button"
              onClick={() => navigate({ kind: "hub", hub: DEFAULT_HUB })}
            >
              Back to Channels
            </button>
          </section>
        </AuroraShell>
      </>
    );
  }

  if (!legacyShellOpen && scope.kind === "workspace") {
    const channelProfile =
      channelProfiles.find((profile) => profile.channel === scope.channel) ?? null;
    const channelName = channelProfile?.display_name?.trim() || scope.channel;
    const characterName = channelProfile?.character?.trim() ?? "";
    const castChar = channelProfile?.character_id
      ? (chars.find((character) => character.id === channelProfile.character_id) ?? null)
      : characterName
        ? (chars.find(
            (character) => character.codename.trim().toLowerCase() === characterName.toLowerCase(),
          ) ?? null)
        : null;
    const activeTabId = workspaceTabId(scope.tab);
    const activePanelId = workspacePanelId(scope.tab);
    const renderDeferredWorkspacePanel = (title: string) => (
      <div className="deferred-panel">
        <div>
          <h3 className="text-title" style={{ marginBottom: "0.5rem" }}>
            {title}
          </h3>
          <p className="dim text-body" style={{ maxWidth: "500px", margin: "0 auto" }}>
            Per-channel production appears once the pipeline tags jobs with a channel. Until then, use the global
            Action Center and Runs.
          </p>
        </div>
      </div>
    );

    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials}>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <button
              type="button"
              className="breadcrumb-button"
              onClick={() => navigate({ kind: "hub", hub: DEFAULT_HUB })}
            >
              Channels
            </button>
            <span className="breadcrumb-sep">/</span>
            <span className="text-main" aria-current="page">
              {channelName}
            </span>
          </nav>

          <section className="workspace-header" aria-label="Channel Identity">
            <div className="avatar-large" aria-hidden="true">
              {channelInitials(scope.channel, channelProfile?.character)}
            </div>
            <div className="channel-meta">
              <h1 className="text-display" style={{ fontSize: "2rem" }}>
                {channelName}
              </h1>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                  marginTop: "0.25rem",
                  flexWrap: "wrap",
                }}
              >
                {characterName ? (
                  <span className="badge badge-success">Cast: {characterName}</span>
                ) : (
                  <span className="badge badge-neutral">Uncast</span>
                )}
                <span className="text-mono dim">{scope.channel}</span>
              </div>
            </div>
          </section>

          <nav className="workspace-nav" role="tablist" aria-label="Channel workspaces">
            {WORKSPACE_TABS.map((tab) => (
              <button
                key={tab}
                ref={(node) => {
                  workspaceTabRefs.current[tab] = node;
                }}
                type="button"
                className="nav-tab"
                role="tab"
                id={workspaceTabId(tab)}
                aria-selected={scope.tab === tab}
                aria-controls={scope.tab === tab ? workspacePanelId(tab) : undefined}
                tabIndex={scope.tab === tab ? 0 : -1}
                onClick={() => activateWorkspaceTab(scope.channel, tab)}
                onKeyDown={(event) => handleWorkspaceTabKeyDown(event, scope.channel, tab)}
              >
                {WORKSPACE_TAB_LABELS[tab]}
              </button>
            ))}
          </nav>

          <div
            id={activePanelId}
            role="tabpanel"
            tabIndex={0}
            className="tab-panel active"
            aria-labelledby={activeTabId}
            style={{ marginTop: "1.5rem" }}
          >
            {scope.tab === "production" &&
              renderDeferredWorkspacePanel("Per-channel production is pending pipeline data")}

            {scope.tab === "character" &&
              (loading ? (
                <article className="glass-panel au-empty">
                  <div>
                    <span className="spin" /> Loading cast…
                  </div>
                </article>
              ) : loadError ? (
                <article className="glass-panel au-empty">
                  <div>
                    <h3 className="text-title" style={{ marginBottom: "0.5rem" }}>
                      Cast unavailable
                    </h3>
                    <p className="dim text-body" style={{ marginBottom: "1rem" }}>
                      Couldn&apos;t reach the character roster: {loadError}
                    </p>
                    <button className="btn" type="button" onClick={() => void fetchCharacters()}>
                      Retry
                    </button>
                  </div>
                </article>
              ) : castChar ? (
                <article className="glass-panel">
                  <div className="panel-header">
                    <h2 className="text-title" style={{ fontSize: "1.25rem" }}>
                      Active Cast
                    </h2>
                    <button
                      type="button"
                      className="text-mono accent"
                      onClick={() => openLegacyConsole("roster")}
                      style={{
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        padding: 0,
                      }}
                    >
                      Manage all characters →
                    </button>
                  </div>

                  <>
                    <div className="workspace-character-split">
                      <div className="workspace-character-dossier">
                        <div
                          style={{
                            display: "flex",
                            gap: "1rem",
                            alignItems: "center",
                            marginBottom: "1.5rem",
                          }}
                        >
                          <div className="avatar-large avatar--cast" aria-hidden="true">
                            {characterInitials(castChar.codename)}
                          </div>
                          <div>
                            <h3 className="text-display" style={{ fontSize: "1.5rem" }}>
                              {castChar.codename}
                            </h3>
                            <p className="text-mono dim" style={{ fontSize: "0.875rem" }}>
                              {castChar.concept || "No concept logged yet."}
                            </p>
                          </div>
                        </div>

                        <div className="form-group" style={{ maxWidth: "none" }}>
                          <span className="form-label">Character Dossier (Bible)</span>
                          <div
                            className="form-input"
                            style={{
                              background: "var(--surface-0)",
                              color: "var(--text-dim)",
                              minHeight: "100px",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {castChar.voice || "No dossier logged yet."}
                          </div>
                        </div>
                      </div>
                      <div className="workspace-character-visual">
                        <VisualIdentityPanel
                          key={castChar.id}
                          variant="inline"
                          character={castChar}
                          supabase={supabase}
                          onClose={noopClose}
                          onCharacterPatched={patchCharacter}
                          showFlash={showFlash}
                          restoreFocusRef={inlineCastingRestoreRef}
                        />
                      </div>
                    </div>
                    <div className="workspace-character-casting">
                      <CastingStudioPanel
                        key={castChar.id}
                        variant="inline"
                        suggestedPersonaChipId={suggestPersonaForChannel(channelProfile ?? {})?.chipId ?? null}
                        character={castChar}
                        supabase={supabase}
                        onClose={noopClose}
                        onCharacterPatched={patchCharacter}
                        showFlash={showFlash}
                        restoreFocusRef={inlineCastingRestoreRef}
                      />
                    </div>
                  </>
                </article>
              ) : (
                <article className="glass-panel">
                  <div className="panel-header">
                    <h2 className="text-title" style={{ fontSize: "1.25rem" }}>
                      Active Cast
                    </h2>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div className="avatar-large avatar-uncast-large" aria-hidden="true">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ position: "relative", zIndex: 1 }}
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-title" style={{ marginBottom: "0.25rem" }}>
                        No Character Assigned
                      </h3>
                      <p
                        className="dim text-body"
                        style={{ fontSize: "0.875rem", marginBottom: "1rem" }}
                      >
                        This channel requires a cast member to generate voice and visual assets.
                      </p>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() =>
                            navigate({
                              kind: "workspace",
                              channel: scope.channel,
                              tab: "guidelines",
                            })
                          }
                        >
                          Assign Character
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => openLegacyConsole("roster")}
                        >
                          Create New
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

            {scope.tab === "guidelines" && (
              <article className="glass-panel">
                <div className="panel-header">
                  <h2 className="text-title" style={{ fontSize: "1.25rem" }}>
                    Channel Guidelines
                  </h2>
                </div>

                <div className="advisory-box">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <div>
                    <h3
                      className="text-title"
                      style={{ color: "var(--accent)", fontSize: "0.875rem", marginBottom: "0.25rem" }}
                    >
                      E1 Persona Advisory
                    </h3>
                    <p className="text-body dim" style={{ fontSize: "0.875rem" }}>
                      These guidelines act as soft prompt boundaries for the underlying Persona engine.
                    </p>
                  </div>
                </div>

                <ChannelProfilesPanel
                  supabase={supabase}
                  profiles={channelProfiles}
                  characters={channelCharacterOptions}
                  loading={channelProfilesLoading}
                  error={channelProfilesError}
                  onRefetch={refetchChannelProfiles}
                  scopedChannel={scope.channel}
                />
              </article>
            )}

            {scope.tab === "cost" && (
              <div className="deferred-panel">
                <svg
                  className="deferred-icon"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <div>
                  <h3 className="text-title" style={{ marginBottom: "0.5rem" }}>
                    Per-Channel Costing is Deferred
                  </h3>
                  <p
                    className="dim text-body"
                    style={{ maxWidth: "500px", margin: "0 auto 1.5rem" }}
                  >
                    Job costs arrive globally via character pipelines without a distinct channel scope column. Honest per-channel spend rollups will be available in Phase 3.
                  </p>
                  <button className="btn" type="button" onClick={() => openLegacyConsole("cost")}>
                    View Global Cost Center →
                  </button>
                </div>
              </div>
            )}
          </div>
        </AuroraShell>
      </>
    );
  }

  return (
    <>
    {globalOverlays}
    <div className="cr">
      <nav className="rail">
        <div className="brand" style={{ marginBottom: "8px" }}>
          CONTROL<b>·</b>ROOM
        </div>
        <button
          className="navbtn"
          type="button"
          onClick={() => guardDirtyAction(() => navigate({ kind: "hub", hub: DEFAULT_HUB }))}
        >
          <Icon name="channels" />
          <span>Hub</span>
          <div className="dot" />
        </button>
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
              {active.codename || "Untitled"}
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
          <button
            className="navbtn"
            type="submit"
            title={`Sign out · ${userEmail}`}
            aria-label={`Sign out ${userEmail}`}
          >
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
                    <DossierVisualAttachment character={active} supabase={supabase} />
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
                        disabled={activeIsDraft}
                      >
                        {isCast(active) ? "🎙 Casting Studio" : "🎙 Cast a voice"}
                      </button>
                      <button
                        ref={visualCastingTriggerRef}
                        className={"btn ghost btn-visual-cast" + (isVisuallyCast(active) ? "" : " save-highlight")}
                        type="button"
                        onClick={() => setVisualCastingOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={visualCastingOpen}
                        disabled={activeIsDraft}
                      >
                        {isVisuallyCast(active) ? "[ RECAST VISUAL ]" : "[ VISUAL CAST ]"}
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={handleExport}
                        disabled={saving || loading || !active || activeIsDraft}
                      >
                        EXPORT MANUAL (MD)
                      </button>
                      <button className="btn ghost" onClick={() => guardedSetView("wire")} disabled={activeIsDraft}>
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

          {view === "channels" && (
            <ChannelProfilesPanel
              supabase={supabase}
              profiles={channelProfiles}
              characters={channelCharacterOptions}
              loading={channelProfilesLoading}
              error={channelProfilesError}
              onRefetch={refetchChannelProfiles}
              autoStartNew={channelsAutoNew}
              onAutoStartNewConsumed={() => setChannelsAutoNew(false)}
            />
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
                    rows={2}
                    value={draftIdeaNote}
                    placeholder="Tactical notes, dialogue fragments, or scene beats (optional)..."
                    onChange={(e) => setDraftIdeaNote(e.target.value)}
                    onKeyDown={handleIdeaNoteKeyDown}
                    disabled={ideaCaptureDisabled}
                    aria-label="New idea note"
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="row" style={{ marginTop: 10, alignItems: "center" }}>
                  <select
                    className="tag-select"
                    value={selectedDraftIdeaCharacterId}
                    onChange={(event) => setDraftIdeaCharacterId(event.target.value)}
                    disabled={ideaCaptureDisabled}
                    aria-label="Idea character assignment"
                  >
                    <option value="">No character</option>
                    {active && (
                      <option value={active.id}>Current Dossier: {active.codename || "Untitled"}</option>
                    )}
                    {chars
                      .filter((character) => character.id !== active?.id && character.status === "active")
                      .map((character) => (
                        <option key={character.id} value={character.id}>
                          ● {character.codename || "Untitled"}
                        </option>
                      ))}
                    {chars
                      .filter((character) => character.id !== active?.id && character.status !== "active")
                      .map((character) => (
                        <option key={character.id} value={character.id}>
                          ○ {character.codename || "Untitled"}
                        </option>
                      ))}
                  </select>
                  <select
                    className="tag-select"
                    value={selectedDraftIdeaChannel}
                    onChange={(event) => setDraftIdeaChannel(event.target.value)}
                    disabled={ideaCaptureDisabled}
                    aria-label="Idea channel assignment"
                  >
                    {CHANNELS.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
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
                <div className="filter-chips" role="group" aria-label="Filter queue jobs">
                  {QUEUE_FILTERS.map((filter) => (
                    <button
                      key={filter.key}
                      className={"chip" + (queueFilter === filter.key ? " on" : "")}
                      type="button"
                      aria-pressed={queueFilter === filter.key}
                      onClick={() => setQueueFilter(filter.key)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
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
              ) : filteredQueueJobs.length === 0 ? (
                <div className="empty">
                  <Icon name="queue" />
                  <h3>No queue matches</h3>
                  <p>Switch filters to see the rest of the pipeline queue.</p>
                </div>
              ) : (
                <div className="wire-list" aria-label="Pipeline jobs">
                  {filteredQueueJobs.map((job) => {
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
                                {job.channel != null && (
                                  <span className="chip queue-channel-chip">{job.channel}</span>
                                )}
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
                          {job.error &&
                            (() => {
                              const errorText = `${job.park_kind ? `${job.park_kind}: ` : ""}${job.error}`;
                              if (!errorText.trim()) return null;
                              const { firstLine, rest } = splitQueueErrorText(errorText);
                              return rest ? (
                                <details className="receipt-json-details queue-card-substatus">
                                  <summary className="receipt-json-summary">
                                    {firstLine}
                                  </summary>
                                  <pre className="receipt-json-content">
                                    <code>{rest}</code>
                                  </pre>
                                </details>
                              ) : (
                                <p className="queue-card-substatus" role="status">
                                  {firstLine}
                                </p>
                              );
                            })()}

                          {actionable && status === "ready_for_review" && (
                            <>
                              {park?.loading ? (
                                <div className="job-review-panel" role="status">
                                  <h4>Review Park Detected</h4>
                                  <p>Reading latest receipt to classify the parked gate.</p>
                                </div>
                              ) : park?.kind === "fact" ? (
                                <div className="job-review-panel">
                                  <h4>Fact Park Detected</h4>
                                  <p>
                                    Regulated-YELLOW claims are waiting on human sign-off.
                                  </p>
                                  <button
                                    className="btn compact"
                                    type="button"
                                    onClick={(event) =>
                                      requestQueueAction(job, "fact", event.currentTarget)
                                    }
                                  >
                                    Approve facts &amp; continue
                                  </button>
                                </div>
                              ) : park?.kind === "publish" ? (
                                <div className="job-review-panel">
                                  <h4>Publish Park Detected</h4>
                                  <p>
                                    Distribution is waiting on human approval.
                                    {park.stage ? ` Last receipt stage: ${park.stage}.` : ""}
                                  </p>
                                  <p className="queue-card-substatus">
                                    Approval posts the exact reviewed render with no re-render or
                                    double-spend. No Buffer token is wired yet, so nothing posts.
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
                                    The review gate could not be classified from the job or latest
                                    receipt. Spend approval is only correct for a spend park; check
                                    the run drill-down first if this might be a fact or publish park.
                                    {park?.error ? ` Receipt read failed: ${park.error}` : ""}
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
                                title="Open run detail"
                              >
                                Open Run Detail
                              </button>
                            )}
                            {job.episode_id && !episodeKnown && (
                              <small className="queue-card-substatus">
                                Episode id is present; run detail opens when the episode row is available.
                              </small>
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
              <div className="cap">
                <span className="eyebrow">Operation-wide pipeline output — every character&apos;s finished episodes.</span>
                <div className="filter-chips" role="group" aria-label="Filter runs">
                  {RUNS_FILTERS.map((filter) => (
                    <button
                      key={filter.key}
                      className={"chip" + (runsFilter === filter.key ? " on" : "")}
                      type="button"
                      aria-pressed={runsFilter === filter.key}
                      onClick={() => setRunsFilter(filter.key)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
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
              ) : filteredEpisodes.length === 0 ? (
                <div className="empty">
                  <Icon name="runs" />
                  <h3>No runs match</h3>
                  <p>Switch filters to see the rest of the pipeline output.</p>
                </div>
              ) : (
                <div className="wire-list">
                  {filteredEpisodes.map((e) => {
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
          channelProfiles={channelProfiles}
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
      {visualCastingOpen && active && (
        <VisualIdentityPanel
          character={active}
          supabase={supabase}
          onClose={closeVisualCasting}
          onCharacterPatched={patchCharacter}
          showFlash={showFlash}
          restoreFocusRef={visualCastingTriggerRef}
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
    </>
  );
}
