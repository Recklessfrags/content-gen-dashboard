import type { Json } from "@/lib/database.types";

export type FactClaimSource = {
  url: string | null;
  type: string | null;
  citation: string | null;
};

export type FactClaim = {
  id: string;
  claim: string;
  status: string;
  reason: string | null;
  safePhrasing: string | null;
  source: FactClaimSource;
  receipt: string | null;
  regulated: boolean;
};

type JsonRecord = { [key: string]: Json | undefined };

function isJsonRecord(json: Json | undefined): json is JsonRecord {
  return json !== null && typeof json === "object" && !Array.isArray(json);
}

function stringOrNull(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export function isSafeHttpUrl(url: string | null): boolean {
  if (url === null) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseRegulatedIds(evidence: Json): Set<string> {
  if (!isJsonRecord(evidence) || !Array.isArray(evidence.regulated_yellow)) {
    return new Set();
  }

  return new Set(
    evidence.regulated_yellow.filter((item): item is string => typeof item === "string"),
  );
}

export function parseFactClaims(result: Json, evidence: Json): FactClaim[] {
  if (!isJsonRecord(result) || !Array.isArray(result.claims)) {
    return [];
  }

  const regulatedIds = parseRegulatedIds(evidence);
  const claims = result.claims.flatMap((entry): FactClaim[] => {
    if (!isJsonRecord(entry) || typeof entry.id !== "string" || typeof entry.claim !== "string") {
      return [];
    }

    const source = isJsonRecord(entry.source) ? entry.source : {};

    return [
      {
        id: entry.id,
        claim: entry.claim,
        status: typeof entry.status === "string" ? entry.status : "",
        reason: stringOrNull(entry.reason),
        safePhrasing: stringOrNull(entry.safe_phrasing),
        source: {
          url: stringOrNull(source.url),
          type: stringOrNull(source.type),
          citation: stringOrNull(source.citation),
        },
        receipt: stringOrNull(entry.receipt),
        regulated: regulatedIds.has(entry.id),
      },
    ];
  });

  return claims.sort((a, b) => {
    if (a.regulated !== b.regulated) return a.regulated ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}
