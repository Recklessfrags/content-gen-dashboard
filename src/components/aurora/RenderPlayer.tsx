"use client";

import { useEffect, useState } from "react";
import {
  renderVideoExists,
  renderVideoUrl,
  type RenderAvailability,
} from "@/lib/renderAssets";

type ConfirmedAvailability = {
  result: RenderAvailability;
  videoUrl: string;
};

export function RenderPlayer({ episodeId }: { episodeId: string }) {
  const [open, setOpen] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [confirmedAvailability, setConfirmedAvailability] =
    useState<ConfirmedAvailability | null>(null);
  const videoUrl = renderVideoUrl(episodeId);

  useEffect(() => {
    let mounted = true;

    setOpen(false);
    setPlaybackFailed(false);
    setConfirmedAvailability(null);

    void renderVideoExists(episodeId).then((result) => {
      if (mounted && videoUrl) setConfirmedAvailability({ result, videoUrl });
    });

    return () => {
      mounted = false;
    };
  }, [episodeId, videoUrl]);

  if (
    !videoUrl ||
    confirmedAvailability?.videoUrl !== videoUrl ||
    confirmedAvailability.result === "missing"
  ) {
    return null;
  }

  return (
    <div className="render-player">
      <button
        type="button"
        className="render-player__toggle"
        aria-expanded={open}
        onClick={() => {
          if (!open) setPlaybackFailed(false);
          setOpen((current) => !current);
        }}
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
            onError={() => setPlaybackFailed(true)}
          />
          {playbackFailed ? (
            <p role="alert">The render could not be loaded. Try again shortly.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
