import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderVideoExists, renderVideoUrl } from "@/lib/renderAssets";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
});

describe("renderVideoUrl", () => {
  it("builds the public mastered-render URL and encodes the episode segment", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/";
    expect(renderVideoUrl(" episode/one ")).toBe(
      "https://example.supabase.co/storage/v1/object/public/render-assets/episode%2Fone/mastered.mp4",
    );
  });

  it("returns null for a blank episode id", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(renderVideoUrl("  ")).toBeNull();
  });

  it("returns null when the public Supabase URL is unavailable", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(renderVideoUrl("episode-one")).toBeNull();
  });
});

describe("renderVideoExists", () => {
  it("returns exists for an ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    await expect(renderVideoExists("probe-exists")).resolves.toBe("exists");
  });

  it("returns missing for a received non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(renderVideoExists("probe-missing")).resolves.toBe("missing");
  });

  it("returns unknown when the probe rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(renderVideoExists("probe-unknown")).resolves.toBe("unknown");
  });

  it("re-probes after the negative-cache TTL and discovers a new render", async () => {
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const head = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", head);

    await expect(renderVideoExists("negative-ttl")).resolves.toBe("missing");
    now += 29_999;
    await expect(renderVideoExists("negative-ttl")).resolves.toBe("missing");
    expect(head).toHaveBeenCalledOnce();

    now += 2;
    await expect(renderVideoExists("negative-ttl")).resolves.toBe("exists");
    expect(head).toHaveBeenCalledTimes(2);
  });

  it("caches an existing render indefinitely", async () => {
    const head = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", head);

    await expect(renderVideoExists("positive-cache")).resolves.toBe("exists");
    await expect(renderVideoExists("positive-cache")).resolves.toBe("exists");
    expect(head).toHaveBeenCalledOnce();
  });

  it("does not cache an unknown result", async () => {
    const head = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", head);

    await expect(renderVideoExists("unknown-cache")).resolves.toBe("unknown");
    await expect(renderVideoExists("unknown-cache")).resolves.toBe("exists");
    expect(head).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight probe between concurrent callers for an episode", async () => {
    let finishHead: ((response: { ok: boolean }) => void) | undefined;
    const head = vi.fn().mockImplementation(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          finishHead = resolve;
        }),
    );
    vi.stubGlobal("fetch", head);

    const first = renderVideoExists("in-flight-dedup");
    const second = renderVideoExists("in-flight-dedup");

    expect(second).toBe(first);
    await Promise.resolve();
    expect(head).toHaveBeenCalledOnce();
    finishHead?.({ ok: true });
    await expect(Promise.all([first, second])).resolves.toEqual(["exists", "exists"]);
  });
});
