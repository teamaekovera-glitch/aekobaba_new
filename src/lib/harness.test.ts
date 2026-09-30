import { describe, expect, it } from "vitest";
import { z } from "zod";

// Proves the Vitest + Zod harness works end to end, and encodes the product's
// truth rule for prices: a missing price stays null ("Ask the supplier") —
// never a guess, never a blend.
const PriceSchema = z.object({
  basePrice: z.number().positive().nullable(),
});

describe("test harness", () => {
  it("runs vitest with zod validation", () => {
    expect(PriceSchema.parse({ basePrice: 0.58 })).toEqual({ basePrice: 0.58 });
  });

  it("treats a missing price as null, never a default", () => {
    expect(PriceSchema.parse({ basePrice: null })).toEqual({ basePrice: null });
  });

  it("rejects non-numeric prices", () => {
    expect(() => PriceSchema.parse({ basePrice: "0.58" })).toThrow();
  });
});
