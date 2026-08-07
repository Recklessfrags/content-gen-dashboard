import { renderProgress } from "@/lib/renderProgress";

export function RenderProgress({ latestStage }: { latestStage: string | null | undefined }) {
  const progress = renderProgress(latestStage ?? null);
  const caption = `Step ${progress.step} of ${progress.total} · ${progress.label}`;

  return (
    <div
      className={`render-progress${progress.step === 0 ? " render-progress--indeterminate" : ""}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-valuenow={progress.step}
      aria-label={`Video render progress: ${caption}`}
    >
      <div className="render-progress__track" aria-hidden="true">
        <span
          className="render-progress__fill"
          style={{ width: `${progress.fraction * 100}%` }}
        />
        {progress.step === 0 ? <span className="render-progress__shimmer" /> : null}
      </div>
      <p className="render-progress__caption">{caption}</p>
    </div>
  );
}
