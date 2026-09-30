import type { ProductVM } from "./view-models";

// Fixture view models shaped like the seeded catalog's real records — used
// by the filter/facet/sort tests and the rendered-DOM component tests.

let nextId = 1;

interface FixtureOverrides {
  basePrice?: number | null;
  priceType?: ProductVM["priceType"];
  moq?: number | null;
  leadTimeDays?: number | null;
  stockOrCustom?: ProductVM["stockOrCustom"];
  material?: string;
  categorySlug?: string;
  categoryName?: string;
  location?: string;
  cert?: string | null;
  samplePolicyVerified?: boolean;
  priceUnit?: number | null;
  reviewScore?: number | null;
  reviewCount?: number;
  status?: ProductVM["supplier"]["status"];
  sourceCapturedAt?: string;
  sourceUrl?: string;
}

export function makeProduct(overrides: FixtureOverrides = {}): ProductVM {
  const id = `prod_${String(nextId).padStart(3, "0")}`;
  nextId += 1;
  return {
    id,
    title: `Test Product ${id}`,
    description: null,
    material: overrides.material ?? "Glass",
    materialFamily: overrides.material ? overrides.material : "Glass",
    categorySlug: overrides.categorySlug ?? "glass-jars",
    categoryName: overrides.categoryName ?? "Glass Jars",
    subcategory: null,
    priceType: overrides.priceType ?? "EXACT",
    basePrice: overrides.basePrice === undefined ? 1.23 : overrides.basePrice,
    priceBasis: "per jar",
    priceUnit: overrides.priceUnit === undefined ? null : overrides.priceUnit,
    moq: overrides.moq === undefined ? 500 : overrides.moq,
    moqUnit: "units",
    leadTimeDays: overrides.leadTimeDays === undefined ? 14 : overrides.leadTimeDays,
    stockOrCustom: overrides.stockOrCustom ?? "STOCK",
    samplePolicyVerified: overrides.samplePolicyVerified ?? false,
    sourceUrl: overrides.sourceUrl ?? `https://supplier.example/${id}`,
    sourceCapturedAt: overrides.sourceCapturedAt ?? "2026-09-18T00:00:00Z",
    quantityBreaks: [],
    supplier: {
      slug: "test-supplier",
      name: "Test Supplier Co",
      website: "https://supplier.example",
      location: overrides.location ?? "US",
      status: overrides.status ?? "RECOMMENDED",
      reviewScore: overrides.reviewScore === undefined ? 4.5 : overrides.reviewScore,
      reviewCount: overrides.reviewCount ?? 214,
      reviewPlatform: overrides.reviewScore === null ? null : "Trustpilot",
      legalIdentity: null,
    },
    certificationNames: overrides.cert === undefined ? ["FSC"] : overrides.cert ? [overrides.cert] : [],
  };
}

export function baseFilters() {
  return {
    q: null,
    maxMoq: null,
    priceType: null,
    stockOrCustom: null,
    material: null,
    category: null,
    location: null,
    maxLeadDays: null,
    cert: null,
    sort: "reviews" as const,
  };
}
