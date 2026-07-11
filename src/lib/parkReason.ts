export type ParkKind = "fact" | "spend" | "publish" | "unknown";

export function parseBelowFloorCuts(message: string | null): string[] {
  if (!message) return [];

  const seen = new Set<string>();
  const cuts: string[] = [];
  const matches = message.matchAll(/\bcut\d+\b/gi);

  for (const match of matches) {
    const cut = match[0].toLowerCase();
    if (seen.has(cut)) continue;
    seen.add(cut);
    cuts.push(cut);
  }

  return cuts;
}

export function parkKindLabel(
  kind: ParkKind,
  parkKindColumn?: string | null,
): string {
  if (kind === "fact") return "Awaiting fact approval";
  if (kind === "spend") return "Awaiting spend approval";
  if (kind === "publish") return "Awaiting publish approval";
  if (parkKindColumn === "blocked") return "Blocked";
  if (parkKindColumn === "exhausted") return "Budget exhausted";
  return "Parked";
}
