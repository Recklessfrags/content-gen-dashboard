import { describe, expect, it } from "vitest";
import {
  buildFactApprovalReenqueue,
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
  jobInputFromRow,
  publishSourceEpisodeId,
  resolveParkKind,
  type QueueJob,
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
  it("keeps the known pre-slice key for channel-less inputs", () => {
    expect(idempotencyKeyFor(jobInput())).toBe("d844ecdb");
    expect(idempotencyKeyFor(jobInput({ channel: null }))).toBe("d844ecdb");
    expect(idempotencyKeyFor(jobInput({ fact_approved: false }))).toBe("d844ecdb");
    expect(idempotencyKeyFor(jobInput({ channel: null, fact_approved: false }))).toBe(
      "d844ecdb",
    );
  });

  it("changes the key when a channel is set", () => {
    expect(idempotencyKeyFor(jobInput({ channel: "dark-history" }))).not.toBe(
      idempotencyKeyFor(jobInput()),
    );
  });

  it("changes the key when fact approval is true", () => {
    expect(idempotencyKeyFor(jobInput({ fact_approved: true }))).not.toBe(
      idempotencyKeyFor(jobInput()),
    );
  });

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
      fact_approved: false,
      publish_approved: false,
      publish_only: false,
      channel: null,
      script_directive: null,
      source_episode_id: null,
      idempotency_key: "fixed-key",
    });
  });

  it("carries a set channel in the insert payload", () => {
    expect(
      buildJobInsert(jobInput({ channel: "dark-history", idempotency_key: "fixed-key" })),
    ).toMatchObject({
      channel: "dark-history",
      idempotency_key: "fixed-key",
    });
  });

  it("passes publish-only resume fields through", () => {
    expect(
      buildJobInsert(
        jobInput({
          idempotency_key: "fixed-key",
          publish_only: true,
          source_episode_id: "episode-reviewed-001",
        }),
      ),
    ).toMatchObject({
      publish_only: true,
      source_episode_id: "episode-reviewed-001",
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
  const parkedJob: QueueJob = {
    anchor_citation: "USDA",
    anchor_url: "https://example.test/source",
    attempts: 1,
    character: "Mad Dog",
    channel: "dark-history",
    created_at: "2026-07-02T00:00:00.000Z",
    episode_cap: 2,
    episode_id: "episode-rendered-001",
    error: null,
    fact_approved: false,
    finished_at: null,
    food: "cottage cheese",
    id: 42,
    idempotency_key: "parked-key",
    inject_claims: [],
    lease_expires_at: null,
    live_adapters: null,
    park_kind: "spend",
    publish_approved: false,
    publish_only: false,
    routes: {},
    script_directive: "Frame this as a myth-busting investigation.",
    source_episode_id: null,
    spend: null,
    spend_approved: false,
    started_at: null,
    status: "ready_for_review",
    stub_upstream: true,
  };

  it("marks spend approval and preserves the caller-supplied idempotency_key", () => {
    expect(
      buildSpendApprovalReenqueue(
        jobInput({
          spend_approved: false,
          idempotency_key: "job_rerun_1_1700000000000",
        }),
      ),
    ).toMatchObject({
      spend_approved: true,
      publish_approved: false,
      idempotency_key: "job_rerun_1_1700000000000",
    });
  });

  it("marks fact approval, preserves the caller-supplied idempotency_key, and preserves original inputs", () => {
    expect(
      buildFactApprovalReenqueue(
        jobInput({
          channel: "dark-history",
          spend_approved: false,
          publish_approved: false,
          idempotency_key: "job_rerun_1_1700000000000",
        }),
      ),
    ).toEqual({
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
      fact_approved: true,
      publish_approved: false,
      publish_only: false,
      channel: "dark-history",
      script_directive: null,
      source_episode_id: null,
      idempotency_key: "job_rerun_1_1700000000000",
    });
  });

  it("marks publish-only resume fields and preserves the caller-supplied idempotency_key without forcing spend approval", () => {
    expect(
      buildPublishApprovalReenqueue(
        jobInput({
          spend_approved: false,
          idempotency_key: "job_rerun_1_1700000000000",
        }),
        "episode-reviewed-001",
      ),
    ).toMatchObject({
      spend_approved: false,
      publish_approved: true,
      publish_only: true,
      source_episode_id: "episode-reviewed-001",
      idempotency_key: "job_rerun_1_1700000000000",
    });
  });

  it("preserves original spend approval on publish-only resume", () => {
    expect(
      buildPublishApprovalReenqueue(jobInput({ spend_approved: true }), "episode-reviewed-001"),
    ).toMatchObject({
      spend_approved: true,
      publish_approved: true,
      publish_only: true,
      source_episode_id: "episode-reviewed-001",
    });
  });

  it("requires a source episode id for publish-only resume", () => {
    expect(() => buildPublishApprovalReenqueue(jobInput(), "")).toThrow(
      /requires the reviewed source episode id/,
    );
  });

  it("preserves channel from a parked row through approval re-enqueue payloads", () => {
    const input = jobInputFromRow(parkedJob, {
      idempotencyKey: "job_rerun_42_1700000000000",
    });

    expect(input.channel).toBe("dark-history");
    expect(buildSpendApprovalReenqueue(input)).toMatchObject({
      channel: "dark-history",
      fact_approved: false,
      spend_approved: true,
      idempotency_key: "job_rerun_42_1700000000000",
    });
    expect(buildFactApprovalReenqueue(input)).toMatchObject({
      channel: "dark-history",
      fact_approved: true,
      spend_approved: false,
      idempotency_key: "job_rerun_42_1700000000000",
    });
    expect(buildPublishApprovalReenqueue(input, "episode-rendered-001")).toMatchObject({
      channel: "dark-history",
      publish_approved: true,
      publish_only: true,
      source_episode_id: "episode-rendered-001",
      idempotency_key: "job_rerun_42_1700000000000",
    });
  });

  it("preserves script_directive from a parked row through every approval re-enqueue", () => {
    const input = jobInputFromRow(parkedJob, {
      idempotencyKey: "job_rerun_42_1700000000000",
    });

    expect(input.script_directive).toBe("Frame this as a myth-busting investigation.");
    expect(buildSpendApprovalReenqueue(input)).toMatchObject({
      script_directive: "Frame this as a myth-busting investigation.",
    });
    expect(buildFactApprovalReenqueue(input)).toMatchObject({
      script_directive: "Frame this as a myth-busting investigation.",
    });
    expect(buildPublishApprovalReenqueue(input, "episode-rendered-001")).toMatchObject({
      script_directive: "Frame this as a myth-busting investigation.",
    });
  });

  it("normalizes absent and null script_directive to null without changing fresh enqueues", () => {
    expect(buildJobInsert(jobInput())).toMatchObject({ script_directive: null });
    expect(buildJobInsert(jobInput({ script_directive: null }))).toMatchObject({
      script_directive: null,
    });
    expect(jobInputFromRow({ ...parkedJob, script_directive: null }).script_directive).toBeNull();
  });

  it("preserves distinct caller-supplied idempotency keys across calls", () => {
    const left = buildSpendApprovalReenqueue(
      jobInput({ idempotency_key: "job_rerun_1_1700000000000" }),
    );
    const right = buildSpendApprovalReenqueue(
      jobInput({ idempotency_key: "job_rerun_1_1700000000001" }),
    );

    expect(left.idempotency_key).toBe("job_rerun_1_1700000000000");
    expect(right.idempotency_key).toBe("job_rerun_1_1700000000001");
    expect(left.idempotency_key).not.toBe(right.idempotency_key);
  });
});

describe("publishSourceEpisodeId", () => {
  it("prefers source_episode_id when set", () => {
    expect(
      publishSourceEpisodeId({
        source_episode_id: "episode-reviewed-001",
        episode_id: "episode-new-001",
      }),
    ).toBe("episode-reviewed-001");
  });

  it("prefers source_episode_id over episode_id when both are set (publish_only is authoritative)", () => {
    expect(publishSourceEpisodeId({ source_episode_id: "src-001", episode_id: "own-999" })).toBe("src-001");
  });

  it("falls back to episode_id when source_episode_id is null or empty", () => {
    expect(
      publishSourceEpisodeId({
        source_episode_id: null,
        episode_id: "episode-first-park-001",
      }),
    ).toBe("episode-first-park-001");

    expect(
      publishSourceEpisodeId({
        source_episode_id: "",
        episode_id: "episode-first-park-002",
      }),
    ).toBe("episode-first-park-002");
  });

  it("returns null when both ids are null or empty", () => {
    expect(
      publishSourceEpisodeId({
        source_episode_id: null,
        episode_id: null,
      }),
    ).toBeNull();

    expect(
      publishSourceEpisodeId({
        source_episode_id: "",
        episode_id: "",
      }),
    ).toBeNull();
  });
});

describe("resolveParkKind", () => {
  it("uses approval park_kind column values before receipt-stage inference", () => {
    expect(resolveParkKind("fact", "assembly")).toBe("fact");
    expect(resolveParkKind("spend", "distribution")).toBe("spend");
    expect(resolveParkKind("publish", "assembly")).toBe("publish");
    expect(resolveParkKind("reveal", "assembly")).toBe("reveal");
  });

  it("falls back to receipt-stage inference when park_kind is null", () => {
    expect(resolveParkKind(null, "assembly")).toBe("spend");
    expect(resolveParkKind(null, "distribution")).toBe("publish");
    expect(resolveParkKind(null, null)).toBe("unknown");
  });

  it("returns unknown for recognized hard-park values without receipt-stage inference", () => {
    expect(resolveParkKind("blocked", "assembly")).toBe("unknown");
    expect(resolveParkKind("blocked", "distribution")).toBe("unknown");
    expect(resolveParkKind("exhausted", "assembly")).toBe("unknown");
    expect(resolveParkKind("exhausted", "distribution")).toBe("unknown");
    expect(resolveParkKind("blocked", null)).toBe("unknown");
    expect(resolveParkKind("exhausted", null)).toBe("unknown");
  });

  it("falls back to receipt-stage inference for unrecognized park_kind strings", () => {
    expect(resolveParkKind("legacy-spend-gate", "assembly")).toBe("spend");
    expect(resolveParkKind("legacy-publish-gate", "distribution")).toBe("publish");
  });
});

describe("detectParkKind", () => {
  it("detects reveal auditor parks", () => {
    expect(detectParkKind("reveal_auditor")).toBe("reveal");
    expect(detectParkKind("reveal-auditor.review")).toBe("reveal");
  });

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
