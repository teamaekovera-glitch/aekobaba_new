import { describe, expect, it } from "vitest";

// MOQ display contract: below a PUBLISHED minimum warns — never blocks,
// never silently alters the quantity. No published MOQ → no warning, ever.

import { assessMoq } from "./moq";

describe("assessMoq", () => {
  it("warns when the quantity is below the published MOQ", () => {
    const result = assessMoq(100, 500, "piece");
    expect(result.belowMoq).toBe(true);
    expect(result.message).toBe("Below the supplier's published minimum of 500 piece. You can still send — the supplier decides.");
  });

  it("does not warn when the quantity meets the MOQ", () => {
    expect(assessMoq(500, 500, "piece").belowMoq).toBe(false);
    expect(assessMoq(500, 500, "piece").message).toBeNull();
  });

  it("does not warn above the MOQ", () => {
    expect(assessMoq(1000, 500, "piece").belowMoq).toBe(false);
  });

  it("never warns when the supplier publishes no MOQ", () => {
    const result = assessMoq(3, null, null);
    expect(result.belowMoq).toBe(false);
    expect(result.message).toBeNull();
  });

  it("handles a null MOQ unit in the warning text", () => {
    const result = assessMoq(5, 100, null);
    expect(result.belowMoq).toBe(true);
    expect(result.message).toContain("minimum of 100");
    expect(result.message).not.toContain("null");
    expect(result.message).not.toContain("undefined");
  });
});
