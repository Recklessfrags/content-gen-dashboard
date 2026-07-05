"use client";

import type { KeyboardEvent } from "react";

export type ChannelCardVM = {
  channel: string;
  displayName: string;
  cast: boolean;
  avatarUrl: string | null;
  initials: string;
  activeJobs: number;
};

export type ChannelsHubProps = {
  cards: ChannelCardVM[];
  loading: boolean;
  error: string | null;
  onOpenChannel: (channel: string) => void;
  onNewChannel: () => void;
  creating?: boolean;
  onOpenCharacters?: () => void;
  onRetry?: () => void;
};

export function getChannelLabel(card: Pick<ChannelCardVM, "channel" | "displayName">): string {
  const label = card.displayName.trim();
  return label === "" ? card.channel : label;
}

export function getAvatarText(card: Pick<ChannelCardVM, "channel" | "initials">): string {
  const initials = card.initials.trim().slice(0, 2).toUpperCase();
  const fallback = card.channel.trim().slice(0, 2).toUpperCase();
  return initials === "" ? fallback || "CH" : initials;
}

export function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

export function ChannelsHub({
  cards,
  loading,
  error,
  onOpenChannel,
  onNewChannel,
  creating = false,
  onOpenCharacters,
  onRetry,
}: ChannelsHubProps) {
  const showEmpty = !loading && error === null && cards.length === 0;
  const showCards = !loading && error === null && cards.length > 0;

  return (
    <section style={{ marginTop: "4rem" }} aria-labelledby="channels-hub-title">
      <div className="section-header">
        <div>
          <h3 id="channels-hub-title" className="text-display" style={{ fontSize: "2rem" }}>
            Channels
          </h3>
          <p className="dim text-mono" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Root Objects &amp; Production Lines
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {onOpenCharacters ? (
            <button type="button" className="btn-secondary" onClick={onOpenCharacters}>
              Characters {"\u2192"}
            </button>
          ) : null}
          <button
            type="button"
            className="btn-new-channel"
            disabled={creating}
            aria-busy={creating}
            onClick={onNewChannel}
          >
            <PlusIcon />
            New Channel
          </button>
        </div>
      </div>

      {loading ? <LoadingGrid /> : null}
      {error !== null ? <ErrorState error={error} onRetry={onRetry} /> : null}
      {showEmpty ? <EmptyState creating={creating} onNewChannel={onNewChannel} /> : null}

      {showCards ? (
        <div className="channels-grid" aria-label="Channels">
          {cards.map((card) => (
            <ChannelCard key={card.channel} card={card} onOpenChannel={onOpenChannel} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LoadingGrid() {
  return (
    <div className="channels-grid" aria-busy="true" aria-label="Loading channels">
      {["one", "two", "three", "four"].map((key) => (
        <article key={key} className="glass-panel channel-card" aria-hidden="true">
          <div className="card-header">
            <div className="avatar avatar-uncast">
              <span style={{ position: "relative", zIndex: 1 }}>--</span>
            </div>
            <div className="channel-info">
              <div className="skeleton-block" style={{ width: "70%", height: "1.5rem" }} />
              <div
                className="skeleton-block"
                style={{ width: "5rem", height: "1rem", marginTop: "0.5rem" }}
              />
            </div>
          </div>
          <div className="card-metrics">
            <div className="metric-group">
              <span className="metric-label dim">Active Jobs</span>
              <span className="au-metric-value text-mono text-title">--</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="glass-panel au-empty" role="alert">
      <p className="text-title">Couldn&apos;t load channels</p>
      <p className="dim">Check your connection and try again.</p>
      {error ? (
        <details className="error-details">
          <summary>Details</summary>
          {error}
        </details>
      ) : null}
      {onRetry ? (
        <div style={{ marginTop: "1rem" }}>
          <button type="button" className="btn-secondary" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  creating,
  onNewChannel,
}: Pick<ChannelsHubProps, "creating" | "onNewChannel">) {
  return (
    <div className="glass-panel au-empty">
      <p className="text-title">No channels yet</p>
      <p>Create the first root object and production line.</p>
      <button
        type="button"
        className="btn-new-channel"
        disabled={creating}
        aria-busy={creating}
        onClick={onNewChannel}
      >
        <PlusIcon />
        New Channel
      </button>
    </div>
  );
}

function ChannelCard({
  card,
  onOpenChannel,
}: {
  card: ChannelCardVM;
  onOpenChannel: ChannelsHubProps["onOpenChannel"];
}) {
  const label = getChannelLabel(card);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!isActivationKey(event.key)) {
      return;
    }

    event.preventDefault();
    onOpenChannel(card.channel);
  }

  return (
    <article
      className="glass-panel channel-card"
      role="button"
      tabIndex={0}
      aria-label={`Open ${label} channel`}
      onClick={() => onOpenChannel(card.channel)}
      onKeyDown={handleKeyDown}
    >
      <div className="card-header">
        <Avatar card={card} />
        <div className="channel-info">
          <h4 className="text-title channel-title">{label}</h4>
          <span className={`status-chip ${card.cast ? "status-cast" : "status-uncast"}`}>
            {card.cast ? "Cast" : "Uncast"}
          </span>
        </div>
      </div>
      <div className="card-metrics">
        <div className="metric-group">
          <span className="metric-label dim">Active Jobs</span>
          <span
            className={`au-metric-value text-mono text-title ${card.activeJobs === 0 ? "zero" : ""}`}
          >
            {card.activeJobs}
          </span>
        </div>
        <div className="metric-group" style={{ textAlign: "right" }}>
          <span className="metric-label dim">Runs &amp; cost - Phase 3</span>
        </div>
      </div>
    </article>
  );
}

function Avatar({ card }: { card: ChannelCardVM }) {
  if (card.avatarUrl !== null) {
    return (
      <div className="avatar avatar--cast" aria-hidden="true">
        <img src={card.avatarUrl} alt="" width={48} height={48} />
      </div>
    );
  }

  if (card.cast) {
    return (
      <div className={`avatar ${getAvatarClass(card.channel)}`} aria-hidden="true">
        {getAvatarText(card)}
      </div>
    );
  }

  return (
    <div className="avatar avatar-uncast" aria-hidden="true">
      <QuestionIcon />
    </div>
  );
}

function getAvatarClass(channel: string): string {
  const classes = ["avatar-cm", "avatar-wf", "avatar-op", "avatar--cast"];
  const total = Array.from(channel).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return classes[total % classes.length] ?? "avatar--cast";
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ position: "relative", zIndex: 1 }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
