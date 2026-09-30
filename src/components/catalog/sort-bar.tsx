import Link from "next/link";

// The four spec sorts (C5) as links — server-rendered, URL-encoded state.

import { buildResultsUrl, SORTS, SORT_LABELS, type ResultsFilters, type SortKey } from "@/lib/catalog/filters";

export function SortBar({ filters }: { filters: ResultsFilters }) {
  return (
    <div data-testid="sort-bar" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-neutral-500">Sort:</span>
      {SORTS.map((sort: SortKey) => {
        const active = filters.sort === sort;
        return (
          <Link
            key={sort}
            href={buildResultsUrl(filters, { sort })}
            aria-current={active ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              active
                ? "border-accent bg-accent text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-accent-soft"
            }`}
          >
            {SORT_LABELS[sort]}
          </Link>
        );
      })}
    </div>
  );
}
