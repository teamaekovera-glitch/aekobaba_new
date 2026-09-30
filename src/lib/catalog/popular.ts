// Popular packaging tiles for Home — material categories only.
//
// The user's review asked for material-only navigation: no use-case entries
// ("Coffee", "Hot Sauce"…) anywhere, only packaging-supplier materials. The
// slugs are curated (the catalog's most-stocked materials) and resolved
// against live Category rows so tile names and product counts are never
// hardcoded copy. Mirrors menu.ts: the test suite locks the slugs against
// data/aekobaba-seed.json, so a taxonomy rename fails tests, not users.

/** Seed category slugs shown as "Popular packaging" tiles on Home. */
export const POPULAR_CATEGORY_SLUGS = [
  "mailers",
  "pouches-bags",
  "corrugated",
  "glass-bottles",
  "labels",
] as const;

/**
 * Pick the popular categories from real rows, ordered by product count
 * (descending). Slugs missing from the live taxonomy are skipped rather
 * than rendered as stale tiles.
 */
export function popularCategories<T extends { slug: string; productCount: number }>(
  categories: T[],
): T[] {
  return POPULAR_CATEGORY_SLUGS.map((slug) => categories.find((c) => c.slug === slug))
    .filter((category): category is T => category !== undefined)
    .sort((a, b) => b.productCount - a.productCount);
}
