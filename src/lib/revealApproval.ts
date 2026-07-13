import type { Json } from "@/lib/database.types";
import {
  isSafeHttpUrl,
  parseFactClaims,
  type FactClaim,
} from "@/lib/factClaims";

export type RevealGrade = "green" | "yellow" | "red";

export type Reveal = {
  reveal_id: string;
  reveal_text: string;
  grade: RevealGrade;
  reason: string;
  brand_specific: { flagged: boolean; detail?: string };
  component_claims: FactClaim[];
};

export type RevealDecision =
  | { kind: "approve" }
  | { kind: "edit"; edited_text: string }
  | { kind: "reject"; steer: string };

export type RevealDecisionMap = Record<string, RevealDecision>;

export type RevealFixture = {
  id: string;
  title: string;
  channel: string;
  reveals: Reveal[];
};

type UnknownRecord = Record<string, unknown>;

export function parseRevealAuditorResult(result: unknown): Reveal[] {
  if (!isRecord(result) || !Array.isArray(result.reveals)) return [];

  return result.reveals.flatMap((entry): Reveal[] => {
    if (!isRecord(entry)) return [];

    const revealId = requiredString(entry.reveal_id);
    const revealText = requiredString(entry.reveal_text);
    if (!revealId || !revealText) return [];

    const brandSpecific = isRecord(entry.brand_specific) ? entry.brand_specific : {};
    const detail = optionalString(brandSpecific.detail);
    const componentClaims = parseFactClaims(
      {
        claims: Array.isArray(entry.component_claims)
          ? (entry.component_claims as Json[])
          : [],
      },
      { regulated_yellow: [] },
    ).map((claim) => ({
      ...claim,
      source: {
        ...claim.source,
        url: isSafeHttpUrl(claim.source.url) ? claim.source.url : null,
      },
    }));

    return [
      {
        reveal_id: revealId,
        reveal_text: revealText,
        grade: parseRevealGrade(entry.grade),
        reason: optionalString(entry.reason) ?? "",
        brand_specific: {
          flagged: brandSpecific.flagged === true,
          ...(detail ? { detail } : {}),
        },
        component_claims: componentClaims,
      },
    ];
  });
}

export function setRevealDecision(
  decisions: RevealDecisionMap,
  revealId: string,
  decision: RevealDecision,
): RevealDecisionMap {
  return { ...decisions, [revealId]: decision };
}

export function isBatchDecided(
  reveals: readonly Reveal[],
  decisions: RevealDecisionMap,
): boolean {
  return reveals.every((reveal) => decisions[reveal.reveal_id] !== undefined);
}

export const MOCK_REVEAL_FIXTURES = [
  {
    id: "mock-parked-episode-1",
    title: "MOCK episode — why vanilla tastes richer in custard",
    channel: "Synthetic Food Lab",
    reveals: [
      {
        reveal_id: "mock-reveal-vanilla-1",
        reveal_text:
          "The richer flavor is not extra vanilla — egg yolk fat holds onto vanilla aromatics longer.",
        grade: "green",
        reason: "The synthesis stays within the supplied food-science grounding.",
        brand_specific: { flagged: false },
        component_claims: [
          {
            id: "mock-claim-vanilla-1",
            claim: "Fat can retain and release aroma compounds during eating.",
            status: "green",
            reason: "Supported by the cited flavor-science overview.",
            safePhrasing: "Fat can help carry aroma compounds.",
            source: {
              url: "https://example.com/mock-flavor-science",
              type: "reference",
              citation: "MOCK flavor-science reference, aroma retention section",
            },
            receipt: "mock-fact-check-vanilla",
            regulated: false,
          },
        ],
      },
      {
        reveal_id: "mock-reveal-vanilla-2",
        reveal_text:
          "That slow-blooming vanilla note is a texture effect as much as a flavoring choice.",
        grade: "yellow",
        reason: "Plausible synthesis, but the causal wording should stay qualified.",
        brand_specific: { flagged: false },
        component_claims: [
          {
            id: "mock-claim-vanilla-2",
            claim: "Texture and fat content can change perceived flavor release.",
            status: "green",
            reason: "The source supports an association, not a universal outcome.",
            safePhrasing: "Texture and fat content can affect perceived flavor release.",
            source: {
              url: "https://example.com/mock-sensory-study",
              type: "study",
              citation: "MOCK sensory study, discussion section",
            },
            receipt: "mock-fact-check-texture",
            regulated: false,
          },
        ],
      },
    ],
  },
  {
    id: "mock-parked-episode-2",
    title: "MOCK episode — bottled tea color shift",
    channel: "Synthetic Drink Desk",
    reveals: [
      {
        reveal_id: "mock-reveal-tea-1",
        reveal_text:
          "The amber color proves this bottle uses the same slow-brew method as a named premium tea brand.",
        grade: "red",
        reason: "Color alone does not establish a production method or competitor equivalence.",
        brand_specific: {
          flagged: true,
          detail: "Names a competitor and implies an unsupported process match.",
        },
        component_claims: [
          {
            id: "mock-claim-tea-1",
            claim: "Tea color can vary with oxidation, concentration, ingredients, and storage.",
            status: "green",
            reason: "Multiple factors can produce similar color outcomes.",
            safePhrasing: "Amber color can result from several processing and storage factors.",
            source: {
              url: "https://example.com/mock-tea-reference",
              type: "reference",
              citation: "MOCK tea reference, color factors section",
            },
            receipt: "mock-fact-check-tea",
            regulated: false,
          },
        ],
      },
    ],
  },
  {
    id: "mock-parked-episode-3",
    title: "MOCK episode — crisp crust steam escape",
    channel: "Synthetic Baking Bench",
    reveals: [
      {
        reveal_id: "mock-reveal-crust-1",
        reveal_text:
          "The rack is part of the recipe: it lets steam escape instead of softening the crust from below.",
        grade: "green",
        reason: "The reveal directly synthesizes the grounded cooling behavior.",
        brand_specific: { flagged: false },
        component_claims: [
          {
            id: "mock-claim-crust-1",
            claim: "Airflow under baked food helps moisture escape during cooling.",
            status: "green",
            reason: "The cited baking reference supports the cooling-rack guidance.",
            safePhrasing: "A cooling rack helps moisture escape from the underside.",
            source: {
              url: "https://example.com/mock-baking-reference",
              type: "reference",
              citation: "MOCK baking reference, cooling section",
            },
            receipt: "mock-fact-check-crust",
            regulated: false,
          },
        ],
      },
    ],
  },
] as const satisfies readonly RevealFixture[];

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseRevealGrade(value: unknown): RevealGrade {
  return value === "green" || value === "yellow" || value === "red" ? value : "red";
}
