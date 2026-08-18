// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useJobs } from "@/lib/hooks/useJobs";
import type { QueueJob } from "@/lib/jobs";

function job(id: number, status = "done"): QueueJob {
  return {
    id,
    status,
    food: `Run ${id}`,
    created_at: `2026-08-18T00:00:0${id}.000Z`,
  } as QueueJob;
}

function archiveClient({
  jobs,
  archived = [],
  insertError = null,
  deleteError = null,
}: {
  jobs: QueueJob[];
  archived?: Array<{ job_id: number; archived_at: string }>;
  insertError?: { message: string } | null;
  deleteError?: { message: string } | null;
}) {
  const jobsReturns = vi.fn().mockResolvedValue({ data: jobs, error: null });
  const jobsOrder = vi.fn(() => ({ returns: jobsReturns }));
  const archiveReturns = vi.fn().mockResolvedValue({ data: archived, error: null });
  const upsert = vi.fn().mockResolvedValue({ error: insertError });
  const deleteIn = vi.fn().mockResolvedValue({ error: deleteError });
  const deleteRows = vi.fn(() => ({ in: deleteIn }));
  const from = vi.fn((table: string) => {
    if (table === "jobs") {
      return { select: vi.fn(() => ({ order: jobsOrder })) };
    }
    return {
      select: vi.fn(() => ({ returns: archiveReturns })),
      upsert,
      delete: deleteRows,
    };
  });

  return { client: { from }, upsert, deleteIn };
}

describe("useJobs archive preference", () => {
  it("excludes archived rows from every default consumer", async () => {
    const query = archiveClient({
      jobs: [job(1), job(2)],
      archived: [{ job_id: 2, archived_at: "2026-08-18T01:00:00.000Z" }],
    });
    const { result } = renderHook(() => useJobs(query.client as never));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.jobs.map((row) => row.id)).toEqual([1]);
    expect(result.current.archivedJobs.map((row) => row.id)).toEqual([2]);
  });

  it("refuses queued and running rows in the mutation handler", async () => {
    const query = archiveClient({ jobs: [job(1, "queued"), job(2, "running")] });
    const { result } = renderHook(() => useJobs(query.client as never));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let mutationResult: Awaited<ReturnType<typeof result.current.archiveJobs>> | undefined;
    await act(async () => {
      mutationResult = await result.current.archiveJobs([1, 2]);
    });

    expect(mutationResult).toMatchObject({ ok: true, affected: 0, skipped: 2 });
    expect(query.upsert).not.toHaveBeenCalled();
    expect(result.current.jobs.map((row) => row.id)).toEqual([1, 2]);
  });

  it("unarchive restores a row to the default list", async () => {
    const query = archiveClient({
      jobs: [job(1)],
      archived: [{ job_id: 1, archived_at: "2026-08-18T01:00:00.000Z" }],
    });
    const { result } = renderHook(() => useJobs(query.client as never));
    await waitFor(() => expect(result.current.archivedJobs).toHaveLength(1));

    await act(async () => {
      await result.current.unarchiveJobs([1]);
    });

    expect(query.deleteIn).toHaveBeenCalledWith("job_id", [1]);
    expect(result.current.jobs.map((row) => row.id)).toEqual([1]);
    expect(result.current.archivedJobs).toHaveLength(0);
  });

  it("rolls an optimistic archive back when the write fails", async () => {
    const query = archiveClient({
      jobs: [job(1)],
      insertError: { message: "archive unavailable" },
    });
    const { result } = renderHook(() => useJobs(query.client as never));
    await waitFor(() => expect(result.current.jobs).toHaveLength(1));

    let mutationResult: Awaited<ReturnType<typeof result.current.archiveJobs>> | undefined;
    await act(async () => {
      mutationResult = await result.current.archiveJobs([1]);
    });

    expect(mutationResult).toMatchObject({ ok: false, affected: 0, error: "archive unavailable" });
    expect(result.current.jobs.map((row) => row.id)).toEqual([1]);
    expect(result.current.archivedJobs).toHaveLength(0);
  });

  it("does not resurrect an optimistically archived row when a poll resolves mid-mutation", async () => {
    let settleInsert: ((result: { error: null }) => void) | undefined;
    const pendingInsert = new Promise<{ error: null }>((resolve) => {
      settleInsert = resolve;
    });
    const query = archiveClient({ jobs: [job(1)] });
    query.upsert.mockReturnValueOnce(pendingInsert);
    const { result } = renderHook(() => useJobs(query.client as never));
    await waitFor(() => expect(result.current.jobs).toHaveLength(1));

    let mutation: ReturnType<typeof result.current.archiveJobs> | undefined;
    act(() => {
      mutation = result.current.archiveJobs([1]);
    });
    await waitFor(() => expect(result.current.archivedJobs.map((row) => row.id)).toEqual([1]));

    await act(async () => {
      await result.current.poll();
    });

    expect(result.current.jobs).toHaveLength(0);
    expect(result.current.archivedJobs.map((row) => row.id)).toEqual([1]);

    await act(async () => {
      settleInsert?.({ error: null });
      await mutation;
    });
    expect(query.upsert).toHaveBeenCalledWith(
      [{ job_id: 1 }],
      { onConflict: "job_id,owner", ignoreDuplicates: true },
    );
  });
});
