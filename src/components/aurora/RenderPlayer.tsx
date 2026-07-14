"use client";

import { useState } from "react";
import { renderVideoUrl } from "@/lib/renderAssets";

export function RenderPlayer({ episodeId }: { episodeId: string }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoUrl = renderVideoUrl(episodeId);

  if (!videoUrl) return null;

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
          {failed ? (
            <p className="render-player__error" role="status">
              No render available for this episode.
            </p>
          ) : (
            <video
              className="render-player__video"
              controls
              playsInline
              preload="metadata"
              src={videoUrl}
              onError={() => setFailed(true)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
