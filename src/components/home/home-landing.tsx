import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import { SearchForm } from "@/components/catalog/search-form";
import { categoryImageAsset } from "../../../data/image-mapping";
import { popularCategories } from "@/lib/catalog/popular";
import type { CategoryVM, ProductVM } from "@/lib/catalog/view-models";

// Home landing (spec C4): one hero question — "What are you packaging?" —
// free-text search through the taxonomy aliases, popular packaging tiles into
// pre-filtered results, a featured-products rail showing real catalog depth,
// and the full category grid. Everything browsable signed-out.
//
// Imagery (spec art_AjaTUf9x): all photography is generated, representative
// packshots — labeled via alt text everywhere and a visible caption on the
// product page. Popular tiles are material categories only (user review: no
// use-case entries in navigation).
//
// Presentational only: data arrives as props; the page (src/app/page.tsx)
// owns the queries.

const HERO_IMAGE = {
  src: "/products/hero-lineup.png",
  width: 1376,
  height: 768,
} as const;

export function HomeLanding({ categories, featured }: { categories: CategoryVM[]; featured: ProductVM[] }) {
  const popular = popularCategories(categories);

  return (
    <div>
      <section className="border-b border-neutral-200 bg-accent-soft/60">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:gap-12">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              What are you packaging?
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 sm:text-base lg:mx-0">
              Real packaging from real suppliers — every price a verified, dated snapshot from the
              supplier&rsquo;s own page. Search pouches, bottles, labels, and more, then request
              quotes from everyone at once.
            </p>
            <div className="mx-auto mt-6 max-w-xl lg:mx-0">
              <SearchForm />
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <Image
              src={HERO_IMAGE.src}
              alt="Representative packaging lineup — pouches, bottles, jars, and cartons"
              width={HERO_IMAGE.width}
              height={HERO_IMAGE.height}
              priority
              sizes="(min-width: 1024px) 640px, 100vw"
              className="h-auto w-full rounded-xl shadow-md"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-lg font-semibold text-ink">Popular packaging</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {popular.map((category) => {
            const asset = categoryImageAsset(category.slug);
            return (
              <Link
                key={category.slug}
                href={`/results?category=${encodeURIComponent(category.slug)}`}
                data-testid="popular-entry"
                data-entry={category.slug}
                className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-colors hover:border-accent"
              >
                <div className="relative h-28 bg-neutral-50">
                  {asset ? (
                    <Image
                      src={asset}
                      alt={`${category.name} — representative packaging image`}
                      fill
                      sizes="(min-width: 1024px) 240px, 50vw"
                      className="object-contain p-2 transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <span className="border-t border-neutral-100 px-3 py-2.5 text-center text-sm font-medium text-ink group-hover:bg-accent-soft">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-10" data-testid="featured-rail-section">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-ink">Featured packaging</h2>
            <Link href="/results" className="text-sm text-accent hover:underline">
              Browse all products
            </Link>
          </div>
          <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-4" data-testid="featured-rail">
            {featured.map((product) => (
              <div key={product.id} className="w-64 shrink-0 snap-start sm:w-72">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="text-lg font-semibold text-ink">Browse all categories</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {categories.length} packaging categories, from pouches to shipping cartons.
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="category-grid">
          {categories.map((category) => {
            const asset = categoryImageAsset(category.slug);
            return (
              <li key={category.slug}>
                <Link
                  href={`/results?category=${encodeURIComponent(category.slug)}`}
                  className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white py-2 pl-2 pr-4 text-sm shadow-sm hover:border-accent hover:bg-accent-soft"
                >
                  {asset ? (
                    <Image
                      src={asset}
                      alt={`${category.name} — representative packaging image`}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded border border-neutral-100 bg-neutral-50 object-contain"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 font-medium text-ink">{category.name}</span>
                  <span className="text-xs text-neutral-400">
                    {category.productCount} product{category.productCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
