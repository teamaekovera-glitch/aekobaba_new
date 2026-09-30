import Link from "next/link";

import { CATEGORY_MENU } from "@/lib/catalog/menu";
import { BasketBadge } from "@/components/quotes/basket-badge";

// Amazon-style header: logo, search over everything, and the category menu.
// Server-rendered with no client JS — the category menu is a native
// <details> disclosure, and search is a plain GET form to /results. The menu
// is static navigation (src/lib/catalog/menu.ts) — no DB query, so pages that
// prerender at build stay build-safe.

export function SiteHeader() {

  return (
    <header className="border-b border-neutral-200 bg-accent text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4">
        <Link href="/" aria-label="Aekobaba — home" className="shrink-0">
          {/* Reversed white logo reads cleanly on the navy surface. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-white.png" alt="Aekobaba" className="h-9 w-auto" />
        </Link>

        <form action="/results" role="search" className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <label htmlFor="site-search" className="sr-only">
            What are you packaging?
          </label>
          <div className="flex overflow-hidden rounded-md bg-white shadow-sm">
            <input
              id="site-search"
              type="search"
              name="q"
              placeholder="What are you packaging? Try “coffee” or “hot sauce”"
              className="w-full px-3 py-2 text-sm text-ink placeholder:text-neutral-400 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-steel px-4 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
            >
              Search
            </button>
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-4 text-sm">
          <BasketBadge />
          <Link href="/auth/sign-in" className="whitespace-nowrap text-white/90 hover:text-white hover:underline">
            Sign in
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4">
          <details className="group relative">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-2 py-2 text-sm font-medium text-white/90 hover:text-white">
              <span aria-hidden>☰</span> All categories
            </summary>
            <div className="absolute left-0 z-20 mt-0 w-80 rounded-b-md border border-neutral-200 bg-white py-2 shadow-lg">
              <ul>
                {CATEGORY_MENU.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/results?category=${encodeURIComponent(category.slug)}`}
                      className="block px-4 py-1.5 text-sm text-ink hover:bg-accent-soft"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
