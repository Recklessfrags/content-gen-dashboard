// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { RenderPlayer } from "@/components/aurora/RenderPlayer";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("RenderPlayer", () => {
  it("renders no DOM at all when the render does not exist", async () => {
    const head = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", head);

    const { container } = render(<RenderPlayer episodeId="missing-render" />);

    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(head).toHaveBeenCalledOnce());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("shows the watch button only after HEAD confirms the render exists", async () => {
    let finishHead: ((response: { ok: boolean }) => void) | undefined;
    const head = vi.fn().mockImplementation(
      () => new Promise<{ ok: boolean }>((resolve) => {
        finishHead = resolve;
      }),
    );
    vi.stubGlobal("fetch", head);

    const { container } = render(<RenderPlayer episodeId="available-render" />);

    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(head).toHaveBeenCalledWith(
      "https://example.supabase.co/storage/v1/object/public/render-assets/available-render/mastered.mp4",
      { method: "HEAD" },
    ));
    expect(screen.queryByRole("button", { name: /watch render/i })).toBeNull();

    finishHead?.({ ok: true });

    expect(await screen.findByRole("button", { name: /watch render/i })).toBeVisible();
  });

  it("shares one probe between repeated mounts of the same episode", async () => {
    const head = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", head);

    render(
      <>
        <RenderPlayer episodeId="shared-render" />
        <RenderPlayer episodeId="shared-render" />
      </>,
    );

    expect(await screen.findAllByRole("button", { name: /watch render/i })).toHaveLength(2);
    expect(head).toHaveBeenCalledOnce();
  });

  it("treats a failed probe as no render without surfacing an error", async () => {
    const head = vi.fn().mockRejectedValue(new Error("network unavailable"));
    vi.stubGlobal("fetch", head);

    const { container } = render(<RenderPlayer episodeId="failed-probe" />);

    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(head).toHaveBeenCalledOnce());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText(/no render|error|unavailable/i)).toBeNull();
  });
});
