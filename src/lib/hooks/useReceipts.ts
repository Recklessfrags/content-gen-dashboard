import { useCallback, useRef, useState } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { Receipt } from "@/lib/types";

export function useReceipts(supabase: ReturnType<typeof createClient>) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(
    async (episodeId: string) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("episode_id", episodeId)
        .order("seq", { ascending: true })
        .returns<Receipt[]>();
      if (requestRef.current !== requestId) return;
      setLoading(false);
      if (error) {
        setReceipts([]);
        setError(error.message);
        return;
      }
      setReceipts(data ?? []);
    },
    [supabase],
  );

  const clear = useCallback(() => {
    setReceipts([]);
  }, []);

  const reset = useCallback(() => {
    requestRef.current += 1;
    setReceipts([]);
    setError(null);
    setLoading(false);
  }, []);

  return { receipts, loading, error, load, clear, reset };
}
