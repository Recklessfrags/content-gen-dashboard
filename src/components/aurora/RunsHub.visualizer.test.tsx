// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/hooks/useRenderProgress", () => ({ useRenderProgress: () => ({}) }));

import { RunsHub, type RunCardVM } from "@/components/aurora/RunsHub";

function card(id: number, status: RunCardVM["status"], episodeId = `episode-${id}`): RunCardVM {
  return {
    id: String(id),
    jobId: id,
    episodeId,
    title: `Topic ${id}`,
    channel: "weird_food",
    status,
    statusLabel: status,
    createdAt: "2026-08-18T17:46:00.000Z",
    spend: 0.29,
    error: status === "error" ? "stopped" : null,
    needsAttention: status === "error" || status === "ready_for_review",
  };
}

const baseProps = {
  loading: false,
  error: null,
  onRetry: vi.fn(),
  onBack: vi.fn(),
  loadReliability: vi.fn(async () => ({ reliability: null, error: null })),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("RunsHub corrected lifecycle", () => {
  it("keeps archive as an orthogonal filter and derives counts and default tab from archived rows", async () => {
    const user = userEvent.setup();
    render(
      <RunsHub
        {...baseProps}
        cards={[card(1, "ready_for_review"), card(2, "running"), card(3, "done")]}
        archivedCards={[card(4, "done"), card(5, "error")]}
        onArchiveJobs={vi.fn()}
        onUnarchiveJobs={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /Parked 1/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /In flight 1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Finished 1/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Archived/i })).not.toBeInTheDocument();
    expect(screen.getByText("Topic 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archived (2)" }));
    expect(screen.getByRole("tab", { name: /Parked 0/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /In flight 0/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Finished 2/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Topic 4")).toBeInTheDocument();
    expect(screen.getByText("Topic 5")).toBeInTheDocument();
  });
});

describe("RunsHub step track", () => {
  it("renders loaded attempt counts and progress as a labelled, non-interactive list", () => {
    const parked: RunCardVM = {
      ...card(1, "ready_for_review"),
      attemptsByStage: { researcher: 1, fact_check: 3, gate: 1, script_writer: 1 },
    };
    render(<RunsHub {...baseProps} cards={[parked]} />);

    const track = screen.getByRole("list", { name: "Progress for Topic 1" });
    expect(within(track).getAllByRole("listitem")).toHaveLength(11);
    expect(within(track).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Checking the facts: passed, 3 attempts")).toHaveTextContent("3");
    expect(screen.getByLabelText("Writing the script: waiting on you")).toHaveClass("is-parked");
    expect(screen.getByLabelText("Lexicon: not reached")).toHaveClass("is-pending");
  });

  it("never claims receipt-free distribution passed for a done run", () => {
    const doneAtScript: RunCardVM = {
      ...card(1, "done"),
      attemptsByStage: { researcher: 1, script_writer: 1 },
    };
    render(<RunsHub {...baseProps} cards={[doneAtScript]} />);

    expect(screen.getByRole("listitem", { name: "Publishing: not reached" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Researching the topic: passed" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Checking the facts: not reached" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Writing the script: passed" })).toBeInTheDocument();
  });

  it.each([
    ["no_op", undefined, "researcher", "Researching the topic: passed"],
    ["stale", undefined, "editor", "Editing the cut: failed"],
    ["queued", "abandoned", "voice_direction", "Recording the voiceover: failed"],
  ] as const)("shows receipt-backed progress for %s runs", (status, rawStatus, furthestStage, terminalLabel) => {
    const receiptBacked: RunCardVM = {
      ...card(1, status),
      rawStatus,
      attemptsByStage: { researcher: 1, [furthestStage]: 1 },
    };
    render(<RunsHub {...baseProps} cards={[receiptBacked]} />);

    expect(screen.getByRole("listitem", { name: terminalLabel })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Publishing: not reached" })).toBeInTheDocument();
  });

  it("puts all 11 nodes in a responsive row while preserving the 44px height", () => {
    render(<RunsHub {...baseProps} cards={[{ ...card(1, "done"), attemptsByStage: { researcher: 1 } }]} />);
    const article = screen.getByText("Topic 1").closest("article") as HTMLElement;
    const head = article.querySelector(".run-card__head");
    expect(head?.nextElementSibling).toHaveClass("au-step-track");
    expect(within(article).getAllByRole("listitem")).toHaveLength(11);

    const css = readFileSync("src/app/aurora.css", "utf8");
    const trackRule = css.match(/\.aurora-app \.au-step-track \{[\s\S]*?\n\}/)?.[0] ?? "";
    const nodeRule = css.match(/\.aurora-app \.au-step-node \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(trackRule).toContain("display: flex");
    expect(nodeRule).toContain("flex: 1 1 0");
    expect(nodeRule).toContain("min-width: 0");
    expect(nodeRule).toContain("min-height: 44px");
    expect(nodeRule).toContain("height: 44px");
  });

  it("restores the receipt-gated render player on a run card", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    const head = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", head);

    render(<RunsHub {...baseProps} cards={[{ ...card(99, "error", "render-on-card"), attemptsByStage: { distribution: 1 } }]} />);

    expect(await screen.findByRole("button", { name: /watch render/i })).toBeVisible();
    await waitFor(() => expect(head).toHaveBeenCalledOnce());
  });
});
