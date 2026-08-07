export const STAGE_LADDER = [
  { stage: "researcher", label: "Researching the topic" },
  { stage: "fact_check", label: "Checking the facts" },
  { stage: "gate", label: "Fact-check review" },
  { stage: "script_writer", label: "Writing the script" },
  { stage: "visual_router", label: "Planning the visuals" },
  { stage: "voice_direction", label: "Recording the voiceover" },
  { stage: "editor", label: "Editing the cut" },
  { stage: "assembly", label: "Assembling the video" },
  { stage: "distribution", label: "Publishing" },
] as const;

export type RenderProgress = {
  step: number;
  total: number;
  label: string;
  fraction: number;
};

export function renderProgress(latestStage: string | null): RenderProgress {
  const total = STAGE_LADDER.length;
  const normalized = latestStage?.trim().toLowerCase() ?? null;
  const step = STAGE_LADDER.findIndex(({ stage }) => stage === normalized) + 1;

  if (step > 0) {
    return {
      step,
      total,
      label: STAGE_LADDER[step - 1].label,
      fraction: step / total,
    };
  }

  return {
    step: 0,
    total,
    label: "Starting…",
    fraction: 0,
  };
}
