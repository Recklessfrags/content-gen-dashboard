// Static/unit guards for the audit harness configuration and assertion helper.
// These tests do not launch a browser or claim to measure rendered geometry.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertTrackGeometry } from "./audit-ui-geometry.mjs";

const source = readFileSync(new URL("./audit-ui.mjs", import.meta.url), "utf8");

describe("audit-ui static and helper guards (no browser launch)", () => {
  it("keeps the container shared-memory launch safeguard configured", () => {
    expect(source).toContain('args: ["--no-sandbox", "--disable-dev-shm-usage"]');
  });

  it("makes the assertion helper reject an empty geometry sample", () => {
    expect(() => assertTrackGeometry([])).toThrow(/skipped - unverified/);
  });
});
