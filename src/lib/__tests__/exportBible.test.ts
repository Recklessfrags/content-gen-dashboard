import { describe, expect, it } from "vitest";
import { bibleToMarkdown } from "@/lib/exportBible";

describe("bibleToMarkdown", () => {
  it("serializes the character shape and key bible fields to Markdown", () => {
    expect(
      bibleToMarkdown({
        codename: "Mad Dog",
        concept: "A sharp host with a court-room cadence.",
        status: "active",
        bible: {
          voice: "Fast, dry, exact.",
          signature_line: "Objection sustained.",
          nested_field: { z: 2, a: 1, omitted: undefined },
          empty: "   ",
        },
      }),
    ).toBe(`# Mad Dog

Status: active

A sharp host with a court-room cadence.

## Empty

_Not set_

## Nested Field

\`\`\`json
{
  "a": 1,
  "z": 2
}
\`\`\`

## Signature Line

Objection sustained.

## Voice

Fast, dry, exact.
`);
  });

  it("uses fallback title and status when missing", () => {
    expect(bibleToMarkdown({ bible: {} })).toBe(`# Untitled Character

Status: Unknown
`);
  });
});
