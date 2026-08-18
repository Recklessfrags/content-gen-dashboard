// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ActionCenter,
  PARK_CLASSIFICATION_TIMEOUT_MS,
} from "@/components/aurora/ActionCenter";
import type { QueueJob } from "@/components/controlroom/shared";

// The screen the operator called "too disorganized and cluttered": 100+ approvals in one
// flat scroll, every card repeating the same paragraph, titled by CHANNEL so every row
// read the same. These pin the redesign's decisions.

function job(over: Partial<QueueJob> & { id: number }): QueueJob {
  return {
    channel: "dark_history",
    food: "The Great Molasses Flood of 1919",
    status: "ready_for_review",
    park_kind: null,
    spend: 1.24,
    episode_id: `ep-${over.id}`,
    created_at: "2026-08-17T00:35:00.000Z",
    ...over,
  } as QueueJob;
}

const baseProps = {
  pending: null,
  submitting: false,
  onRequest: vi.fn(),
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  canPublish: () => false,
  statusLabel: () => "Ready for review",
};

function park(kind: string, loading = false, loadingSince = loading ? Date.now() : null) {
  return { kind, loading, loadingSince, stage: null, error: null } as never;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ActionCenter triage", () => {
  it("groups approvals by decision type and totals only the money group", () => {
    render(
      <ActionCenter
        {...baseProps}
        jobs={[
          job({ id: 1, spend: 1.25 }),
          job({ id: 2, spend: 2.75 }),
          job({ id: 3, spend: 0.3 }),
        ]}
        parkById={{ 1: park("spend"), 2: park("spend"), 3: park("fact") }}
      />,
    );

    expect(screen.getByText(/\/\/ SPEND APPROVALS \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/\/\/ FACT CALLS \(1\)/)).toBeInTheDocument();
    // The spend group carries what has already been spent on those runs...
    expect(screen.getByText("$4.00 held")).toBeInTheDocument();
    // ...and the free group says so instead of showing a total.
    expect(screen.getByText(/no cost to approve/i)).toBeInTheDocument();
  });

  it("titles each row by TOPIC, and keeps a time so repeated topics stay distinct", () => {
    render(
      <ActionCenter
        {...baseProps}
        jobs={[
          job({ id: 1, created_at: "2026-08-17T04:30:00.000Z" }),
          job({ id: 2, created_at: "2026-08-17T04:35:00.000Z" }),
        ]}
        parkById={{ 1: park("spend"), 2: park("spend") }}
      />,
    );

    // Titled by topic, not channel — the defect was 107 rows all reading "dark_history".
    expect(
      screen.getAllByText("The Great Molasses Flood of 1919"),
    ).toHaveLength(2);
    // The same topic legitimately repeats, so the row still carries a timestamp.
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText(/dark_history/)).toBeInTheDocument();
    expect(
      within(rows[0]).getByText(/dark_history/).textContent,
    ).not.toEqual(within(rows[1]).getByText(/dark_history/).textContent);
  });

  it("collapses the detail and its repeated copy until the row is opened", async () => {
    const user = userEvent.setup();
    render(
      <ActionCenter
        {...baseProps}
        jobs={[job({ id: 1 })]}
        parkById={{ 1: park("spend") }}
      />,
    );

    const summary = screen.getByRole("button", { expanded: false });
    // The per-card paragraph and the action are not in the collapsed row.
    expect(screen.queryByText(/waiting to avoid unexpected cost/i)).not.toBeVisible();

    await user.click(summary);

    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    expect(screen.getByText(/waiting to avoid unexpected cost/i)).toBeVisible();
  });

  it("opens only one row at a time", async () => {
    const user = userEvent.setup();
    render(
      <ActionCenter
        {...baseProps}
        jobs={[job({ id: 1 }), job({ id: 2 })]}
        parkById={{ 1: park("spend"), 2: park("spend") }}
      />,
    );

    const summaries = screen.getAllByRole("button", { expanded: false });
    await user.click(summaries[0]);
    await user.click(summaries[1]);

    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
  });

  it("does not mount a render player on spend or fact holds", async () => {
    const user = userEvent.setup();
    render(
      <ActionCenter
        {...baseProps}
        jobs={[job({ id: 1 })]}
        parkById={{ 1: park("spend") }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /The Great Molasses Flood/ }));
    // The old screen mounted this on every card and it usually said
    // "No render available for this episode."
    expect(screen.queryByText(/watch render/i)).not.toBeInTheDocument();
  });

  it("keeps a still-classifying row out of the group that says to go investigate", () => {
    render(
      <ActionCenter
        {...baseProps}
        jobs={[
          job({ id: 1, food: "Classification pending" }),
          job({ id: 2, food: "Unclassifiable approval" }),
        ]}
        parkById={{ 1: park("unknown", true), 2: park("unknown") }}
      />,
    );

    const classifying = screen.getByRole("list", { name: "CLASSIFYING" });
    const needsALook = screen.getByRole("list", { name: "NEEDS A LOOK" });

    expect(screen.getByText(/\/\/ CLASSIFYING \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/\/\/ NEEDS A LOOK \(1\)/)).toBeInTheDocument();
    expect(within(classifying).getByText("Classification pending")).toBeInTheDocument();
    expect(within(classifying).queryByText("Unclassifiable approval")).not.toBeInTheDocument();
    expect(within(needsALook).getByText("Unclassifiable approval")).toBeInTheDocument();
    expect(within(needsALook).queryByText("Classification pending")).not.toBeInTheDocument();
  });

  it("keeps an approval with an unrecognized park kind visible in NEEDS A LOOK", () => {
    render(
      <ActionCenter
        {...baseProps}
        jobs={[job({ id: 1, food: "New park kind approval" })]}
        parkById={{ 1: park("future_kind") }}
      />,
    );

    const needsALook = screen.getByRole("list", { name: "NEEDS A LOOK" });
    expect(screen.getByText(/\/\/ NEEDS A LOOK \(1\)/)).toBeInTheDocument();
    expect(within(needsALook).getByText("New park kind approval")).toBeInTheDocument();
  });

  it("moves a classification into NEEDS A LOOK when its timeout elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T12:00:00.000Z"));
    const loadingSince = Date.now();

    render(
      <ActionCenter
        {...baseProps}
        jobs={[job({ id: 1, food: "Classification timed out" })]}
        parkById={{ 1: park("unknown", true, loadingSince) }}
      />,
    );

    expect(screen.getByRole("list", { name: "CLASSIFYING" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "NEEDS A LOOK" })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(PARK_CLASSIFICATION_TIMEOUT_MS + 1);
    });

    const needsALook = screen.getByRole("list", { name: "NEEDS A LOOK" });
    expect(screen.getByText(/\/\/ NEEDS A LOOK \(1\)/)).toBeInTheDocument();
    expect(within(needsALook).getByText("Classification timed out")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "CLASSIFYING" })).not.toBeInTheDocument();
  });

  it("does not strand a classification that expires between render and scheduling", () => {
    vi.useFakeTimers();
    const renderClock = new Date("2026-08-18T12:00:00.000Z").getTime();
    vi.setSystemTime(renderClock);
    const expiry = renderClock + 5;
    const loadingSince = expiry - PARK_CLASSIFICATION_TIMEOUT_MS;
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(renderClock)
      .mockReturnValue(renderClock + 10);

    render(
      <ActionCenter
        {...baseProps}
        jobs={[job({ id: 1, food: "Boundary classification" })]}
        parkById={{ 1: park("unknown", true, loadingSince) }}
      />,
    );

    expect(screen.getByRole("list", { name: "CLASSIFYING" })).toBeInTheDocument();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    const needsALook = screen.getByRole("list", { name: "NEEDS A LOOK" });
    expect(within(needsALook).getByText("Boundary classification")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "CLASSIFYING" })).not.toBeInTheDocument();
  });

  it("offers secondary per-row archive actions for approvals and errors", async () => {
    const user = userEvent.setup();
    const onArchiveJobs = vi.fn().mockResolvedValue({
      ok: true,
      affected: 1,
      skipped: 0,
      error: null,
    });
    render(
      <ActionCenter
        {...baseProps}
        jobs={[job({ id: 1 })]}
        erroredJobs={[job({ id: 2, status: "error" })]}
        parkById={{ 1: park("spend"), 2: park("unknown") }}
        onArchiveJobs={onArchiveJobs}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /The Great Molasses Flood/ }));
    const approvalRow = screen.getAllByRole("listitem")[0];
    expect(within(approvalRow).getByRole("button", { name: "Archive" })).toHaveClass("ghost");

    const errorRow = screen.getAllByRole("listitem")[1];
    await user.click(within(errorRow).getByRole("button", { name: "Archive" }));
    expect(onArchiveJobs).toHaveBeenCalledWith([2]);
  });

  it("bulk-archives only the selected decision group", async () => {
    const user = userEvent.setup();
    const onArchiveJobs = vi.fn().mockResolvedValue({
      ok: true,
      affected: 1,
      skipped: 0,
      error: null,
    });
    render(
      <ActionCenter
        {...baseProps}
        jobs={[
          job({ id: 11, food: "Paid run" }),
          job({ id: 12, food: "Fact-check run" }),
          job({ id: 13, food: "Still classifying" }),
        ]}
        erroredJobs={[job({ id: 14, status: "error", food: "Broken run" })]}
        parkById={{
          11: park("spend"),
          12: park("fact"),
          13: park("unknown", true),
          14: park("unknown"),
        }}
        onArchiveJobs={onArchiveJobs}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    const factGroup = screen.getByText(/\/\/ FACT CALLS \(1\)/).closest("section")!;
    await user.click(within(factGroup).getByRole("button", { name: "Archive 1 item" }));
    await user.click(within(factGroup).getByRole("button", { name: "Archive 1" }));

    expect(onArchiveJobs).toHaveBeenCalledOnce();
    expect(onArchiveJobs).toHaveBeenCalledWith([12]);
    expect(onArchiveJobs).not.toHaveBeenCalledWith(expect.arrayContaining([11, 13, 14]));
  });

  it("bulk-archiving errored jobs leaves a pending spend approval untouched", async () => {
    const user = userEvent.setup();
    const onArchiveJobs = vi.fn().mockResolvedValue({
      ok: true,
      affected: 2,
      skipped: 0,
      error: null,
    });
    render(
      <ActionCenter
        {...baseProps}
        jobs={[job({ id: 21, food: "Money already spent" })]}
        erroredJobs={[
          job({ id: 22, status: "error", food: "Broken one" }),
          job({ id: 23, status: "stale", food: "Broken two" }),
        ]}
        parkById={{ 21: park("spend"), 22: park("unknown"), 23: park("unknown") }}
        onArchiveJobs={onArchiveJobs}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    const errorGroup = screen.getByRole("heading", { name: "Errored / stuck" }).closest("section")!;
    await user.click(within(errorGroup).getByRole("button", { name: "Archive 2 items" }));
    await user.click(within(errorGroup).getByRole("button", { name: "Archive 2" }));

    expect(onArchiveJobs).toHaveBeenCalledOnce();
    expect(onArchiveJobs).toHaveBeenCalledWith([22, 23]);
    expect(onArchiveJobs).not.toHaveBeenCalledWith(expect.arrayContaining([21]));
  });
});
