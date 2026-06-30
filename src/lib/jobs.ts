import type { Json, Tables, TablesInsert } from "@/lib/database.types";

export type QueueJob = Tables<"jobs">;

export const JOB_STATUSES = [
  "queued",
  "running",
  "done",
  "no_op",
  "ready_for_review",
  "error",
  "stale",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Running",
  done: "Done",
  no_op: "No-op",
  ready_for_review: "Ready for review",
  error: "Error",
  stale: "Stale",
};

const JOB_STATUS_SET = new Set<string>(JOB_STATUSES);

export function isActionableStatus(status: JobStatus): boolean {
  return status === "ready_for_review" || status === "stale";
}

export function isTerminalStatus(status: JobStatus): boolean {
  return status === "done" || status === "no_op" || status === "error";
}

export function isInFlightStatus(status: JobStatus): boolean {
  return status === "queued" || status === "running";
}

/**
 * Classifies an arbitrary status string. Unknown values are intentionally mapped
 * to queued so new worker states render as in-flight-ish until the contract is
 * expanded.
 */
export function classifyJobStatus(status: string | null | undefined): JobStatus {
  const normalized = status?.trim().toLowerCase();

  if (normalized !== undefined && JOB_STATUS_SET.has(normalized)) {
    return normalized as JobStatus;
  }

  return "queued";
}

export const RECIPES = {
  provenRender: {
    stub_upstream: true,
    episode_cap: 2,
  },
  fullEpisode: {
    stub_upstream: false,
    episode_cap: 5,
  },
} as const;

export type RecipeKey = keyof typeof RECIPES;

export const EPISODE_CAP_MIN = 0;
export const EPISODE_CAP_MAX = 50;

export function isValidEpisodeCap(n: number): boolean {
  return Number.isFinite(n) && n > EPISODE_CAP_MIN && n <= EPISODE_CAP_MAX;
}

export type JobEnqueueInput = {
  food: string;
  character: string | null;
  anchor_citation: string | null;
  anchor_url: string | null;
  inject_claims: Json[];
  episode_cap: number;
  routes: Json;
  live_adapters: Json | null;
  stub_upstream: boolean;
  spend_approved: boolean;
  publish_approved?: boolean;
  publish_only?: boolean;
  source_episode_id?: string | null;
  idempotency_key?: string | null;
};

type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

type CanonicalOptions = {
  normalizeArrays: boolean;
};

const CANONICAL_ARRAY_SORT: CanonicalOptions = { normalizeArrays: true };
const CANONICAL_ARRAY_KEEP_ORDER: CanonicalOptions = { normalizeArrays: false };

function canonicalizeJson(
  value: Json | undefined,
  options: CanonicalOptions,
): CanonicalValue {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const normalized = value.map((item) => canonicalizeJson(item, options));

    if (!options.normalizeArrays) {
      return normalized;
    }

    // Byte/codepoint comparison, NOT localeCompare — collation is locale/ICU
    // dependent, which would make the idempotency hash differ across clients.
    return normalized.sort((left, right) => {
      const a = stableStringify(left);
      const b = stableStringify(right);
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }

  const normalizedObject: { [key: string]: CanonicalValue } = {};

  for (const key of Object.keys(value).sort()) {
    normalizedObject[key] = canonicalizeJson(value[key], options);
  }

  return normalizedObject;
}

function stableStringify(value: CanonicalValue): string {
  if (value === null) {
    return "null";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function idempotencyKeyFor(input: JobEnqueueInput): string {
  const canonicalInput = {
    anchor_citation: input.anchor_citation,
    anchor_url: input.anchor_url,
    character: input.character,
    episode_cap: input.episode_cap,
    food: input.food,
    inject_claims: canonicalizeJson(
      input.inject_claims,
      CANONICAL_ARRAY_SORT,
    ),
    live_adapters: canonicalizeJson(
      input.live_adapters,
      CANONICAL_ARRAY_SORT,
    ),
    routes: canonicalizeJson(input.routes, CANONICAL_ARRAY_KEEP_ORDER),
    stub_upstream: input.stub_upstream,
  };

  return fnv1a32Hex(stableStringify(canonicalInput));
}

export function buildJobInsert(
  input: JobEnqueueInput,
): TablesInsert<"jobs"> {
  if (!isValidEpisodeCap(input.episode_cap)) {
    throw new Error(
      `Invalid episode_cap: expected a number greater than ${EPISODE_CAP_MIN} and less than or equal to ${EPISODE_CAP_MAX}.`,
    );
  }

  return {
    food: input.food,
    character: input.character,
    anchor_citation: input.anchor_citation,
    anchor_url: input.anchor_url,
    inject_claims: input.inject_claims,
    episode_cap: input.episode_cap,
    routes: input.routes,
    live_adapters: input.live_adapters,
    stub_upstream: input.stub_upstream,
    spend_approved: input.spend_approved,
    publish_approved: input.publish_approved ?? false,
    publish_only: input.publish_only ?? false,
    source_episode_id: input.source_episode_id ?? null,
    idempotency_key:
      input.idempotency_key === undefined
        ? idempotencyKeyFor(input)
        : input.idempotency_key,
  };
}

/**
 * Assumed SPEND-park recovery mechanism pending pipeline confirmation:
 * re-enqueue the same logical job with spend approved and no idempotency key so
 * Supabase does not reject it as a duplicate insert.
 */
export function buildSpendApprovalReenqueue(
  originalInput: JobEnqueueInput,
): TablesInsert<"jobs"> {
  const input = {
    ...originalInput,
    spend_approved: true,
    idempotency_key: null,
  };

  return {
    ...buildJobInsert(input),
    idempotency_key: null,
  };
}

/**
 * The reviewed episode to resume distribution from, for a publish approval.
 * Precedence is source_episode_id FIRST, then episode_id:
 *  - A publish_only job posts the MP4 of source_episode_id (the worker skips
 *    gen/render), so source_episode_id is authoritative whenever it is set —
 *    this is the only correct source for a publish_only RETRY (whose own
 *    episode_id is null/irrelevant).
 *  - A first publish-park has source_episode_id = null, so it falls back to its
 *    own rendered episode_id.
 * Do NOT flip to episode_id-first: for a publish_only job the worker posts
 * source_episode_id, so preferring episode_id could resume from the wrong cut.
 */
export function publishSourceEpisodeId(
  job: Pick<QueueJob, "source_episode_id" | "episode_id">,
): string | null {
  return job.source_episode_id || job.episode_id || null;
}

/**
 * Resume-to-distribution publish approval: re-enqueue a publish-only job that
 * posts the exact reviewed MP4 from source_episode_id. This skips gen/render, so
 * it does not re-render or double-spend; posting is still gated by a wired Buffer
 * adapter.
 */
export function buildPublishApprovalReenqueue(
  originalInput: JobEnqueueInput,
  sourceEpisodeId: string,
): TablesInsert<"jobs"> {
  if (!sourceEpisodeId) {
    throw new Error("buildPublishApprovalReenqueue requires the reviewed source episode id.");
  }

  const input: JobEnqueueInput = {
    ...originalInput,
    publish_approved: true,
    publish_only: true,
    source_episode_id: sourceEpisodeId,
    idempotency_key: null,
  };

  return {
    ...buildJobInsert(input),
    idempotency_key: null,
  };
}

/**
 * Maps a parked receipt stage to the review flavor. Assembly/cost-guard/
 * render-cost stages are spend parks; distribution/publish/buffer/posting and a
 * standalone "post" (not post-/post_/post./postX) are publish parks. Unknown or
 * missing stages remain unknown.
 */
export function detectParkKind(
  lastReceiptStage: string | null | undefined,
): "spend" | "publish" | "unknown" {
  const normalized = lastReceiptStage?.trim().toLowerCase();

  if (normalized === undefined || normalized.length === 0) {
    return "unknown";
  }

  if (
    normalized.includes("assembly") ||
    normalized.includes("cost-guard") ||
    normalized.includes("render-cost")
  ) {
    return "spend";
  }

  if (
    /(?:^|[^a-z0-9])(distribution|publish|publishing|buffer|posting)(?:$|[^a-z0-9])/.test(
      normalized,
    ) ||
    /(?:^|[^a-z0-9])post(?:$|[^a-z0-9_.-])/.test(normalized)
  ) {
    return "publish";
  }

  return "unknown";
}
