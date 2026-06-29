import { describe, expect, it } from "vitest";
import {
  buildJobInsert,
  buildPublishApprovalReenqueue,
  buildSpendApprovalReenqueue,
  classifyJobStatus,
  detectParkKind,
  idempotencyKeyFor,
  isActionableStatus,
  isInFlightStatus,
  isTerminalStatus,
  isValidEpisodeCap,
  type JobEnqueueInput,
} from "@/lib/jobs";

function jobInput(overrides: Partial<JobEnqueueInput> = {}): JobEnqueueInput {
  return {
    food: "cottage cheese",
    character: "Mad Dog",
    anchor_citation: "USDA",
    anchor_url: "https://example.test/source",
    inject_claims: [
      { b: 2, a: 1 },
      ["z", "a"],
    ],
    episode_cap: 2,
    routes: { render: ["script", "assembly"], nested: { b: true, a: false } },
    live_adapters: { buffer: false, elevenlabs: true },
    stub_upstream: true,
    spend_approved: false,
    ...overrides,
  };
}

describe("idempotencyKeyFor", () => {
  it("is stable across object key order and normalized array order for unordered inputs", () => {
    const left = jobInput({
      inject_claims: [
        { z: ["b", "a"], a: 1 },
        { c: 3, b: 2 },
      ],
      live_adapters: { z: ["beta", "alpha"], a: { y: 2, x: 1 } },
    });
    const right = jobInput({
      inject_claims: [
        { b: 2, c: 3 },
        { a: 1, z: ["a", "b"] },
      ],
      live_adapters: { a: { x: 1, y: 2 }, z: ["alpha", "beta"] },
    });

    expect(idempotencyKeyFor(right)).toBe(idempotencyKeyFor(left));
  });

  it("excludes spend_approved from the hash", () => {
    expect(idempotencyKeyFor(jobInput({ spend_approved: true }))).toBe(
      idempotencyKeyFor(jobInput({ spend_approved: false })),
    );
  });

  it("uses deterministic byte ordering, not locale collation", () => {
    const input = jobInput({
      inject_claims: ["ä", "z"],
      live_adapters: null,
    });

    expect(idempotencyKeyFor(input)).toBe("e609067f");
    expect(idempotencyKeyFor(jobInput({ inject_claims: ["z", "ä"], live_adapters: null }))).toBe(
      "e609067f",
    );
  });
});

describe("buildJobInsert", () => {
  it("returns only input fields plus normalized defaults", () => {
    expect(buildJobInsert(jobInput({ idempotency_key: "fixed-key" }))).toEqual({
      food: "cottage cheese",
      character: "Mad Dog",
      anchor_citation: "USDA",
      anchor_url: "https://example.test/source",
      inject_claims: [
        { b: 2, a: 1 },
        ["z", "a"],
      ],
      episode_cap: 2,
      routes: { render: ["script", "assembly"], nested: { b: true, a: false } },
      live_adapters: { buffer: false, elevenlabs: true },
      stub_upstream: true,
      spend_approved: false,
      publish_approved: false,
      idempotency_key: "fixed-key",
    });
  });

  it("throws when episode_cap is outside (0, 50]", () => {
    for (const episode_cap of [0, -1, 50.1, 51, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(() => buildJobInsert(jobInput({ episode_cap }))).toThrow(/Invalid episode_cap/);
    }
  });
});

describe("approval re-enqueue builders", () => {
  it("marks spend approval and clears idempotency_key", () => {
    expect(buildSpendApprovalReenqueue(jobInput({ spend_approved: false }))).toMatchObject({
      spend_approved: true,
      publish_approved: false,
      idempotency_key: null,
    });
  });

  it("marks publish and spend approval and clears idempotency_key", () => {
    expect(buildPublishApprovalReenqueue(jobInput({ spend_approved: false }))).toMatchObject({
      spend_approved: true,
      publish_approved: true,
      idempotency_key: null,
    });
  });
});

describe("detectParkKind", () => {
  it("detects spend park stages", () => {
    expect(detectParkKind("assembly")).toBe("spend");
    expect(detectParkKind("pre_cost-guard_check")).toBe("spend");
    expect(detectParkKind("render-cost")).toBe("spend");
  });

  it("detects publish park stages", () => {
    expect(detectParkKind("distribution")).toBe("publish");
    expect(detectParkKind("publish")).toBe("publish");
    expect(detectParkKind("publishing.review")).toBe("publish");
    expect(detectParkKind("buffer")).toBe("publish");
    expect(detectParkKind("posting")).toBe("publish");
  });

  it("treats standalone post as publish without matching post-prefixed stages", () => {
    expect(detectParkKind("post")).toBe("publish");
    expect(detectParkKind("pre post done")).toBe("publish");
    expect(detectParkKind("post_approval")).toBe("unknown");
    expect(detectParkKind("post-approval")).toBe("unknown");
    expect(detectParkKind("post.approval")).toBe("unknown");
    expect(detectParkKind("postX")).toBe("unknown");
  });

  it("returns unknown for missing or unrecognized stages", () => {
    expect(detectParkKind(null)).toBe("unknown");
    expect(detectParkKind("   ")).toBe("unknown");
    expect(detectParkKind("research")).toBe("unknown");
  });
});

describe("job status helpers", () => {
  it("validates episode caps", () => {
    expect(isValidEpisodeCap(0)).toBe(false);
    expect(isValidEpisodeCap(1)).toBe(true);
    expect(isValidEpisodeCap(50)).toBe(true);
    expect(isValidEpisodeCap(51)).toBe(false);
  });

  it("classifies unknown statuses as queued", () => {
    expect(classifyJobStatus("DONE")).toBe("done");
    expect(classifyJobStatus(" mystery ")).toBe("queued");
    expect(classifyJobStatus(null)).toBe("queued");
  });

  it("groups actionable, terminal, and in-flight statuses", () => {
    expect(isActionableStatus("ready_for_review")).toBe(true);
    expect(isActionableStatus("stale")).toBe(true);
    expect(isActionableStatus("queued")).toBe(false);

    expect(isTerminalStatus("done")).toBe(true);
    expect(isTerminalStatus("no_op")).toBe(true);
    expect(isTerminalStatus("error")).toBe(true);
    expect(isTerminalStatus("running")).toBe(false);

    expect(isInFlightStatus("queued")).toBe(true);
    expect(isInFlightStatus("running")).toBe(true);
    expect(isInFlightStatus("done")).toBe(false);
  });
});
