export function renderVideoUrl(episodeId: string): string | null {
  const normalizedEpisodeId = episodeId.trim();
  if (!normalizedEpisodeId) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) return null;

  // HQ verified render-assets is public. If it becomes private, replace this URL
  // with createSignedUrl following the castingVisual.ts pattern.
  return `${supabaseUrl}/storage/v1/object/public/render-assets/${encodeURIComponent(normalizedEpisodeId)}/mastered.mp4`;
}

const renderAvailabilityByEpisode = new Map<string, Promise<boolean>>();

/** Confirms that an episode's public render exists without downloading video data. */
export function renderVideoExists(episodeId: string): Promise<boolean> {
  const normalizedEpisodeId = episodeId.trim();
  const videoUrl = renderVideoUrl(normalizedEpisodeId);
  if (!videoUrl) return Promise.resolve(false);

  const cached = renderAvailabilityByEpisode.get(normalizedEpisodeId);
  if (cached) return cached;

  const probe = fetch(videoUrl, { method: "HEAD" })
    .then((response) => response.ok)
    .catch(() => false);
  renderAvailabilityByEpisode.set(normalizedEpisodeId, probe);
  return probe;
}
