"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import { parseBelowFloorCuts } from "@/lib/parkReason";
import { parseFactClaims, type FactClaim } from "@/lib/factClaims";
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
import { useUiMode } from "./aurora/UiModeContext";
import { ActionCenter } from "./aurora/ActionCenter";
import { HubLanding } from "./aurora/HubLanding";
import { CharactersHub } from "./aurora/CharactersHub";
import type { ChannelCardVM } from "./aurora/ChannelsHub";
import type {
  CharacterCardVM as CharactersHubCardVM,
  CharactersHubProps,
} from "./aurora/CharactersHub";
import { IdeasHub } from "./aurora/IdeasHub";
import type { IdeasHubProps } from "./aurora/IdeasHub";
import { ReviewHub } from "./aurora/ReviewHub";
import { RevealHub } from "./aurora/RevealHub";
import { RunsHub } from "./aurora/RunsHub";
import type {
  ReliabilityResult,
  RunCardVM,
  RunDiagnosticsResult,
  RunsHubProps,
} from "./aurora/RunsHub";
import { RunCostEstimate } from "./aurora/RunCostEstimate";
import { computeWorkerReliability } from "@/lib/workerReliability";
import { MOCK_REVIEW_FIXTURES } from "@/lib/renderReview";
import {
  buildJobsRevealPatch,
  buildRevealApprovalRow,
  parseRevealAuditorResult,
  type RevealDecisionMap,
  type RevealFixture,
} from "@/lib/revealApproval";
import { CastingStudioPanel } from "./controlroom/CastingStudioPanel";
import { ChannelProfilesPanel } from "./controlroom/ChannelProfilesPanel";
import { CompareDialog } from "./controlroom/CompareDialog";
import { CostBoxDashboard } from "./controlroom/CostBoxDashboard";
import { EnqueueIdeaPanel } from "./controlroom/EnqueueIdeaPanel";
import { HistoryDrawer } from "./controlroom/HistoryDrawer";
import { OverviewDashboard } from "./controlroom/OverviewDashboard";
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

function workspaceTabId(tab: WorkspaceTab) {
  return `workspace-tab-${tab}`;
}

function workspacePanelId(tab: WorkspaceTab) {
  return `workspace-panel-${tab}`;
}

function isApprovalParkKind(
  parkKind: string | null | undefined,
): parkKind is "fact" | "spend" | "publish" | "reveal" {
  return (
    parkKind === "fact" ||
    parkKind === "spend" ||
    parkKind === "publish" ||
    parkKind === "reveal"
  );
}

function isMissingRevealColumnsError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("column") && message.includes("reveal"))
  );
}


const IDEA_STATUS_OPTIONS: IdeaStatus[] = ["backlog", "active", "used"];
const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  backlog: "Backlog",
  active: "Active",
  used: "Used",
};

type FactClaimsResult = { claims: FactClaim[]; error: string | null };

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
        <h2 id="restore-title">Restore this version?</h2>
        <p id="restore-desc">
          Restore the version from {formatRevisionDate(revision.created_at)}? This replaces your
          current unsaved edits — you&apos;ll still need to save to keep it.
        </p>
        <div className="restore-actions">
          <button className="btn restore-confirm" type="button" onClick={onConfirm}>
            Restore version
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
        <h2 id="discard-title">Discard unsaved changes?</h2>
        <p id="discard-desc">
          You have unsaved changes to {codename}. Leaving this screen deletes them permanently.
        </p>
        <div className="restore-actions">
          <button className="btn ghost" type="button" onClick={onConfirm}>
            Discard changes
          </button>
          <button ref={keepButtonRef} className="btn" type="button" onClick={onCancel}>
            Keep editing
          </button>
        </div>
      </div>
    </div>
  );
}



export default function ControlRoom({ userEmail }: { userEmail: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { advanced: uiAdvanced, setMode: setUiMode } = useUiMode();
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
  const [revealFixtures, setRevealFixtures] = useState<RevealFixture[]>([]);
  const [revealFixturesLoading, setRevealFixturesLoading] = useState(true);
  const [revealFixturesError, setRevealFixturesError] = useState<string | null>(null);
  const revealParkedJobs = jobs.filter(
    (job) =>
      classifyJobStatus(job.status) === "ready_for_review" &&
      jobParkById[job.id]?.kind === "reveal" &&
      Boolean(job.episode_id),
  );
  const revealJobSignature = revealParkedJobs
    .map((job) => `${job.id}:${job.episode_id}`)
    .sort()
    .join(",");
  const revealParkedJobsRef = useRef(revealParkedJobs);
  revealParkedJobsRef.current = revealParkedJobs;
  const [activeEnqueueIdeaId, setActiveEnqueueIdeaId] = useState<string | null>(null);
  const [castingOpen, setCastingOpen] = useState(false);
  const [castingSuggestedPersona, setCastingSuggestedPersona] = useState<string | null>(null);
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
  const [scope, setScope] = useState<AppScope>({ kind: "hub", hub: DEFAULT_HUB });
  const [charactersBenchMode, setCharactersBenchMode] = useState<"grid" | "editor">("grid");
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [costCenterOpen, setCostCenterOpen] = useState(false);
  const [draftIdea, setDraftIdea] = useState("");
  const [draftIdeaNote, setDraftIdeaNote] = useState("");
  const [draftIdeaCharacterId, setDraftIdeaCharacterId] = useState<string | null>(null);
  const [draftIdeaChannel, setDraftIdeaChannel] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const adding = false;
  const [pendingQueueAction, setPendingQueueAction] = useState<{
    job: QueueJob;
    action: "fact" | "spend" | "publish" | "stale";
  } | null>(null);
  const [queueActionSubmitting, setQueueActionSubmitting] = useState(false);
  const [factClaimsState, setFactClaimsState] = useState<{
    claims: FactClaim[] | null;
    loading: boolean;
    error: string | null;
  }>({ claims: null, loading: false, error: null });
  useEffect(() => {
    setPendingQueueAction(null);
    // Close the Aurora "New channel" surface whenever we leave the Channels hub,
    // so returning to it never re-shows a stale create form.
    if (scope.kind !== "hub" || scope.hub !== DEFAULT_HUB) setNewChannelOpen(false);
    // Any real navigation closes the global Cost Center overlay surface.
    setCostCenterOpen(false);
  }, [scope]);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceTabRefs = useRef<Record<WorkspaceTab, HTMLButtonElement | null>>({
    production: null,
    character: null,
    guidelines: null,
    cost: null,
  });
  const enqueueButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastEnqueueTriggerRef = useRef<string | null>(null);
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
  const exitFormRef = useRef<HTMLFormElement>(null);
  const ideaTitleRef = useRef<HTMLTextAreaElement>(null);
  const didInitScopeRef = useRef(false);
  const showFlash = useCallback((msg: string, err = false) => {
    setFlash({ msg, err });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  }, []);
  const submitRevealDecisions = useCallback(
    async (episodeId: string, decisions: RevealDecisionMap) => {
      const rows = Object.entries(decisions).map(([revealId, decision]) =>
        buildRevealApprovalRow(episodeId, revealId, decision),
      );
      if (rows.length === 0) {
        throw new Error("Decide each reveal before submitting.");
      }

      const { error: auditError } = await supabase.from("reveal_approvals").insert(rows);
      if (auditError) {
        throw new Error(`Could not record reveal decisions: ${auditError.message}`);
      }

      if (process.env.NEXT_PUBLIC_REVEAL_WRITE_ENABLED !== "true") {
        showFlash(
          "Recorded your decision — resume activates when the pipeline's reveal columns land.",
        );
        return;
      }

      const patch = buildJobsRevealPatch(decisions);
      const { data: updatedJobs, error: jobError } = await supabase
        .from("jobs")
        .update(patch as never)
        .eq("episode_id", episodeId)
        .eq("park_kind", "reveal")
        .select("id")
        .returns<Array<{ id: number }>>();

      if (jobError && isMissingRevealColumnsError(jobError)) {
        showFlash(
          "Recorded your decision — resume activates when the pipeline's reveal columns land.",
        );
        return;
      }
      if (jobError) {
        throw new Error(`Decision recorded, but pipeline resume failed: ${jobError.message}`);
      }
      if (!updatedJobs || updatedJobs.length === 0) {
        throw new Error("Decision recorded, but no parked reveal job was updated.");
      }
      if (updatedJobs.length > 1) {
        throw new Error("Multiple parked reveal jobs matched — resolve before resuming.");
      }

      showFlash("Reveal decisions recorded and pipeline resume activated.");
    },
    [showFlash, supabase],
  );
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

  useEffect(() => {
    if (jobsLoading) {
      setRevealFixturesLoading(true);
      return undefined;
    }
    if (jobsError) {
      setRevealFixtures([]);
      setRevealFixturesError(jobsError);
      setRevealFixturesLoading(false);
      return undefined;
    }

    const revealJobs = revealParkedJobsRef.current;
    let cancelled = false;

    if (revealJobs.length === 0) {
      setRevealFixtures([]);
      setRevealFixturesError(null);
      setRevealFixturesLoading(false);
      return undefined;
    }

    setRevealFixturesLoading(true);
    setRevealFixturesError(null);
    void Promise.allSettled(
      revealJobs.map(async (job): Promise<RevealFixture | null> => {
        const episodeId = job.episode_id as string;
        const { data, error } = await supabase
          .from("receipts")
          .select("result,seq")
          .eq("episode_id", episodeId)
          .eq("stage", "reveal_auditor")
          .order("seq", { ascending: false })
          .limit(1)
          .returns<Array<Pick<Receipt, "result" | "seq">>>();

        if (error) throw error;
        if (!data?.[0]) return null;
        return {
          id: episodeId,
          title: job.food,
          channel: job.channel ?? "Channel not set",
          reveals: parseRevealAuditorResult(data[0].result),
        };
      }),
    )
      .then((results) => {
        if (cancelled) return;

        const fixtures = results.flatMap((result) =>
          result.status === "fulfilled" && result.value ? [result.value] : [],
        );
        const failures = results.filter(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );

        if (failures.length > 0) {
          console.warn("Some parked reveal batches could not be loaded.", failures);
        }

        setRevealFixtures(fixtures);
        setRevealFixturesError(
          fixtures.length === 0 && failures.length > 0
            ? failures[0].reason instanceof Error
              ? failures[0].reason.message
              : "Could not load parked reveals."
            : null,
        );
      })
      .finally(() => {
        if (!cancelled) setRevealFixturesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobParkById, jobsError, jobsLoading, revealJobSignature, supabase]);

  const active = chars.find((c) => c.id === activeId) ?? null;
  const activeChannelProfile = active
    ? (channelProfiles.find((profile) => profile.character_id === active.id) ??
      channelProfiles.find(
        (profile) =>
          profile.character?.trim().toLowerCase() === active.codename?.trim().toLowerCase(),
      ) ??
      null)
    : null;
  const modalSuggestedPersonaChipId =
    castingSuggestedPersona ??
    suggestPersonaForChannel(activeChannelProfile ?? {})?.chipId ??
    null;
  const activeIsDraft = isDraftCharacterId(active?.id);
  const castingDisabledHelpId = activeIsDraft ? "character-casting-disabled-help" : undefined;
  const previewingRevision =
    revisions.find((revision) => revision.id === previewingRevisionId) ?? null;
  const displayedActive =
    active && previewingRevision ? flattenRevision(previewingRevision, active) : active;
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
  const overlayOpen = pendingQueueAction !== null;
  const POLL_MS = 5000;

  usePolling(pollJobs, {
    enabled: !overlayOpen,
    intervalMs: POLL_MS,
  });
  usePolling(pollEpisodes, {
    enabled: !overlayOpen,
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

  const focusWorkspaceTab = useCallback((nextTab: WorkspaceTab) => {
    workspaceTabRefs.current[nextTab]?.focus();
  }, []);

  const navigate = useCallback(
    (next: AppScope) => {
      if (activeId === DRAFT_CHARACTER_ID) discardDraftCharacter();
      didInitScopeRef.current = true;
      setPendingQueueAction(null);
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

  const handleOpenCharacter = useCallback(
    (characterId: string) => {
      guardDirtyAction(() => {
        if (isDraftCharacterId(activeId) && activeId !== characterId) {
          discardDraftCharacter();
        }
        setActiveId(characterId);
        setCharactersBenchMode("editor");
      });
    },
    [activeId, discardDraftCharacter, guardDirtyAction],
  );

  const handleUseInCasting = useCallback((characterId: string, chipId: string) => {
    setActiveId(characterId);
    setCastingSuggestedPersona(chipId);
    setCastingOpen(true);
  }, []);

  const closeCasting = useCallback(() => {
    setCastingOpen(false);
    setCastingSuggestedPersona(null);
  }, []);

  const handleCharactersBenchBack = useCallback(() => {
    guardDirtyAction(() => {
      if (isDraftCharacterId(activeId)) discardDraftCharacter();
      setCastingOpen(false);
      setVisualCastingOpen(false);
      setCharactersBenchMode("grid");
    });
  }, [
    activeId,
    discardDraftCharacter,
    guardDirtyAction,
    setCastingOpen,
    setCharactersBenchMode,
    setVisualCastingOpen,
  ]);

  const handleCharactersHubNav = useCallback(() => {
    guardDirtyAction(() => {
      setCharactersBenchMode("grid");
      navigate({ kind: "hub", hub: "characters" });
    });
  }, [guardDirtyAction, navigate, setCharactersBenchMode]);

  const createBenchDraft = useCallback(() => {
    discardDraftCharacter();
    const draft = createDraftCharacter();
    setActiveId(draft.id);
    setCharactersBenchMode("editor");
  }, [createDraftCharacter, discardDraftCharacter, setCharactersBenchMode]);

  const handleWorkspaceCreateCharacter = useCallback(() => {
    guardDirtyAction(() => {
      setCharactersBenchMode("grid");
      navigate({ kind: "hub", hub: "characters" });
      createBenchDraft();
    });
  }, [createBenchDraft, guardDirtyAction, navigate, setCharactersBenchMode]);

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
  }, [channelProfilesError, channelProfilesLoading, knownChannels, scope]);

  useEffect(() => {
    if (scope.kind !== "hub" || scope.hub !== "characters") {
      if (isDraftCharacterId(activeId)) {
        discardDraftCharacter();
      }
      setCastingOpen(false);
      setVisualCastingOpen(false);
      setCharactersBenchMode("grid");
    }
  }, [
    activeId,
    discardDraftCharacter,
    scope,
    setCastingOpen,
    setVisualCastingOpen,
  ]);

  useEffect(() => {
    if (
      scope.kind === "hub" &&
      scope.hub === "characters" &&
      charactersBenchMode !== "editor"
    ) {
      setCastingOpen(false);
      setVisualCastingOpen(false);
      if (isDraftCharacterId(activeId)) {
        discardDraftCharacter();
      }
    }
  }, [
    activeId,
    charactersBenchMode,
    discardDraftCharacter,
    scope,
    setCastingOpen,
    setVisualCastingOpen,
  ]);

  useEffect(() => {
    const onPopState = () => {
      const cancelUrl = scopeToUrl(scope, window.location.pathname, window.location.hash);

      const { scope: nextScope, canonicalize } = parseScope(window.location.search, {
        knownChannels:
          channelProfilesLoading || channelProfilesError !== null ? undefined : knownChannels,
      });

      if (scopesEqual(nextScope, scope) && !canonicalize) return;

      guardDirtyAction(
        () => {
          if (scope.kind === "hub" && scope.hub === "characters") {
            if (isDraftCharacterId(activeId)) {
              discardDraftCharacter();
            }
            setCastingOpen(false);
            setVisualCastingOpen(false);
          }
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
    activeId,
    channelProfilesLoading,
    guardDirtyAction,
    knownChannels,
    scope,
    setCastingOpen,
    setVisualCastingOpen,
    discardDraftCharacter,
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
  ) => {
    if (queueActionSubmitting) return;
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
  };

  const guardedAddChar = () => {
    guardDirtyAction(() => {
      addChar();
    });
  };

  const handleCharactersBenchCreate = useCallback(() => {
    guardDirtyAction(() => {
      createBenchDraft();
    });
  }, [createBenchDraft, guardDirtyAction]);

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
  const charactersHubCards = useMemo<CharactersHubCardVM[]>(
    () =>
      chars.filter((character) => !isDraftCharacterId(character.id)).map((character) => ({
        id: character.id,
        codename: character.codename ?? "",
        concept: character.concept ?? null,
        initials: characterInitials(character.codename ?? ""),
        isVoiceCast: isCast(character),
        isVisualCast: isVisuallyCast(character),
        isDraft: character.status === "draft",
        isSelected: character.id === activeId,
      })),
    [activeId, chars],
  );
  const activeRuns = useMemo(
    () =>
      episodes.filter(
        (episode) => !isClearedStatus(episode.status) && !isFailedStatus(episode.status),
      ).length,
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
  const charactersHubProps = useMemo<CharactersHubProps>(
    () => ({
      cards: charactersHubCards,
      loading,
      error: loadError,
      onRetry: () => {
        void refetchCharacters();
      },
      onBack: () => navigate({ kind: "hub", hub: DEFAULT_HUB }),
      onOpenCharacter: handleOpenCharacter,
      onCreateCharacter: handleCharactersBenchCreate,
    }),
    [
      charactersHubCards,
      handleCharactersBenchCreate,
      handleOpenCharacter,
      loadError,
      loading,
      navigate,
      refetchCharacters,
    ],
  );
  const ideasHubCharacters = useMemo<IdeasHubProps["characters"]>(
    () => chars.map((character) => ({
      id: character.id,
      codename: character.codename,
      status: character.status,
    })),
    [chars],
  );
  const ideasHubProps = useMemo<IdeasHubProps>(
    () => ({
      ideas,
      loading: ideasLoading,
      error: ideasError,
      characters: ideasHubCharacters,
      submitting: Boolean(ideaSubmittingTitle),
      activeEnqueueIdeaId,
      onAddIdea: addIdea,
      onSetIdeaStatus: setIdeaStatus,
      onSetIdeaField: setIdeaField,
      onRetryIdea: retryIdea,
      onDismissIdea: dismissIdea,
      onQueueAsRun: openEnqueuePanel,
      onEnqueueButtonRef: (id, node) => {
        if (node) enqueueButtonRefs.current.set(id, node);
        else enqueueButtonRefs.current.delete(id);
      },
      onRetry: () => {
        void fetchIdeas();
      },
      onBack: () => navigate({ kind: "hub", hub: DEFAULT_HUB }),
    }),
    [
      activeEnqueueIdeaId,
      addIdea,
      dismissIdea,
      fetchIdeas,
      ideaSubmittingTitle,
      ideas,
      ideasError,
      ideasHubCharacters,
      ideasLoading,
      navigate,
      openEnqueuePanel,
      retryIdea,
      setIdeaField,
      setIdeaStatus,
    ],
  );
  const loadRunDiagnostics = useCallback(
    async (episodeId: string): Promise<RunDiagnosticsResult> => {
      const { data, error } = await supabase
        .from("receipts")
        .select("seq, stage, verdict, reason, model, provider")
        .eq("episode_id", episodeId)
        .order("seq", { ascending: true });
      if (error) return { receipts: [], error: error.message };
      const receipts = (data ?? []).map((row) => ({
        seq: typeof row.seq === "number" ? row.seq : 0,
        stage: row.stage ?? "",
        verdict: row.verdict ?? "",
        reason: row.reason ?? "",
        model: row.model ?? "",
        provider: row.provider ?? "",
      }));
      return { receipts, error: null };
    },
    [supabase],
  );
  const loadFactClaims = useCallback(
    async (episodeId: string): Promise<FactClaimsResult> => {
      const { data, error } = await supabase
        .from("receipts")
        .select("result, evidence")
        .eq("episode_id", episodeId)
        .eq("stage", "fact_check")
        .order("seq", { ascending: false })
        .limit(1)
        .returns<Array<Pick<Receipt, "result" | "evidence">>>();

      if (error) return { claims: [], error: error.message };

      const row = data?.[0];
      if (!row) return { claims: [], error: null };

      return {
        claims: parseFactClaims(row.result, row.evidence),
        error: null,
      };
    },
    [supabase],
  );
  useEffect(() => {
    if (pendingQueueAction?.action !== "fact") {
      setFactClaimsState({ claims: null, loading: false, error: null });
      return;
    }

    const episodeId = pendingQueueAction.job.episode_id;
    if (!episodeId) {
      setFactClaimsState({
        claims: [],
        loading: false,
        error: "This job has no source episode yet.",
      });
      return;
    }

    let cancelled = false;
    setFactClaimsState({ claims: null, loading: true, error: null });
    void loadFactClaims(episodeId).then((result) => {
      if (!cancelled) {
        setFactClaimsState({
          claims: result.claims,
          loading: false,
          error: result.error,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadFactClaims, pendingQueueAction?.action, pendingQueueAction?.job.episode_id]);
  const loadWorkerReliability = useCallback(async (): Promise<ReliabilityResult> => {
    // Bound the telemetry scan: a rolling window (episodes complete in minutes, so
    // the window keeps each episode's receipts intact for the spend diff) + an
    // explicit row cap that overrides PostgREST's silent 1000-row default.
    const windowDays = 30;
    const rowCap = 5000;
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("receipts")
      .select("episode_id, seq, stage, model, provider, verdict, spend_so_far")
      .gte("ts", cutoff)
      .order("ts", { ascending: false })
      .limit(rowCap);
    if (error) return { reliability: null, error: error.message, windowDays };
    const raw = (data ?? []).map((row) => ({
      episodeId: row.episode_id ?? "",
      seq: typeof row.seq === "number" ? row.seq : 0,
      stage: row.stage ?? "",
      model: row.model ?? "",
      provider: row.provider ?? "",
      verdict: row.verdict ?? "",
      spendSoFar: typeof row.spend_so_far === "number" ? row.spend_so_far : 0,
    }));
    return { reliability: computeWorkerReliability(raw), error: null, windowDays };
  }, [supabase]);
  const episodeParkReasonById = useMemo(
    () =>
      new Map(
        episodes.map((episode) => [
          episode.episode_id,
          {
            finalStage: episode.final_stage ?? null,
            message: episode.message ?? null,
          },
        ]),
      ),
    [episodes],
  );
  const runsHubCards = useMemo<RunCardVM[]>(
    () =>
      jobs.map((job) => {
        const status = classifyJobStatus(job.status);
        const isParked = status === "ready_for_review" || (status === "error" && job.park_kind != null);
        const episodeParkReason = job.episode_id
          ? (episodeParkReasonById.get(job.episode_id) ?? null)
          : null;
        return {
          id: String(job.id),
          episodeId: job.episode_id ?? null,
          title: job.food,
          channel: job.channel ?? null,
          status,
          statusLabel: JOB_STATUS_LABELS[status],
          createdAt: job.created_at,
          spend: typeof job.spend === "number" ? job.spend : null,
          error: job.error ?? null,
          needsAttention:
            status === "error" || status === "stale" || status === "ready_for_review",
          parkKind: isParked ? resolveParkKind(job.park_kind, null) : null,
          parkKindColumn: isParked ? (job.park_kind ?? null) : null,
          finalStage: isParked ? (episodeParkReason?.finalStage ?? null) : null,
          parkReason: isParked ? (episodeParkReason?.message ?? null) : null,
          belowFloorCuts: isParked
            ? parseBelowFloorCuts(episodeParkReason?.message ?? null)
            : [],
        };
      }),
    [episodeParkReasonById, jobs],
  );
  const runsHubProps = useMemo<RunsHubProps>(
    () => ({
      cards: runsHubCards,
      loading: jobsLoading,
      error: jobsError,
      onRetry: () => {
        void fetchJobs();
      },
      onBack: () => navigate({ kind: "hub", hub: DEFAULT_HUB }),
      loadDiagnostics: loadRunDiagnostics,
      loadReliability: loadWorkerReliability,
    }),
    [
      fetchJobs,
      jobsError,
      jobsLoading,
      loadRunDiagnostics,
      loadWorkerReliability,
      navigate,
      runsHubCards,
    ],
  );
  const auroraNav = {
    activeKey:
      scope.kind === "workspace" ||
      scope.hub === "actions" ||
      scope.hub === "overview" ||
      scope.hub === "reveal"
        ? "channels"
        : scope.hub,
    onNavigate: (key: "channels" | "characters" | "ideas" | "runs" | "review") =>
      navigate({ kind: "hub", hub: key }),
  } as const;
  const handleExitSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!dirty || !active) return;
    event.preventDefault();
    guardDirtyAction(() => {
      exitFormRef.current?.submit();
    });
  };
  const signOutSlot = (
    <form ref={exitFormRef} action="/auth/signout" method="post" onSubmit={handleExitSubmit}>
      <button className="aurora-sign-out" type="submit" aria-label={`Sign out ${userEmail}`}>
        Sign out
      </button>
    </form>
  );
  const hubLandingProps = {
    channels: {
      cards: hubChannelCards,
      loading: channelProfilesLoading,
      error: channelProfilesError,
      onOpenChannel: (channel: string) =>
        navigate({ kind: "workspace", channel, tab: DEFAULT_TAB }),
      onNewChannel: () => {
        // Durable tier (slice-newcomer-journey-fixes #1): the Aurora "New channel"
        // create surface — never routes through the legacy console, never pre-selects
        // an existing channel (the overwrite-the-default footgun).
        setNewChannelOpen(true);
      },
      onRetry: () => void refetchChannelProfiles(),
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
    },
    operatorInitials,
    signOutSlot,
    nav: auroraNav,
  };
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
      {castingOpen && active && (
        <CastingStudioPanel
          character={active}
          supabase={supabase}
          onClose={closeCasting}
          onCharacterPatched={patchCharacter}
          showFlash={showFlash}
          restoreFocusRef={castingTriggerRef}
          suggestedPersonaChipId={modalSuggestedPersonaChipId}
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
      {/* Enqueue-idea-as-run (money path). Mounted in globalOverlays so
          "Queue as run" works from BOTH the Aurora Ideas hub and the legacy
          wire board (which renders globalOverlays too). */}
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
    </>
  );

  const renderMobileRoster = (onCreate: () => void) => (
    <div className="mobile-roster">
      <label className="eyebrow" htmlFor="mobile-roster-select">
        Select character
      </label>
      <select
        id="mobile-roster-select"
        className="mobile-roster-select"
        value={activeId ?? ""}
        onChange={(event) => {
          if (event.target.value) guardedSetActiveId(event.target.value);
        }}
        disabled={chars.length === 0 || saving}
        aria-label="Select character"
      >
        {chars.length === 0 ? (
          <option value="">No characters yet</option>
        ) : (
          <>
            <optgroup label="Active characters">
              {mobileActiveManuals.map((c) => (
                <option key={c.id} value={c.id}>
                  ● {c.codename || "Untitled"}
                </option>
              ))}
            </optgroup>
            <optgroup label="Draft characters">
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
        onClick={onCreate}
        disabled={adding || saving}
        aria-label="Create new character"
      >
        {adding ? "Creating…" : "+ New"}
      </button>
    </div>
  );

  const renderDossierEditor = (createHandler: () => void): ReactNode => {
    const mobileRosterNode = renderMobileRoster(createHandler);
    // Basic mode keeps the high-leverage user seeds (name, concept, voice, gold-standard
    // lines) and tucks the auto-drafted bible detail behind "Show advanced settings".
    const showAdvancedFields = uiAdvanced;

    if (active && displayedActive) {
      return (
        <section className={"dossier" + (historyOpen ? " history-open" : "")}>
          {mobileRosterNode}
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
                  Restore this version
                </button>
                <button className="btn dark-ghost" type="button" onClick={exitPreview}>
                  Exit preview
                </button>
              </div>
            </div>
          )}
          <header className="dossier-head">
            <DossierVisualAttachment character={active} supabase={supabase} />
            <div className="filecode">
              <span>ID · {displayedActive.id.slice(0, 8).toUpperCase()}</span>
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
                ● {displayedActive.status === "active" ? "Active" : "Draft"}
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
              label="Name"
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
            {showAdvancedFields && (
              <>
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
                  hint="What this character never says."
                  value={displayedActive.offlimits}
                  onChange={(v) => set("offlimits", v)}
                  rows={3}
                  readOnly={Boolean(previewingRevision)}
                  locked={Boolean(previewingRevision)}
                />
              </>
            )}
            <Field
              id={fieldControlId(activeId, "lines")}
              label="Gold-standard lines"
              hint="Add 2–4 lines for the writer to emulate."
              value={displayedActive.lines}
              onChange={(v) => set("lines", v)}
              rows={5}
              readOnly={Boolean(previewingRevision)}
              locked={Boolean(previewingRevision)}
            />
            {showAdvancedFields && (
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
            )}
            {!showAdvancedFields && (
              <button
                type="button"
                className="show-advanced-btn"
                onClick={() => setUiMode("advanced")}
              >
                Show advanced settings
              </button>
            )}
          </div>

          {!previewingRevision && (
            <div className="savebar">
              {isRestoredDraft && (
                <div className="restore-warning">
                  ⚠ Unsaved restored draft — you&apos;re viewing a restored version. Save to
                  make these changes live.
                </div>
              )}
              {dirty && (
                <span className="savebar-dirty-label chip draft" role="status">
                  • Unsaved changes
                </span>
              )}
              <button
                className={"btn" + (isRestoredDraft ? " save-highlight" : "")}
                onClick={save}
                disabled={saving || !dirty}
              >
                {saving ? "Saving…" : "Save character"}
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
                View history
              </button>
              <button
                ref={castingTriggerRef}
                className={"btn ghost" + (isCast(active) ? "" : " save-highlight")}
                type="button"
                onClick={() => setCastingOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={castingOpen}
                aria-describedby={castingDisabledHelpId}
                disabled={activeIsDraft}
              >
                {isCast(active) ? "🎙 Casting studio" : "🎙 Cast a voice"}
              </button>
              <button
                ref={visualCastingTriggerRef}
                className={
                  "btn ghost btn-visual-cast" + (isVisuallyCast(active) ? "" : " save-highlight")
                }
                type="button"
                onClick={() => setVisualCastingOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={visualCastingOpen}
                aria-describedby={castingDisabledHelpId}
                disabled={activeIsDraft}
              >
                {isVisuallyCast(active) ? "Recast visual" : "Cast visual"}
              </button>
              {activeIsDraft && (
                <p id="character-casting-disabled-help" className="savebar-helper">
                  Save this character before casting a voice or visual.
                </p>
              )}
              <button
                className="btn ghost"
                type="button"
                onClick={handleExport}
                disabled={saving || loading || !active || activeIsDraft}
              >
                Export profile (MD)
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => guardDirtyAction(() => navigate({ kind: "hub", hub: "ideas" }))}
                disabled={activeIsDraft}
              >
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
      );
    }

    return (
      <section className="dossier">
        {mobileRosterNode}
        <div className="empty">
          <Icon name="roster" />
          <h3>No characters yet</h3>
          <p>Create your first character to get started.</p>
          <button className="btn btn-primary" onClick={createHandler} disabled={adding}>
            {adding ? "Creating…" : "+ New character"}
          </button>
        </div>
      </section>
    );
  };

  // ── render ─────────────────────────────────────────────────────────────────
  if (costCenterOpen) {
    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
          <div className="cost-center scoped">
            <div className="overview-hub__head">
              <div>
                <p className="dim" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                  Spend across every channel
                </p>
                <h1 className="text-display" style={{ fontSize: "2.5rem" }}>
                  Global cost center
                </h1>
              </div>
              <button type="button" className="action-button" onClick={() => setCostCenterOpen(false)}>
                Back
              </button>
            </div>
            <RunCostEstimate
              episodeCosts={costStats.episodeCosts.map((entry) => ({
                cost: entry.liveSpend,
                characterId: entry.episode.character_id ?? null,
              }))}
              characters={chars.map((character) => ({ id: character.id, label: character.codename }))}
            />
            <CostBoxDashboard
              episodes={episodes}
              costStats={costStats}
              loading={costReceiptsLoading}
              error={costReceiptsError}
              receiptsLoaded={costReceiptsLoaded}
              onRetry={() => void fetchCostReceipts()}
            />
          </div>
        </AuroraShell>
      </>
    );
  }

  if (scope.kind === "hub" && scope.hub === DEFAULT_HUB) {
    if (newChannelOpen) {
      return (
        <>
          {globalOverlays}
          <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
            <div className="channel-create-surface">
              <nav className="breadcrumb" aria-label="Breadcrumb">
                <button
                  type="button"
                  className="breadcrumb-button"
                  onClick={() => setNewChannelOpen(false)}
                >
                  Channels
                </button>
                <span className="breadcrumb-sep">/</span>
                <span className="text-main" aria-current="page">New channel</span>
              </nav>
              <ChannelProfilesPanel
                supabase={supabase}
                profiles={channelProfiles}
                characters={channelCharacterOptions}
                loading={channelProfilesLoading}
                error={channelProfilesError}
                onRefetch={refetchChannelProfiles}
                createOnly
                basicMode={!uiAdvanced}
                onShowAdvanced={() => setUiMode("advanced")}
                onUseInCasting={handleUseInCasting}
                onCreated={(channel) => {
                  setNewChannelOpen(false);
                  showFlash(`Channel "${channel}" created.`);
                }}
              />
            </div>
          </AuroraShell>
        </>
      );
    }
    return (
      <>
        {globalOverlays}
        <HubLanding {...hubLandingProps} />
      </>
    );
  }

  if (scope.kind === "hub" && scope.hub === "actions") {
    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
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
            onOpenRevealPreview={() => navigate({ kind: "hub", hub: "reveal" })}
            statusLabel={(job) => JOB_STATUS_LABELS[classifyJobStatus(job.status)]}
            factClaims={factClaimsState.claims}
            factClaimsLoading={factClaimsState.loading}
            factClaimsError={factClaimsState.error}
          />
        </AuroraShell>
      </>
    );
  }

  if (scope.kind === "hub" && scope.hub === "characters") {
    const charactersBenchContent =
      charactersBenchMode === "grid"
        ? <CharactersHub {...charactersHubProps} />
        : loading ? (
            <div className="characters-bench scoped">
              <div className="characters-bench__content">
                <div className="loading">
                  <span className="spin" /> Loading characters…
                </div>
              </div>
            </div>
          ) : loadError ? (
            <div className="characters-bench scoped">
              <div className="characters-bench__content">
                <div className="empty">
                  <h3>Couldn&apos;t load characters</h3>
                  <p>Check your connection and try again.</p>
                  {loadError ? (
                    <details className="error-details">
                      <summary>Details</summary>
                      {loadError}
                    </details>
                  ) : null}
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => void refetchCharacters()}
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="characters-bench scoped">
              <nav className="breadcrumb" aria-label="Breadcrumb">
                <button type="button" className="breadcrumb-button" onClick={handleCharactersBenchBack}>
                  Characters
                </button>
                <span className="breadcrumb-sep">/</span>
                <span className="text-main" aria-current="page">
                  {displayedActive?.codename?.trim() || "Untitled"}
                </span>
              </nav>
              <div className="characters-bench__content">
                {renderDossierEditor(handleCharactersBenchCreate)}
              </div>
            </div>
          );

    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
          {charactersBenchContent}
        </AuroraShell>
      </>
    );
  }

  if (scope.kind === "hub" && scope.hub === "ideas") {
    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
          <IdeasHub {...ideasHubProps} />
        </AuroraShell>
      </>
    );
  }

  if (scope.kind === "hub" && scope.hub === "runs") {
    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
          <RunsHub {...runsHubProps} />
        </AuroraShell>
      </>
    );
  }

  if (scope.kind === "hub" && scope.hub === "review") {
    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
          <ReviewHub
            fixtures={MOCK_REVIEW_FIXTURES}
            onBack={() => navigate({ kind: "hub", hub: DEFAULT_HUB })}
          />
        </AuroraShell>
      </>
    );
  }

  if (scope.kind === "hub" && scope.hub === "reveal") {
    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
          <RevealHub
            fixtures={revealFixtures}
            loading={revealFixturesLoading}
            error={revealFixturesError}
            onSubmit={submitRevealDecisions}
            onBack={() => navigate({ kind: "hub", hub: DEFAULT_HUB })}
          />
        </AuroraShell>
      </>
    );
  }

  if (scope.kind === "hub" && scope.hub === "overview") {
    return (
      <>
        {globalOverlays}
        <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
          <div className="overview-hub scoped">
            <div className="overview-hub__head">
              <div>
                <p className="text-mono dim" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                  {scopeToSearch({ kind: "hub", hub: "overview" })}
                </p>
                <h1 id="system-overview-title" className="text-display" style={{ fontSize: "2.5rem" }}>
                  System Overview
                </h1>
              </div>
              <button
                type="button"
                className="action-button"
                onClick={() => navigate({ kind: "hub", hub: DEFAULT_HUB })}
              >
                Back to Channels
              </button>
            </div>
            <OverviewDashboard
              chars={chars}
              ideas={ideas}
              episodes={episodes}
              costStats={costStats}
              costReceiptsLoading={costReceiptsLoading}
              costReceiptsError={costReceiptsError}
            />
          </div>
        </AuroraShell>
      </>
    );
  }

  if (scope.kind === "workspace") {
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
        <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={auroraNav}>
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
              (() => {
                const items = [
                  {
                    key: "guidelines",
                    label: "Channel guidelines set",
                    done: Boolean(channelProfile?.description?.trim()),
                    action: "Set guidelines",
                    onClick: () => activateWorkspaceTab(scope.channel, "guidelines"),
                  },
                  {
                    key: "character",
                    label: "Character assigned",
                    done: Boolean(channelProfile?.character_id),
                    action: "Assign character",
                    onClick: () => activateWorkspaceTab(scope.channel, "character"),
                  },
                  {
                    key: "voice",
                    label: "Voice cast & locked",
                    done: Boolean(castChar && isCast(castChar)),
                    action: "Cast a voice",
                    onClick: () => activateWorkspaceTab(scope.channel, "character"),
                  },
                  {
                    key: "visual",
                    label: "Visual identity locked",
                    done: Boolean(castChar && isVisuallyCast(castChar)),
                    action: "Set visual identity",
                    onClick: () => activateWorkspaceTab(scope.channel, "character"),
                  },
                ];
                const doneCount = items.filter((item) => item.done).length;
                const ready = doneCount === items.length;

                return (
                  <>
                    <article className="glass-panel">
                      <div className="panel-header">
                        <h2 className="text-title" style={{ fontSize: "1.25rem" }}>
                          Production Readiness
                        </h2>
                        <span className="text-mono dim" style={{ fontSize: "0.875rem" }}>
                          {doneCount}/{items.length} complete
                        </span>
                      </div>
                      {ready ? (
                        <div
                          className="advisory-box"
                          role="status"
                          style={{ borderColor: "var(--success)" }}
                        >
                          <span
                            aria-hidden="true"
                            style={{ color: "var(--success)", fontSize: "1.1rem" }}
                          >
                            ✓
                          </span>
                          <div>
                            <h3
                              className="text-title"
                              style={{
                                color: "var(--success)",
                                fontSize: "0.9rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              Production-ready
                            </h3>
                            <p className="text-body dim" style={{ fontSize: "0.875rem" }}>
                              This channel has everything the dashboard owns. Per-channel
                              production runs arrive once the pipeline tags jobs with a channel.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="text-body dim"
                          style={{ fontSize: "0.875rem", marginBottom: "1rem" }}
                        >
                          Complete the dashboard-owned prerequisites below before this channel
                          can produce.
                        </p>
                      )}
                      <ul
                        style={{
                          listStyle: "none",
                          margin: "1rem 0 0",
                          padding: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        {items.map((item) => (
                          <li
                            key={item.key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              padding: "0.75rem 1rem",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--surface-0)",
                              border: "1px solid var(--border-soft)",
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                flexShrink: 0,
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                color: item.done ? "var(--text-inverse)" : "var(--text-muted)",
                                background: item.done ? "var(--success)" : "transparent",
                                border: item.done ? "none" : "2px solid var(--border-strong)",
                              }}
                            >
                              {item.done ? "✓" : ""}
                            </span>
                            <span
                              className="text-body"
                              style={{
                                flex: 1,
                                color: item.done ? "var(--text-main)" : "var(--text-dim)",
                              }}
                            >
                              {item.label}
                            </span>
                            {item.done ? (
                              <span
                                className="text-mono"
                                style={{ fontSize: "0.75rem", color: "var(--success)" }}
                              >
                                DONE
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="text-mono accent"
                                onClick={item.onClick}
                                style={{
                                  background: "transparent",
                                  border: 0,
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  padding: 0,
                                }}
                              >
                                {item.action} →
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </article>
                    <div style={{ marginTop: "1.5rem" }}>
                      {renderDeferredWorkspacePanel(
                        "Per-channel production is pending pipeline data",
                      )}
                    </div>
                  </>
                );
              })()}

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
                      Couldn&apos;t load your characters: {loadError}
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
                      Active cast
                    </h2>
                    <button
                      type="button"
                      className="text-mono accent"
                      onClick={handleCharactersHubNav}
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
                          <span className="form-label">Character profile</span>
                          <div
                            className="form-input"
                            style={{
                              background: "var(--surface-0)",
                              color: "var(--text-dim)",
                              minHeight: "100px",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {castChar.voice || "No profile logged yet."}
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
                      Active cast
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
                          onClick={handleWorkspaceCreateCharacter}
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
                      Character guidelines
                    </h3>
                    <p className="text-body dim" style={{ fontSize: "0.875rem" }}>
                      These guidelines act as soft boundaries for how the character is written.
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
                  basicMode={!uiAdvanced}
                  onShowAdvanced={() => setUiMode("advanced")}
                  onUseInCasting={handleUseInCasting}
                  onDeleted={() => navigate({ kind: "hub", hub: DEFAULT_HUB })}
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
                    Per-channel costs aren&apos;t available yet
                  </h3>
                  <p
                    className="dim text-body"
                    style={{ maxWidth: "500px", margin: "0 auto 1.5rem" }}
                  >
                    Costs are tracked globally right now, not per channel. Per-channel spend breakdowns are coming soon.
                  </p>
                  <button className="btn" type="button" onClick={() => setCostCenterOpen(true)}>
                    View global cost center →
                  </button>
                </div>
              </div>
            )}
          </div>
        </AuroraShell>
      </>
    );
  }

  return null;
}
