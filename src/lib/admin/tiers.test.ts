import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseSupplierTier, TIER_VALUES } from "./tiers";

// Tier parsing. The union is re-declared in plain TS so API routes need not
// import Prisma; this test pins it against the schema so the two cannot drift
// (same contract-test pattern as lib/schema-contract.test.ts).

const schemaPath = path.resolve(__dirname, "../../../prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

function enumValues(name: string): string[] {
  const match = schema.match(new RegExp(`enum ${name} \\{\\n([^}]*)\\}`));
  if (!match) throw new Error(`enum ${name} not found in schema`);
  return match[1]
    .split("\n")
    .map((l) => l.split("//")[0].trim())
    .filter(Boolean);
}

describe("TIER_VALUES", () => {
  it("is every SupplierStatus except PENDING (pre-verification)", () => {
    const statuses = enumValues("SupplierStatus");
    expect(TIER_VALUES).toEqual(statuses.filter((s) => s !== "PENDING"));
  });
});

describe("parseSupplierTier", () => {
  it("accepts each tier value", () => {
    for (const tier of TIER_VALUES) {
      expect(parseSupplierTier(tier)).toBe(tier);
    }
  });

  it("rejects PENDING — a claim state, never an admin-assigned tier", () => {
    expect(parseSupplierTier("PENDING")).toBeNull();
  });

  it("rejects unknown and non-string values", () => {
    expect(parseSupplierTier("RECOMMENDED ")).toBeNull();
    expect(parseSupplierTier("recommended")).toBeNull();
    expect(parseSupplierTier(42)).toBeNull();
    expect(parseSupplierTier(null)).toBeNull();
    expect(parseSupplierTier(undefined)).toBeNull();
  });
});
