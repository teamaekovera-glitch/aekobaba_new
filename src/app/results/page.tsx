import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import { FilterRail } from "@/components/catalog/filter-rail";
import { SortBar } from "@/components/catalog/sort-bar";
import { SearchForm } from "@/components/catalog/search-form";
import { applyFilters, computeFacets, parseFilters, sortProducts } from "@/lib/catalog/filters";
import { resolveSearchQuery } from "@/lib/catalog/aliases";
import { getAllProducts } from "@/lib/catalog/queries";

// Results (spec C5): server-rendered, URL-encoded filter state, left rail in
// the spec's priority order with live facet counts, four sorts. Loads the
// catalog once per request and runs the pure filter/facet/sort pipeline.

export const metadata: Metadata = {
  title: "Results",
};

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

interface ResultsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const resolved = filters.q ? resolveSearchQuery(filters.q) : null;

  const allProducts = await getAllProducts();
  const filtered = applyFilters(allProducts, filters, resolved);
  const products = sortProducts(filtered, filters.sort);
  const facets = computeFacets(allProducts, filters, resolved);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4">
        <SearchForm size="sm" />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <FilterRail filters={filters} facets={facets} scopeProducts={allProducts} />
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 data-testid="results-heading" className="text-lg font-semibold text-ink">
              {filters.q ? `Packaging for “${filters.q}”` : "All packaging"}
              <span className="ml-2 text-sm font-normal text-neutral-500">
                {products.length} product{products.length === 1 ? "" : "s"}
              </span>
            </h1>
            <SortBar filters={filters} />
          </header>

          {resolved ? (
            <p data-testid="search-mapping" className="mt-2 text-xs text-neutral-500">
              Matching {resolved.categorySlugs.length} categories
              {resolved.matchedTerms.length > 0 ? ` — ${resolved.matchedTerms.join(", ")}` : ""}.
            </p>
          ) : null}

          {products.length > 0 ? (
            <div data-testid="results-grid" className="mt-6 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div data-testid="results-empty" className="mt-8 rounded-lg border border-neutral-200 bg-white p-8 text-center">
              <p className="text-sm text-neutral-600">
                Nothing matches these filters yet.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                We only list what we have verified — no invented filler. Try clearing a filter or
                browsing a{" "}
                <Link href="/results" className="text-accent underline">
                  wider view
                </Link>
                .
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
