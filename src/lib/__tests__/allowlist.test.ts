import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "@/lib/allowlist";

describe("isAllowedEmail", () => {
  const operator = "operator@example.com";

  it.each([undefined, null, "", "  ", " , , "])(
    "allows only the operator floor for an empty list (%s)",
    (envValue) => {
      expect(isAllowedEmail("OPERATOR@example.com", envValue, operator)).toBe(
        true,
      );
      expect(isAllowedEmail("stranger@example.com", envValue, operator)).toBe(
        false,
      );
    },
  );

  it("allows the operator floor plus a configured list", () => {
    expect(
      isAllowedEmail("operator@example.com", "friend@example.com", operator),
    ).toBe(true);
    expect(
      isAllowedEmail("friend@example.com", "friend@example.com", operator),
    ).toBe(true);
  });

  it.each([undefined, null, "", "   "])(
    "falls back to the default operator floor (%s)",
    (operatorEmail) => {
      expect(
        isAllowedEmail(
          "CAMERONNICODEMUS@gmail.com",
          undefined,
          operatorEmail,
        ),
      ).toBe(true);
    },
  );

  it("matches case-insensitively and trims comma-separated entries", () => {
    expect(
      isAllowedEmail(
        "OWNER@Example.COM",
        "friend@example.com, OWNER@example.com ",
        operator,
      ),
    ).toBe(true);
  });

  it("rejects an email that is not listed", () => {
    expect(
      isAllowedEmail("stranger@example.com", "owner@example.com", operator),
    ).toBe(false);
  });

  it("does not normalize a padded user email into a match", () => {
    expect(
      isAllowedEmail(" owner@example.com ", " owner@example.com ", operator),
    ).toBe(false);
  });

  it.each([undefined, null, "", "   "])(
    "rejects an empty user email (%s)",
    (email) => {
      expect(isAllowedEmail(email, "owner@example.com", operator)).toBe(false);
    },
  );
});
