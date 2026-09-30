import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSeedFile, seedFileSchema, type SeedFile } from "./seed-schema";

// The seed file is the data contract's enforcement point (build spec
// art_MObD9666, C1–C3): a record without provenance must be rejected before
// it can ever reach the database, and the shipped dataset must clear the
// spec's coverage floors. These tests pin both.

const realSeed = (): unknown =>
  JSON.parse(readFileSync(path.resolve(__dirname, "aekobaba-seed.json"), "utf8"));

const category = (
  overrides: Partial<SeedFile["categories"][number]> = {},
): SeedFile["categories"][number] => ({
  slug: "bottles-jars",
  name: "Bottles & Jars",
  description: null,
  parentSlug: null,
  ...overrides,
});

const supplier = (
  overrides: Partial<SeedFile["suppliers"][number]> = {},
): SeedFile["suppliers"][number] => ({
  slug: "container-and-packaging",
  name: "Container & Packaging",
  website: "https://www.containerandpackaging.com",
  location: "US",
  legalIdentity: null,
  status: "LISTED",
  isPartner: false,
  sourceUrl: "https://www.containerandpackaging.com/about",
  sourceCapturedAt: "2026-09-18",
  review: null,
  certifications: [],
  products: [],
  ...overrides,
});

const product = (
  overrides: Partial<SeedFile["suppliers"][number]["products"][number]> = {},
): SeedFile["suppliers"][number]["products"][number] => ({
  title: "12 oz Amber Glass Boston Round Bottle",
  material: "Glass",
  categorySlug: "bottles-jars",
  priceType: "EXACT",
  basePrice: 0.58,
  priceBasis: "per piece (USD)",
  priceUnit: 0.58,
  moq: 1,
  moqUnit: "piece",
  leadTimeDays: 5,
  stockOrCustom: "STOCK",
  samplePolicyVerified: true,
  sourceUrl: "https://www.containerandpackaging.com/item/12oz-amber-boston-round",
  sourceCapturedAt: "2026-09-18",
  quantityBreaks: [],
  ...overrides,
});

const file = (overrides: Partial<SeedFile> = {}): SeedFile => ({
  meta: { name: "test-dataset", transcribedAt: "2026-09-30", sources: ["art_k3aUFNnH"] },
  categories: [category()],
  suppliers: [supplier()],
  ...overrides,
});

const parseErrorOf = (value: unknown): string[] => {
  const result = seedFileSchema.safeParse(value);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("expected validation to fail");
  return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
};

describe("provenance enforcement (C1)", () => {
  it("rejects a supplier without a sourceUrl", () => {
    const bad = file();
    delete (bad.suppliers[0] as Record<string, unknown>).sourceUrl;
    expect(parseErrorOf(bad)).toEqual(expect.arrayContaining([expect.stringMatching(/sourceUrl/)]));
  });

  it("rejects a supplier whose sourceUrl is not a URL", () => {
    const bad = file({ suppliers: [supplier({ sourceUrl: "container and packaging dot com" })] });
    expect(parseErrorOf(bad).join("\n")).toMatch(/sourceUrl/i);
  });

  it("rejects a supplier whose sourceCapturedAt is not a date", () => {
    const bad = file({ suppliers: [supplier({ sourceCapturedAt: "September 18, 2026" })] });
    expect(parseErrorOf(bad).join("\n")).toMatch(/sourceCapturedAt/i);
  });

  it("rejects a product without a sourceUrl", () => {
    const bad = file({
      suppliers: [supplier({ products: [product({ sourceUrl: undefined as never })] })],
    });
    expect(parseErrorOf(bad).join("\n")).toMatch(/sourceUrl/i);
  });

  it("rejects a product whose sourceCapturedAt is not a date", () => {
    const bad = file({
      suppliers: [supplier({ products: [product({ sourceCapturedAt: "2026-09-18T00:00:00Z" })] })],
    });
    expect(parseErrorOf(bad).join("\n")).toMatch(/sourceCapturedAt/i);
  });

  it("rejects a review without provenance", () => {
    const bad = file({
      suppliers: [
        supplier({
          review: {
            score: 4.5,
            count: 214,
            platform: "Trustpilot",
            sourceUrl: "not-a-url",
            sourceCapturedAt: "2026-09-18",
          },
        }),
      ],
    });
    expect(parseErrorOf(bad).join("\n")).toMatch(/sourceUrl/i);
  });

  it("rejects a certification without provenance", () => {
    const bad = file({
      suppliers: [
        supplier({
          certifications: [
            { name: "FDA registered", sourceCapturedAt: "2026-09-18", sourceUrl: "" },
          ],
        }),
      ],
    });
    expect(parseErrorOf(bad).join("\n")).toMatch(/sourceUrl/i);
  });

  it("rejects unknown keys — the seed cannot smuggle unrendered fields", () => {
    const bad = file({
      suppliers: [supplier({ estimatedPrice: 0.5 } as Partial<SeedFile["suppliers"][number]>)],
    });
    expect(parseErrorOf(bad).length).toBeGreaterThan(0);
  });
});

describe("price honesty (C2)", () => {
  it("rejects an EXACT product without a basePrice", () => {
    const bad = file({
      suppliers: [supplier({ products: [product({ priceType: "EXACT", basePrice: null })] })],
    });
    expect(parseErrorOf(bad).join("\n")).toMatch(/EXACT product must carry a basePrice/);
  });

  it("rejects a QUOTE_ONLY product that carries a basePrice", () => {
    const bad = file({
      suppliers: [supplier({ products: [product({ priceType: "QUOTE_ONLY", basePrice: 0.58 })] })],
    });
    expect(parseErrorOf(bad).join("\n")).toMatch(/QUOTE_ONLY product must not carry a basePrice/);
  });
});

describe("quantity breaks", () => {
  it("rejects tiers that are not strictly ascending by minQty", () => {
    const bad = file({
      suppliers: [
        supplier({
          products: [
            product({
              quantityBreaks: [
                { minQty: 500, maxQty: 999, unitPrice: 0.47 },
                { minQty: 100, maxQty: 499, unitPrice: 0.58 },
              ],
            }),
          ],
        }),
      ],
    });
    expect(parseErrorOf(bad).join("\n")).toMatch(/strictly ascending/);
  });

  it("rejects a tier whose maxQty is below its minQty", () => {
    const bad = file({
      suppliers: [
        supplier({
          products: [
            product({
              quantityBreaks: [{ minQty: 500, maxQty: 100, unitPrice: 0.47 }],
            }),
          ],
        }),
      ],
    });
    expect(parseErrorOf(bad).join("\n")).toMatch(/maxQty 100 is below minQty 500/);
  });
});

describe("shipped dataset (C3)", () => {
  const seed = parseSeedFile(realSeed());

  it("is the real, validated seed file", () => {
    expect(seed.suppliers.length).toBeGreaterThan(0);
  });

  it("covers at least 20 suppliers", () => {
    expect(seed.suppliers.length).toBeGreaterThanOrEqual(20);
  });

  it("covers at least 60 products", () => {
    const products = seed.suppliers.flatMap((s) => s.products);
    expect(products.length).toBeGreaterThanOrEqual(60);
  });

  it("spans at least 10 categories with products", () => {
    const withProducts = new Set(
      seed.suppliers.flatMap((s) => s.products.map((p) => p.categorySlug)),
    );
    expect(withProducts.size).toBeGreaterThanOrEqual(10);
  });

  it("carries subcategory depth in the priority categories (coffee, hot sauce, skincare)", () => {
    const priorityGroups: Array<[string, string[]]> = [
      ["coffee", ["pouches-bags"]],
      ["hot sauce", ["glass-bottles", "labels"]],
      ["skincare", ["droppers-vials", "glass-jars", "labels"]],
    ];
    const products = seed.suppliers.flatMap((s) => s.products);
    for (const [group, slugs] of priorityGroups) {
      const subcategories = new Set(
        products
          .filter((p) => slugs.includes(p.categorySlug) && p.subcategory)
          .map((p) => p.subcategory),
      );
      expect(subcategories.size, `${group} subcategory depth`).toBeGreaterThanOrEqual(2);
    }
  });

  it("resolves every product's categorySlug to a seeded category (importer precondition)", () => {
    const known = new Set(seed.categories.map((c) => c.slug));
    const unresolved = seed.suppliers
      .flatMap((s) => s.products.map((p) => p.categorySlug))
      .filter((slug) => !known.has(slug));
    expect(unresolved).toEqual([]);
  });

  it("traces every supplier and product to the research corpus via a dated source URL", () => {
    for (const s of seed.suppliers) {
      expect(s.sourceUrl).toMatch(/^https?:\/\//);
      expect(s.sourceCapturedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const p of s.products) {
        expect(p.sourceUrl).toMatch(/^https?:\/\//);
        expect(p.sourceCapturedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect([p.sourceUrl, s.sourceUrl]).toContain(p.sourceUrl); // explicit, not inferred
      }
    }
  });
});
