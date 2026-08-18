import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./audit-ui.mjs", import.meta.url), "utf8");

describe("audit-ui container and empty-board guards", () => {
  it("launches Chromium with the container shared-memory safeguard", () => {
    expect(source).toContain('args: ["--no-sandbox", "--disable-dev-shm-usage"]');
  });

  it("only runs track geometry assertions when a track exists", () => {
    expect(source).toMatch(/if \(await firstTrack\.count\(\) > 0\) \{/);
  });
});
