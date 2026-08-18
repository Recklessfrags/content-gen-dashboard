"use client";

import { useEffect, useState } from "react";
import { renderVideoExists, renderVideoUrl } from "@/lib/renderAssets";

export function RenderPlayer({ episodeId }: { episodeId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmedVideoUrl, setConfirmedVideoUrl] = useState<string | null>(null);
  const videoUrl = renderVideoUrl(episodeId);

  useEffect(() => {
    let mounted = true;

    void renderVideoExists(episodeId).then((exists) => {
      if (mounted && exists) setConfirmedVideoUrl(videoUrl);
    });

    return () => {
      mounted = false;
    };
  }, [episodeId, videoUrl]);

  if (!videoUrl || confirmedVideoUrl !== videoUrl) return null;

  return (
    <div className="render-player">
      <button
        type="button"
        className="render-player__toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Watch render <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div className="render-player__stage">
          <video
            className="render-player__video"
            controls
            playsInline
            preload="metadata"
            src={videoUrl}
          />
        </div>
      ) : null}
    </div>
  );
}
