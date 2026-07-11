import { describe, expect, it } from "vitest";
import {
  REVIEW_AXES,
  firstUnansweredIndex,
  isReviewComplete,
  summarizeReview,
  type ReviewAnswers,
} from "@/lib/renderReview";

function completeAnswers(): ReviewAnswers {
  return Object.fromEntries(
    REVIEW_AXES.map((axis) => [
      axis.key,
      axis.kind === "ordinal"
        ? { value: 7, verdict: null }
        : { value: null, verdict: "ship" },
    ]),
  );
}

describe("review scoring helpers", () => {
  it("finds the first question on empty answers", () => {
    expect(firstUnansweredIndex({})).toBe(0);
  });

  it("finds the first unanswered question in a partial review", () => {
    expect(
      firstUnansweredIndex({
        hook: { value: 10, verdict: null },
        visual_relevance: { value: 7, verdict: null },
      }),
    ).toBe(2);
  });

  it("returns -1 when every axis is answered", () => {
    expect(firstUnansweredIndex(completeAnswers())).toBe(-1);
  });

  it("requires all ordinal values and the engagement verdict for completion", () => {
    const answers = completeAnswers();

    expect(isReviewComplete(answers)).toBe(true);
    expect(isReviewComplete({ ...answers, rendering: { value: null, verdict: null } })).toBe(false);
    expect(isReviewComplete({ ...answers, engagement: { value: null, verdict: null } })).toBe(false);
    expect(isReviewComplete({ ...answers, hook: { value: 11, verdict: null } })).toBe(false);
    expect(isReviewComplete({ ...answers, engagement: { value: null, verdict: "maybe" } })).toBe(
      false,
    );
  });

  it("summarizes every axis into human-readable rows", () => {
    const answers = completeAnswers();
    answers.hook = { value: 10, verdict: null, why: "Strong opening line." };

    expect(summarizeReview(answers)).toEqual([
      {
        dimension: "hook",
        question: "Did the first 2 seconds grab you?",
        answer: "Great (10) - Strong opening line.",
      },
      {
        dimension: "visual_relevance",
        question: "Did the visuals match what was being said?",
        answer: "Good (7)",
      },
      {
        dimension: "vo_delivery",
        question: "Did the voice sound natural, or robotic?",
        answer: "Good (7)",
      },
      {
        dimension: "beat_pacing",
        question: "Did it drag anywhere?",
        answer: "Good (7)",
      },
      {
        dimension: "script",
        question: "Was the writing clear, and did it land?",
        answer: "Good (7)",
      },
      {
        dimension: "editing",
        question: "Any rough cuts or awkward edits?",
        answer: "Good (7)",
      },
      {
        dimension: "rendering",
        question: "Any visual glitches or render artifacts?",
        answer: "Good (7)",
      },
      {
        dimension: "engagement",
        question: "Would you post this as-is?",
        answer: "ship",
      },
    ]);
  });
});
