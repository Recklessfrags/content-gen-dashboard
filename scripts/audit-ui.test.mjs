import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertTrackGeometry } from "./audit-ui-geometry.mjs";

const source = readFileSync(new URL("./audit-ui.mjs", import.meta.url), "utf8");

describe("audit-ui container and empty-board guards", () => {
  it("launches Chromium with the container shared-memory safeguard", () => {
    expect(source).toContain('args: ["--no-sandbox", "--disable-dev-shm-usage"]');
  });

  it("reports a missing run track as skipped and unverified instead of passing", () => {
    expect(() => assertTrackGeometry([])).toThrow(/skipped - unverified/);
  });
});
