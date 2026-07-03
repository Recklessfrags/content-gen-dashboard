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
};

export function getChannelLabel(card: Pick<ChannelCardVM, "channel" | "displayName">): string {
  const label = card.displayName.trim();
  return label === "" ? card.channel : label;
}

export function getAvatarText(card: Pick<ChannelCardVM, "channel" | "initials">): string {
  const initials = card.initials.trim().slice(0, 2).toUpperCase();
  return initials === "" ? card.channel.trim().slice(0, 2).toUpperCase() : initials;
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
}: ChannelsHubProps) {
  const showEmpty = !loading && error === null && cards.length === 0;
  const showCards = !loading && error === null && cards.length > 0;

  return (
    <section aria-labelledby="channels-hub-title">
      <div className="glass-panel">
        <p className="text-mono dim">// CHANNELS HUB</p>
        <h1 id="channels-hub-title" className="text-display">
          Channels
        </h1>
        <p className="dim">Root objects &amp; production lines</p>
        <button
          type="button"
          className="au-btn au-btn-primary"
          disabled={creating}
          aria-busy={creating}
          onClick={onNewChannel}
        >
          + New channel
        </button>
      </div>

      {loading ? <LoadingGrid /> : null}
      {error !== null ? <ErrorState error={error} /> : null}
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
        <article key={key} className="channel-card" aria-hidden="true">
          <div className="avatar avatar--uncast">
            <span>--</span>
          </div>
          <div>
            <p className="text-title dim">Loading channel</p>
            <span className="au-badge is-parked">Loading</span>
          </div>
          <div>
            <p className="text-mono dim">--</p>
            <p className="dim">Active Jobs</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="glass-panel au-empty" role="alert">
      <span className="au-badge is-danger">Error</span>
      <p className="text-title">Channel data could not load</p>
      <p>{error}</p>
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
        className="au-btn au-btn-primary"
        disabled={creating}
        aria-busy={creating}
        onClick={onNewChannel}
      >
        + New channel
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
      className="channel-card"
      role="button"
      tabIndex={0}
      aria-label={`Open ${label} channel`}
      onClick={() => onOpenChannel(card.channel)}
      onKeyDown={handleKeyDown}
    >
      <div>
        <Avatar card={card} />
        <div>
          <h2 className="text-title">{label}</h2>
          <span className={`au-badge ${card.cast ? "is-success" : "is-warn"}`}>
            {card.cast ? "Cast" : "Uncast"}
          </span>
        </div>
      </div>

      <div>
        <p className="text-mono text-title">{card.activeJobs}</p>
        <p className="dim">Active Jobs</p>
      </div>

      <p className="dim">Runs &amp; cost - Phase 3</p>
    </article>
  );
}

function Avatar({ card }: { card: ChannelCardVM }) {
  if (card.avatarUrl !== null) {
    return (
      <span className="avatar avatar--cast" aria-hidden="true">
        <img src={card.avatarUrl} alt="" width={48} height={48} />
      </span>
    );
  }

  if (card.cast) {
    return (
      <span className="avatar avatar--cast" aria-hidden="true">
        {getAvatarText(card)}
      </span>
    );
  }

  return (
    <span className="avatar avatar--uncast" aria-hidden="true">
      <span>?</span>
    </span>
  );
}
