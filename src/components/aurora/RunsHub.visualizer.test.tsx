// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/hooks/useRenderProgress", () => ({ useRenderProgress: () => ({}) }));

import {
  RunsHub,
  STAGE_DETAIL_SELECTS,
  type RunCardVM,
  type RunDiagnosticsResult,
  type RunStage,
} from "@/components/aurora/RunsHub";

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

const emptyDiagnostics = vi.fn(async (): Promise<RunDiagnosticsResult> => ({ receipts: [], error: null }));
const baseProps = {
  loading: false,
  error: null,
  onRetry: vi.fn(),
  onBack: vi.fn(),
  loadDiagnostics: emptyDiagnostics,
  loadStageDetail: vi.fn(async () => ({ payload: null, error: null })),
  loadReliability: vi.fn(async () => ({ reliability: null, error: null })),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RunsHub corrected lifecycle", () => {
  it("keeps archive as an orthogonal filter and excludes archived rows from lifecycle counts", async () => {
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
    expect(screen.getByRole("tab", { name: /Finished 1/ })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Finished 1/ }));
    expect(screen.getByText("Topic 4")).toBeInTheDocument();
    expect(screen.getByText("Topic 5")).toBeInTheDocument();
  });
});

describe("RunsHub step interaction", () => {
  it("loads metadata and one selected attempt lazily, renders readable script, caches it, and toggles closed", async () => {
    const user = userEvent.setup();
    const loadDiagnostics = vi.fn(async (): Promise<RunDiagnosticsResult> => ({
      receipts: [
        { seq: 1, stage: "researcher", verdict: "pass", reason: "ok", model: "", provider: "", spendSoFar: 0.05 },
        { seq: 2, stage: "script_writer", verdict: "retry", reason: "tighten hook", model: "m", provider: "p", spendSoFar: 0.15 },
        { seq: 3, stage: "script_writer", verdict: "pass", reason: "script passed", model: "m", provider: "p", spendSoFar: 0.25 },
      ],
      error: null,
    }));
    const loadStageDetail = vi.fn(async (_episode: string, stage: RunStage, seq: number | null) => ({
      payload: {
        seq,
        title: "The curd nobody expected",
        hook: seq === 2 ? "Old hook" : "The label hides the twist.",
        beats: [{ label: "Beat 1", timecode: "0-6s", voiceover: "Readable spoken copy.", on_screen: "Show the label" }],
        cta: "Read the ingredients.",
        stage,
      },
      error: null,
    }));

    render(
      <RunsHub
        {...baseProps}
        cards={[card(1, "done")]}
        loadDiagnostics={loadDiagnostics}
        loadStageDetail={loadStageDetail}
      />,
    );

    expect(loadDiagnostics).not.toHaveBeenCalled();
    expect(loadStageDetail).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Writing the script: passed" }));

    expect(await screen.findByText("Readable spoken copy.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Writing the script: passed, 2 attempts" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Attempt")).toHaveValue("3");
    expect(screen.getByText(/\$0\.10 this attempt/)).toBeInTheDocument();
    expect(loadDiagnostics).toHaveBeenCalledTimes(1);
    expect(loadStageDetail).toHaveBeenCalledWith("episode-1", "script_writer", 3);

    await user.selectOptions(screen.getByLabelText("Attempt"), "2");
    expect(await screen.findByText("Old hook")).toBeInTheDocument();
    expect(loadStageDetail).toHaveBeenCalledWith("episode-1", "script_writer", 2);

    await user.click(screen.getByRole("button", { name: "Writing the script: passed, 2 attempts" }));
    expect(screen.queryByLabelText("Writing the script details")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Writing the script: passed, 2 attempts" }));
    await screen.findByText("Readable spoken copy.");
    expect(loadDiagnostics).toHaveBeenCalledTimes(1);
    expect(loadStageDetail).toHaveBeenCalledTimes(2);
  });

  it("keeps one run drawer open and renders fact claims as status chips with sources", async () => {
    const user = userEvent.setup();
    const loadDiagnostics = vi.fn(async (episodeId: string): Promise<RunDiagnosticsResult> => ({
      receipts: [{ seq: episodeId === "episode-1" ? 11 : 21, stage: "fact_check", verdict: "pass", reason: "ledger", model: "", provider: "" }],
      error: null,
    }));
    const loadStageDetail = vi.fn(async (_episode: string, _stage: RunStage, seq: number | null) => ({
      payload: {
        seq,
        gate_summary: { green: 1, yellow: 0, red: 0 },
        claim_0_id: "c1",
        claim_0_claim: "The claim text",
        claim_0_status: "green",
        claim_source_0_citation: "Primary record",
        claim_source_0_url: "https://example.com/source",
        claim_source_0_type: "archive",
      },
      error: null,
    }));
    render(<RunsHub {...baseProps} cards={[card(1, "done"), card(2, "done")]} loadDiagnostics={loadDiagnostics} loadStageDetail={loadStageDetail} />);

    const first = screen.getByText("Topic 1").closest("article") as HTMLElement;
    const second = screen.getByText("Topic 2").closest("article") as HTMLElement;
    await user.click(within(first).getByRole("button", { name: "Checking the facts: passed" }));
    expect(await within(first).findByText("The claim text")).toBeInTheDocument();
    expect(within(first).getByText("green")).toHaveClass("is-green");
    expect(within(first).getByRole("link", { name: "Primary record" })).toHaveAttribute("href", "https://example.com/source");

    await user.click(within(second).getByRole("button", { name: "Checking the facts: passed" }));
    await within(second).findByText("The claim text");
    expect(within(first).queryByLabelText("Checking the facts details")).not.toBeInTheDocument();
    expect(within(second).getByLabelText("Checking the facts details")).toBeInTheDocument();
  });

  it("auto-selects the exact last non-pass receipt on a parked run instead of guessing from park_kind", async () => {
    const user = userEvent.setup();
    const parked = { ...card(1, "ready_for_review"), parkKind: "spend" as const };
    const loadDiagnostics = vi.fn(async (): Promise<RunDiagnosticsResult> => ({
      receipts: [
        { seq: 7, stage: "assembly", verdict: "retry", reason: "old retry", model: "", provider: "" },
        { seq: 8, stage: "assembly", verdict: "pass", reason: "assembled", model: "", provider: "" },
        { seq: 9, stage: "fact_check", verdict: "approval_required", reason: "review claim", model: "", provider: "" },
      ],
      error: null,
    }));
    const loadStageDetail = vi.fn(async () => ({ payload: { gate_summary: { green: 0, yellow: 0, red: 0 } }, error: null }));
    render(<RunsHub {...baseProps} cards={[parked]} loadDiagnostics={loadDiagnostics} loadStageDetail={loadStageDetail} />);

    await user.click(screen.getByRole("button", { name: /Topic 1.*Open stopped step/ }));
    await waitFor(() => expect(loadStageDetail).toHaveBeenCalledWith("episode-1", "fact_check", 9));
    expect(loadStageDetail).not.toHaveBeenCalledWith("episode-1", "assembly", expect.anything());
    expect(screen.getByLabelText("Checking the facts details")).toBeInTheDocument();
  });
});

describe("RunsHub corrected payload and geometry contracts", () => {
  it("projects assembly scalars without selecting the manifest and caps array projections", () => {
    expect(STAGE_DETAIL_SELECTS.assembly).not.toMatch(/(?:^|,)result(?:,|$|->)/);
    expect(STAGE_DETAIL_SELECTS.assembly).toContain("scene_count:evidence->scenes");
    expect(STAGE_DETAIL_SELECTS.assembly).toContain("cut_count:evidence->visual_cuts");
    expect(STAGE_DETAIL_SELECTS.fact_check.match(/claim_\d+_id:/g)).toHaveLength(8);
    expect(STAGE_DETAIL_SELECTS.researcher.match(/source_\d+_id:/g)).toHaveLength(6);
  });

  it("puts all 11 nodes in a responsive row while preserving the 44px target height", () => {
    render(<RunsHub {...baseProps} cards={[card(1, "done")]} />);
    const article = screen.getByText("Topic 1").closest("article") as HTMLElement;
    const head = article.querySelector(".run-card__head");
    expect(head?.nextElementSibling).toHaveClass("au-step-track");
    expect(within(article).getAllByRole("button", { name: /: passed$/ })).toHaveLength(11);

    const css = readFileSync("src/app/aurora.css", "utf8");
    const trackRule = css.match(/\.aurora-app \.au-step-track \{[\s\S]*?\n\}/)?.[0] ?? "";
    const nodeRule = css.match(/\.aurora-app \.au-step-node \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(trackRule).toContain("display: flex");
    expect(nodeRule).toContain("flex: 1 1 0");
    expect(nodeRule).toContain("min-width: 0");
    expect(nodeRule).toContain("min-height: 44px");
    expect(nodeRule).toContain("height: 44px");
  });
});
