// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: vi.fn() }),
}));
vi.mock("@/lib/hooks/useRenderProgress", () => ({
  useRenderProgress: () => ({ "ep-1": "editor" }),
}));

import { RunsHub, type RunCardVM } from "@/components/aurora/RunsHub";

afterEach(cleanup);

describe("RunsHub plain-language defaults", () => {
  it("keeps the collapsed parked row compact and omits raw field jargon", () => {
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
    };

    render(
      <RunsHub
        cards={[card]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
        loadReliability={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /Parked 1/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("list", { name: "Progress for A test run" })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Waiting on you");
    expect(document.body).not.toHaveTextContent("Stopped at");
    expect(document.body).not.toHaveTextContent("Technical details");
    expect(document.body).not.toHaveTextContent("park_kind");
    expect(document.body).not.toHaveTextContent("verdict");
  });

  it("shows honest node progress only for the selected lifecycle", () => {
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
      attemptsByStage: { researcher: 1, editor: 1 },
    };

    render(
      <RunsHub
        cards={[base, { ...base, id: "job-done", title: "Finished video", status: "done", statusLabel: "Done" }]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
        loadReliability={vi.fn()}
      />,
    );

    expect(screen.getByRole("listitem", { name: "Editing the cut: running" })).toBeInTheDocument();
    expect(screen.queryByText("Finished video")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Finished 1/ }));
    expect(screen.getByText("Finished video")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Editing the cut: passed" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Publishing: not reached" })).toBeInTheDocument();
  });

  it("marks the last receipted stage as where progress stopped without claiming that stage failed", () => {
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
      attemptsByStage: { researcher: 1, voice_direction: 1 },
    };

    render(
      <RunsHub
        cards={[card]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
        loadReliability={vi.fn()}
      />,
    );

    expect(screen.getByRole("listitem", { name: "Recording the voiceover: stopped here" })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Stopped at");
    expect(document.body).not.toHaveTextContent("Why it stopped");
  });

  it("keeps status visible and failure detail collapsed until requested", async () => {
    const user = userEvent.setup();
    const card: RunCardVM = {
      id: "job-failed",
      episodeId: null,
      title: "Failed video",
      channel: "history",
      status: "error",
      statusLabel: "Error",
      createdAt: "2026-08-07T00:00:00.000Z",
      spend: null,
      error: "Unhandled: worker crashed",
      terminalState: "crashed",
    };

    render(
      <RunsHub
        cards={[card]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
        loadReliability={vi.fn()}
      />,
    );

    const article = screen.getByText("Failed video").closest("article") as HTMLElement;
    expect(article.querySelectorAll(".run-card__status")).toHaveLength(1);
    expect(article.querySelector(".run-card__status")).toHaveTextContent("Error");
    const disclosure = screen.getByText("Failure details").closest("details");
    expect(disclosure).not.toHaveAttribute("open");

    await user.click(screen.getByText("Failure details"));
    expect(within(article).getByText("Crashed")).toBeVisible();
    expect(within(article).getByText("Unhandled: worker crashed")).toBeVisible();
    expect(document.body).not.toHaveTextContent("Stopped at");
  });
});
