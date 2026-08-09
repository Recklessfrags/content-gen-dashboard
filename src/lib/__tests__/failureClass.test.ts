import { describe, expect, it } from "vitest";
import {
  classifyFailure,
  failureClassLabel,
  resolveTerminalState,
  summarizeFailures,
} from "@/lib/failureClass";

describe("classifyFailure", () => {
  const samples = {
    scriptWordCount: "parked: exhausted: word_count 214 outside 130-195",
    unhandled: "unhandled: Error code: 400 - {'type': 'error', ...}",
    costGuardBudget:
      "parked: blocked: cost-guard (budget_projection): projected $5.22 over assembly_ceiling headroom $4.5",
    renderProvider:
      "parked: exhausted: provider error: Render dpwivOL3SKu4xekX did not finish in 60 polls.",
    renderNotProduced:
      "parked: blocked: render intended but not produced: 4 asset(s) still stubbed (e.g. stub://locked_character/b25ebb009f)",
    providerAuth:
      "parked: exhausted: provider error: ElevenLabs music generation failed: Client error '401 Unauthorized'",
    llmSchema:
      "parked: exhausted: provider error: Gemini output not valid for schema: 1 validation error for Script",
    audioMastering: "parked: blocked: final mix measured_true_peak_dbtp -0.84 exceeds -1",
    editorBand: "parked: exhausted: cut_count 47 outside cadence band 20-45",
    costGuardPanel: "parked: blocked: cost-guard (pre_spend_panel): reviewer_a:error",
    ffmpeg: "parked: exhausted: provider error: ffmpeg audio strip failed: ffmpeg version 7.1.5",
    abandoned: "abandoned: worker restarted during #28 deploy mid-run; superseded by fresh job",
  } as const;

  it("classifies the known production patterns (order is load-bearing)", () => {
    expect(classifyFailure(samples.scriptWordCount)).toBe("script_word_count");
    expect(classifyFailure(samples.unhandled)).toBe("unhandled_exception");
    expect(classifyFailure(samples.costGuardBudget)).toBe("cost_guard_budget");
    expect(classifyFailure(samples.renderProvider)).toBe("render_provider");
    expect(classifyFailure(samples.renderNotProduced)).toBe("render_not_produced");
    expect(classifyFailure(samples.providerAuth)).toBe("provider_auth");
    expect(classifyFailure(samples.llmSchema)).toBe("llm_schema");
    expect(classifyFailure(samples.audioMastering)).toBe("audio_mastering");
    expect(classifyFailure(samples.editorBand)).toBe("editor_band");
    expect(classifyFailure(samples.costGuardPanel)).toBe("cost_guard_panel");
    expect(classifyFailure(samples.ffmpeg)).toBe("ffmpeg");
    expect(classifyFailure(samples.abandoned)).toBe("abandoned");
    expect(classifyFailure("")).toBe("other");
    expect(classifyFailure(null)).toBe("other");
  });

  it("prefers cost-guard over render-provider when both substrings appear", () => {
    expect(classifyFailure(`${samples.costGuardBudget} Render failed`)).toBe("cost_guard_budget");
  });

  it("prefers unhandled over word_count when both substrings appear", () => {
    expect(classifyFailure(`${samples.unhandled} word_count 214 outside 130-195`)).toBe(
      "unhandled_exception",
    );
  });

  it("labels caption-audit failures", () => {
    expect(failureClassLabel("caption_audit")).toBe("Captions failed numeral audit");
  });
});

describe("resolveTerminalState", () => {
  it("derives the terminal state from error text when park_kind is unset (presence test, never equality-with-default)", () => {
    const error = "parked: exhausted: word_count 214 outside 130-195";
    for (const parkKindColumn of [null, undefined, "", "   "] as const) {
      expect(resolveTerminalState(parkKindColumn, error)).toEqual({
        state: "exhausted",
        source: "derived",
      });
    }
  });

  it("reports a recorded park_kind value as recorded even if the state matches a derived value", () => {
    const error = "parked: exhausted: word_count 214 outside 130-195";
    expect(resolveTerminalState(null, error)).toEqual({ state: "exhausted", source: "derived" });
    expect(resolveTerminalState("exhausted", error)).toEqual({
      state: "exhausted",
      source: "recorded",
    });
  });

  it("treats unrecognized recorded park_kind values as recorded (without throwing)", () => {
    expect(resolveTerminalState("fact", "parked: blocked: something")).toEqual({
      state: "unknown",
      source: "recorded",
    });
  });

  it("derives crash-path states from error prefixes", () => {
    expect(resolveTerminalState(null, "unhandled: Error code: 400 - {'type': 'error', ...}")).toEqual({
      state: "crashed",
      source: "derived",
    });
    expect(resolveTerminalState(null, "abandoned: worker restarted during #28 deploy mid-run; superseded by fresh job")).toEqual({
      state: "abandoned",
      source: "derived",
    });
  });
});

describe("summarizeFailures", () => {
  it("sums recorded spend, counts missing spend separately, and uses deterministic ordering", () => {
    const costGuardBudget =
      "parked: blocked: cost-guard (budget_projection): projected $5.22 over assembly_ceiling headroom $4.5";
    const ffmpeg = "parked: exhausted: provider error: ffmpeg audio strip failed: ffmpeg version 7.1.5";
    const llmSchema =
      "parked: exhausted: provider error: Gemini output not valid for schema: 1 validation error for Script";

    const rows = summarizeFailures([
      { error: costGuardBudget, spend: 1.25, stage: "assembly" },
      { error: costGuardBudget, spend: null, stage: "assembly" },
      { error: ffmpeg, spend: 0.5, stage: "script" },
      { error: llmSchema, spend: 0.75, stage: null },
    ]);

    expect(rows.map((row) => row.classId)).toEqual(["cost_guard_budget", "ffmpeg", "llm_schema"]);
    expect(rows[0]).toEqual({
      classId: "cost_guard_budget",
      label: "Stopped: would exceed budget",
      count: 2,
      spend: 1.25,
      spendUnrecorded: 1,
      stages: ["assembly"],
    });
  });

  it("dedupes and sorts distinct non-null stages", () => {
    const editorBand = "parked: exhausted: cut_count 47 outside cadence band 20-45";
    const rows = summarizeFailures([
      { error: editorBand, spend: 0.1, stage: "z-stage" },
      { error: editorBand, spend: 0.2, stage: "a-stage" },
      { error: editorBand, spend: 0.3, stage: "a-stage" },
      { error: editorBand, spend: 0.4, stage: null },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].stages).toEqual(["a-stage", "z-stage"]);
  });
});
