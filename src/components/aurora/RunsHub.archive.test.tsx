// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/useRenderProgress", () => ({ useRenderProgress: () => ({}) }));

import { RunsHub, type RunCardVM } from "@/components/aurora/RunsHub";

function card(jobId: number, status: RunCardVM["status"], channel: string): RunCardVM {
  return {
    id: String(jobId),
    jobId,
    episodeId: null,
    title: `Run ${jobId}`,
    channel,
    status,
    statusLabel: status,
    createdAt: "2026-08-18T00:00:00.000Z",
    spend: null,
    error: null,
    needsAttention: status === "error",
  };
}

const baseProps = {
  loading: false,
  error: null,
  onRetry: vi.fn(),
  onBack: vi.fn(),
  loadDiagnostics: vi.fn(),
  loadReliability: vi.fn(),
};

afterEach(cleanup);

describe("RunsHub archive controls", () => {
  it("omits the per-row archive action for queued and running jobs", () => {
    render(
      <RunsHub
        {...baseProps}
        cards={[card(1, "queued", "alpha"), card(2, "running", "alpha")]}
        onArchiveJobs={vi.fn()}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    for (const title of ["Run 1", "Run 2"]) {
      const row = screen.getByText(title).closest("article");
      expect(row).not.toBeNull();
      expect(within(row as HTMLElement).queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    }
  });

  it("offers archive for a terminal status unknown to the dashboard", async () => {
    const user = userEvent.setup();
    const abandoned = card(135, "queued", "alpha");
    abandoned.rawStatus = "abandoned";
    abandoned.statusLabel = "abandoned";

    render(
      <RunsHub
        {...baseProps}
        cards={[abandoned]}
        onArchiveJobs={vi.fn()}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Done · 1/ }));
    const row = screen.getByText("Run 135").closest("article");
    expect(within(row as HTMLElement).getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive 1 run" })).toBeInTheDocument();
  });

  it("default bulk archive excludes approvals and names the skipped status", async () => {
    const user = userEvent.setup();
    const onArchiveJobs = vi.fn().mockResolvedValue({
      ok: true,
      affected: 2,
      skipped: 1,
      error: null,
    });
    render(
      <RunsHub
        {...baseProps}
        cards={[
          card(1, "done", "alpha"),
          card(2, "error", "alpha"),
          card(3, "running", "alpha"),
          card(4, "done", "beta"),
          card(5, "ready_for_review", "beta"),
        ]}
        onArchiveJobs={onArchiveJobs}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Archive 3 runs" }));

    expect(screen.getByText(/Hide 3 runs/)).toBeInTheDocument();
    expect(screen.getByText(/1 run with status “running” will be skipped/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive 3" }));

    expect(onArchiveJobs).toHaveBeenCalledWith([1, 2, 4]);
    expect(onArchiveJobs).not.toHaveBeenCalledWith(expect.arrayContaining([5]));
  });

  it("shows an archive write failure instead of claiming success", async () => {
    const user = userEvent.setup();
    render(
      <RunsHub
        {...baseProps}
        cards={[card(1, "done", "alpha")]}
        onArchiveJobs={vi.fn().mockResolvedValue({
          ok: false,
          affected: 0,
          skipped: 0,
          error: "archive unavailable",
        })}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Archive 1 run" }));
    await user.click(screen.getByRole("button", { name: "Archive 1" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("archive unavailable");
  });
});
