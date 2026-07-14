export function renderVideoUrl(episodeId: string): string | null {
  const normalizedEpisodeId = episodeId.trim();
  if (!normalizedEpisodeId) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) return null;

  // HQ verified render-assets is public. If it becomes private, replace this URL
  // with createSignedUrl following the castingVisual.ts pattern.
  return `${supabaseUrl}/storage/v1/object/public/render-assets/${encodeURIComponent(normalizedEpisodeId)}/mastered.mp4`;
}
