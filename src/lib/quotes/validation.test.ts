import { describe, expect, it } from "vitest";

// Submission payload validation: quantities are positive integers, ids are
// non-empty strings, deadlines are ISO dates when present. This is the wall
// between the client form and the database — the route and the tests parse
// through the same schema.

import { quoteSubmitSchema } from "./validation";

describe("quoteSubmitSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = quoteSubmitSchema.safeParse({
      items: [{ productId: "p_1", quantity: 500 }],
      deadline: "2026-10-15",
      artworkNotes: "Matte finish",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toEqual([{ productId: "p_1", quantity: 500 }]);
      expect(parsed.data.deadline).toBe("2026-10-15");
      expect(parsed.data.artworkNotes).toBe("Matte finish");
    }
  });

  it("accepts the minimal shape — items only", () => {
    const parsed = quoteSubmitSchema.safeParse({ items: [{ productId: "p_1", quantity: 1 }] });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.deadline).toBeUndefined();
      expect(parsed.data.artworkNotes).toBeUndefined();
    }
  });

  it("rejects an empty basket and missing items", () => {
    expect(quoteSubmitSchema.safeParse({ items: [] }).success).toBe(false);
    expect(quoteSubmitSchema.safeParse({}).success).toBe(false);
  });

  it("rejects zero, negative, fractional, and non-numeric quantities", () => {
    for (const quantity of [0, -5, 1.5, "100", null]) {
      const parsed = quoteSubmitSchema.safeParse({ items: [{ productId: "p_1", quantity }] });
      expect(parsed.success).toBe(false);
    }
  });

  it("rejects quantities beyond the 10,000,000 ceiling", () => {
    expect(
      quoteSubmitSchema.safeParse({ items: [{ productId: "p_1", quantity: 10_000_001 }] }).success,
    ).toBe(false);
  });

  it("rejects empty product ids and non-string ids", () => {
    expect(quoteSubmitSchema.safeParse({ items: [{ productId: "", quantity: 1 }] }).success).toBe(false);
    expect(quoteSubmitSchema.safeParse({ items: [{ productId: 42, quantity: 1 }] }).success).toBe(false);
  });

  it("rejects a bad deadline format", () => {
    expect(
      quoteSubmitSchema.safeParse({ items: [{ productId: "p_1", quantity: 1 }], deadline: "next tuesday" })
        .success,
    ).toBe(false);
  });

  it("caps the basket at 50 items", () => {
    const items = Array.from({ length: 51 }, (_, index) => ({ productId: `p_${index}`, quantity: 1 }));
    expect(quoteSubmitSchema.safeParse({ items }).success).toBe(false);
  });
});
