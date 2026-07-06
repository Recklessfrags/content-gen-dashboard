"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { CHANNELS, STATUS_LABEL, type CharacterStatus, type IdeaStatus } from "@/lib/types";
import type { WireIdea } from "@/components/controlroom/shared";

const STATUS_OPTIONS: IdeaStatus[] = ["backlog", "active", "used"];

export type IdeaCharacterOption = {
  id: string;
  codename: string;
  status: CharacterStatus;
};

export type IdeaCardVM = WireIdea;

export type IdeasHubProps = {
  ideas: WireIdea[];
  loading: boolean;
  error: string | null;
  characters: IdeaCharacterOption[];
  submitting: boolean;
  activeEnqueueIdeaId: string | null;
  onAddIdea: (title: string, note: string, characterId: string | null, channel: string) => void;
  onSetIdeaStatus: (id: string, status: IdeaStatus) => void;
  onSetIdeaField: (id: string, field: "character_id" | "channel", value: string) => void;
  onRetryIdea: (idea: WireIdea) => void;
  onDismissIdea: (id: string) => void;
  onQueueAsRun: (id: string, trigger: HTMLButtonElement) => void;
  onEnqueueButtonRef: (id: string, node: HTMLButtonElement | null) => void;
  onRetry: () => void;
  onBack: () => void;
};

export function IdeasHub({
  ideas,
  loading,
  error,
  characters,
  submitting,
  activeEnqueueIdeaId,
  onAddIdea,
  onSetIdeaStatus,
  onSetIdeaField,
  onRetryIdea,
  onDismissIdea,
  onQueueAsRun,
  onEnqueueButtonRef,
  onRetry,
  onBack,
}: IdeasHubProps) {
  const openCount = ideas.filter((idea) => idea.status !== "used").length;
  const showLoading = loading && ideas.length === 0;
  const showFatalError = error !== null && ideas.length === 0 && !loading;
  const showEmpty = !loading && error === null && ideas.length === 0;
  const showList = ideas.length > 0;

  return (
    <section className="ideas-hub scoped" aria-labelledby="ideas-hub-title">
      <div className="section-header">
        <div>
          <h3 id="ideas-hub-title" className="text-display" style={{ fontSize: "2rem" }}>
            Ideas
          </h3>
          <p className="dim" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {ideas.length} logged · {openCount} open
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back to Channels
        </button>
      </div>

      <IdeaCaptureForm
        characters={characters}
        submitting={submitting}
        onAddIdea={onAddIdea}
      />

      {error !== null && ideas.length > 0 ? (
        <div className="glass-panel ideas-hub__banner" role="alert">
          <p className="text-title">Couldn&apos;t refresh ideas</p>
          <p className="dim">Showing the last loaded list. Check your connection and try again.</p>
          <details className="error-details">
            <summary>Details</summary>
            {error}
          </details>
          <div style={{ marginTop: "0.75rem" }}>
            <button type="button" className="btn-secondary" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {showLoading ? (
        <div className="glass-panel au-empty" aria-busy="true">
          <span className="spin" aria-hidden="true" /> Loading ideas…
        </div>
      ) : null}

      {showFatalError ? (
        <div className="glass-panel au-empty" role="alert">
          <p className="text-title">Couldn&apos;t load ideas</p>
          <p className="dim">Check your connection and try again.</p>
          {error ? (
            <details className="error-details">
              <summary>Details</summary>
              {error}
            </details>
          ) : null}
          <div style={{ marginTop: "1rem" }}>
            <button type="button" className="btn-secondary" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {showEmpty ? (
        <div className="glass-panel au-empty">
          <p className="text-title">No ideas yet</p>
          <p>Log your first idea above the moment it lands.</p>
        </div>
      ) : null}

      {showList ? (
        <div className="ideas-hub__list" aria-label="Logged ideas">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.clientKey ?? idea.id}
              idea={idea}
              characters={characters}
              activeEnqueueIdeaId={activeEnqueueIdeaId}
              onSetIdeaStatus={onSetIdeaStatus}
              onSetIdeaField={onSetIdeaField}
              onRetryIdea={onRetryIdea}
              onDismissIdea={onDismissIdea}
              onQueueAsRun={onQueueAsRun}
              onEnqueueButtonRef={onEnqueueButtonRef}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function IdeaCaptureForm({
  characters,
  submitting,
  onAddIdea,
}: {
  characters: IdeaCharacterOption[];
  submitting: boolean;
  onAddIdea: IdeasHubProps["onAddIdea"];
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [channel, setChannel] = useState<string>(CHANNELS[0]);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = title.trim().length > 0 && !submitting;

  const submit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || submitting) return;
    onAddIdea(trimmedTitle, note.trim(), characterId === "" ? null : characterId, channel);
    setTitle("");
    setNote("");
    setCharacterId("");
    setChannel(CHANNELS[0]);
    window.requestAnimationFrame(() => {
      titleRef.current?.focus();
    });
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handleNoteKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  const activeCharacters = characters.filter((character) => character.status === "active");
  const draftCharacters = characters.filter((character) => character.status !== "active");

  return (
    <div className="glass-panel ideas-hub__capture">
      <p className="ideas-hub__capture-label">Log an idea</p>
      <div className="ideas-hub__field">
        <label className="ideas-hub__sr-only" htmlFor="idea-title">
          Idea title
        </label>
        <textarea
          ref={titleRef}
          id="idea-title"
          rows={2}
          value={title}
          placeholder="Idea title (e.g. Why sourdough needs a night to rise)"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={handleTitleKeyDown}
          disabled={submitting}
        />
      </div>
      <div className="ideas-hub__field">
        <label className="ideas-hub__sr-only" htmlFor="idea-note">
          Idea note
        </label>
        <textarea
          id="idea-note"
          rows={2}
          value={note}
          placeholder="Notes, angles, or beats (optional)"
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={handleNoteKeyDown}
          disabled={submitting}
        />
      </div>
      <div className="ideas-hub__capture-row">
        <select
          className="ideas-hub__select"
          value={characterId}
          onChange={(event) => setCharacterId(event.target.value)}
          disabled={submitting}
          aria-label="Character"
        >
          <option value="">No character</option>
          {activeCharacters.map((character) => (
            <option key={character.id} value={character.id}>
              ● {character.codename || "Untitled"}
            </option>
          ))}
          {draftCharacters.map((character) => (
            <option key={character.id} value={character.id}>
              ○ {character.codename || "Untitled"}
            </option>
          ))}
        </select>
        <select
          className="ideas-hub__select"
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          disabled={submitting}
          aria-label="Channel"
        >
          {CHANNELS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={!canSubmit}
        >
          {submitting ? "Logging…" : "Log idea"}
        </button>
      </div>
    </div>
  );
}

function IdeaCard({
  idea,
  characters,
  activeEnqueueIdeaId,
  onSetIdeaStatus,
  onSetIdeaField,
  onRetryIdea,
  onDismissIdea,
  onQueueAsRun,
  onEnqueueButtonRef,
}: {
  idea: WireIdea;
  characters: IdeaCharacterOption[];
  activeEnqueueIdeaId: string | null;
  onSetIdeaStatus: IdeasHubProps["onSetIdeaStatus"];
  onSetIdeaField: IdeasHubProps["onSetIdeaField"];
  onRetryIdea: IdeasHubProps["onRetryIdea"];
  onDismissIdea: IdeasHubProps["onDismissIdea"];
  onQueueAsRun: IdeasHubProps["onQueueAsRun"];
  onEnqueueButtonRef: IdeasHubProps["onEnqueueButtonRef"];
}) {
  const writeState = idea.clientWriteState;
  const isWriteBlocked = Boolean(writeState);
  const activeCharacters = characters.filter((character) => character.status === "active");
  const draftCharacters = characters.filter((character) => character.status !== "active");
  const cardClass =
    "glass-panel idea-card" +
    (writeState === "failed" ? " idea-card--failed" : "") +
    (writeState === "saving" ? " idea-card--saving" : "");

  return (
    <article className={cardClass} aria-busy={writeState === "saving"}>
      <div className="idea-card__title text-title">{idea.title}</div>
      {idea.note ? <p className="idea-card__note dim">{idea.note}</p> : null}

      <div className="idea-card__controls">
        {writeState === "saving" ? (
          <span className="status-chip status-uncast">Saving…</span>
        ) : writeState === "failed" ? (
          <>
            <button type="button" className="btn-secondary" onClick={() => onRetryIdea(idea)}>
              Retry
            </button>
            <button type="button" className="btn-ghost" onClick={() => onDismissIdea(idea.id)}>
              Dismiss
            </button>
          </>
        ) : (
          <div className="ideas-hub__segmented" role="group" aria-label="Idea status">
            {STATUS_OPTIONS.map((status) => {
              const isActive = idea.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  className={"ideas-hub__segment" + (isActive ? " is-active" : "")}
                  aria-pressed={isActive}
                  disabled={isWriteBlocked}
                  onClick={() => onSetIdeaStatus(idea.id, status)}
                >
                  {STATUS_LABEL[status]}
                </button>
              );
            })}
          </div>
        )}

        {!isWriteBlocked && idea.status !== "used" ? (
          <button
            ref={(node) => onEnqueueButtonRef(idea.id, node)}
            type="button"
            className="btn btn-primary ideas-hub__queue"
            onClick={(event) => onQueueAsRun(idea.id, event.currentTarget)}
            aria-haspopup="dialog"
            aria-expanded={activeEnqueueIdeaId === idea.id}
          >
            Queue as run
          </button>
        ) : null}

        <select
          className="ideas-hub__select"
          value={characters.length === 0 ? "" : idea.character_id ?? ""}
          onChange={(event) => onSetIdeaField(idea.id, "character_id", event.target.value)}
          disabled={isWriteBlocked || characters.length === 0}
          aria-label="Assign character"
        >
          {characters.length === 0 ? (
            <option value="">No characters yet</option>
          ) : (
            <>
              <option value="">Unassigned</option>
              {activeCharacters.length > 0 ? (
                <optgroup label="Active characters">
                  {activeCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      ● {character.codename || "Untitled"}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {draftCharacters.length > 0 ? (
                <optgroup label="Draft characters">
                  {draftCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      ○ {character.codename || "Untitled"}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </>
          )}
        </select>

        <select
          className="ideas-hub__select"
          value={idea.channel}
          onChange={(event) => onSetIdeaField(idea.id, "channel", event.target.value)}
          disabled={isWriteBlocked}
          aria-label="Assign channel"
        >
          {CHANNELS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {writeState === "failed" && idea.clientError ? (
        <p className="idea-card__error danger" role="alert">
          {idea.clientError}
        </p>
      ) : null}
    </article>
  );
}
