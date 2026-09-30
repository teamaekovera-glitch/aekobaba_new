// Results filtering, faceting, and sorting (spec criterion C5).
//
// Everything here is pure and synchronous over the product view models so the
// whole behavior is unit-testable without a database. The Results page loads
// the (small, demo-scale) catalog once per request and applies these
// functions; when the catalog grows this is where SQL aggregation replaces
// the in-memory pass.
//
// Filter priority order is a spec decision (Packaging Hub plan, week of
// 23 Sept 2026): minimum order → price type → stock/custom → material &
// category → location → lead time → certifications. FILTER_GROUP_ORDER pins
// it, and a test asserts the rail renders in exactly this order.

import type { ProductVM } from "./view-models";
import { effectiveUnitPrice } from "./format";
import type { ResolvedQuery } from "./aliases";

export const SORTS = ["price", "moq", "lead", "reviews"] as const;
export type SortKey = (typeof SORTS)[number];

export const DEFAULT_SORT: SortKey = "reviews";

/** Spec priority order for the left rail, top to bottom. */
export const FILTER_GROUP_ORDER = [
  "min-order",
  "price-type",
  "stock-custom",
  "material-category",
  "location",
  "lead-time",
  "certifications",
] as const;

export type FilterGroupId = (typeof FILTER_GROUP_ORDER)[number];

export interface ResultsFilters {
  /** Free text from the hero/header search. */
  q: string | null;
  /** "Minimum order up to N" — published MOQs at or below this. */
  maxMoq: number | null;
  priceType: string | null;
  stockOrCustom: "STOCK" | "CUSTOM" | null;
  /** Coarse material family, e.g. "Glass". */
  material: string | null;
  /** Explicit category slug from the menu/tree. */
  category: string | null;
  location: string | null;
  /** "Lead time up to N days" — published lead times at or below this. */
  maxLeadDays: number | null;
  /** Certification name (supplier-level). */
  cert: string | null;
  sort: SortKey;
}

export type ResultsSearchParams = Record<string, string | string[] | undefined>;

const PRICE_TYPES = ["EXACT", "CALCULATOR", "FROM", "QUOTE_ONLY"] as const;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseNonNegativeInt(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function parsePriceType(raw: string | undefined): string | null {
  return raw !== undefined && (PRICE_TYPES as readonly string[]).includes(raw) ? raw : null;
}

function parseStockOrCustom(raw: string | undefined): "STOCK" | "CUSTOM" | null {
  return raw === "STOCK" || raw === "CUSTOM" ? raw : null;
}

function parseSort(raw: string | undefined): SortKey {
  return raw !== undefined && (SORTS as readonly string[]).includes(raw) ? (raw as SortKey) : DEFAULT_SORT;
}

/** Parse URL search params into typed filters. Junk values are ignored, never guessed. */
export function parseFilters(searchParams: ResultsSearchParams): ResultsFilters {
  return {
    q: firstValue(searchParams.q)?.trim() || null,
    maxMoq: parseNonNegativeInt(firstValue(searchParams.maxMoq)),
    priceType: parsePriceType(firstValue(searchParams.priceType)),
    stockOrCustom: parseStockOrCustom(firstValue(searchParams.stock)),
    material: firstValue(searchParams.material) || null,
    category: firstValue(searchParams.category) || null,
    location: firstValue(searchParams.location) || null,
    maxLeadDays: parseNonNegativeInt(firstValue(searchParams.maxLead)),
    cert: firstValue(searchParams.cert) || null,
    sort: parseSort(firstValue(searchParams.sort)),
  };
}

/**
 * Serialize filters back to a shareable query string. Defaults and nulls are
 * omitted so URLs stay clean ("/results?maxMoq=1000&sort=price").
 */
export function filtersToQueryString(filters: ResultsFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.maxMoq !== null) params.set("maxMoq", String(filters.maxMoq));
  if (filters.priceType) params.set("priceType", filters.priceType);
  if (filters.stockOrCustom) params.set("stock", filters.stockOrCustom);
  if (filters.material) params.set("material", filters.material);
  if (filters.category) params.set("category", filters.category);
  if (filters.location) params.set("location", filters.location);
  if (filters.maxLeadDays !== null) params.set("maxLead", String(filters.maxLeadDays));
  if (filters.cert) params.set("cert", filters.cert);
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  return params.toString();
}

/** Build a /results URL from a filter patch applied to the current state. */
export function buildResultsUrl(current: ResultsFilters, patch: Partial<ResultsFilters>): string {
  const next = { ...current, ...patch };
  const qs = filtersToQueryString(next);
  return qs ? `/results?${qs}` : "/results";
}

/**
 * Categories the result set is scoped to. A search query's alias resolution
 * intersects an explicit category filter — picking "Labels" inside a "coffee"
 * search narrows to labels; a category outside the query's scope yields an
 * empty (honest) result.
 */
export function effectiveCategorySlugs(filters: ResultsFilters, resolved: ResolvedQuery | null): string[] | null {
  if (filters.category) {
    if (resolved && !resolved.categorySlugs.includes(filters.category)) return [];
    return [filters.category];
  }
  return resolved ? resolved.categorySlugs : null;
}

/** Apply the typed filters to a product list. Pure. */
export function applyFilters(products: ProductVM[], filters: ResultsFilters, resolved: ResolvedQuery | null): ProductVM[] {
  const categorySlugs = effectiveCategorySlugs(filters, resolved);
  return products.filter((p) => {
    if (categorySlugs !== null && !categorySlugs.includes(p.categorySlug)) return false;
    if (filters.maxMoq !== null && (p.moq === null || p.moq > filters.maxMoq)) return false;
    if (filters.priceType && p.priceType !== filters.priceType) return false;
    if (filters.stockOrCustom && p.stockOrCustom !== filters.stockOrCustom) return false;
    if (filters.material && p.materialFamily !== filters.material) return false;
    if (filters.location && p.supplier.location !== filters.location) return false;
    if (filters.maxLeadDays !== null && (p.leadTimeDays === null || p.leadTimeDays > filters.maxLeadDays)) return false;
    if (filters.cert && !p.certificationNames.includes(filters.cert)) return false;
    return true;
  });
}

// ─── Facets ──────────────────────────────────────────────────────────────────

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface Facets {
  minOrder: FacetOption[];
  priceType: FacetOption[];
  stockCustom: FacetOption[];
  material: FacetOption[];
  category: FacetOption[];
  location: FacetOption[];
  leadTime: FacetOption[];
  certifications: FacetOption[];
}

export const MOQ_BUCKETS: { value: number; label: string }[] = [
  { value: 100, label: "Up to 100" },
  { value: 1000, label: "Up to 1,000" },
  { value: 10000, label: "Up to 10,000" },
];

export const LEAD_BUCKETS: { value: number; label: string }[] = [
  { value: 7, label: "Up to 7 days" },
  { value: 14, label: "Up to 14 days" },
  { value: 30, label: "Up to 30 days" },
];

const PRICE_TYPE_LABELS: Record<string, string> = {
  EXACT: "Exact price",
  CALCULATOR: "Calculator quote",
  FROM: "From price",
  QUOTE_ONLY: "Quote only",
};

const STOCK_LABELS: Record<string, string> = { STOCK: "Stock", CUSTOM: "Custom" };

function countBy(products: ProductVM[], key: (p: ProductVM) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products) {
    const k = key(p);
    if (k === null) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

function toOptions(counts: Map<string, number>, label: (value: string) => string): FacetOption[] {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/**
 * Facet counts that update with the query: each facet counts the products
 * matching every OTHER active filter (its own dimension is left open), so
 * counts always describe what clicking the option would yield.
 */
export function computeFacets(products: ProductVM[], filters: ResultsFilters, resolved: ResolvedQuery | null): Facets {
  const except = (omit: keyof ResultsFilters): ProductVM[] =>
    applyFilters(products, { ...filters, [omit]: null }, resolved);

  const moqCandidates = except("maxMoq");
  const priceCandidates = except("priceType");
  const stockCandidates = except("stockOrCustom");
  const materialCandidates = except("material");
  const categoryCandidates = except("category");
  const locationCandidates = except("location");
  const leadCandidates = except("maxLeadDays");
  const certCandidates = except("cert");

  const minOrder = MOQ_BUCKETS.map((bucket) => ({
    value: String(bucket.value),
    label: bucket.label,
    count: moqCandidates.filter((p) => p.moq !== null && p.moq <= bucket.value).length,
  }));

  const priceType = toOptions(countBy(priceCandidates, (p) => p.priceType), (v) => PRICE_TYPE_LABELS[v] ?? v);

  const stockCustom = (["STOCK", "CUSTOM"] as const)
    .map((value) => ({
      value,
      label: STOCK_LABELS[value],
      count: stockCandidates.filter((p) => p.stockOrCustom === value).length,
    }))
    .filter((o) => o.count > 0 || filters.stockOrCustom === o.value);

  const material = toOptions(countBy(materialCandidates, (p) => p.materialFamily), (v) => v);

  const categoryCounts = countBy(categoryCandidates, (p) => p.categorySlug);
  const categoryNames = new Map(categoryCandidates.map((p) => [p.categorySlug, p.categoryName]));
  const category = [...categoryCounts.entries()]
    .map(([slug, count]) => ({ value: slug, label: categoryNames.get(slug) ?? slug, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const location = toOptions(countBy(locationCandidates, (p) => p.supplier.location), (v) => v);

  const leadTime = LEAD_BUCKETS.map((bucket) => ({
    value: String(bucket.value),
    label: bucket.label,
    count: leadCandidates.filter((p) => p.leadTimeDays !== null && p.leadTimeDays <= bucket.value).length,
  }));

  const certifications = toOptions(countBy(certCandidates, (p) => p.certificationNames[0] ?? null), (v) => v);

  return { minOrder, priceType, stockCustom, material, category, location, leadTime, certifications };
}

/** True when any product in scope publishes a lead time — drives the honest note. */
export function hasAnyLeadTimeData(products: Pick<ProductVM, "leadTimeDays">[]): boolean {
  return products.some((p) => p.leadTimeDays !== null);
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

export const SORT_LABELS: Record<SortKey, string> = {
  price: "Lowest price per item",
  moq: "Smallest minimum order",
  lead: "Fastest lead time",
  reviews: "Best-reviewed",
};

function ascendingWithNullsLast(value: number | null): number {
  return value ?? Number.POSITIVE_INFINITY;
}

function descendingWithNullsLast(value: number | null): number {
  return value === null ? Number.NEGATIVE_INFINITY : value;
}

/** The four spec sorts. Pure and stable. */
export function sortProducts(products: ProductVM[], sort: SortKey): ProductVM[] {
  const sorted = [...products];
  switch (sort) {
    case "price":
      sorted.sort(
        (a, b) => ascendingWithNullsLast(effectiveUnitPrice(a)) - ascendingWithNullsLast(effectiveUnitPrice(b)),
      );
      break;
    case "moq":
      sorted.sort((a, b) => ascendingWithNullsLast(a.moq) - ascendingWithNullsLast(b.moq));
      break;
    case "lead":
      sorted.sort((a, b) => ascendingWithNullsLast(a.leadTimeDays) - ascendingWithNullsLast(b.leadTimeDays));
      break;
    case "reviews":
      sorted.sort(
        (a, b) =>
          descendingWithNullsLast(b.supplier.reviewScore) - descendingWithNullsLast(a.supplier.reviewScore) ||
          b.supplier.reviewCount - a.supplier.reviewCount,
      );
      break;
  }
  return sorted;
}
