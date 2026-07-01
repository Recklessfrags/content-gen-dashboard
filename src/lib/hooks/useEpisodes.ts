import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { Episode } from "@/lib/types";

type FetchMode = "refetch" | "poll";
type SupabaseClient = ReturnType<typeof createClient>;

async function fetchEpisodes(
  supabase: SupabaseClient,
  requestRef: { current: number },
  hasEpisodesRef: { current: boolean },
  setEpisodes: Dispatch<SetStateAction<Episode[]>>,
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
    .from("episodes")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Episode[]>();
  if (requestRef.current !== requestId) return;
  setLoading(false);
  if (error) {
    if (!isPoll) {
      hasEpisodesRef.current = false;
      setEpisodes([]);
    }
    if (isPoll && hasEpisodesRef.current) return;
    setError(error.message);
    return;
  }
  const nextEpisodes = data ?? [];
  hasEpisodesRef.current = nextEpisodes.length > 0;
  setEpisodes(nextEpisodes);
  setError(null);
}

export function useEpisodes(supabase: ReturnType<typeof createClient>) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const hasEpisodesRef = useRef(false);

  const refetch = useCallback(async () => {
    await fetchEpisodes(supabase, requestRef, hasEpisodesRef, setEpisodes, setLoading, setError, "refetch");
  }, [supabase]);

  const poll = useCallback(async () => {
    await fetchEpisodes(supabase, requestRef, hasEpisodesRef, setEpisodes, setLoading, setError, "poll");
  }, [supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { episodes, loading, error, refetch, poll };
}
