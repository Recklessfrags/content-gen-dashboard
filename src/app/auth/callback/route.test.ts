import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession },
  })),
}));

import { GET } from "./route";

describe("OAuth callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it.each([
    [null, "/"],
    ["/control-room?tab=runs", "/control-room?tab=runs"],
    ["//evil.com", "/"],
    ["https://evil.com", "/"],
    ["/\\evil.com", "/"],
  ])("sanitizes next=%s to %s", async (next, expected) => {
    const url = new URL("https://dashboard.example/auth/callback?code=oauth-code");
    if (next) url.searchParams.set("next", next);

    const response = await GET(new NextRequest(url));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(response.headers.get("location")).toBe(
      `https://dashboard.example${expected}`,
    );
  });

  it("redirects exchange failures to the friendly auth error", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("invalid code") });

    const response = await GET(
      new NextRequest("https://dashboard.example/auth/callback?code=bad"),
    );

    expect(response.headers.get("location")).toBe(
      "https://dashboard.example/login?error=auth",
    );
  });
});
