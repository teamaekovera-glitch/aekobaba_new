import { describe, expect, it } from "vitest";

import {
  assessVerificationGates,
  gatesPassed,
  type SupplierGateFacts,
} from "./gates";

// Four-gate assessment (spec: real operating company / verifiable prices /
// sells to CPG in our categories / no unresolved trust problems). Pure
// fixtures — no database.

const passing: SupplierGateFacts = {
  legalIdentity: "Claimable Jars Ltd (Delaware C-Corp)",
  productCount: 12,
  categoryCount: 3,
  pricedProductCount: 9,
  reviewCount: 214,
  reviewScore: 4.5,
};

describe("assessVerificationGates", () => {
  it("passes all three assessable gates on a complete record", () => {
    const gates = assessVerificationGates(passing);

    expect(gates.map((g) => g.status)).toEqual(["pass", "pass", "pass", "manual"]);
    // Evidence is visible, not just a verdict.
    expect(gates[0].evidence).toContain("Claimable Jars Ltd");
    expect(gates[1].evidence).toContain("9 of 12");
    expect(gates[2].evidence).toContain("12 products across 3");
  });

  it("fails gate 1 when no legal identity is recorded", () => {
    const gates = assessVerificationGates({ ...passing, legalIdentity: null });
    expect(gates[0].status).toBe("fail");
    expect(gates[0].evidence).toBe("No registered legal identity recorded");
  });

  it("fails gate 1 on a whitespace-only legal identity", () => {
    const gates = assessVerificationGates({ ...passing, legalIdentity: "   " });
    expect(gates[0].status).toBe("fail");
  });

  it("fails gate 2 when every product is quote-only", () => {
    const gates = assessVerificationGates({ ...passing, pricedProductCount: 0 });
    expect(gates[1].status).toBe("fail");
    expect(gates[1].evidence).toContain("quote-only");
  });

  it("fails gate 3 when the catalog is empty", () => {
    const gates = assessVerificationGates({
      ...passing,
      productCount: 0,
      categoryCount: 0,
      pricedProductCount: 0,
    });
    expect(gates[2].status).toBe("fail");
  });

  it("keeps gate 4 manual even with strong reviews — no invented trust signal", () => {
    const gates = assessVerificationGates(passing);
    expect(gates[3].status).toBe("manual");
    expect(gates[3].evidence).toContain("214 sourced reviews");
  });

  it("keeps gate 4 manual when there is no review evidence either", () => {
    const gates = assessVerificationGates({
      ...passing,
      reviewCount: 0,
      reviewScore: null,
    });
    expect(gates[3].status).toBe("manual");
    expect(gates[3].evidence).toContain("No sourced review evidence");
  });

  it("returns gates in the spec's order", () => {
    const gates = assessVerificationGates(passing);
    expect(gates.map((g) => g.number)).toEqual([1, 2, 3, 4]);
  });
});

describe("gatesPassed", () => {
  it("counts only outright passes — manual gates do not pad the score", () => {
    expect(gatesPassed(assessVerificationGates(passing))).toBe(3);
  });
});
