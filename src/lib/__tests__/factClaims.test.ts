import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, parseFactClaims } from "@/lib/factClaims";

describe("parseFactClaims", () => {
  it("round-trips a full realistic claim object", () => {
    expect(
      parseFactClaims(
        {
          claims: [
            {
              id: "c7",
              claim: "Parmesan must be aged for at least 12 months.",
              status: "yellow",
              reason: "Aging claims need label-specific support.",
              safe_phrasing: "Many PDO Parmigiano Reggiano wheels are aged at least 12 months.",
              source: {
                url: "https://example.com/standard",
                type: "standard",
                citation: "PDO standard, section 4.3",
              },
              receipt: "fact_check:seq:18",
            },
          ],
        },
        { regulated_yellow: [] },
      ),
    ).toEqual([
      {
        id: "c7",
        claim: "Parmesan must be aged for at least 12 months.",
        status: "yellow",
        reason: "Aging claims need label-specific support.",
        safePhrasing: "Many PDO Parmigiano Reggiano wheels are aged at least 12 months.",
        source: {
          url: "https://example.com/standard",
          type: "standard",
          citation: "PDO standard, section 4.3",
        },
        receipt: "fact_check:seq:18",
        regulated: false,
      },
    ]);
  });

  it("sets regulated from evidence.regulated_yellow", () => {
    expect(
      parseFactClaims(
        {
          claims: [
            { id: "c1", claim: "Claim one" },
            { id: "c2", claim: "Claim two" },
          ],
        },
        { regulated_yellow: ["c2"] },
      ).map((claim) => [claim.id, claim.regulated]),
    ).toEqual([
      ["c2", true],
      ["c1", false],
    ]);
  });

  it("skips malformed entries", () => {
    expect(
      parseFactClaims(
        {
          claims: [
            null,
            "bad",
            { id: "missing-claim" },
            { claim: "Missing id" },
            { id: "c1", claim: "Valid claim", source: "bad" },
          ],
        },
        { regulated_yellow: ["c1"] },
      ),
    ).toEqual([
      {
        id: "c1",
        claim: "Valid claim",
        status: "",
        reason: null,
        safePhrasing: null,
        source: { url: null, type: null, citation: null },
        receipt: null,
        regulated: true,
      },
    ]);
  });

  it("returns empty for null and non-array result.claims", () => {
    expect(parseFactClaims(null, { regulated_yellow: ["c1"] })).toEqual([]);
    expect(parseFactClaims({ claims: null }, { regulated_yellow: ["c1"] })).toEqual([]);
    expect(parseFactClaims({ claims: "bad" }, { regulated_yellow: ["c1"] })).toEqual([]);
  });

  it("sorts regulated first, then by id ascending", () => {
    expect(
      parseFactClaims(
        {
          claims: [
            { id: "c3", claim: "Third" },
            { id: "c1", claim: "First" },
            { id: "c2", claim: "Second" },
          ],
        },
        { regulated_yellow: ["c2"] },
      ).map((claim) => claim.id),
    ).toEqual(["c2", "c1", "c3"]);
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isSafeHttpUrl("https://example.com/standard")).toBe(true);
    expect(isSafeHttpUrl("http://example.com/standard")).toBe(true);
  });

  it("rejects unsafe and invalid URLs", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("ftp://x")).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });
});
