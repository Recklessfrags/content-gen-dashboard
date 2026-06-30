import { useCallback, useEffect, useRef, useState } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { CostReceipt } from "@/components/controlroom/shared";

export function useCostReceipts(supabase: ReturnType<typeof createClient>) {
  const [costReceipts, setCostReceipts] = useState<CostReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const requestRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("receipts")
      .select("episode_id,seq,provider,stage,spend_so_far")
      .order("episode_id", { ascending: true })
      .order("seq", { ascending: true })
      .returns<CostReceipt[]>();
    if (requestRef.current !== requestId) return;
    setLoading(false);
    setLoaded(true);
    if (error) {
      setCostReceipts([]);
      setError(error.message);
      return;
    }
    setCostReceipts(data ?? []);
  }, [supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { costReceipts, loading, error, loaded, refetch };
}
