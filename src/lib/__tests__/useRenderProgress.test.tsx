// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({ createClient: mocks.createClient }));

import { reduceLatestReceiptStages, useRenderProgress } from "@/lib/hooks/useRenderProgress";
import { RenderProgress } from "@/components/aurora/RenderProgress";

function clientReturning(response: { data: unknown[] | null; error: { message: string } | null }) {
  const order = vi.fn((_column: string, _options: { ascending: boolean }) => Promise.resolve(response));
  const inFilter = vi.fn((_column: string, _values: string[]) => ({ order }));
  const select = vi.fn((_columns: string) => ({ in: inFilter }));
  const from = vi.fn((_table: string) => ({ select }));
  return { client: { from }, from, select, inFilter, order };
}

describe("useRenderProgress", () => {
  beforeEach(() => mocks.createClient.mockReset());
  afterEach(cleanup);

  it("reduces each episode to its furthest ladder stage, regardless of receipt sequence", async () => {
    const query = clientReturning({
      data: [
        { episode_id: "ep-1", seq: 1, stage: "researcher" },
        { episode_id: "ep-2", seq: 9, stage: "distribution" },
        { episode_id: "ep-1", seq: 2, stage: "assembly" },
        { episode_id: "ep-1", seq: 3, stage: "voice_direction" },
        { episode_id: "ep-1", seq: 4, stage: "entertainment_judge" },
        { episode_id: "ep-1", seq: 5, stage: "future_stage" },
      ],
      error: null,
    });
    mocks.createClient.mockReturnValue(query.client);

    const { result } = renderHook(() => useRenderProgress(["ep-1", "ep-2", "ep-1"]));

    await waitFor(() => expect(result.current).toEqual({ "ep-1": "assembly", "ep-2": "distribution" }));
    expect(query.from).toHaveBeenCalledTimes(1);
    expect(query.from).toHaveBeenCalledWith("receipts");
    expect(query.select).toHaveBeenCalledWith("episode_id,seq,stage");
    expect(query.inFilter).toHaveBeenCalledWith("episode_id", ["ep-1", "ep-2"]);
    expect(query.order).toHaveBeenCalledWith("seq", { ascending: false });
  });

  it("keeps researcher → assembly → voice_direction at assembly", () => {
    expect(reduceLatestReceiptStages([
      { episode_id: "ep-1", seq: 1, stage: "researcher" },
      { episode_id: "ep-1", seq: 2, stage: "assembly" },
      { episode_id: "ep-1", seq: 3, stage: "voice_direction" },
    ])).toEqual({ "ep-1": "assembly" });
  });

  it("refreshes on the configured cadence while ids remain in flight", async () => {
    const query = clientReturning({ data: [], error: null });
    query.order
      .mockResolvedValueOnce({
        data: [{ episode_id: "ep-1", seq: 1, stage: "researcher" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { episode_id: "ep-1", seq: 1, stage: "researcher" },
          { episode_id: "ep-1", seq: 2, stage: "assembly" },
        ],
        error: null,
      });
    mocks.createClient.mockReturnValue(query.client);

    const { result } = renderHook(() => useRenderProgress(["ep-1"], 100));

    await waitFor(() => expect(result.current).toEqual({ "ep-1": "researcher" }));
    await waitFor(() => expect(result.current).toEqual({ "ep-1": "assembly" }));
    expect(query.order).toHaveBeenCalledTimes(2);
  });

  it("shows assembly on the bar when a later receipt revisits voice direction", async () => {
    const query = clientReturning({
      data: [
        { episode_id: "ep-1", seq: 1, stage: "researcher" },
        { episode_id: "ep-1", seq: 2, stage: "assembly" },
        { episode_id: "ep-1", seq: 3, stage: "voice_direction" },
      ],
      error: null,
    });
    mocks.createClient.mockReturnValue(query.client);

    function ProgressHarness() {
      const stages = useRenderProgress(["ep-1"], 60_000);
      return <RenderProgress latestStage={stages["ep-1"]} />;
    }
    render(<ProgressHarness />);

    expect(await screen.findByText("Step 8 of 9 · Assembling the video")).toBeTruthy();
    expect(screen.queryByText(/Recording the voiceover/)).toBeNull();
  });

  it("chunks receipt queries into batches of at most 100 ids", async () => {
    const query = clientReturning({ data: [], error: null });
    mocks.createClient.mockReturnValue(query.client);
    const ids = Array.from({ length: 205 }, (_, index) => `ep-${String(index).padStart(3, "0")}`);

    renderHook(() => useRenderProgress(ids, 60_000));

    await waitFor(() => expect(query.inFilter).toHaveBeenCalledTimes(3));
    const batches = query.inFilter.mock.calls.map(([, batch]) => batch);
    expect(batches.map((batch) => batch.length)).toEqual([100, 100, 5]);
    expect(batches.flat()).toEqual(ids);
  });

  it("does not query for an empty id list", () => {
    const query = clientReturning({ data: [], error: null });
    mocks.createClient.mockReturnValue(query.client);
    const { result } = renderHook(() => useRenderProgress([]));
    expect(result.current).toEqual({});
    expect(query.from).not.toHaveBeenCalled();
  });

  it("returns an empty map on a read error", async () => {
    const query = clientReturning({ data: null, error: { message: "nope" } });
    mocks.createClient.mockReturnValue(query.client);
    const { result } = renderHook(() => useRenderProgress(["ep-1"]));
    await waitFor(() => expect(query.order).toHaveBeenCalledTimes(1));
    expect(result.current).toEqual({});
  });

  it("stops refreshing when the id list becomes empty", async () => {
    const query = clientReturning({ data: [], error: null });
    mocks.createClient.mockReturnValue(query.client);
    const { rerender } = renderHook(
      ({ ids }) => useRenderProgress(ids, 20),
      { initialProps: { ids: ["ep-1"] as string[] } },
    );
    await waitFor(() => expect(query.order).toHaveBeenCalledTimes(1));

    rerender({ ids: [] });
    await new Promise((resolve) => window.setTimeout(resolve, 50));

    expect(query.order).toHaveBeenCalledTimes(1);
  });
});
