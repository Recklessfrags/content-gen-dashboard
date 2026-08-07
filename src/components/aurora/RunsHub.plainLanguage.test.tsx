// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: vi.fn() }),
}));
vi.mock("@/lib/hooks/useRenderProgress", () => ({
  useRenderProgress: () => ({ "ep-1": "editor" }),
}));

import { RunsHub, type RunCardVM } from "@/components/aurora/RunsHub";

afterEach(cleanup);

describe("RunsHub plain-language defaults", () => {
  it("shows the operator label without raw field jargon", () => {
    const card: RunCardVM = {
      id: "job-1",
      episodeId: null,
      title: "A test run",
      channel: "history",
      status: "ready_for_review",
      statusLabel: "Ready for review",
      createdAt: "2026-08-07T00:00:00.000Z",
      spend: null,
      error: null,
      needsAttention: true,
      parkKind: "unknown",
      parkKindColumn: "future_hold",
    };

    render(
      <RunsHub
        cards={[card]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
        loadDiagnostics={vi.fn()}
        loadReliability={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Waiting on you").length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent("park_kind");
    expect(document.body).not.toHaveTextContent("verdict");
  });

  it("shows honest progress only for in-flight runs", () => {
    const base: RunCardVM = {
      id: "job-running",
      episodeId: "ep-1",
      title: "Running video",
      channel: "history",
      status: "running",
      statusLabel: "Running",
      createdAt: "2026-08-07T00:00:00.000Z",
      spend: null,
      error: null,
      needsAttention: false,
    };

    render(
      <RunsHub
        cards={[base, { ...base, id: "job-done", title: "Finished video", status: "done", statusLabel: "Done" }]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
        loadDiagnostics={vi.fn()}
        loadReliability={vi.fn()}
      />,
    );

    const progress = screen.getByRole("progressbar", { name: /video render progress/i });
    expect(progress).toHaveAttribute("aria-valuenow", "7");
    expect(screen.getByText("Step 7 of 9 · Editing the cut")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  });

  it("labels the final stage as where the run stopped", () => {
    const card: RunCardVM = {
      id: "job-stopped",
      episodeId: "ep-stopped",
      title: "Stopped video",
      channel: "history",
      status: "error",
      statusLabel: "Error",
      createdAt: "2026-08-07T00:00:00.000Z",
      spend: null,
      error: "Pipeline stopped",
      needsAttention: false,
      finalStage: "voice_direction",
    };

    render(
      <RunsHub
        cards={[card]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
        loadDiagnostics={vi.fn()}
        loadReliability={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Done · 1/ }));
    expect(screen.getByText("Stopped at · Recording the voiceover")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Why it stopped · Recording the voiceover");
  });
});
