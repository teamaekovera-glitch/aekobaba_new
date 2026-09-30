import { describe, expect, it } from "vitest";

import {
  applyFilters,
  buildResultsUrl,
  computeFacets,
  FILTER_GROUP_ORDER,
  filtersToQueryString,
  hasAnyLeadTimeData,
  parseFilters,
  sortProducts,
} from "./filters";
import { baseFilters, makeProduct } from "./test-fixtures";

// Spec C5: left-rail filters in the plan's priority order, facet counts that
// update with the query, four sorts, URL-encoded shareable state.

describe("parseFilters", () => {
  it("parses URL params into typed filters", () => {
    const filters = parseFilters({ q: "coffee", maxMoq: "1000", priceType: "EXACT", sort: "price" });
    expect(filters.q).toBe("coffee");
    expect(filters.maxMoq).toBe(1000);
    expect(filters.priceType).toBe("EXACT");
    expect(filters.sort).toBe("price");
  });

  it("ignores junk values instead of guessing", () => {
    const filters = parseFilters({ maxMoq: "abc", priceType: "STOCK", stock: "MAYBE", sort: "newest" });
    expect(filters.maxMoq).toBeNull();
    expect(filters.priceType).toBeNull();
    expect(filters.stockOrCustom).toBeNull();
    expect(filters.sort).toBe("reviews");
  });
});

describe("URL state roundtrip", () => {
  it("omits defaults and nulls", () => {
    const qs = filtersToQueryString(baseFilters());
    expect(qs).toBe("");
  });

  it("roundtrips a fully filtered query", () => {
    const filters = parseFilters({
      q: "hot sauce",
      maxMoq: "500",
      priceType: "CALCULATOR",
      stock: "CUSTOM",
      material: "Glass",
      category: "glass-bottles",
      location: "US",
      maxLead: "14",
      cert: "FSC",
      sort: "moq",
    });
    const qs = filtersToQueryString(filters);
    expect(qs).toBe(
      "q=hot+sauce&maxMoq=500&priceType=CALCULATOR&stock=CUSTOM&material=Glass&category=glass-bottles&location=US&maxLead=14&cert=FSC&sort=moq",
    );
    expect(parseFilters(Object.fromEntries(new URLSearchParams(qs)))).toEqual(filters);
  });

  it("builds results URLs from filter patches", () => {
    const url = buildResultsUrl(baseFilters(), { maxMoq: 100 });
    expect(url).toBe("/results?maxMoq=100");
  });
});

describe("applyFilters", () => {
  it("filters by published maximum MOQ; unknown-MOQ products drop out", () => {
    const products = [
      makeProduct({ moq: 100 }),
      makeProduct({ moq: 500 }),
      makeProduct({ moq: null }),
    ];
    const filtered = applyFilters(products, { ...baseFilters(), maxMoq: 100 }, null);
    expect(filtered).toHaveLength(1);
  });

  it("filters by price type, stock/custom, material family, and location", () => {
    const products = [
      makeProduct({ priceType: "EXACT", stockOrCustom: "STOCK", material: "Glass", location: "US" }),
      makeProduct({ priceType: "QUOTE_ONLY", stockOrCustom: "CUSTOM", material: "Plastic (PET)", location: "IN" }),
    ];
    const filtered = applyFilters(products, { ...baseFilters(), priceType: "EXACT", material: "Plastic & Film" }, null);
    expect(filtered).toHaveLength(0);
  });

  it("intersects an explicit category with a search scope", () => {
    const products = [
      makeProduct({ categorySlug: "labels" }),
      makeProduct({ categorySlug: "pouches-bags" }),
    ];
    const resolved = { query: "coffee", categorySlugs: ["pouches-bags", "labels"], matchedTerms: [] };
    const narrowed = applyFilters(products, { ...baseFilters(), category: "labels" }, resolved);
    expect(narrowed).toHaveLength(1);
    expect(narrowed[0].categorySlug).toBe("labels");

    const outOfScope = applyFilters(products, { ...baseFilters(), category: "closures" }, resolved);
    expect(outOfScope).toHaveLength(0);
  });

  it("scopes to search-resolved categories with no explicit filter", () => {
    const products = [makeProduct({ categorySlug: "labels" }), makeProduct({ categorySlug: "closures" })];
    const resolved = { query: "coffee", categorySlugs: ["labels"], matchedTerms: [] };
    const filtered = applyFilters(products, baseFilters(), resolved);
    expect(filtered.map((p) => p.categorySlug)).toEqual(["labels"]);
  });

  it("filters by published maximum lead time", () => {
    const products = [makeProduct({ leadTimeDays: 7 }), makeProduct({ leadTimeDays: 30 }), makeProduct({ leadTimeDays: null })];
    const filtered = applyFilters(products, { ...baseFilters(), maxLeadDays: 14 }, null);
    expect(filtered).toHaveLength(1);
  });

  it("filters by supplier certification", () => {
    const products = [makeProduct({ cert: "FSC" }), makeProduct({ cert: "FDA" }), makeProduct({ cert: null })];
    const filtered = applyFilters(products, { ...baseFilters(), cert: "FSC" }, null);
    expect(filtered).toHaveLength(1);
  });
});

describe("computeFacets", () => {
  const products = [
    makeProduct({ moq: 100, priceType: "EXACT", stockOrCustom: "STOCK", location: "US", cert: "FSC" }),
    makeProduct({ moq: 2500, priceType: "QUOTE_ONLY", stockOrCustom: "CUSTOM", location: "IN", cert: "FDA" }),
    makeProduct({ moq: null, priceType: "EXACT", stockOrCustom: "STOCK", location: "US", cert: null }),
  ];

  it("counts each facet against every OTHER active filter", () => {
    const facets = computeFacets(products, { ...baseFilters(), priceType: "EXACT" }, null);
    // Price type facet is open, so its own counts include all three products.
    const exact = facets.priceType.find((o) => o.value === "EXACT");
    expect(exact!.count).toBe(2);
    // Min-order buckets are counted with the priceType filter still applied.
    expect(facets.minOrder.find((o) => o.value === "100")!.count).toBe(1);
    expect(facets.minOrder.find((o) => o.value === "1000")!.count).toBe(1); // unknown MOQ drops out
  });

  it("counts locations and certifications", () => {
    const facets = computeFacets(products, baseFilters(), null);
    expect(facets.location.find((o) => o.value === "US")!.count).toBe(2);
    expect(facets.certifications.find((o) => o.value === "FSC")!.count).toBe(1);
  });
});

describe("sortProducts (C5)", () => {
  const products = [
    makeProduct({ basePrice: 2.0, moq: 1000, leadTimeDays: 30, reviewScore: 4.8, reviewCount: 10 }),
    makeProduct({ basePrice: 1.0, moq: 100, leadTimeDays: 7, reviewScore: 4.9, reviewCount: 5 }),
    makeProduct({ basePrice: null, moq: null, leadTimeDays: null, reviewScore: null, reviewCount: 0 }),
  ];

  it("sorts by lowest effective price per item; null prices last", () => {
    const sorted = sortProducts(products, "price");
    expect(sorted.map((p) => p.basePrice)).toEqual([1.0, 2.0, null]);
  });

  it("sorts by smallest MOQ; unknowns last", () => {
    const sorted = sortProducts(products, "moq");
    expect(sorted.map((p) => p.moq)).toEqual([100, 1000, null]);
  });

  it("sorts by fastest lead time; unknowns last", () => {
    const sorted = sortProducts(products, "lead");
    expect(sorted.map((p) => p.leadTimeDays)).toEqual([7, 30, null]);
  });

  it("sorts by best review score with count as tiebreak", () => {
    const sorted = sortProducts(products, "reviews");
    expect(sorted[0].supplier.reviewScore).toBe(4.9);
    expect(sorted[2].supplier.reviewScore).toBeNull();
  });
});

describe("spec priority order", () => {
  it("pins the left-rail group order", () => {
    expect(FILTER_GROUP_ORDER).toEqual([
      "min-order",
      "price-type",
      "stock-custom",
      "material-category",
      "location",
      "lead-time",
      "certifications",
    ]);
  });
});

describe("hasAnyLeadTimeData", () => {
  it("detects whether any product publishes a lead time", () => {
    expect(hasAnyLeadTimeData([makeProduct({ leadTimeDays: null })])).toBe(false);
    expect(hasAnyLeadTimeData([makeProduct({ leadTimeDays: 7 })])).toBe(true);
  });
});
