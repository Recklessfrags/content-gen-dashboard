import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Tables } from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/client";
import {
  canArchiveJob,
  partitionArchivableJobs,
  type JobArchiveOptions,
  type JobArchiveMutationResult,
  type QueueJob,
} from "@/lib/jobs";

type FetchMode = "refetch" | "poll";
type SupabaseClient = ReturnType<typeof createClient>;
type JobArchiveRow = Pick<Tables<"job_archive">, "job_id" | "archived_at">;
type ArchiveByJobId = Map<number, string>;
type PendingArchiveMutations = {
  archives: Map<number, string>;
  unarchives: Set<number>;
};

function layerPendingArchiveMutations(
  archiveByJobId: ArchiveByJobId,
  pending: PendingArchiveMutations,
) {
  const next = new Map(archiveByJobId);
  for (const [jobId, archivedAt] of pending.archives) next.set(jobId, archivedAt);
  for (const jobId of pending.unarchives) next.delete(jobId);
  return next;
}

async function fetchJobs(
  supabase: SupabaseClient,
  requestRef: { current: number },
  hasJobsRef: { current: boolean },
  pendingArchiveMutationsRef: { current: PendingArchiveMutations },
  setAllJobs: Dispatch<SetStateAction<QueueJob[]>>,
  setArchiveByJobId: Dispatch<SetStateAction<ArchiveByJobId>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
  setError: Dispatch<SetStateAction<string | null>>,
  mode: FetchMode,
) {
  const isPoll = mode === "poll";
  const requestId = requestRef.current + 1;
  requestRef.current = requestId;
  if (!isPoll) {
    setLoading(true);
    setError(null);
  }

  const [jobsResult, archiveResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<QueueJob[]>(),
    supabase
      .from("job_archive")
      .select("job_id,archived_at")
      .returns<JobArchiveRow[]>(),
  ]);

  if (requestRef.current !== requestId) return;
  setLoading(false);

  const fetchError = jobsResult.error ?? archiveResult.error;
  if (fetchError) {
    if (!isPoll) {
      hasJobsRef.current = false;
      setAllJobs([]);
      setArchiveByJobId(
        layerPendingArchiveMutations(new Map(), pendingArchiveMutationsRef.current),
      );
    }
    if (isPoll && hasJobsRef.current) return;
    setError(fetchError.message);
    return;
  }

  const nextJobs = jobsResult.data ?? [];
  const nextArchiveByJobId = new Map(
    (archiveResult.data ?? []).map((row) => [row.job_id, row.archived_at]),
  );
  hasJobsRef.current = nextJobs.length > 0;
  setAllJobs(nextJobs);
  setArchiveByJobId(
    layerPendingArchiveMutations(nextArchiveByJobId, pendingArchiveMutationsRef.current),
  );
  setError(null);
}

export function useJobs(supabase: ReturnType<typeof createClient>) {
  const [allJobs, setAllJobs] = useState<QueueJob[]>([]);
  const [archiveByJobId, setArchiveByJobId] = useState<ArchiveByJobId>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const hasJobsRef = useRef(false);
  const pendingArchiveMutationsRef = useRef<PendingArchiveMutations>({
    archives: new Map(),
    unarchives: new Set(),
  });

  const jobs = useMemo(
    () => allJobs.filter((job) => !archiveByJobId.has(job.id)),
    [allJobs, archiveByJobId],
  );
  const archivedJobs = useMemo(
    () => allJobs.filter((job) => archiveByJobId.has(job.id)),
    [allJobs, archiveByJobId],
  );

  const refetch = useCallback(async () => {
    await fetchJobs(
      supabase,
      requestRef,
      hasJobsRef,
      pendingArchiveMutationsRef,
      setAllJobs,
      setArchiveByJobId,
      setLoading,
      setError,
      "refetch",
    );
  }, [supabase]);

  const poll = useCallback(async () => {
    await fetchJobs(
      supabase,
      requestRef,
      hasJobsRef,
      pendingArchiveMutationsRef,
      setAllJobs,
      setArchiveByJobId,
      setLoading,
      setError,
      "poll",
    );
  }, [supabase]);

  const archiveJobs = useCallback(
    async (
      jobIds: readonly number[],
      options: JobArchiveOptions = {},
    ): Promise<JobArchiveMutationResult> => {
      const requestedIds = [...new Set(jobIds)];
      const requestedJobs = requestedIds.flatMap((id) => {
        const job = allJobs.find((candidate) => candidate.id === id);
        return job ? [job] : [];
      });
      const { archivable, skipped } = options.allowDeliberateDismissal === true
        ? requestedJobs.reduce<{ archivable: QueueJob[]; skipped: QueueJob[] }>(
            (partitioned, job) => {
              (canArchiveJob(job) ? partitioned.archivable : partitioned.skipped).push(job);
              return partitioned;
            },
            { archivable: [], skipped: [] },
          )
        : partitionArchivableJobs(requestedJobs);
      const targetIds = archivable
        .map((job) => job.id)
        .filter(
          (id) =>
            !archiveByJobId.has(id) &&
            !pendingArchiveMutationsRef.current.archives.has(id) &&
            !pendingArchiveMutationsRef.current.unarchives.has(id),
        );

      if (targetIds.length === 0) {
        return { ok: true, affected: 0, skipped: skipped.length, error: null };
      }

      // Invalidate a fetch that started before this preference change. A later poll
      // will see the committed archive row; an earlier one must not undo optimism.
      requestRef.current += 1;
      const optimisticAt = new Date().toISOString();
      for (const id of targetIds) {
        pendingArchiveMutationsRef.current.archives.set(id, optimisticAt);
      }
      setArchiveByJobId((current) => {
        const next = new Map(current);
        for (const id of targetIds) next.set(id, optimisticAt);
        return next;
      });

      const rows = targetIds.map((jobId) => ({ job_id: jobId }));
      const { data: writtenRows, error: writeError } = await supabase
        .from("job_archive")
        .upsert(rows, { onConflict: "job_id,owner", ignoreDuplicates: true })
        .select("job_id");
      // A poll may have read before this write settled but not resolved yet. Invalidate
      // that request before removing the pending overlay so its stale snapshot cannot win.
      requestRef.current += 1;
      for (const id of targetIds) pendingArchiveMutationsRef.current.archives.delete(id);

      if (writeError) {
        setArchiveByJobId((current) => {
          const next = new Map(current);
          for (const id of targetIds) {
            if (next.get(id) === optimisticAt) next.delete(id);
          }
          return next;
        });
        return {
          ok: false,
          affected: 0,
          skipped: skipped.length,
          error: writeError.message,
        };
      }

      return {
        ok: true,
        affected: writtenRows?.length ?? 0,
        skipped: skipped.length,
        error: null,
      };
    },
    [allJobs, archiveByJobId, supabase],
  );

  const unarchiveJobs = useCallback(
    async (jobIds: readonly number[]): Promise<JobArchiveMutationResult> => {
      const targetIds = [...new Set(jobIds)].filter(
        (id) =>
          archiveByJobId.has(id) &&
          !pendingArchiveMutationsRef.current.archives.has(id) &&
          !pendingArchiveMutationsRef.current.unarchives.has(id),
      );
      if (targetIds.length === 0) {
        return { ok: true, affected: 0, skipped: 0, error: null };
      }

      requestRef.current += 1;
      const previous = new Map(
        targetIds.flatMap((id) => {
          const archivedAt = archiveByJobId.get(id);
          return archivedAt ? [[id, archivedAt] as const] : [];
        }),
      );
      for (const id of targetIds) pendingArchiveMutationsRef.current.unarchives.add(id);
      setArchiveByJobId((current) => {
        const next = new Map(current);
        for (const id of targetIds) next.delete(id);
        return next;
      });

      const { data: writtenRows, error: writeError } = await supabase
        .from("job_archive")
        .delete()
        .in("job_id", targetIds)
        .select("job_id");
      requestRef.current += 1;
      for (const id of targetIds) pendingArchiveMutationsRef.current.unarchives.delete(id);

      if (writeError) {
        setArchiveByJobId((current) => {
          const next = new Map(current);
          for (const [id, archivedAt] of previous) next.set(id, archivedAt);
          return next;
        });
        return { ok: false, affected: 0, skipped: 0, error: writeError.message };
      }

      return { ok: true, affected: writtenRows?.length ?? 0, skipped: 0, error: null };
    },
    [archiveByJobId, supabase],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    jobs,
    archivedJobs,
    loading,
    error,
    refetch,
    poll,
    archiveJobs,
    unarchiveJobs,
  };
}
