import { STAGE_LADDER } from "@/lib/renderProgress";

export const PLAIN_LANGUAGE = {
  parked: "Waiting on you",
  park_kind: "Waiting on you",
  verdict: "Result",
  receipts: "Run details",
  below_floor: "Low-quality shots flagged",
  "below-floor cuts": "Low-quality shots flagged",
  terminal_state: "Why it stopped",
  failure_class: "Why it stopped",
  final_stage: "Stopped at",
} as const;

const ADVANCED_ONLY = new Set([
  "sentinels",
  "idempotency key",
  "reveal auditor",
  "correlation key",
]);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function plainLanguage(value: string): string {
  const key = normalize(value) as keyof typeof PLAIN_LANGUAGE;
  return PLAIN_LANGUAGE[key] ?? value;
}

export function isAdvancedOnlyLabel(value: string): boolean {
  return ADVANCED_ONLY.has(normalize(value).replaceAll("-", " ").replaceAll("_", " "));
}

export function stageLabel(stage: string | null | undefined): string {
  if (!stage?.trim()) return "Stage not recorded";
  const normalized = normalize(stage);
  const ladderLabel = STAGE_LADDER.find((item) => item.stage === normalized)?.label;
  if (ladderLabel) return ladderLabel;
  return normalized
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
