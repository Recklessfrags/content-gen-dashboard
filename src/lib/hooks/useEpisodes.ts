import { useCallback, useEffect, useRef, useState } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { Episode } from "@/lib/types";

export function useEpisodes(supabase: ReturnType<typeof createClient>) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Episode[]>();
    if (requestRef.current !== requestId) return;
    setLoading(false);
    if (error) {
      setEpisodes([]);
      setError(error.message);
      return;
    }
    setEpisodes(data ?? []);
  }, [supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { episodes, loading, error, refetch };
}
