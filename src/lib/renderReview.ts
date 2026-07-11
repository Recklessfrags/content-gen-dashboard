export const ORDINAL_OPTIONS = [
  { label: "Bad", value: 0 },
  { label: "Weak", value: 3 },
  { label: "Good", value: 7 },
  { label: "Great", value: 10 },
] as const;

export const VERDICT_OPTIONS = ["ship", "almost", "reject"] as const;
export type ReviewVerdict = (typeof VERDICT_OPTIONS)[number];

export const REVIEW_AXES = [
  {
    key: "hook",
    dimension: "hook",
    question: "Did the first 2 seconds grab you?",
    kind: "ordinal",
  },
  {
    key: "visual_relevance",
    dimension: "visual_relevance",
    question: "Did the visuals match what was being said?",
    kind: "ordinal",
  },
  {
    key: "vo_delivery",
    dimension: "vo_delivery",
    question: "Did the voice sound natural, or robotic?",
    kind: "ordinal",
  },
  {
    key: "beat_pacing",
    dimension: "beat_pacing",
    question: "Did it drag anywhere?",
    kind: "ordinal",
  },
  {
    key: "script",
    dimension: "script",
    question: "Was the writing clear, and did it land?",
    kind: "ordinal",
  },
  {
    key: "editing",
    dimension: "editing",
    question: "Any rough cuts or awkward edits?",
    kind: "ordinal",
  },
  {
    key: "rendering",
    dimension: "rendering",
    question: "Any visual glitches or render artifacts?",
    kind: "ordinal",
  },
  {
    key: "engagement",
    dimension: "engagement",
    question: "Would you post this as-is?",
    kind: "verdict",
  },
] as const satisfies ReadonlyArray<{
  key: string;
  dimension: string;
  question: string;
  kind: "ordinal" | "verdict";
}>;

export type ReviewAnswer = { value: number | null; verdict: string | null; why?: string };
export type ReviewAnswers = Record<string, ReviewAnswer>;

export const MOCK_REVIEW_FIXTURES = [
  {
    id: "mock-1",
    title: "MOCK sample render - cold open pacing",
    channel: "Synthetic channel",
    note: "Synthetic fixture for building the questionnaire shell. No pipeline record or media file.",
  },
  {
    id: "mock-2",
    title: "MOCK sample render - visual match check",
    channel: "Synthetic channel",
    note: "Synthetic fixture with no real MP4 playback and no pipeline record.",
  },
  {
    id: "mock-3",
    title: "MOCK sample render - final post verdict",
    channel: "Synthetic channel",
    note: "Synthetic fixture for local-only scoring capture. Nothing is saved.",
  },
] as const;

export function firstUnansweredIndex(answers: Partial<ReviewAnswers>): number {
  return REVIEW_AXES.findIndex((axis) => {
    const answer = answers[axis.key];
    if (axis.kind === "ordinal") {
      return !isOrdinalValue(answer?.value);
    }

    return !isReviewVerdict(answer?.verdict);
  });
}

export function isReviewComplete(answers: Partial<ReviewAnswers>): boolean {
  return firstUnansweredIndex(answers) === -1;
}

export function summarizeReview(
  answers: Partial<ReviewAnswers>,
): { dimension: string; question: string; answer: string }[] {
  return REVIEW_AXES.map((axis) => {
    const answer = answers[axis.key];
    const baseAnswer =
      axis.kind === "ordinal"
        ? formatOrdinalAnswer(answer?.value)
        : formatVerdictAnswer(answer?.verdict);
    const why = answer?.why?.trim();

    return {
      dimension: axis.dimension,
      question: axis.question,
      answer: why ? `${baseAnswer} - ${why}` : baseAnswer,
    };
  });
}

function formatOrdinalAnswer(value: number | null | undefined): string {
  const option = ORDINAL_OPTIONS.find((entry) => entry.value === value);
  return option ? `${option.label} (${option.value})` : "Unanswered";
}

function formatVerdictAnswer(value: string | null | undefined): string {
  return isReviewVerdict(value) ? value : "Unanswered";
}

function isOrdinalValue(value: number | null | undefined): boolean {
  return ORDINAL_OPTIONS.some((option) => option.value === value);
}

function isReviewVerdict(value: string | null | undefined): value is ReviewVerdict {
  return VERDICT_OPTIONS.includes(value as ReviewVerdict);
}
