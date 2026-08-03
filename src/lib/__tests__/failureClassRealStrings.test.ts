import { describe, expect, it } from "vitest";
import { classifyFailure, resolveTerminalState } from "@/lib/failureClass";

// Real production strings that match MORE THAN ONE rule — ordering is the risk.
const AMBIGUOUS: Array<[string, string, string]> = [
  ["job12 word_count + duration/outside",
   "parked: exhausted: word_count 234 outside 135-160; est_duration_sec 108 outside 50-85 (calibrated at 130 wpm)",
   "script_word_count"],
  ["job64 cost-guard(clip_grade) + duration",
   "parked: exhausted: cost-guard (clip_grade): retry cap 2 hit; duration 8s != expected 2.75s (tol 0.75s)",
   "other"],
  ["job91 'budget cannot afford the render' not budget_projection",
   "parked: exhausted: render intended but not produced: episode/assembly budget cannot afford the render",
   "render_not_produced"],
  ["job45 Render failed + quota of time",
   "parked: exhausted: provider error: Render failed: You exceeded the quota of time in your plan",
   "render_provider"],
  ["job55 ElevenLabs + quota_exceeded (NOT 'quota of time')",
   "parked: exhausted: provider error: ElevenLabs music generation failed: Client error '401 Unauthorized' for url 'https://api.elevenlabs.io/v1/music' :: body={\"code\":\"insufficient_credits\",\"status\":\"quota_exceeded\"}",
   "provider_auth"],
  ["job56 ElevenLabs TTS + 'quota of 40000'",
   "parked: exhausted: provider error: ElevenLabs timestamped TTS failed: Client error '401 Unauthorized' :: body={\"message\":\"This request exceeds your quota of 40000.\"}",
   "provider_auth"],
  ["job9 duration + outside (platform bounds)",
   "parked: blocked: duration 99s outside platform bounds [3,90]",
   "editor_band"],
  ["job93 not mastered + measured_lufs",
   "parked: blocked: final mix was not mastered; final mix measured_lufs missing or non-numeric; final mix measured_true_peak_dbtp missing or non-numeric",
   "audio_mastering"],
  ["job113 ffmpeg blob containing 'Duration:' and archive metadata",
   "parked: exhausted: provider error: ffmpeg audio strip failed: ffmpeg version 7.1.5\n  Duration: 00:13:34.98, start: 0.000000\nConversion failed!",
   "ffmpeg"],
  ["job120 near-duplicate",
   "parked: exhausted: undeclared near-duplicate 5,cta",
   "editor_band"],
  ["job80 resume manifest",
   "parked: blocked: resume manifest != parked manifest; repair aborted",
   "other"],
  ["job5 no_progress YELLOW claim",
   "parked: no_progress: YELLOW claim c3 used without its on-screen receipt cued",
   "other"],
  ["authored caption numeral mismatch",
   "parked: blocked: authored caption numeral mismatch: missing from captions=[\"21\"]; missing from voiceover=[\"133\"]",
   "caption_audit"],
  ["unaudited vendor-recognised captions",
   "parked: blocked: numeral-bearing script rendered with unaudited vendor-recognised captions",
   "caption_audit"],
];

describe("classifier vs real ambiguous production strings", () => {
  for (const [name, err, expected] of AMBIGUOUS) {
    it(name, () => expect(classifyFailure(err)).toBe(expected));
  }
});

describe("terminal state recovery on the 30 unclassified", () => {
  it("recovers exhausted from a pre-era row with NULL park_kind", () => {
    expect(resolveTerminalState(null, "parked: exhausted: word_count 216 outside 135-160"))
      .toEqual({ state: "exhausted", source: "derived" });
  });
  it("recovers blocked from a pre-era row with NULL park_kind", () => {
    expect(resolveTerminalState(null, "parked: blocked: duration 99s outside platform bounds [3,90]"))
      .toEqual({ state: "blocked", source: "derived" });
  });
  it("recovers no_progress", () => {
    expect(resolveTerminalState(null, "parked: no_progress: word_count 171 outside 135-160"))
      .toEqual({ state: "no_progress", source: "derived" });
  });
  it("marks a crash as crashed, never blank", () => {
    expect(resolveTerminalState(null, "unhandled: Error code: 400 - Grammar compilation timed out."))
      .toEqual({ state: "crashed", source: "derived" });
  });
  it("marks the abandoned row", () => {
    expect(resolveTerminalState(null, "abandoned: worker restarted during #28 deploy mid-run"))
      .toEqual({ state: "abandoned", source: "derived" });
  });
});
