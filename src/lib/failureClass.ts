export type TerminalState =
  | "exhausted"
  | "blocked"
  | "no_progress"
  | "crashed"
  | "abandoned"
  | "unknown";

export type TerminalStateSource = "recorded" | "derived" | "unavailable";

export type FailureClassId =
  | "unhandled_exception"
  | "cost_guard_budget"
  | "script_word_count"
  | "render_provider"
  | "render_not_produced"
  | "provider_auth"
  | "llm_schema"
  | "audio_mastering"
  | "editor_band"
  | "caption_audit"
  | "cost_guard_panel"
  | "ffmpeg"
  | "abandoned"
  | "other";

export function resolveTerminalState(
  parkKindColumn: string | null | undefined,
  error: string | null | undefined,
): { state: TerminalState; source: TerminalStateSource } {
  const recorded = parkKindColumn != null && parkKindColumn.trim().length > 0;
  if (recorded) {
    const value = parkKindColumn.trim().toLowerCase();
    if (value === "blocked") return { state: "blocked", source: "recorded" };
    if (value === "exhausted") return { state: "exhausted", source: "recorded" };
    return { state: "unknown", source: "recorded" };
  }

  const text = error?.trim() ?? "";
  if (text === "") return { state: "unknown", source: "unavailable" };

  if (/^parked:\s*exhausted\b/i.test(text)) return { state: "exhausted", source: "derived" };
  if (/^parked:\s*blocked\b/i.test(text)) return { state: "blocked", source: "derived" };
  if (/^parked:\s*no_progress\b/i.test(text)) return { state: "no_progress", source: "derived" };
  if (/^unhandled:/i.test(text)) return { state: "crashed", source: "derived" };
  if (/^abandoned:/i.test(text)) return { state: "abandoned", source: "derived" };

  return { state: "unknown", source: "unavailable" };
}

export function classifyFailure(error: string | null | undefined): FailureClassId {
  const raw = error?.trim() ?? "";
  if (raw === "") return "other";

  if (/^unhandled:/i.test(raw)) return "unhandled_exception";
  if (/^abandoned:/i.test(raw)) return "abandoned";

  const text = raw.toLowerCase();

  if (text.includes("cost-guard (budget_projection)")) return "cost_guard_budget";
  if (text.includes("cost-guard (pre_spend_panel)")) return "cost_guard_panel";
  if (text.includes("word_count")) return "script_word_count";
  if (text.includes("ffmpeg")) return "ffmpeg";
  if (
    text.includes("caption numeral mismatch") ||
    text.includes("unaudited vendor-recognised captions")
  ) {
    return "caption_audit";
  }

  if (
    (text.includes("did not finish in") && text.includes("polls")) ||
    text.includes("render failed") ||
    text.includes("quota of time")
  ) {
    return "render_provider";
  }

  if (text.includes("still stubbed") || text.includes("budget cannot afford the render")) {
    return "render_not_produced";
  }

  if (text.includes("elevenlabs") || text.includes("higgsfield") || text.includes("pexels")) {
    return "provider_auth";
  }

  if (text.includes("not valid for schema") || text.includes("returned no content")) {
    return "llm_schema";
  }

  if (text.includes("measured_lufs") || text.includes("true_peak") || text.includes("not mastered")) {
    return "audio_mastering";
  }

  if (text.includes("cut_count") || text.includes("near-duplicate") || (text.includes("duration") && text.includes("outside"))) {
    return "editor_band";
  }

  return "other";
}

export function failureClassLabel(id: FailureClassId): string {
  switch (id) {
    case "unhandled_exception":
      return "Crashed (unhandled error)";
    case "cost_guard_budget":
      return "Stopped: would exceed budget";
    case "script_word_count":
      return "Script length out of band";
    case "render_provider":
      return "Render service failed";
    case "render_not_produced":
      return "Render never produced";
    case "provider_auth":
      return "Provider key or access problem";
    case "llm_schema":
      return "Model returned unusable output";
    case "audio_mastering":
      return "Audio failed the loudness floor";
    case "editor_band":
      return "Edit failed a pacing/duplication check";
    case "caption_audit":
      return "Captions failed numeral audit";
    case "cost_guard_panel":
      return "Stopped by the pre-spend review panel";
    case "ffmpeg":
      return "Local audio/video tool failed";
    case "abandoned":
      return "Abandoned (worker restarted)";
    case "other":
      return "Other";
  }
}

export function terminalStateLabel(state: TerminalState): string {
  switch (state) {
    case "exhausted":
      return "Retries exhausted";
    case "blocked":
      return "Blocked";
    case "no_progress":
      return "No progress";
    case "crashed":
      return "Crashed";
    case "abandoned":
      return "Abandoned";
    case "unknown":
      return "Unclassified";
  }
}

export type FailureSummaryRow = {
  classId: FailureClassId;
  label: string;
  count: number;
  spend: number;
  spendUnrecorded: number;
  stages: string[];
};

export function summarizeFailures(
  rows: ReadonlyArray<{ error: string | null; spend: number | null; stage: string | null }>,
): FailureSummaryRow[] {
  const byClass = new Map<
    FailureClassId,
    { count: number; spend: number; spendUnrecorded: number; stages: Set<string> }
  >();

  for (const row of rows) {
    const classId = classifyFailure(row.error);
    const current = byClass.get(classId) ?? {
      count: 0,
      spend: 0,
      spendUnrecorded: 0,
      stages: new Set<string>(),
    };

    current.count += 1;
    if (typeof row.spend === "number") current.spend += row.spend;
    else current.spendUnrecorded += 1;

    if (row.stage != null) {
      const trimmed = row.stage.trim();
      if (trimmed !== "") current.stages.add(trimmed);
    }

    byClass.set(classId, current);
  }

  return Array.from(byClass.entries())
    .map(([classId, data]) => ({
      classId,
      label: failureClassLabel(classId),
      count: data.count,
      spend: data.spend,
      spendUnrecorded: data.spendUnrecorded,
      stages: Array.from(data.stages).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => (b.count - a.count) || a.classId.localeCompare(b.classId));
}
