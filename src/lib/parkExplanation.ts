export type ParkExplanationKind = "fact" | "spend" | "publish" | "reveal" | "unknown";

const EXPLANATIONS: Record<Exclude<ParkExplanationKind, "unknown"> | "blocked" | "exhausted", string> = {
  fact: "Waiting for your fact call. A flagged claim needs your yes/no before work continues. Approving starts the run again; money is not spent by this approval.",
  spend: "Waiting for your spend approval. The next step costs real money and needs your go.",
  publish: "Waiting for your publish approval. The video is rendered; nothing posts until you approve.",
  reveal: "Waiting for reveal sign-off. Review the reveal wording in the Reveal hub.",
  blocked: "Stopped: the video system hit a problem it can't retry (setup, credentials, or an outside service refusal). This needs a system fix, not an approval.",
  exhausted: "Stopped after using all retry attempts. The run details below show where and why.",
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
    return "Stopped with an error. The run details below show where it failed.";
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
