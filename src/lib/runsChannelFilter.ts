export const ALL_CHANNELS_KEY = "__all__";
export const UNASSIGNED_CHANNEL_KEY = "__unassigned__";

export type ChannelFacet = { key: string; label: string; count: number };

export function isUnassignedChannel(channel: string | null | undefined): boolean {
  return channel === null || channel === undefined || channel.trim() === "";
}

export function channelFacets(cards: ReadonlyArray<{ channel: string | null }>): ChannelFacet[] {
  const counts = new Map<string, number>();
  let unassignedCount = 0;

  for (const card of cards) {
    if (isUnassignedChannel(card.channel)) {
      unassignedCount += 1;
      continue;
    }

    const channel = card.channel!.trim();
    counts.set(channel, (counts.get(channel) ?? 0) + 1);
  }

  const assignedFacets = Array.from(counts, ([channel, count]) => ({
    key: channel,
    label: channel,
    count,
  })).sort(
    (left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }) ||
      left.label.localeCompare(right.label),
  );

  const facets: ChannelFacet[] = [
    { key: ALL_CHANNELS_KEY, label: "All channels", count: cards.length },
    ...assignedFacets,
  ];

  if (unassignedCount > 0) {
    facets.push({ key: UNASSIGNED_CHANNEL_KEY, label: "Unassigned", count: unassignedCount });
  }

  return facets;
}

export function cardMatchesChannel(card: { channel: string | null }, facetKey: string): boolean {
  if (facetKey === ALL_CHANNELS_KEY) return true;
  if (facetKey === UNASSIGNED_CHANNEL_KEY) return isUnassignedChannel(card.channel);
  return !isUnassignedChannel(card.channel) && card.channel?.trim() === facetKey;
}
