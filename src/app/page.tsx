import Link from "next/link";

import { SearchForm } from "@/components/catalog/search-form";
import { getCategories } from "@/lib/catalog/queries";
import { popularCategories } from "@/lib/catalog/popular";

// Home (spec C4): one hero question — "What are you packaging?" — free-text
// search through the taxonomy aliases, popular packaging tiles into
// pre-filtered results, and the full category grid. Everything browsable
// signed-out. Popular tiles are material categories only (user review: no
// use-case entries in navigation).

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categories = await getCategories();
  const popular = popularCategories(categories);

  return (
    <div>
      <section className="bg-accent-soft/60 border-b border-neutral-200">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            What are you packaging?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">
            Real packaging from real suppliers — every price a verified, dated snapshot from the
            supplier&rsquo;s own page. Search pouches, bottles, labels, and more, then request
            quotes from everyone at once.
          </p>
          <div className="mx-auto mt-6 max-w-xl">
            <SearchForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-lg font-semibold text-ink">Popular packaging</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {popular.map((category) => (
            <Link
              key={category.slug}
              href={`/results?category=${encodeURIComponent(category.slug)}`}
              data-testid="popular-entry"
              data-entry={category.slug}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-5 text-center text-sm font-medium text-ink shadow-sm transition-colors hover:border-accent hover:bg-accent-soft"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="text-lg font-semibold text-ink">Browse all categories</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {categories.length} packaging categories, from pouches to shipping cartons.
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="category-grid">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/results?category=${encodeURIComponent(category.slug)}`}
                className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm hover:border-accent hover:bg-accent-soft"
              >
                <span className="font-medium text-ink">{category.name}</span>
                <span className="text-xs text-neutral-400">
                  {category.productCount} product{category.productCount === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
