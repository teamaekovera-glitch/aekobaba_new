import { describe, expect, it } from "vitest";

import { safeNextPath } from "./redirect";

// The `next` parameter comes from the query string — attacker-controlled.
// Anything that is not a same-origin relative path falls back to "/".

describe("safeNextPath", () => {
  it("keeps plain relative paths", () => {
    expect(safeNextPath("/supplier/inbox")).toBe("/supplier/inbox");
  });

  it("keeps relative paths with query strings", () => {
    expect(safeNextPath("/results?category=pouches")).toBe(
      "/results?category=pouches",
    );
  });

  it("keeps the root path", () => {
    expect(safeNextPath("/")).toBe("/");
  });

  it("falls back to / on empty and non-string input", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(42)).toBe("/");
  });

  it("rejects absolute URLs to other origins", () => {
    expect(safeNextPath("https://evil.test/phish")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.test")).toBe("/");
  });

  it("rejects scheme-looking payloads", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("rejects backslash bypasses", () => {
    expect(safeNextPath("/\\evil.test")).toBe("/");
  });

  it("rejects control-character tricks", () => {
    expect(safeNextPath("/\u0000evil")).toBe("/");
    expect(safeNextPath("/x\u0007y")).toBe("/");
  });
});
