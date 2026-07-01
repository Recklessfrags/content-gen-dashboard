import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { QueueJob } from "@/lib/jobs";

type FetchMode = "refetch" | "poll";
type SupabaseClient = ReturnType<typeof createClient>;

async function fetchJobs(
  supabase: SupabaseClient,
  requestRef: { current: number },
  hasJobsRef: { current: boolean },
  setJobs: Dispatch<SetStateAction<QueueJob[]>>,
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
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<QueueJob[]>();
  if (requestRef.current !== requestId) return;
  setLoading(false);
  if (error) {
    if (!isPoll) {
      hasJobsRef.current = false;
      setJobs([]);
    }
    if (isPoll && hasJobsRef.current) return;
    setError(error.message);
    return;
  }
  const nextJobs = data ?? [];
  hasJobsRef.current = nextJobs.length > 0;
  setJobs(nextJobs);
  setError(null);
}

export function useJobs(supabase: ReturnType<typeof createClient>) {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const hasJobsRef = useRef(false);

  const refetch = useCallback(async () => {
    await fetchJobs(supabase, requestRef, hasJobsRef, setJobs, setLoading, setError, "refetch");
  }, [supabase]);

  const poll = useCallback(async () => {
    await fetchJobs(supabase, requestRef, hasJobsRef, setJobs, setLoading, setError, "poll");
  }, [supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { jobs, loading, error, refetch, poll };
}
