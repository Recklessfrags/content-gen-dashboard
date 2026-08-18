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

  const rowReason = (row: Record<string, unknown>, cut: unknown): unknown => {
    if (row.reason != null) return row.reason;
    if (row.message != null) return row.message;

    const label =
      typeof cut === "string" || typeof cut === "number" ? String(cut).trim() : "";
    const details: string[] = [];
    if (typeof row.anchor_phrase === "string" && row.anchor_phrase.trim()) {
      details.push(`"${row.anchor_phrase.trim()}"`);
    }
    if (typeof row.relevance_score === "number" && Number.isFinite(row.relevance_score)) {
      details.push(`relevance ${row.relevance_score.toFixed(2)}`);
    }
    if (typeof row.vision_confirm === "string" && row.vision_confirm.trim()) {
      details.push(row.vision_confirm.trim());
    }
    if (row.escalation && typeof row.escalation === "object" && !Array.isArray(row.escalation)) {
      const escalation = row.escalation as Record<string, unknown>;
      if (Array.isArray(escalation.attempted_tiers)) {
        const attemptedTiers = escalation.attempted_tiers.filter(
          (tier): tier is string => typeof tier === "string" && Boolean(tier.trim()),
        );
        if (attemptedTiers.length > 0) {
          details.push(`attempted tiers ${attemptedTiers.map((tier) => tier.trim()).join(" → ")}`);
        }
      }
      if (typeof escalation.accepted_tier === "string" && escalation.accepted_tier.trim()) {
        details.push(`accepted tier ${escalation.accepted_tier.trim()}`);
      } else if (escalation.exhausted === true) {
        details.push("exhausted");
      }
    }
    return label && details.length > 0 ? `${label} — ${details.join(", ")}` : undefined;
  };

  const visitCuts = (cuts: unknown) => {
    if (Array.isArray(cuts)) {
      for (const entry of cuts) {
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          const row = entry as Record<string, unknown>;
          const cut = row.cut ?? row.cut_id ?? row.id ?? row.name ?? row.index;
          add(cut, rowReason(row, cut));
        } else add(entry);
      }
    } else if (cuts && typeof cuts === "object") {
      for (const [cut, detail] of Object.entries(cuts as Record<string, unknown>)) {
        if (typeof detail === "string") add(cut, detail);
        else if (detail && typeof detail === "object") {
          const row = detail as Record<string, unknown>;
          const rowCut = row.cut ?? row.cut_id ?? row.id ?? cut;
          add(rowCut, rowReason(row, rowCut));
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
      if (["below_floor_cuts", "below_floor_notice"].includes(key.toLowerCase())) {
        if (key.toLowerCase() === "below_floor_notice" && child && typeof child === "object") {
          const notice = child as Record<string, unknown>;
          visitCuts(notice.cut_ids);
          visitCuts(notice.cuts);
        } else visitCuts(child);
      }
      else walk(child);
    }
  };

  walk(value);
  return [...found.values()];
}
