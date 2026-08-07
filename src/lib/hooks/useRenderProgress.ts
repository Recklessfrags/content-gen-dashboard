import { useEffect, useMemo, useRef, useState } from "react";
import { STAGE_LADDER } from "@/lib/renderProgress";
import { createClient } from "@/lib/supabase/client";

type ReceiptStageRow = {
  episode_id: string;
  seq: number;
  stage: string;
};

const RECEIPT_QUERY_BATCH_SIZE = 100;
const LADDER_INDEX = new Map<string, number>(
  STAGE_LADDER.map(({ stage }, index) => [stage, index]),
);

export function reduceLatestReceiptStages(rows: readonly ReceiptStageRow[]): Record<string, string> {
  const furthest: Record<string, string> = {};
  const furthestIndex: Record<string, number> = {};

  for (const row of rows) {
    if (!row.episode_id || !row.stage) continue;
    const normalizedStage = row.stage.trim().toLowerCase();
    if (normalizedStage === "entertainment_judge") continue;
    const ladderIndex = LADDER_INDEX.get(normalizedStage);
    if (ladderIndex === undefined) continue;
    if (!(row.episode_id in furthestIndex) || ladderIndex > furthestIndex[row.episode_id]) {
      furthest[row.episode_id] = normalizedStage;
      furthestIndex[row.episode_id] = ladderIndex;
    }
  }

  return furthest;
}

export function useRenderProgress(
  episodeIds: readonly string[],
  pollIntervalMs = 5_000,
): Record<string, string> {
  const supabase = useMemo(() => createClient(), []);
  const [latestStages, setLatestStages] = useState<Record<string, string>>({});
  const requestRef = useRef(0);
  const idsKey = [...new Set(episodeIds.filter(Boolean))].sort().join("\u0000");

  useEffect(() => {
    const ids = idsKey ? idsKey.split("\u0000") : [];

    if (ids.length === 0) {
      requestRef.current += 1;
      setLatestStages({});
      return;
    }

    let fetchInFlight = false;
    const fetchProgress = async () => {
      if (fetchInFlight) return;
      fetchInFlight = true;
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      try {
        const batches: string[][] = [];
        for (let index = 0; index < ids.length; index += RECEIPT_QUERY_BATCH_SIZE) {
          batches.push(ids.slice(index, index + RECEIPT_QUERY_BATCH_SIZE));
        }

        const responses = await Promise.all(
          batches.map((batch) => supabase
            .from("receipts")
            .select("episode_id,seq,stage")
            .in("episode_id", batch)
            .order("seq", { ascending: false })),
        );
        if (requestRef.current !== requestId) return;
        if (responses.some(({ error }) => error)) {
          setLatestStages({});
          return;
        }
        const rows = responses.flatMap(({ data }) => (data ?? []) as ReceiptStageRow[]);
        setLatestStages(reduceLatestReceiptStages(rows));
      } finally {
        fetchInFlight = false;
      }
    };

    void fetchProgress();
    const intervalId = window.setInterval(() => void fetchProgress(), pollIntervalMs);
    return () => {
      window.clearInterval(intervalId);
      requestRef.current += 1;
    };
  }, [idsKey, pollIntervalMs, supabase]);

  return latestStages;
}
