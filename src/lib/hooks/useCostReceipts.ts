import { useCallback, useEffect, useRef, useState } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { CostReceipt } from "@/components/controlroom/shared";

type SupabaseClient = ReturnType<typeof createClient>;

const RECEIPT_QUERY_BATCH_SIZE = 100;
const RECEIPT_PAGE_SIZE = 1_000;

async function fetchReceiptBatch(
  supabase: SupabaseClient,
  episodeIds: readonly string[] | null,
): Promise<CostReceipt[]> {
  const rows: CostReceipt[] = [];

  for (let from = 0; ; from += RECEIPT_PAGE_SIZE) {
    let query = supabase
      .from("receipts")
      .select("episode_id,seq,provider,stage,spend_so_far");

    if (episodeIds) query = query.in("episode_id", episodeIds);

    const { data, error } = await query
      .order("episode_id", { ascending: true })
      .order("seq", { ascending: true })
      .returns<CostReceipt[]>()
      .range(from, from + RECEIPT_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    const page = data ?? [];
    rows.push(...page);
    // A full page is not treated as completion: it may be PostgREST's max_rows
    // boundary, so the next explicit range must confirm whether more rows exist.
    if (page.length < RECEIPT_PAGE_SIZE) return rows;
  }
}

async function fetchReceiptScope(
  supabase: SupabaseClient,
  episodeIds: readonly string[] | null,
): Promise<CostReceipt[]> {
  if (episodeIds === null) return fetchReceiptBatch(supabase, null);

  const batches: string[][] = [];
  for (let index = 0; index < episodeIds.length; index += RECEIPT_QUERY_BATCH_SIZE) {
    batches.push(episodeIds.slice(index, index + RECEIPT_QUERY_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map((batch) => fetchReceiptBatch(supabase, batch)),
  );
  return results.flat();
}

function useReceiptQuery(
  supabase: SupabaseClient,
  episodeIds: readonly string[] | null,
) {
  const [costReceipts, setCostReceipts] = useState<CostReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const requestRef = useRef(0);
  const idsKey = episodeIds === null
    ? null
    : [...new Set(episodeIds.filter(Boolean))].sort().join("\u0000");

  const refetch = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    const ids = idsKey === null
      ? null
      : idsKey
        ? idsKey.split("\u0000")
        : [];

    if (ids?.length === 0) {
      setCostReceipts([]);
      setLoading(false);
      setLoaded(true);
      return;
    }

    try {
      const data = await fetchReceiptScope(supabase, ids);
      if (requestRef.current !== requestId) return;
      setCostReceipts(data);
      setError(null);
    } catch (queryError) {
      if (requestRef.current !== requestId) return;
      setCostReceipts([]);
      setError(queryError instanceof Error ? queryError.message : "Could not load receipts.");
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
        setLoaded(true);
      }
    }
  }, [idsKey, supabase]);

  useEffect(() => {
    void refetch();
    return () => {
      requestRef.current += 1;
    };
  }, [refetch]);

  return { costReceipts, loading, error, loaded, refetch };
}

/** Receipt rows for run cards: always filtered to the episode ids the caller can show. */
export function useCostReceipts(
  supabase: SupabaseClient,
  episodeIds: readonly string[],
) {
  return useReceiptQuery(supabase, episodeIds);
}

/** Full cost roll-up: deliberately paginated rather than relying on PostgREST max_rows. */
export function useAllCostReceipts(supabase: SupabaseClient) {
  return useReceiptQuery(supabase, null);
}
