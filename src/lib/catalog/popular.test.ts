import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { POPULAR_CATEGORY_SLUGS, popularCategories } from "./popular";

// User review: navigation shows packaging materials only — no use-case
// entries. The home "Popular packaging" row is a curated slug list resolved
// against real Category rows; this test is the sync mechanism with the seeded
// taxonomy, mirroring menu.test.ts.

const seed = JSON.parse(
  readFileSync(path.join(__dirname, "../../../data/aekobaba-seed.json"), "utf8"),
) as { categories: { slug: string }[] };

const seededSlugs = new Set(seed.categories.map((c) => c.slug));

describe("POPULAR_CATEGORY_SLUGS", () => {
  it("only references category slugs that exist in the seed dataset", () => {
    for (const slug of POPULAR_CATEGORY_SLUGS) {
      expect(seededSlugs, `popular tile references unseeded category "${slug}"`).toContain(slug);
    }
  });

  it("contains no use-case entries — packaging materials only", () => {
    for (const slug of POPULAR_CATEGORY_SLUGS) {
      expect(slug, `popular tile "${slug}" must be a material category`).not.toMatch(
        /coffee|sauce|skincare|supplement|tea|snack/i,
      );
    }
  });
});

describe("popularCategories", () => {
  it("picks exactly the curated slugs from real rows, ordered by product count", () => {
    const rows = [
      { slug: "labels", productCount: 5 },
      { slug: "corrugated", productCount: 9 },
      { slug: "mailers", productCount: 16 },
      { slug: "glass-bottles", productCount: 8 },
      { slug: "pouches-bags", productCount: 13 },
    ];

    expect(popularCategories(rows)).toEqual([
      { slug: "mailers", productCount: 16 },
      { slug: "pouches-bags", productCount: 13 },
      { slug: "corrugated", productCount: 9 },
      { slug: "glass-bottles", productCount: 8 },
      { slug: "labels", productCount: 5 },
    ]);
  });

  it("skips slugs missing from the live rows instead of rendering stale tiles", () => {
    const rows = [
      { slug: "mailers", productCount: 16 },
      { slug: "labels", productCount: 5 },
    ];

    expect(popularCategories(rows)).toEqual([
      { slug: "mailers", productCount: 16 },
      { slug: "labels", productCount: 5 },
    ]);
  });

  it("never surfaces use-case rows even if they are the most-stocked", () => {
    const rows = [{ slug: "coffee-use-case", productCount: 999 }, { slug: "mailers", productCount: 16 }];

    expect(popularCategories(rows)).toEqual([{ slug: "mailers", productCount: 16 }]);
  });
});
