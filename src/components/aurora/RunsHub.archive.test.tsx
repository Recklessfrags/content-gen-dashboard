// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/useRenderProgress", () => ({ useRenderProgress: () => ({}) }));

import { JobArchiveBulkControl } from "@/components/aurora/JobArchiveControls";
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

    await user.click(screen.getByRole("button", { name: "dark_history (2)" }));

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

  it("keeps the active channel filter and its off-switch visible when it becomes the only facet", async () => {
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
    rerender(<RunsHub {...baseProps} cards={[card(1, "ready_for_review", "dark_history")]} />);

    expect(screen.getByRole("button", { name: "All channels (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "dark_history (1)" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps a global channel selected on a zero-row lifecycle so counts, rows, and off-switch agree", async () => {
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
    expect(screen.getByRole("tab", { name: /Parked 0/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /In flight 0/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Finished 1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "grandma (1)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/No parked runs/)).toBeInTheDocument();
    expect(document.querySelectorAll("[data-run-id]")).toHaveLength(0);
  });

  it("falls back to all channels only when refreshed population removes the selected channel", async () => {
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
          card(4, "ready_for_review", "weird_food"),
        ]}
      />,
    );

    expect(await screen.findByRole("tab", { name: /Parked 1/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Finished 0/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filter by channel" })).not.toBeInTheDocument();
    expect(screen.getByText("Run 4")).toBeInTheDocument();
  });

  it("keeps counts and rendered rows identical across every view, lifecycle, and channel", async () => {
    const user = userEvent.setup();
    const active = [
      card(1, "ready_for_review", "alpha"),
      card(2, "ready_for_review", "alpha"),
      card(3, "running", "alpha"),
      card(4, "done", "alpha"),
      card(5, "ready_for_review", "beta"),
      card(6, "done", "beta"),
      card(7, "error", "beta"),
    ];
    const archived = [
      card(11, "ready_for_review", "alpha"),
      card(12, "running", "alpha"),
      card(13, "queued", "alpha"),
      card(14, "running", "beta"),
      card(15, "done", "beta"),
    ];
    render(
      <RunsHub
        {...baseProps}
        cards={active}
        archivedCards={archived}
        onArchiveJobs={vi.fn()}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    const assertScope = async (
      view: "Active" | "Archived",
      channel: "All channels" | "alpha" | "beta",
      expected: Record<"Parked" | "In flight" | "Finished", string[]>,
    ) => {
      await user.click(screen.getByRole("button", { name: new RegExp(`^${view} \\(`) }));
      const total = Object.values(expected).flat().length;
      await user.click(screen.getByRole("button", { name: `${channel} (${total})` }));
      expect(screen.getByRole("button", { name: `${channel} (${total})` })).toHaveAttribute("aria-pressed", "true");

      for (const lifecycleLabel of ["Parked", "In flight", "Finished"] as const) {
        const ids = expected[lifecycleLabel];
        const tab = screen.getByRole("tab", { name: new RegExp(`^${lifecycleLabel} ${ids.length}$`) });
        await user.click(tab);
        expect(tab).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("button", { name: `${channel} (${total})` })).toBeVisible();
        expect([...document.querySelectorAll<HTMLElement>("[data-run-id]")].map((node) => node.dataset.runId)).toEqual(ids);
      }
    };

    await assertScope("Active", "All channels", {
      Parked: ["1", "2", "5"],
      "In flight": ["3"],
      Finished: ["4", "6", "7"],
    });
    await assertScope("Active", "alpha", {
      Parked: ["1", "2"],
      "In flight": ["3"],
      Finished: ["4"],
    });
    await assertScope("Active", "beta", {
      Parked: ["5"],
      "In flight": [],
      Finished: ["6", "7"],
    });
    await assertScope("Archived", "All channels", {
      Parked: ["11"],
      "In flight": ["12", "13", "14"],
      Finished: ["15"],
    });
    await assertScope("Archived", "alpha", {
      Parked: ["11"],
      "In flight": ["12", "13"],
      Finished: [],
    });
    await assertScope("Archived", "beta", {
      Parked: [],
      "In flight": ["14"],
      Finished: ["15"],
    });
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
    expect(screen.getByText(/2 runs with statuses “queued”, “running” cannot be archived while in flight/i)).toBeInTheDocument();
  });

  it("keeps an unknown pipeline status visible as in-flight, held out of bulk, and deliberately dismissible", async () => {
    const user = userEvent.setup();
    const onArchiveJobs = vi.fn().mockResolvedValue({
      ok: true,
      affected: 1,
      skipped: 0,
      error: null,
    });
    const awaitingApproval = card(135, "queued", "alpha");
    awaitingApproval.rawStatus = "awaiting_spend_approval";
    awaitingApproval.statusLabel = "awaiting_spend_approval";

    render(
      <RunsHub
        {...baseProps}
        cards={[awaitingApproval]}
        onArchiveJobs={onArchiveJobs}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /In flight 1/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Archive 0 runs" })).toBeDisabled();
    expect(screen.getByText(/1 run is held out of bulk archive.*awaiting_spend_approval.*Archive it from the row/i)).toBeInTheDocument();
    await user.click(within(screen.getByText("Run 135").closest("article") as HTMLElement).getByRole("button", { name: "Archive" }));
    expect(onArchiveJobs).toHaveBeenCalledWith([135], { allowDeliberateDismissal: true });
  });

  it("cannot bulk-archive a ready-for-review row from the default Parked tab", async () => {
    const user = userEvent.setup();
    const onArchiveJobs = vi.fn();
    render(
      <RunsHub
        {...baseProps}
        cards={[card(1, "ready_for_review", "alpha")]}
        onArchiveJobs={onArchiveJobs}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /Parked 1/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Archive 0 runs" })).toBeDisabled();
    expect(screen.getByText(/1 run is held out of bulk archive.*ready for review — approval pending.*Archive it from the row/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive 0 runs" }));
    expect(onArchiveJobs).not.toHaveBeenCalled();
  });

  it("closes a pending bulk confirmation when its target set changes", async () => {
    const user = userEvent.setup();
    const props = {
      noun: "run",
      showArchived: false,
      onArchive: vi.fn(),
      onUnarchive: vi.fn(),
    };
    const { rerender } = render(
      <JobArchiveBulkControl {...props} currentJobs={[{ id: 1, status: "done" }]} />,
    );

    await user.click(screen.getByRole("button", { name: "Archive 1 run" }));
    expect(screen.getByRole("group", { name: "Confirm archive" })).toBeInTheDocument();

    rerender(<JobArchiveBulkControl {...props} currentJobs={[{ id: 2, status: "done" }]} />);
    expect(screen.queryByRole("group", { name: "Confirm archive" })).not.toBeInTheDocument();
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
    expect(screen.getByText(/1 run is held out of bulk archive.*stale.*Archive it from the row/i)).toBeInTheDocument();

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
