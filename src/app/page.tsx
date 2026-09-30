import { HomeLanding } from "@/components/home/home-landing";
import { getCategories, getFeaturedProducts } from "@/lib/catalog/queries";

// Home page: thin data wrapper. The layout and rendering live in
// src/components/home/home-landing.tsx (presentational, test-covered);
// this file owns the queries and request-time rendering.
//
// Popular tiles are material categories only (user review: no use-case
// entries in navigation — PR #9).

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([getCategories(), getFeaturedProducts()]);

  return <HomeLanding categories={categories} featured={featured} />;
}
