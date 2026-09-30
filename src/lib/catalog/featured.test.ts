import { describe, expect, it } from "vitest";

import { makeProduct } from "./test-fixtures";
import { selectFeaturedProducts } from "./featured";

// Featured rail rules: verified (RECOMMENDED) suppliers first, then LISTED;
// categories interleave so the rail shows catalog breadth; deterministic.

describe("selectFeaturedProducts", () => {
  it("ranks RECOMMENDED suppliers ahead of LISTED regardless of review score", () => {
    const products = [
      makeProduct({ status: "LISTED", reviewScore: 5.0, categorySlug: "mailers" }),
      makeProduct({ status: "RECOMMENDED", reviewScore: 3.0, categorySlug: "glass-bottles" }),
    ];

    expect(selectFeaturedProducts(products, 10).map((p) => p.supplier.status)).toEqual([
      "RECOMMENDED",
      "LISTED",
    ]);
  });

  it("ranks unverified states (QUOTE_ONLY, PENDING, DISABLED) last", () => {
    const products = [
      makeProduct({ status: "DISABLED", categorySlug: "labels" }),
      makeProduct({ status: "PENDING", categorySlug: "mailers" }),
      makeProduct({ status: "QUOTE_ONLY", categorySlug: "corrugated" }),
      makeProduct({ status: "LISTED", categorySlug: "glass-bottles" }),
    ];

    expect(selectFeaturedProducts(products, 10).map((p) => p.supplier.status)).toEqual([
      "LISTED",
      "QUOTE_ONLY",
      "PENDING",
      "DISABLED",
    ]);
  });

  it("spreads across categories round-robin instead of running one category end to end", () => {
    const mailers = [1, 2, 3, 4].map((n) => makeProduct({ categorySlug: "mailers", moq: n }));
    const labels = [1, 2, 3, 4].map((n) => makeProduct({ categorySlug: "labels", moq: n }));

    const featured = selectFeaturedProducts([...mailers, ...labels], 4);

    expect(featured.map((p) => p.categorySlug)).toEqual(["mailers", "labels", "mailers", "labels"]);
  });

  it("orders interleaved picks by verified-first within each round", () => {
    const listed = makeProduct({ status: "LISTED", categorySlug: "mailers" });
    const recommended = makeProduct({ status: "RECOMMENDED", categorySlug: "labels" });

    expect(selectFeaturedProducts([listed, recommended], 2).map((p) => p.id)).toEqual([
      recommended.id,
      listed.id,
    ]);
  });

  it("breaks ties on review score, then review count — deterministically", () => {
    const low = makeProduct({ reviewScore: 4.1, categorySlug: "mailers" });
    const high = makeProduct({ reviewScore: 4.9, categorySlug: "mailers" });
    const manyReviews = makeProduct({ reviewScore: null, reviewCount: 300, categorySlug: "labels" });
    const fewReviews = makeProduct({ reviewScore: null, reviewCount: 5, categorySlug: "labels" });

    // Two categories interleave one pick per round; within each category the
    // ranked order holds.
    expect(selectFeaturedProducts([low, high, fewReviews, manyReviews], 4).map((p) => p.id)).toEqual([
      high.id,
      manyReviews.id,
      low.id,
      fewReviews.id,
    ]);
  });

  it("never mutates the input list", () => {
    const products = [makeProduct({ categorySlug: "mailers" }), makeProduct({ categorySlug: "labels" })];
    const snapshot = [...products];

    selectFeaturedProducts(products, 10);

    expect(products).toEqual(snapshot);
  });

  it("returns fewer than the cap when the catalog is smaller", () => {
    const products = [makeProduct({ categorySlug: "mailers" })];

    expect(selectFeaturedProducts(products, 10)).toHaveLength(1);
    expect(selectFeaturedProducts([], 10)).toEqual([]);
  });
});
