import Link from "next/link";

// Left-rail filters (spec C5) — server-rendered links, no client JS. Each
// option toggles its filter on the current query; clicking the active option
// clears it. Groups render in the spec's priority order: min order → price
// type → stock/custom → material & category → location → lead time →
// certifications. Facet counts update with the query (computeFacets).

import {
  buildResultsUrl,
  FILTER_GROUP_ORDER,
  type Facets,
  type ResultsFilters,
} from "@/lib/catalog/filters";
import { hasAnyLeadTimeData } from "@/lib/catalog/filters";

interface FilterGroupProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

function FilterGroup({ id, title, children }: FilterGroupProps) {
  return (
    <section data-testid={`filter-group-${id}`} className="border-b border-neutral-200 pb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      {children}
    </section>
  );
}

function OptionLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={`flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-accent-soft ${
        active ? "bg-accent-soft font-medium text-accent" : "text-neutral-700"
      }`}
    >
      <span>{label}</span>
      <span className="ml-2 shrink-0 text-xs text-neutral-400">{count}</span>
    </Link>
  );
}

export function FilterRail({
  filters,
  facets,
  scopeProducts,
}: {
  filters: ResultsFilters;
  facets: Facets;
  scopeProducts: { leadTimeDays: number | null }[];
}) {
  const anyActive =
    filters.maxMoq !== null ||
    filters.priceType !== null ||
    filters.stockOrCustom !== null ||
    filters.material !== null ||
    filters.category !== null ||
    filters.location !== null ||
    filters.maxLeadDays !== null ||
    filters.cert !== null;

  return (
    <nav data-testid="filter-rail" aria-label="Filters" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Filters</h2>
        {anyActive ? (
          <Link href={buildResultsUrl(filters, { maxMoq: null, priceType: null, stockOrCustom: null, material: null, category: null, location: null, maxLeadDays: null, cert: null })} className="text-xs text-accent hover:underline">
            Clear all
          </Link>
        ) : null}
      </div>

      <FilterGroup id="min-order" title="Minimum order">
        {facets.minOrder.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, { maxMoq: filters.maxMoq === Number(option.value) ? null : Number(option.value) })}
            active={filters.maxMoq === Number(option.value)}
            label={option.label}
            count={option.count}
          />
        ))}
        <p className="mt-1 px-2 text-xs text-neutral-400">
          Filters apply to published minimums — products without one are shown when this filter is off.
        </p>
      </FilterGroup>

      <FilterGroup id="price-type" title="Price type">
        {facets.priceType.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, { priceType: filters.priceType === option.value ? null : option.value })}
            active={filters.priceType === option.value}
            label={option.label}
            count={option.count}
          />
        ))}
      </FilterGroup>

      <FilterGroup id="stock-custom" title="Stock or custom">
        {facets.stockCustom.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, {
              stockOrCustom: filters.stockOrCustom === option.value ? null : (option.value as "STOCK" | "CUSTOM"),
            })}
            active={filters.stockOrCustom === option.value}
            label={option.label}
            count={option.count}
          />
        ))}
      </FilterGroup>

      <FilterGroup id="material-category" title="Material &amp; category">
        <div className="space-y-1">
          {facets.material.map((option) => (
            <OptionLink
              key={option.value}
              href={buildResultsUrl(filters, { material: filters.material === option.value ? null : option.value })}
              active={filters.material === option.value}
              label={option.label}
              count={option.count}
            />
          ))}
        </div>
        <div className="mt-3 space-y-1">
          {facets.category.map((option) => (
            <OptionLink
              key={option.value}
              href={buildResultsUrl(filters, { category: filters.category === option.value ? null : option.value })}
              active={filters.category === option.value}
              label={option.label}
              count={option.count}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup id="location" title="Location">
        {facets.location.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, { location: filters.location === option.value ? null : option.value })}
            active={filters.location === option.value}
            label={option.label}
            count={option.count}
          />
        ))}
      </FilterGroup>

      <FilterGroup id="lead-time" title="Lead time">
        {hasAnyLeadTimeData(scopeProducts) ? (
          <>
            {facets.leadTime.map((option) => (
              <OptionLink
                key={option.value}
                href={buildResultsUrl(filters, { maxLeadDays: filters.maxLeadDays === Number(option.value) ? null : Number(option.value) })}
                active={filters.maxLeadDays === Number(option.value)}
                label={option.label}
                count={option.count}
              />
            ))}
          </>
        ) : (
          <p className="px-2 text-xs text-neutral-500">
            No supplier in this view publishes a lead time — ask them with your quote request.
          </p>
        )}
      </FilterGroup>

      <FilterGroup id="certifications" title="Certifications">
        {facets.certifications.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, { cert: filters.cert === option.value ? null : option.value })}
            active={filters.cert === option.value}
            label={option.label}
            count={option.count}
          />
        ))}
        {facets.certifications.length === 0 ? (
          <p className="px-2 text-xs text-neutral-500">No certification data captured yet.</p>
        ) : null}
      </FilterGroup>

      {/* Exposed for the C5 order test: the rail must render groups in this order. */}
      <span data-testid="filter-group-order" className="hidden" data-order={FILTER_GROUP_ORDER.join(",")} />
    </nav>
  );
}
