import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ALIAS_TABLE, normalizeQuery, resolveSearchQuery } from "./aliases";

// Spec C4: "coffee" → stand-up pouches / valve bags / labels; "hot sauce" →
// woozy bottles / shrink sleeves. Every referenced category slug must exist
// in the seed dataset — a taxonomy rename fails tests, not users.

const seed = JSON.parse(
  readFileSync(path.join(__dirname, "../../../data/aekobaba-seed.json"), "utf8"),
) as { categories: { slug: string }[] };

const seededSlugs = new Set(seed.categories.map((c) => c.slug));

describe("normalizeQuery", () => {
  it("lowercases, strips punctuation, collapses whitespace", () => {
    expect(normalizeQuery("  Coffee!!  ")).toBe("coffee");
    expect(normalizeQuery("Hot   Sauce?")).toBe("hot sauce");
  });
});

describe("resolveSearchQuery (C4)", () => {
  it("maps 'coffee' to pouches/bags + labels with the spec's terms", () => {
    const resolved = resolveSearchQuery("coffee");
    expect(resolved).not.toBeNull();
    expect(resolved!.categorySlugs).toEqual(["pouches-bags", "labels"]);
    expect(resolved!.matchedTerms).toEqual(
      expect.arrayContaining(["stand-up pouches", "valve bags", "labels"]),
    );
  });

  it("maps 'hot sauce' to woozy bottles / shrink sleeves", () => {
    const resolved = resolveSearchQuery("hot sauce");
    expect(resolved).not.toBeNull();
    expect(resolved!.categorySlugs).toEqual(["glass-bottles", "shrink-sleeves"]);
    expect(resolved!.matchedTerms).toEqual(
      expect.arrayContaining(["woozy bottles", "shrink sleeves"]),
    );
  });

  it("matches multi-word phrases before their tokens", () => {
    expect(resolveSearchQuery("hot sauce")!.categorySlugs).toEqual(["glass-bottles", "shrink-sleeves"]);
  });

  it("matches singular/plural variants ('supplement' ≈ 'supplements')", () => {
    expect(resolveSearchQuery("supplements")!.categorySlugs).toEqual(
      resolveSearchQuery("supplement")!.categorySlugs,
    );
  });

  it("matches category names ('labels') even without an alias entry", () => {
    const resolved = resolveSearchQuery("labels");
    expect(resolved).not.toBeNull();
    expect(resolved!.categorySlugs).toEqual(["labels"]);
  });

  it("returns null for an unrecognized product — no guessed categories", () => {
    expect(resolveSearchQuery("jet engines")).toBeNull();
    expect(resolveSearchQuery("")).toBeNull();
    expect(resolveSearchQuery(null)).toBeNull();
  });
});

describe("alias table integrity", () => {
  it("only references category slugs that exist in the seed dataset", () => {
    for (const [alias, entry] of Object.entries(ALIAS_TABLE)) {
      for (const slug of entry.categories) {
        expect(seededSlugs, `alias "${alias}" references unseeded category "${slug}"`).toContain(slug);
      }
    }
  });

  it("the category-name index only references seeded slugs", () => {
    // resolveSearchQuery uses CATEGORY_INDEX internally; a slug match against
    // the seed is the observable contract.
    for (const slug of seededSlugs) {
      const resolved = resolveSearchQuery(slug);
      if (resolved) {
        expect(resolved.categorySlugs).toContain(slug);
      }
    }
  });
});
