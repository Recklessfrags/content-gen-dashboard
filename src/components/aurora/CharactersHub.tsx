"use client";

import type { KeyboardEvent } from "react";
import { isActivationKey } from "./ChannelsHub";

export type CharacterCardVM = {
  id: string;
  codename: string;
  concept: string | null;
  initials: string;
  isVoiceCast: boolean;
  isVisualCast: boolean;
  isDraft: boolean;
  isSelected: boolean;
};

export type CharactersHubProps = {
  cards: CharacterCardVM[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
  onOpenCharacter: (id: string) => void;
  onCreateCharacter: () => void;
};

export function CharactersHub({
  cards,
  loading,
  error,
  onRetry,
  onBack,
  onOpenCharacter,
  onCreateCharacter,
}: CharactersHubProps) {
  const showEmpty = !loading && error === null && cards.length === 0;
  const showCards = !loading && error === null && cards.length > 0;

  return (
    <section style={{ marginTop: "4rem" }} aria-labelledby="characters-hub-title">
      <div className="section-header">
        <div>
          <h3 id="characters-hub-title" className="text-display" style={{ fontSize: "2rem" }}>
            Characters
          </h3>
          <p className="dim" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Recurring characters for your channels
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn btn-primary" onClick={onCreateCharacter}>
            + New character
          </button>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Back to Channels
          </button>
        </div>
      </div>

      {loading ? <LoadingGrid /> : null}
      {error !== null ? <ErrorState error={error} onRetry={onRetry} /> : null}
      {showEmpty ? <EmptyState onCreateCharacter={onCreateCharacter} /> : null}

      {showCards ? (
        <div className="channels-grid" aria-label="Characters">
          {cards.map((card) => (
            <CharacterCard key={card.id} card={card} onOpenCharacter={onOpenCharacter} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LoadingGrid() {
  return (
    <div className="channels-grid" aria-busy="true" aria-label="Loading characters">
      {["one", "two", "three", "four"].map((key) => (
        <article key={key} className="glass-panel channel-card" aria-hidden="true">
          <div className="card-header">
            <div className="avatar avatar-uncast">
              <span style={{ position: "relative", zIndex: 1 }}>--</span>
            </div>
            <div className="channel-info">
              <div className="skeleton-block" style={{ width: "60%", height: "1.5rem" }} />
              <div
                className="skeleton-block"
                style={{ width: "80%", height: "1rem", marginTop: "0.5rem" }}
              />
            </div>
          </div>
          <div className="card-metrics">
            <div className="skeleton-block" style={{ width: "40%", height: "1.25rem" }} />
            <div
              className="skeleton-block"
              style={{ width: "50%", height: "1.25rem", marginLeft: "auto" }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="glass-panel au-empty" role="alert">
      <p className="text-title">Couldn&apos;t load characters</p>
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
  );
}

function EmptyState({ onCreateCharacter }: { onCreateCharacter: () => void }) {
  return (
    <div className="glass-panel au-empty">
      <p className="text-title">No characters yet</p>
      <p>Create your first character to start casting voices.</p>
      <div style={{ marginTop: "1rem" }}>
        <button type="button" className="btn btn-primary" onClick={onCreateCharacter}>
          Create your first character
        </button>
      </div>
    </div>
  );
}

function CharacterCard({
  card,
  onOpenCharacter,
}: {
  card: CharacterCardVM;
  onOpenCharacter: CharactersHubProps["onOpenCharacter"];
}) {
  const codename = card.codename.trim() === "" ? "Untitled character" : card.codename;
  const concept = card.concept?.trim() || "No concept logged yet.";
  const avatarClass = card.isVoiceCast ? "avatar avatar--cast" : "avatar avatar-uncast";
  const cardClass =
    "glass-panel channel-card" + (card.isSelected ? " channel-card--selected" : "");

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!isActivationKey(event.key)) {
      return;
    }
    event.preventDefault();
    onOpenCharacter(card.id);
  }

  return (
    <article
      className={cardClass}
      role="button"
      tabIndex={0}
      aria-label={`Open ${codename} character profile`}
      aria-current={card.isSelected ? "true" : undefined}
      onClick={() => onOpenCharacter(card.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="card-header">
        <div className={avatarClass} aria-hidden="true">
          <span style={{ position: "relative", zIndex: 1 }}>{card.initials}</span>
        </div>
        <div className="channel-info">
          <h4 className="text-title channel-title">{codename}</h4>
          {card.isDraft ? <span className="badge badge-neutral">Draft</span> : null}
        </div>
      </div>
      <p className="dim" style={{ marginTop: "0.75rem", minHeight: "3rem" }}>
        {concept}
      </p>
      <div className="card-metrics" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <span className={`status-chip ${card.isVoiceCast ? "status-cast" : "status-uncast"}`}>
          {card.isVoiceCast ? "Voice: Cast" : "Voice: Uncast"}
        </span>
        <span className={`status-chip ${card.isVisualCast ? "status-cast" : "status-uncast"}`}>
          {card.isVisualCast ? "Visual: Cast" : "Visual: Uncast"}
        </span>
      </div>
    </article>
  );
}
