import { afterEach, describe, expect, it } from "vitest";
import { renderVideoUrl } from "@/lib/renderAssets";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

afterEach(() => {
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
