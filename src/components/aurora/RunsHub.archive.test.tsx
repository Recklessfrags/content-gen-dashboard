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
  };
}

const baseProps = {
  loading: false,
  error: null,
  onRetry: vi.fn(),
  onBack: vi.fn(),
  loadReliability: vi.fn(),
};

afterEach(cleanup);

describe("RunsHub archive controls", () => {
  it("keeps lifecycle counts and rendered rows scoped to the selected channel", async () => {
    const user = userEvent.setup();
    render(
      <RunsHub
        {...baseProps}
        cards={[
          card(1, "ready_for_review", "dark_history"),
          card(2, "done", "dark_history"),
          card(3, "ready_for_review", "weird_food"),
          card(4, "running", "weird_food"),
          card(5, "done", "weird_food"),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "dark_history (1)" }));

    expect(screen.getByRole("tab", { name: /Parked 1/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /In flight 0/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Finished 1/ })).toBeInTheDocument();
    expect(screen.getByText("Run 1")).toBeInTheDocument();
    expect(screen.queryByText("Run 3")).not.toBeInTheDocument();
  });

  it("keeps every lifecycle-scoped channel facet available after selecting one", async () => {
    const user = userEvent.setup();
    render(
      <RunsHub
        {...baseProps}
        cards={[
          card(1, "ready_for_review", "dark_history"),
          card(2, "ready_for_review", "weird_food"),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "dark_history (1)" }));

    expect(screen.getByRole("button", { name: "All channels (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "dark_history (1)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "weird_food (1)" })).toBeInTheDocument();
  });

  it("clears a channel outside the next lifecycle so every tab keeps honest counts and rows", async () => {
    const user = userEvent.setup();
    render(
      <RunsHub
        {...baseProps}
        cards={[
          card(1, "done", "grandma"),
          card(2, "done", "dark_history"),
          card(3, "ready_for_review", "animal_facts"),
          card(4, "ready_for_review", "ab_gen_forced"),
          card(5, "running", "weird_food"),
        ]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Finished 2/ }));
    await user.click(screen.getByRole("button", { name: "grandma (1)" }));
    expect(screen.getByText("Run 1")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Parked 0/ }));
    expect(screen.getByRole("tab", { name: /Parked 2/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /In flight 1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Finished 2/ })).toBeInTheDocument();
    expect(screen.getByText("Run 3")).toBeInTheDocument();
    expect(screen.getByText("Run 4")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /In flight 1/ }));
    expect(screen.getByText("Run 5")).toBeInTheDocument();
    expect(screen.queryByText("Run 1")).not.toBeInTheDocument();
  });

  it("falls back to all channels when refreshed data removes the selected lifecycle facet", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RunsHub
        {...baseProps}
        cards={[
          card(1, "ready_for_review", "dark_history"),
          card(2, "ready_for_review", "weird_food"),
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "dark_history (1)" }));

    rerender(
      <RunsHub
        {...baseProps}
        cards={[
          card(3, "done", "dark_history"),
          card(4, "ready_for_review", "weird_food"),
        ]}
      />,
    );

    expect(await screen.findByRole("tab", { name: /Parked 1/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Finished 1/ })).toBeInTheDocument();
    expect(screen.getByText("Run 4")).toBeInTheDocument();
    expect(screen.queryByText("Run 3")).not.toBeInTheDocument();
  });

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

  it("keeps an unknown pipeline status visible as in-flight and out of archive actions", () => {
    const awaitingApproval = card(135, "queued", "alpha");
    awaitingApproval.rawStatus = "awaiting_spend_approval";
    awaitingApproval.statusLabel = "awaiting_spend_approval";

    render(
      <RunsHub
        {...baseProps}
        cards={[awaitingApproval]}
        onArchiveJobs={vi.fn()}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /In flight 1/ })).toHaveAttribute("aria-selected", "true");
    const row = screen.getByText("Run 135").closest("article");
    expect(within(row as HTMLElement).queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive 0 runs" })).toBeDisabled();
  });

  it("bulk archive is scoped to the selected finished lifecycle", async () => {
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

    await user.click(screen.getByRole("tab", { name: /Finished 3/ }));
    await user.click(screen.getByRole("button", { name: "Archive 3 runs" }));

    expect(screen.getByText(/Hide 3 runs/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive 3" }));

    expect(onArchiveJobs).toHaveBeenCalledWith([1, 2, 4]);
    expect(onArchiveJobs).not.toHaveBeenCalledWith(expect.arrayContaining([5]));
  });

  it("archives raw finished fallbacks and reports every visible ineligible run", async () => {
    const user = userEvent.setup();
    const abandoned = card(3, "queued", "alpha");
    abandoned.rawStatus = "abandoned";
    abandoned.statusLabel = "Abandoned";
    const onArchiveJobs = vi.fn().mockResolvedValue({
      ok: true,
      affected: 2,
      skipped: 0,
      error: null,
    });

    render(
      <RunsHub
        {...baseProps}
        cards={[card(1, "done", "alpha"), card(2, "stale", "alpha"), abandoned]}
        onArchiveJobs={onArchiveJobs}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /Finished 3/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Archive 2 runs" })).toBeEnabled();
    expect(screen.getByText(/1 run with status “stale” cannot be archived/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archive 2 runs" }));
    await user.click(screen.getByRole("button", { name: "Archive 2" }));
    expect(onArchiveJobs).toHaveBeenCalledWith([1, 3]);
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
