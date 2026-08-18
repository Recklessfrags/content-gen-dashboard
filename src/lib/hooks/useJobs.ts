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
  partitionArchivableJobs,
  type JobArchiveMutationResult,
  type QueueJob,
} from "@/lib/jobs";

type FetchMode = "refetch" | "poll";
type SupabaseClient = ReturnType<typeof createClient>;
type JobArchiveRow = Pick<Tables<"job_archive">, "job_id" | "archived_at">;
type ArchiveByJobId = Map<number, string>;

async function fetchJobs(
  supabase: SupabaseClient,
  requestRef: { current: number },
  hasJobsRef: { current: boolean },
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
      setArchiveByJobId(new Map());
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
  setArchiveByJobId(nextArchiveByJobId);
  setError(null);
}

export function useJobs(supabase: ReturnType<typeof createClient>) {
  const [allJobs, setAllJobs] = useState<QueueJob[]>([]);
  const [archiveByJobId, setArchiveByJobId] = useState<ArchiveByJobId>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const hasJobsRef = useRef(false);

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
      setAllJobs,
      setArchiveByJobId,
      setLoading,
      setError,
      "poll",
    );
  }, [supabase]);

  const archiveJobs = useCallback(
    async (jobIds: readonly number[]): Promise<JobArchiveMutationResult> => {
      const requestedIds = [...new Set(jobIds)];
      const requestedJobs = requestedIds.flatMap((id) => {
        const job = allJobs.find((candidate) => candidate.id === id);
        return job ? [job] : [];
      });
      const { archivable, skipped } = partitionArchivableJobs(requestedJobs);
      const targetIds = archivable
        .map((job) => job.id)
        .filter((id) => !archiveByJobId.has(id));

      if (targetIds.length === 0) {
        return { ok: true, affected: 0, skipped: skipped.length, error: null };
      }

      // Invalidate a fetch that started before this preference change. A later poll
      // will see the committed archive row; an earlier one must not undo optimism.
      requestRef.current += 1;
      const optimisticAt = new Date().toISOString();
      setArchiveByJobId((current) => {
        const next = new Map(current);
        for (const id of targetIds) next.set(id, optimisticAt);
        return next;
      });

      const rows = targetIds.map((jobId) => ({ job_id: jobId }));
      const { error: writeError } = await supabase.from("job_archive").insert(rows);

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
        affected: targetIds.length,
        skipped: skipped.length,
        error: null,
      };
    },
    [allJobs, archiveByJobId, supabase],
  );

  const unarchiveJobs = useCallback(
    async (jobIds: readonly number[]): Promise<JobArchiveMutationResult> => {
      const targetIds = [...new Set(jobIds)].filter((id) => archiveByJobId.has(id));
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
      setArchiveByJobId((current) => {
        const next = new Map(current);
        for (const id of targetIds) next.delete(id);
        return next;
      });

      const { error: writeError } = await supabase
        .from("job_archive")
        .delete()
        .in("job_id", targetIds);

      if (writeError) {
        setArchiveByJobId((current) => {
          const next = new Map(current);
          for (const [id, archivedAt] of previous) next.set(id, archivedAt);
          return next;
        });
        return { ok: false, affected: 0, skipped: 0, error: writeError.message };
      }

      return { ok: true, affected: targetIds.length, skipped: 0, error: null };
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
