export type ParkExplanationKind = "fact" | "spend" | "publish" | "reveal" | "unknown";

const EXPLANATIONS: Record<Exclude<ParkExplanationKind, "unknown"> | "blocked" | "exhausted", string> = {
  fact: "Paused for your fact call. A flagged claim needs your yes/no before the pipeline continues. Approving re-queues the run; money is not spent by this approval.",
  spend: "Paused for your spend approval. The next stage costs real money and waits for your go.",
  publish: "Paused for your publish approval. The video is rendered; nothing posts until you approve.",
  reveal: "Paused for reveal sign-off. Review the reveal wording in the Reveal hub.",
  blocked: "Stopped: the pipeline hit a wall it can't retry through (config, credentials, or an upstream refusal). Needs a fix on the pipeline side, not an approval.",
  exhausted: "Stopped: the pipeline used all its retries on a failing stage. The per-worker log below shows which stage and why.",
};

export function parkExplanation(
  kind: ParkExplanationKind | null | undefined,
  status: unknown,
  parkKindColumn?: unknown,
): string | null {
  if (parkKindColumn === "blocked" || parkKindColumn === "exhausted") {
    return EXPLANATIONS[parkKindColumn];
  }
  if (kind && kind !== "unknown") return EXPLANATIONS[kind];
  if (typeof status === "string" && status.trim().toLowerCase() === "error") {
    return "Stopped with an error. The per-worker log below shows the failing stage.";
  }
  return null;
}

export type BelowFloorCut = { cut: string; reason: string | null };

/** Extracts known below-floor payload shapes without trusting receipt JSON. */
export function extractBelowFloorCuts(value: unknown): BelowFloorCut[] {
  const found = new Map<string, BelowFloorCut>();
  const seen = new Set<object>();

  const add = (cut: unknown, reason?: unknown) => {
    if (typeof cut !== "string" && typeof cut !== "number") return;
    const label = String(cut).trim();
    if (!label) return;
    const why = typeof reason === "string" && reason.trim() ? reason.trim() : null;
    const prior = found.get(label);
    if (!prior || (!prior.reason && why)) found.set(label, { cut: label, reason: why });
  };

  const visitCuts = (cuts: unknown) => {
    if (Array.isArray(cuts)) {
      for (const entry of cuts) {
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          const row = entry as Record<string, unknown>;
          add(row.cut ?? row.cut_id ?? row.id ?? row.name ?? row.index, row.reason ?? row.message);
        } else add(entry);
      }
    } else if (cuts && typeof cuts === "object") {
      for (const [cut, detail] of Object.entries(cuts as Record<string, unknown>)) {
        if (typeof detail === "string") add(cut, detail);
        else if (detail && typeof detail === "object") {
          const row = detail as Record<string, unknown>;
          add(row.cut ?? row.cut_id ?? row.id ?? cut, row.reason ?? row.message);
        } else add(cut);
      }
    }
  };

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (key.toLowerCase() === "below_floor_cuts") visitCuts(child);
      else walk(child);
    }
  };

  walk(value);
  return [...found.values()];
}
