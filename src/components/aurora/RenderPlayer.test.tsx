// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RenderPlayer } from "@/components/aurora/RenderPlayer";

const stateUpdateTracker = vi.hoisted(() => ({ enabled: false, count: 0 }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const trackedUseState = ((initialState?: unknown) => {
    const [value, setValue] = actual.useState(initialState);
    const trackedSetValue: typeof setValue = (nextValue) => {
      if (stateUpdateTracker.enabled) stateUpdateTracker.count += 1;
      setValue(nextValue);
    };
    return [value, trackedSetValue];
  }) as typeof actual.useState;

  return { ...actual, useState: trackedUseState };
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  stateUpdateTracker.enabled = false;
  stateUpdateTracker.count = 0;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("RenderPlayer", () => {
  it("occupies no space when the render is definitively missing", async () => {
    const head = vi.fn().mockResolvedValue({ ok: false, status: 404, type: "basic" });
    vi.stubGlobal("fetch", head);

    const { container } = render(<RenderPlayer episodeId="player-missing" />);

    await waitFor(() => expect(head).toHaveBeenCalledOnce());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("states that an approval render is missing after the probe finishes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, type: "basic" }));

    const { container } = render(<RenderPlayer episodeId="approval-missing" variant="approval" />);

    expect(container).toBeEmptyDOMElement();
    expect(await screen.findByText("No render is available for this episode.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /watch render/i })).not.toBeInTheDocument();
  });

  it("shows the watch button after the probe confirms the render exists", async () => {
    let finishHead: ((response: { ok: boolean }) => void) | undefined;
    const head = vi.fn().mockImplementation(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          finishHead = resolve;
        }),
    );
    vi.stubGlobal("fetch", head);

    const { container } = render(<RenderPlayer episodeId="player-exists" />);

    expect(container).toBeEmptyDOMElement();
    await waitFor(() =>
      expect(head).toHaveBeenCalledWith(
        "https://example.supabase.co/storage/v1/object/public/render-assets/player-exists/mastered.mp4",
        { method: "HEAD" },
      ),
    );
    finishHead?.({ ok: true });

    expect(await screen.findByRole("button", { name: /watch render/i })).toBeVisible();
  });

  it.each(["run", "approval"] as const)(
    "keeps an unknown render reachable in the %s variant and explains the uncertainty",
    async (variant) => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

      render(<RenderPlayer episodeId={`player-unknown-${variant}`} variant={variant} />);

      expect(
        await screen.findByText(
          "Render availability could not be confirmed. You can still try to watch it.",
        ),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: /watch render/i })).toBeVisible();
      expect(document.querySelector("video")).toBeNull();
    },
  );

  it("reports a genuine playback failure through the player's onError backstop", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    render(<RenderPlayer episodeId="player-playback-failure" />);

    fireEvent.click(await screen.findByRole("button", { name: /watch render/i }));
    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    fireEvent.error(video as HTMLVideoElement);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
  });

  it("makes a render visible after the negative-cache TTL lapses", async () => {
    let now = 2_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const head = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, type: "basic" })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", head);

    const first = render(<RenderPlayer episodeId="player-negative-ttl" />);
    await waitFor(() => expect(head).toHaveBeenCalledOnce());
    await waitFor(() => expect(first.container).toBeEmptyDOMElement());
    first.unmount();

    now += 30_001;
    render(<RenderPlayer episodeId="player-negative-ttl" />);

    expect(await screen.findByRole("button", { name: /watch render/i })).toBeVisible();
    expect(head).toHaveBeenCalledTimes(2);
  });

  it("shares one probe between simultaneous players for the same episode", async () => {
    const head = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", head);

    render(
      <>
        <RenderPlayer episodeId="player-shared-probe" />
        <RenderPlayer episodeId="player-shared-probe" />
      </>,
    );

    expect(await screen.findAllByRole("button", { name: /watch render/i })).toHaveLength(2);
    expect(head).toHaveBeenCalledOnce();
  });

  it("does not update component state after unmounting during a probe", async () => {
    let finishHead: ((response: { ok: boolean }) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise<{ ok: boolean }>((resolve) => {
            finishHead = resolve;
          }),
      ),
    );

    const player = render(<RenderPlayer episodeId="player-unmount" />);
    await waitFor(() => expect(finishHead).toBeTypeOf("function"));
    player.unmount();
    stateUpdateTracker.enabled = true;

    await act(async () => {
      finishHead?.({ ok: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(stateUpdateTracker.count).toBe(0);
  });

  it("ignores an older probe result after the episode changes", async () => {
    let finishOldProbe: ((response: { ok: boolean }) => void) | undefined;
    const head = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ ok: boolean }>((resolve) => {
            finishOldProbe = resolve;
          }),
      )
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", head);

    const player = render(<RenderPlayer episodeId="player-old-episode" />);
    await waitFor(() => expect(head).toHaveBeenCalledOnce());
    player.rerender(<RenderPlayer episodeId="player-new-episode" />);
    expect(await screen.findByRole("button", { name: /watch render/i })).toBeVisible();

    await act(async () => {
      finishOldProbe?.({ ok: false });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: /watch render/i })).toBeVisible();
  });
});
