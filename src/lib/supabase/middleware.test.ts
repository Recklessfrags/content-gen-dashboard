import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUser, signOut } = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser, signOut },
  })),
}));

import { updateSession } from "./middleware";

describe("updateSession allowlist", () => {
  const originalAllowlist = process.env.DASHBOARD_ALLOWED_EMAILS;
  const originalOperator = process.env.DASHBOARD_OPERATOR_EMAIL;

  beforeEach(() => {
    getUser.mockReset();
    signOut.mockReset();
    signOut.mockResolvedValue({ error: null });
    process.env.DASHBOARD_OPERATOR_EMAIL = "operator@example.com";
  });

  afterEach(() => {
    if (originalAllowlist === undefined) {
      delete process.env.DASHBOARD_ALLOWED_EMAILS;
    } else {
      process.env.DASHBOARD_ALLOWED_EMAILS = originalAllowlist;
    }
    if (originalOperator === undefined) {
      delete process.env.DASHBOARD_OPERATOR_EMAIL;
    } else {
      process.env.DASHBOARD_OPERATOR_EMAIL = originalOperator;
    }
  });

  it("signs out and redirects a user who is not listed", async () => {
    process.env.DASHBOARD_ALLOWED_EMAILS = "owner@example.com";
    getUser.mockResolvedValue({
      data: {
        user: {
          email: "stranger@example.com",
          email_confirmed_at: "2026-08-06T00:00:00Z",
        },
      },
    });

    const response = await updateSession(
      new NextRequest("https://dashboard.example/control-room"),
    );

    expect(signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe(
      "https://dashboard.example/login?error=not_invited",
    );
  });

  it("signs out an unconfirmed listed user", async () => {
    process.env.DASHBOARD_ALLOWED_EMAILS = "owner@example.com";
    getUser.mockResolvedValue({
      data: {
        user: { email: "OWNER@example.com", email_confirmed_at: null },
      },
    });

    const response = await updateSession(
      new NextRequest("https://dashboard.example/control-room"),
    );

    expect(signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe(
      "https://dashboard.example/login?error=not_invited",
    );
  });

  it("lets a confirmed listed user pass", async () => {
    process.env.DASHBOARD_ALLOWED_EMAILS = "owner@example.com";
    getUser.mockResolvedValue({
      data: {
        user: {
          email: "OWNER@example.com",
          email_confirmed_at: "2026-08-06T00:00:00Z",
        },
      },
    });

    const response = await updateSession(
      new NextRequest("https://dashboard.example/control-room"),
    );

    expect(signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("denies a confirmed non-operator when the list is unset", async () => {
    delete process.env.DASHBOARD_ALLOWED_EMAILS;
    getUser.mockResolvedValue({
      data: {
        user: {
          email: "stranger@example.com",
          email_confirmed_at: "2026-08-06T00:00:00Z",
        },
      },
    });

    const response = await updateSession(
      new NextRequest("https://dashboard.example/control-room"),
    );

    expect(signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe(
      "https://dashboard.example/login?error=not_invited",
    );
  });

  it("always lets the confirmed operator floor pass", async () => {
    process.env.DASHBOARD_ALLOWED_EMAILS = "friend@example.com";
    getUser.mockResolvedValue({
      data: {
        user: {
          email: "OPERATOR@example.com",
          email_confirmed_at: "2026-08-06T00:00:00Z",
        },
      },
    });

    const response = await updateSession(
      new NextRequest("https://dashboard.example/control-room"),
    );

    expect(signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });
});
