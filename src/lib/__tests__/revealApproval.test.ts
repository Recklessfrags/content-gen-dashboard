import { describe, expect, it } from "vitest";
import {
  MOCK_REVEAL_FIXTURES,
  isBatchDecided,
  parseRevealAuditorResult,
  setRevealDecision,
  type Reveal,
  type RevealDecisionMap,
  type RevealFixture,
} from "@/lib/revealApproval";

const reveal = (id: string): Reveal => ({
  reveal_id: id,
  reveal_text: `Reveal ${id}`,
  grade: "green",
  reason: "Grounded",
  brand_specific: { flagged: false },
  component_claims: [],
});

describe("parseRevealAuditorResult", () => {
  it("parses every supported grade and grounded component claims", () => {
    const result = parseRevealAuditorResult({
      reveals: [
        {
          reveal_id: "green-1",
          reveal_text: "Green reveal",
          grade: "green",
          reason: "Grounded",
          brand_specific: { flagged: false },
          component_claims: [
            {
              id: "c1",
              claim: "Supported claim",
              status: "green",
              reason: "Supported",
              safe_phrasing: "Supported claim",
              source: {
                url: "https://example.com/source",
                type: "reference",
                citation: "Example source",
              },
              receipt: "fact-check-1",
            },
          ],
        },
        { reveal_id: "yellow-1", reveal_text: "Yellow reveal", grade: "yellow" },
        { reveal_id: "red-1", reveal_text: "Red reveal", grade: "red" },
      ],
    });

    expect(result.map((entry) => entry.grade)).toEqual(["green", "yellow", "red"]);
    expect(result[0]?.component_claims).toEqual([
      {
        id: "c1",
        claim: "Supported claim",
        status: "green",
        reason: "Supported",
        safePhrasing: "Supported claim",
        source: {
          url: "https://example.com/source",
          type: "reference",
          citation: "Example source",
        },
        receipt: "fact-check-1",
        regulated: false,
      },
    ]);
  });

  it("drops reveals missing a non-empty id or reveal text", () => {
    expect(
      parseRevealAuditorResult({
        reveals: [
          null,
          "bad",
          { reveal_text: "Missing id" },
          { reveal_id: "missing-text" },
          { reveal_id: "", reveal_text: "Empty id" },
          { reveal_id: "empty-text", reveal_text: "   " },
          { reveal_id: "valid", reveal_text: "Valid reveal" },
        ],
      }),
    ).toEqual([
      {
        reveal_id: "valid",
        reveal_text: "Valid reveal",
        grade: "red",
        reason: "",
        brand_specific: { flagged: false },
        component_claims: [],
      },
    ]);
  });

  it("defaults unknown grades to red and preserves brand cautions", () => {
    expect(
      parseRevealAuditorResult({
        reveals: [
          {
            reveal_id: "r1",
            reveal_text: "Risky reveal",
            grade: "GREEN",
            brand_specific: { flagged: true, detail: "Unsupported brand comparison" },
          },
        ],
      }),
    ).toEqual([
      {
        reveal_id: "r1",
        reveal_text: "Risky reveal",
        grade: "red",
        reason: "",
        brand_specific: { flagged: true, detail: "Unsupported brand comparison" },
        component_claims: [],
      },
    ]);
  });

  it("removes unsafe claim URLs and skips malformed component claims", () => {
    const [parsed] = parseRevealAuditorResult({
      reveals: [
        {
          reveal_id: "r1",
          reveal_text: "Reveal",
          component_claims: [
            { id: "unsafe", claim: "Unsafe URL", source: { url: "javascript:alert(1)" } },
            { id: "missing-claim" },
          ],
        },
      ],
    });

    expect(parsed?.component_claims).toHaveLength(1);
    expect(parsed?.component_claims[0]?.source.url).toBeNull();
  });

  it("is total for malformed result containers", () => {
    expect(parseRevealAuditorResult(null)).toEqual([]);
    expect(parseRevealAuditorResult("bad")).toEqual([]);
    expect(parseRevealAuditorResult({})).toEqual([]);
    expect(parseRevealAuditorResult({ reveals: null })).toEqual([]);
  });
});

describe("reveal decisions", () => {
  it("captures approve, edited text, and optional reject steering per reveal", () => {
    const empty: RevealDecisionMap = {};
    const approved = setRevealDecision(empty, "r1", { kind: "approve" });
    const edited = setRevealDecision(approved, "r2", {
      kind: "edit",
      edited_text: "Safer edited reveal",
    });
    const rejected = setRevealDecision(edited, "r3", { kind: "reject", steer: "" });

    expect(empty).toEqual({});
    expect(rejected).toEqual({
      r1: { kind: "approve" },
      r2: { kind: "edit", edited_text: "Safer edited reveal" },
      r3: { kind: "reject", steer: "" },
    });
  });

  it("requires every reveal in single and multi-reveal batches to be decided", () => {
    const single = [reveal("r1")];
    const multiple = [reveal("r1"), reveal("r2")];

    expect(isBatchDecided(single, {})).toBe(false);
    expect(isBatchDecided(single, { r1: { kind: "approve" } })).toBe(true);
    expect(isBatchDecided(multiple, { r1: { kind: "approve" } })).toBe(false);
    expect(
      isBatchDecided(multiple, {
        r1: { kind: "approve" },
        r2: { kind: "reject", steer: "Try a different synthesis" },
      }),
    ).toBe(true);
    expect(isBatchDecided([], {})).toBe(true);
  });
});

describe("MOCK_REVEAL_FIXTURES", () => {
  it("covers empty-state inputs, single and multi batches, all grades, and flagged red caution", () => {
    expect([]).toHaveLength(0);
    expect(MOCK_REVEAL_FIXTURES.some((fixture) => fixture.reveals.length === 1)).toBe(true);
    expect(MOCK_REVEAL_FIXTURES.some((fixture) => fixture.reveals.length > 1)).toBe(true);

    const fixtures: readonly RevealFixture[] = MOCK_REVEAL_FIXTURES;
    const reveals = fixtures.flatMap((fixture) => fixture.reveals);
    expect(new Set(reveals.map((entry) => entry.grade))).toEqual(
      new Set(["green", "yellow", "red"]),
    );
    expect(
      reveals.some(
        (entry) => entry.grade === "red" && entry.brand_specific.flagged === true,
      ),
    ).toBe(true);
    expect(MOCK_REVEAL_FIXTURES.every((fixture) => fixture.id.startsWith("mock-"))).toBe(true);
  });
});
