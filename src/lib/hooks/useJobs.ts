import { useCallback, useEffect, useRef, useState } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { QueueJob } from "@/lib/jobs";

export function useJobs(supabase: ReturnType<typeof createClient>) {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<QueueJob[]>();
    if (requestRef.current !== requestId) return;
    setLoading(false);
    if (error) {
      setJobs([]);
      setError(error.message);
      return;
    }
    setJobs(data ?? []);
  }, [supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { jobs, loading, error, refetch };
}
