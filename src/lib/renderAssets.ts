export function renderVideoUrl(episodeId: string): string | null {
  const normalizedEpisodeId = episodeId.trim();
  if (!normalizedEpisodeId) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) return null;

  // HQ verified render-assets is public. If it becomes private, replace this URL
  // with createSignedUrl following the castingVisual.ts pattern.
  return `${supabaseUrl}/storage/v1/object/public/render-assets/${encodeURIComponent(normalizedEpisodeId)}/mastered.mp4`;
}

export type RenderAvailability = "exists" | "missing" | "unknown";

const MISSING_RENDER_TTL_MS = 30_000;

type CachedRenderAvailability = {
  result: Exclude<RenderAvailability, "unknown">;
  expiresAt: number | null;
};

const renderAvailabilityByEpisode = new Map<string, CachedRenderAvailability>();
const renderProbeByEpisode = new Map<string, Promise<RenderAvailability>>();

/** Confirms that an episode's public render exists without downloading video data. */
export function renderVideoExists(episodeId: string): Promise<RenderAvailability> {
  const normalizedEpisodeId = episodeId.trim();
  const videoUrl = renderVideoUrl(normalizedEpisodeId);
  if (!videoUrl) return Promise.resolve("missing");

  const cached = renderAvailabilityByEpisode.get(normalizedEpisodeId);
  if (cached && (cached.expiresAt === null || cached.expiresAt > Date.now())) {
    return Promise.resolve(cached.result);
  }
  if (cached) renderAvailabilityByEpisode.delete(normalizedEpisodeId);

  const inFlightProbe = renderProbeByEpisode.get(normalizedEpisodeId);
  if (inFlightProbe) return inFlightProbe;

  const probe = Promise.resolve()
    .then(() => fetch(videoUrl, { method: "HEAD" }))
    .then(
      (response): RenderAvailability => {
        if (response.ok) return "exists";
        if (response.type !== "opaque" && (response.status === 400 || response.status === 404)) {
          return "missing";
        }
        return "unknown";
      },
      (): RenderAvailability => "unknown",
    )
    .then((result) => {
      if (result === "exists") {
        renderAvailabilityByEpisode.set(normalizedEpisodeId, {
          result,
          expiresAt: null,
        });
      } else if (result === "missing") {
        renderAvailabilityByEpisode.set(normalizedEpisodeId, {
          result,
          expiresAt: Date.now() + MISSING_RENDER_TTL_MS,
        });
      }
      return result;
    })
    .finally(() => {
      if (renderProbeByEpisode.get(normalizedEpisodeId) === probe) {
        renderProbeByEpisode.delete(normalizedEpisodeId);
      }
    });
  renderProbeByEpisode.set(normalizedEpisodeId, probe);
  return probe;
}
