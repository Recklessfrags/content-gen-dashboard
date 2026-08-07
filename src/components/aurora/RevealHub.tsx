"use client";

import { useRef, useState } from "react";
import {
  isBatchDecided,
  setRevealDecision,
  type Reveal,
  type RevealDecision,
  type RevealDecisionMap,
  type RevealFixture,
} from "@/lib/revealApproval";
import { FactClaimsReviewSection } from "../controlroom/QueueActionDialog";
import { RenderPlayer } from "./RenderPlayer";

export type RevealHubProps = {
  fixtures: readonly RevealFixture[];
  loading?: boolean;
  error?: string | null;
  onSubmit: (episodeId: string, decisions: RevealDecisionMap) => Promise<void>;
  onBack: () => void;
};

type DecisionState = Record<string, RevealDecisionMap>;
type EditorState = { fixtureId: string; revealId: string; kind: "edit" | "reject" } | null;
type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function RevealHub({
  fixtures,
  loading = false,
  error = null,
  onSubmit,
  onBack,
}: RevealHubProps) {
  const [decisions, setDecisions] = useState<DecisionState>({});
  const [submitStates, setSubmitStates] = useState<Record<string, SubmitState>>({});
  const submittingRef = useRef(new Set<string>());
  const [editor, setEditor] = useState<EditorState>(null);
  const [draft, setDraft] = useState("");
  const parkedFixtures = fixtures.filter((fixture) => fixture.reveals.length > 0);

  function chooseDecision(
    fixtureId: string,
    revealId: string,
    decision: RevealDecision,
  ) {
    if (submittingRef.current.has(fixtureId)) return;
    setDecisions((previous) => ({
      ...previous,
      [fixtureId]: setRevealDecision(previous[fixtureId] ?? {}, revealId, decision),
    }));
    setSubmitStates((previous) => ({ ...previous, [fixtureId]: { status: "idle" } }));
    // Only close the editor if the decision is for the reveal currently being edited,
    // so approving one card doesn't wipe an in-progress edit/steer on another.
    if (editor?.fixtureId === fixtureId && editor.revealId === revealId) {
      setEditor(null);
      setDraft("");
    }
  }

  async function submitBatch(fixtureId: string, batchDecisions: RevealDecisionMap) {
    if (submittingRef.current.has(fixtureId)) return;
    submittingRef.current.add(fixtureId);
    setSubmitStates((previous) => ({
      ...previous,
      [fixtureId]: { status: "submitting" },
    }));

    try {
      await onSubmit(fixtureId, batchDecisions);
      setSubmitStates((previous) => ({
        ...previous,
        [fixtureId]: { status: "success" },
      }));
    } catch (error) {
      setSubmitStates((previous) => ({
        ...previous,
        [fixtureId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Could not submit reveal decisions.",
        },
      }));
    } finally {
      submittingRef.current.delete(fixtureId);
    }
  }

  function openEditor(fixtureId: string, reveal: Reveal, kind: "edit" | "reject") {
    const existing = decisions[fixtureId]?.[reveal.reveal_id];
    setEditor({ fixtureId, revealId: reveal.reveal_id, kind });
    setDraft(
      kind === "edit"
        ? existing?.kind === "edit"
          ? existing.edited_text
          : reveal.reveal_text
        : existing?.kind === "reject"
          ? existing.steer
          : "",
    );
  }

  return (
    <section className="reveal-hub scoped" aria-labelledby="reveal-hub-title">
      <RevealHeader onBack={onBack} />

      {loading ? (
        <div className="glass-panel reveal-hub__empty" role="status">
          <h3 className="text-title">Loading reveals waiting on you</h3>
          <p className="dim">Checking the latest reveal review.</p>
        </div>
      ) : error ? (
        <div className="glass-panel reveal-hub__empty" role="alert">
          <h3 className="text-title">Couldn&apos;t load reveals waiting on you</h3>
          <p className="dim">{error}</p>
        </div>
      ) : parkedFixtures.length === 0 ? (
        <div className="glass-panel reveal-hub__empty">
          <h3 className="text-title">No reveals waiting on you</h3>
          <p className="dim">Reveal decisions will appear here when a batch needs your input.</p>
        </div>
      ) : (
        <div className="reveal-hub__episodes">
          {parkedFixtures.map((fixture) => {
            const batchDecisions = decisions[fixture.id] ?? {};
            const batchDecided = isBatchDecided(fixture.reveals, batchDecisions);
            const submitState = submitStates[fixture.id] ?? { status: "idle" };
            const submitDisabled =
              !batchDecided ||
              submitState.status === "submitting" ||
              submitState.status === "success";
            const episodeTitleId = `reveal-episode-${fixture.id}`;

            return (
              <article
                key={fixture.id}
                className="glass-panel reveal-hub__episode"
                aria-labelledby={episodeTitleId}
              >
                <header className="reveal-hub__episode-head">
                  <div>
                    <p className="text-mono dim">{fixture.channel}</p>
                    <h2 id={episodeTitleId} className="text-title">
                      {fixture.title}
                    </h2>
                  </div>
                  <span className="status-chip reveal-hub__batch-count">
                    {fixture.reveals.length} {fixture.reveals.length === 1 ? "reveal" : "reveals"}
                  </span>
                </header>

                <div className="reveal-hub__reveal-list">
                  {fixture.reveals.map((reveal) => {
                    const decision = batchDecisions[reveal.reveal_id];
                    const editing =
                      editor?.fixtureId === fixture.id &&
                      editor.revealId === reveal.reveal_id;

                    return (
                      <RevealCard
                        key={reveal.reveal_id}
                        fixtureId={fixture.id}
                        reveal={reveal}
                        decision={decision}
                        editorKind={editing ? editor.kind : null}
                        draft={editing ? draft : ""}
                        onDraftChange={setDraft}
                        onApprove={() =>
                          chooseDecision(fixture.id, reveal.reveal_id, { kind: "approve" })
                        }
                        onEdit={() => openEditor(fixture.id, reveal, "edit")}
                        onReject={() => openEditor(fixture.id, reveal, "reject")}
                        onCancel={() => {
                          setEditor(null);
                          setDraft("");
                        }}
                        onSaveEdit={() =>
                          chooseDecision(fixture.id, reveal.reveal_id, {
                            kind: "edit",
                            edited_text: draft,
                          })
                        }
                        onSaveReject={() =>
                          chooseDecision(fixture.id, reveal.reveal_id, {
                            kind: "reject",
                            steer: draft,
                          })
                        }
                      />
                    );
                  })}
                </div>

                <footer className="reveal-hub__batch-actions">
                  <div>
                    <button
                      type="button"
                      className="action-button"
                      disabled={submitDisabled}
                      aria-disabled={submitDisabled}
                      aria-describedby={`reveal-submit-note-${fixture.id}`}
                      onClick={() => void submitBatch(fixture.id, batchDecisions)}
                    >
                      {submitState.status === "submitting" ? "Submitting…" : "Submit decisions"}
                    </button>
                    <p id={`reveal-submit-note-${fixture.id}`} className="dim">
                      Decisions are recorded now; pipeline resume waits when reveal columns are
                      unavailable.
                    </p>
                  </div>
                  <p className="text-mono dim" aria-live="polite">
                    {submitState.status === "submitting"
                      ? "Submitting reveal decisions"
                      : submitState.status === "success"
                        ? "Reveal decisions recorded"
                        : submitState.status === "error"
                          ? submitState.message
                          : batchDecided
                            ? "All reveals decided — ready to submit"
                            : "Decide each reveal to enable submission"}
                  </p>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RevealCard({
  fixtureId,
  reveal,
  decision,
  editorKind,
  draft,
  onDraftChange,
  onApprove,
  onEdit,
  onReject,
  onCancel,
  onSaveEdit,
  onSaveReject,
}: {
  fixtureId: string;
  reveal: Reveal;
  decision?: RevealDecision;
  editorKind: "edit" | "reject" | null;
  draft: string;
  onDraftChange: (value: string) => void;
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
  onCancel: () => void;
  onSaveEdit: () => void;
  onSaveReject: () => void;
}) {
  const textareaId = `reveal-decision-${fixtureId}-${reveal.reveal_id}`;

  return (
    <section className="reveal-hub__reveal-card" aria-label={`Reveal ${reveal.reveal_id}`}>
      <div className="reveal-hub__reveal-head">
        <p className="reveal-hub__reveal-text">{reveal.reveal_text}</p>
        <span
          className={`status-chip reveal-hub__grade reveal-hub__grade--${reveal.grade}`}
          aria-label={`Grade: ${reveal.grade}`}
        >
          {reveal.grade}
        </span>
      </div>
      <p className="reveal-hub__reason">
        <strong>Auditor reason:</strong> {reveal.reason || "No reason provided."}
      </p>
      <RenderPlayer episodeId={fixtureId} />

      {reveal.brand_specific.flagged ? (
        <div className="reveal-hub__brand-caution" role="note">
          <strong>Brand-specific caution</strong>
          <span>{reveal.brand_specific.detail || "This reveal needs a brand-specific check."}</span>
        </div>
      ) : null}

      <FactClaimsReviewSection claims={reveal.component_claims} />

      <div className="reveal-hub__decision-controls" aria-label="Reveal decision">
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={decision?.kind === "approve"}
          onClick={onApprove}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={decision?.kind === "edit"}
          onClick={onEdit}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-danger-outline"
          aria-pressed={decision?.kind === "reject"}
          onClick={onReject}
        >
          Reject
        </button>
      </div>

      {editorKind ? (
        <div className="reveal-hub__editor">
          <label htmlFor={textareaId}>
            {editorKind === "edit" ? "Edited reveal" : "Optional steering for the next attempt"}
          </label>
          <textarea
            id={textareaId}
            className="input-base"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={4}
          />
          {editorKind === "edit" ? (
            <p className="reveal-hub__recheck-note">
              Edited reveals re-check grounding before render.
            </p>
          ) : null}
          <div className="reveal-hub__editor-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="action-button"
              onClick={editorKind === "edit" ? onSaveEdit : onSaveReject}
              disabled={editorKind === "edit" && draft.trim().length === 0}
            >
              {editorKind === "edit" ? "Save edit locally" : "Reject locally"}
            </button>
          </div>
        </div>
      ) : null}

      {decision ? (
        <p className="reveal-hub__decision-status" aria-live="polite">
          {decision.kind === "approve"
            ? "Approved locally — not submitted"
            : decision.kind === "edit"
              ? "Edit saved locally — edited reveals re-check grounding before render"
              : decision.steer.trim()
                ? `Rejected locally — steer: ${decision.steer}`
                : "Rejected locally — no steer added"}
        </p>
      ) : null}
    </section>
  );
}

function RevealHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="section-header reveal-hub__header">
      <div>
        <h1 id="reveal-hub-title" className="text-display reveal-hub__title">
          Reveal approvals
        </h1>
        <p className="dim">Approve, edit, or reject each synthesis before render.</p>
      </div>
      <button type="button" className="btn-secondary" onClick={onBack}>
        Back to Channels
      </button>
    </div>
  );
}
