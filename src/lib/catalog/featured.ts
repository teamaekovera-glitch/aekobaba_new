import type { ProductVM } from "./view-models";

// Featured rail selection for Home.
//
// "Verified suppliers first" is the ordering rule (spec: featured rail shows
// real catalog depth): the admin-assigned tier ranks RECOMMENDED above LISTED,
// and unverified states (QUOTE_ONLY, PENDING, DISABLED) rank last. Within a
// tier, better-reviewed suppliers lead. Categories then interleave — one
// product per category per round — so the rail shows the breadth of the
// catalog instead of running one deep category end to end.
//
// Pure function: same products, same cap, same output — no clock, no randomness.

const STATUS_RANK: Record<ProductVM["supplier"]["status"], number> = {
  RECOMMENDED: 0,
  LISTED: 1,
  QUOTE_ONLY: 2,
  PENDING: 3,
  DISABLED: 4,
};

/**
 * Pick the featured products: verified-first ordering, spread across
 * categories, capped. Deterministic — ties break on review count, then id —
 * so the rail is stable across renders and runs.
 */
export function selectFeaturedProducts(products: ProductVM[], cap: number): ProductVM[] {
  const ranked = [...products].sort((a, b) => {
    const byStatus = STATUS_RANK[a.supplier.status] - STATUS_RANK[b.supplier.status];
    if (byStatus !== 0) return byStatus;
    const byScore = (b.supplier.reviewScore ?? -1) - (a.supplier.reviewScore ?? -1);
    if (byScore !== 0) return byScore;
    if (a.supplier.reviewCount !== b.supplier.reviewCount) {
      return b.supplier.reviewCount - a.supplier.reviewCount;
    }
    return a.id.localeCompare(b.id);
  });

  // Group by category, preserving the ranked order within each group. Map
  // insertion order keeps groups in best-rank-first order for interleaving.
  const groups = new Map<string, ProductVM[]>();
  for (const product of ranked) {
    const group = groups.get(product.categorySlug) ?? [];
    group.push(product);
    groups.set(product.categorySlug, group);
  }

  const featured: ProductVM[] = [];
  while (featured.length < cap) {
    let picked = false;
    for (const group of groups.values()) {
      if (featured.length >= cap) break;
      const next = group.shift();
      if (next) {
        featured.push(next);
        picked = true;
      }
    }
    if (!picked) break;
  }
  return featured;
}
