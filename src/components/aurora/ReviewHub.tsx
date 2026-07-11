"use client";

import { useMemo, useState } from "react";
import {
  MOCK_REVIEW_FIXTURES,
  ORDINAL_OPTIONS,
  REVIEW_AXES,
  VERDICT_OPTIONS,
  isReviewComplete,
  summarizeReview,
  type ReviewAnswers,
} from "@/lib/renderReview";

type ReviewFixture = (typeof MOCK_REVIEW_FIXTURES)[number];

export type ReviewHubProps = {
  fixtures: typeof MOCK_REVIEW_FIXTURES;
  onBack: () => void;
};

export function ReviewHub({ fixtures, onBack }: ReviewHubProps) {
  const [activeFixture, setActiveFixture] = useState<ReviewFixture | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<ReviewAnswers>>({});
  const [summaryOpen, setSummaryOpen] = useState(false);

  const currentAxis = REVIEW_AXES[questionIndex];
  const currentAnswer = currentAxis ? answers[currentAxis.key] : undefined;
  const currentAnswered =
    currentAxis?.kind === "ordinal"
      ? currentAnswer?.value !== null && currentAnswer?.value !== undefined
      : currentAnswer?.verdict !== null && currentAnswer?.verdict !== undefined;
  const summary = useMemo(() => summarizeReview(answers), [answers]);

  function startScoring(fixture: ReviewFixture) {
    setActiveFixture(fixture);
    setQuestionIndex(0);
    setAnswers({});
    setSummaryOpen(false);
  }

  function returnToList() {
    setActiveFixture(null);
    setQuestionIndex(0);
    setAnswers({});
    setSummaryOpen(false);
  }

  function setOrdinal(value: number) {
    if (!currentAxis) return;
    setAnswers((previous) => ({
      ...previous,
      [currentAxis.key]: {
        value,
        verdict: null,
        why: previous[currentAxis.key]?.why,
      },
    }));
  }

  function setVerdict(verdict: string) {
    if (!currentAxis) return;
    setAnswers((previous) => ({
      ...previous,
      [currentAxis.key]: {
        value: null,
        verdict,
        why: previous[currentAxis.key]?.why,
      },
    }));
  }

  function setWhy(why: string) {
    if (!currentAxis) return;
    setAnswers((previous) => {
      const existing = previous[currentAxis.key] ?? { value: null, verdict: null };
      return {
        ...previous,
        [currentAxis.key]: {
          ...existing,
          why,
        },
      };
    });
  }

  function goBack() {
    if (questionIndex === 0) {
      returnToList();
      return;
    }

    setQuestionIndex((index) => Math.max(0, index - 1));
  }

  function goNext() {
    if (!currentAnswered) return;
    if (questionIndex === REVIEW_AXES.length - 1) {
      if (isReviewComplete(answers)) setSummaryOpen(true);
      return;
    }

    setQuestionIndex((index) => Math.min(REVIEW_AXES.length - 1, index + 1));
  }

  if (activeFixture && summaryOpen) {
    return (
      <section className="review-hub scoped" aria-labelledby="review-hub-title">
        <ReviewHeader onBack={onBack} />
        <div className="glass-panel review-hub__summary">
          <div>
            <p className="text-mono dim">MOCK SUMMARY</p>
            <h3 className="text-display review-hub__title">
              {activeFixture.title}
            </h3>
            <p className="dim">{activeFixture.channel}</p>
          </div>
          <div className="review-hub__summary-list">
            {summary.map((row) => (
              <article key={row.dimension} className="review-hub__summary-row">
                <p className="text-mono dim">{row.dimension}</p>
                <h4 className="text-title">{row.question}</h4>
                <p>{row.answer}</p>
              </article>
            ))}
          </div>
          <div className="review-hub__actions">
            <button
              type="button"
              className="action-button"
              disabled
              aria-disabled="true"
            >
              Save review: capture lands when a real render exists - nothing saved yet
            </button>
            <button type="button" className="btn-secondary" onClick={returnToList}>
              Score another
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (activeFixture && currentAxis) {
    const isLastQuestion = questionIndex === REVIEW_AXES.length - 1;

    return (
      <section className="review-hub scoped" aria-labelledby="review-hub-title">
        <ReviewHeader onBack={onBack} />
        <div className="review-hub__score-layout">
          <aside className="glass-panel review-hub__fixture-panel" aria-label="Selected mock render">
            <div className="review-hub__video-placeholder">sample render - no playback yet</div>
            <p className="text-title">{activeFixture.title}</p>
            <p className="dim">{activeFixture.note}</p>
          </aside>

          <div className="glass-panel review-hub__question-card">
            <div className="review-hub__progress">
              <span className="text-mono">
                Question {questionIndex + 1} of {REVIEW_AXES.length}
              </span>
              <span className="dim">{currentAxis.dimension}</span>
            </div>
            <h3 className="text-display review-hub__question">
              {currentAxis.question}
            </h3>
            {currentAxis.kind === "ordinal" ? (
              <div className="review-hub__options" role="group" aria-label={currentAxis.question}>
                {ORDINAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      "review-hub__option" +
                      (currentAnswer?.value === option.value ? " is-selected" : "")
                    }
                    aria-pressed={currentAnswer?.value === option.value}
                    onClick={() => setOrdinal(option.value)}
                  >
                    <span>{option.label}</span>
                    <span className="text-mono">{option.value}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="review-hub__options" role="group" aria-label={currentAxis.question}>
                {VERDICT_OPTIONS.map((verdict) => (
                  <button
                    key={verdict}
                    type="button"
                    className={
                      "review-hub__option" +
                      (currentAnswer?.verdict === verdict ? " is-selected" : "")
                    }
                    aria-pressed={currentAnswer?.verdict === verdict}
                    onClick={() => setVerdict(verdict)}
                  >
                    {verdict}
                  </button>
                ))}
              </div>
            )}
            <label className="review-hub__why">
              <span>why (optional)</span>
              <textarea
                value={currentAnswer?.why ?? ""}
                onChange={(event) => setWhy(event.target.value)}
                rows={3}
              />
            </label>
            <div className="review-hub__actions">
              <button type="button" className="btn-secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                className="action-button"
                disabled={!currentAnswered}
                onClick={goNext}
              >
                {isLastQuestion ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="review-hub scoped" aria-labelledby="review-hub-title">
      <ReviewHeader onBack={onBack} />
      <div className="glass-panel review-hub__mock-banner" role="status">
        MOCK — sample renders for building the review flow (no real capture yet)
      </div>
      <div className="review-hub__fixtures" aria-label="Mock sample renders">
        {fixtures.map((fixture) => (
          <article key={fixture.id} className="glass-panel review-hub__fixture-card">
            <div className="review-hub__video-placeholder">sample render - no playback yet</div>
            <div className="review-hub__fixture-copy">
              <p className="text-mono dim">{fixture.channel}</p>
              <h3 className="text-title">{fixture.title}</h3>
              <p className="dim">{fixture.note}</p>
            </div>
            <button type="button" className="action-button" onClick={() => startScoring(fixture)}>
              Score this render
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="section-header">
      <div>
        <h3 id="review-hub-title" className="text-display review-hub__title">
          Review
        </h3>
        <p className="dim">Local-only scoring capture against synthetic renders.</p>
      </div>
      <button type="button" className="btn-secondary" onClick={onBack}>
        Back to Channels
      </button>
    </div>
  );
}
