import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isVisuallyCast,
  refImagePath,
  REF_IMAGE_MAX_BYTES,
  validateRefImage,
} from "@/lib/castingVisual";

function file(type: string, size: number): File {
  return { type, size } as File;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateRefImage", () => {
  it("accepts png, jpeg, and webp up to 5MB", () => {
    expect(validateRefImage(file("image/png", REF_IMAGE_MAX_BYTES))).toBeNull();
    expect(validateRefImage(file("image/jpeg", 123))).toBeNull();
    expect(validateRefImage(file("image/webp", 123))).toBeNull();
  });

  it("rejects unsupported types and files over 5MB", () => {
    expect(validateRefImage(file("image/gif", 123))).toBe("Use a JPEG, PNG, or WEBP reference image.");
    expect(validateRefImage(file("image/png", REF_IMAGE_MAX_BYTES + 1))).toBe(
      "Reference image must be 5MB or smaller.",
    );
  });
});

describe("refImagePath", () => {
  it("builds a bucket-relative owner/character path", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-1" });

    expect(refImagePath("owner-1", "character-1", file("image/webp", 1))).toBe(
      "owner-1/character-1/ref-uuid-1.webp",
    );
  });

  it("uses jpg for image/jpeg and never includes the bucket prefix", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-2" });

    const path = refImagePath("owner-2", "character-2", file("image/jpeg", 1));
    expect(path).toBe("owner-2/character-2/ref-uuid-2.jpg");
    expect(path.startsWith("character-refs/")).toBe(false);
  });
});

describe("isVisuallyCast", () => {
  it("treats non-empty reference paths as visually cast", () => {
    expect(isVisuallyCast({ reference_image_url: "owner/char/ref.png" })).toBe(true);
    expect(isVisuallyCast({ reference_image_url: "   " })).toBe(false);
    expect(isVisuallyCast({ reference_image_url: null })).toBe(false);
  });
});
