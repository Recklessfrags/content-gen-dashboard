// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { RunsHub, type RunCardVM, type RunStage } from "@/components/aurora/RunsHub";
import type { CostReceipt } from "@/components/controlroom/shared";
import { useAllCostReceipts, useCostReceipts } from "@/lib/hooks/useCostReceipts";

vi.mock("@/lib/hooks/useRenderProgress", () => ({ useRenderProgress: () => ({}) }));

type QueryResult = { data: CostReceipt[]; error: null };
const SERVER_ROW_CAP = 500;

function receipt(episodeId: string, seq: number, stage: string): CostReceipt {
  return {
    episode_id: episodeId,
    seq,
    stage,
    provider: "test-provider",
    spend_so_far: seq / 100,
  };
}

function mockSupabase(rows: CostReceipt[]) {
  const inCalls: string[][] = [];
  const rangeCalls: Array<[number, number]> = [];

  class Query implements PromiseLike<QueryResult> {
    private episodeIds: string[] | null = null;

    select() { return this; }
    order() { return this; }
    returns() { return this; }
    in(_column: string, values: string[]) {
      this.episodeIds = values;
      inCalls.push(values);
      return this;
    }
    range(from: number, to: number) {
      rangeCalls.push([from, to]);
      return Promise.resolve({
        data: this.filteredRows().slice(from, Math.min(to + 1, from + SERVER_ROW_CAP)),
        error: null,
      });
    }
    then<TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      // Model PostgREST's project-level default max_rows for an unbounded request.
      return Promise.resolve({ data: this.filteredRows().slice(0, 1_000), error: null })
        .then(onfulfilled, onrejected);
    }
    private filteredRows() {
      if (!this.episodeIds) return rows;
      const ids = new Set(this.episodeIds);
      return rows.filter((row) => ids.has(row.episode_id));
    }
  }

  return {
    client: { from: () => new Query() },
    inCalls,
    rangeCalls,
  };
}

function TrackFromReceipts({ receipts }: { receipts: CostReceipt[] }) {
  const attemptsByStage: Partial<Record<RunStage, number>> = {};
  for (const row of receipts) {
    if (row.episode_id !== "episode-365") continue;
    const stage = row.stage as RunStage;
    attemptsByStage[stage] = (attemptsByStage[stage] ?? 0) + 1;
  }
  const card: RunCardVM = {
    id: "job-365",
    episodeId: "episode-365",
    title: "Late-page run",
    channel: "history",
    status: "ready_for_review",
    statusLabel: "Ready for review",
    createdAt: "2026-08-18T00:00:00.000Z",
    spend: null,
    error: null,
    attemptsByStage,
  };
  return (
    <RunsHub
      cards={[card]}
      loading={false}
      error={null}
      onRetry={() => {}}
      onBack={() => {}}
      loadReliability={async () => ({ reliability: null, error: null })}
    />
  );
}

afterEach(cleanup);

describe("useCostReceipts scoped paging", () => {
  it("renders the real track when the run's receipts sit beyond an unscoped 1000-row page", async () => {
    const unrelated = Array.from({ length: 1_000 }, (_, index) =>
      receipt(`older-${index}`, index + 1, "researcher"),
    );
    const targetRows = [
      receipt("episode-365", 1_148, "researcher"),
      receipt("episode-365", 1_149, "editor"),
    ];
    const mock = mockSupabase([...unrelated, ...targetRows]);
    const { result } = renderHook(() => useCostReceipts(mock.client as never, ["episode-365"]));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    render(<TrackFromReceipts receipts={result.current.costReceipts} />);
    expect(screen.getByRole("listitem", { name: "Researching the topic: passed" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Editing the cut: waiting on you" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Publishing: not reached" })).toBeInTheDocument();
    expect(mock.inCalls).toEqual([["episode-365"], ["episode-365"]]);
  });

  it("continues after an exactly-full API page instead of silently truncating", async () => {
    const rows = Array.from({ length: 1_001 }, (_, index) =>
      receipt("busy-episode", index + 1, "researcher"),
    );
    const mock = mockSupabase(rows);
    const { result } = renderHook(() => useCostReceipts(mock.client as never, ["busy-episode"]));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.error).toBeNull();
    expect(result.current.costReceipts).toHaveLength(1_001);
    expect(mock.rangeCalls).toEqual([[0, 999], [500, 1_499], [1_000, 1_999], [1_001, 2_000]]);
  });

  it("explicitly paginates the full cost roll-up consumer", async () => {
    const rows = Array.from({ length: 1_001 }, (_, index) =>
      receipt(`episode-${index}`, index + 1, "researcher"),
    );
    const mock = mockSupabase(rows);

    const { result } = renderHook(() => useAllCostReceipts(mock.client as never));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.costReceipts).toHaveLength(1_001);
    expect(mock.inCalls).toHaveLength(0);
    expect(mock.rangeCalls).toEqual([[0, 999], [500, 1_499], [1_000, 1_999], [1_001, 2_000]]);
  });
});
