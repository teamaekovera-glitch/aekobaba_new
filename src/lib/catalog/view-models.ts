// Serializable view models for the catalog UI.
//
// Server Components map Prisma rows to these plain objects; presentational
// components take them as props and never touch the database. Every field is
// JSON-serializable so the same objects can cross into client components.

export type SupplierStatusValue = "PENDING" | "LISTED" | "RECOMMENDED" | "QUOTE_ONLY" | "DISABLED";
export type PriceTypeValue = "EXACT" | "CALCULATOR" | "FROM" | "QUOTE_ONLY";
export type StockOrCustomValue = "STOCK" | "CUSTOM";

export interface SupplierSummaryVM {
  slug: string;
  name: string;
  website: string;
  location: string;
  status: SupplierStatusValue;
  reviewScore: number | null;
  reviewCount: number;
  /** Platform the aggregate review was read from, e.g. "Trustpilot". */
  reviewPlatform: string | null;
  legalIdentity: string | null;
}

export interface QuantityBreakVM {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
}

export interface ProductImageVM {
  url: string;
  alt: string | null;
}

export interface ProductVM {
  id: string;
  title: string;
  description: string | null;
  material: string;
  /** Coarse family for the material facet (display grouping only). */
  materialFamily: string;
  categorySlug: string;
  categoryName: string;
  subcategory: string | null;
  priceType: PriceTypeValue;
  /** Null = the supplier does not publish it → "Ask the supplier". */
  basePrice: number | null;
  priceBasis: string | null;
  priceUnit: number | null;
  moq: number | null;
  moqUnit: string | null;
  leadTimeDays: number | null;
  stockOrCustom: StockOrCustomValue;
  /** The Request Sample action exists only when this is true. */
  samplePolicyVerified: boolean;
  sourceUrl: string;
  /** ISO timestamp of the capture rendered next to every price. */
  sourceCapturedAt: string;
  quantityBreaks: QuantityBreakVM[];
  /** All Image rows, sortOrder ascending — the product-page gallery data. */
  images: ProductImageVM[];
  /** Primary representative image; null only if a product has no Image row. */
  primaryImage: ProductImageVM | null;
  supplier: SupplierSummaryVM;
  /** Supplier-level certification names (certs attach to companies, not SKUs). */
  certificationNames: string[];
}

export interface CategoryVM {
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
}

export interface ReviewVM {
  score: number;
  sourcePlatform: string;
  reviewedAt: string;
  sourceUrl: string;
  sourceCapturedAt: string;
  summary: string | null;
}

export interface SupplierDetailVM extends SupplierSummaryVM {
  lastVerifiedAt: string | null;
  reviews: ReviewVM[];
  certifications: { name: string; sourceUrl: string; sourceCapturedAt: string }[];
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

/** Minimal structural shape the mappers accept (subset of the Prisma include). */
export interface ProductWithRelations {
  id: string;
  title: string;
  description: string | null;
  material: string;
  subcategory: string | null;
  priceType: string;
  basePrice: { toNumber(): number } | null;
  priceBasis: string | null;
  priceUnit: { toNumber(): number } | null;
  moq: number | null;
  moqUnit: string | null;
  leadTimeDays: number | null;
  stockOrCustom: string;
  samplePolicyVerified: boolean;
  sourceUrl: string;
  sourceCapturedAt: Date;
  quantityBreaks: { minQty: number; maxQty: number | null; unitPrice: { toNumber(): number } }[];
  images: { url: string; alt: string | null }[];
  supplier: {
    slug: string;
    name: string;
    website: string;
    location: string;
    status: string;
    reviewScore: number | null;
    reviewCount: number;
    legalIdentity: string | null;
    reviews: { sourcePlatform: string }[];
    certifications: { name: string }[];
  };
  category: { slug: string; name: string };
}

/**
 * Coarse material family for the material facet. This is a display grouping —
 * the exact material string the supplier publishes always renders on cards
 * and the detail page, unchanged.
 */
export function materialFamily(material: string): string {
  const m = material.toLowerCase();
  if (m.includes("not specified")) return "Not specified";
  if (m.includes("glass")) return "Glass";
  if (m.includes("corrugat")) return "Corrugated";
  if (
    m.includes("plastic") ||
    m.includes("polythene") ||
    m.includes("polyethylene") ||
    m.includes("ldpe") ||
    m.includes("vinyl") ||
    m.includes("cellophane") ||
    m.includes("nylon") ||
    m.includes("laminate") ||
    m.includes("foil")
  ) {
    return "Plastic & Film";
  }
  if (
    m.includes("kraft") ||
    m.includes("paper") ||
    m.includes("cardboard") ||
    m.includes("glassine") ||
    m.includes("tissue")
  ) {
    return "Paper & Board";
  }
  if (m.includes("aluminum") || m.includes("aluminium") || m.includes("tin") || m.includes("steel") || m.includes("metal")) {
    return "Metal";
  }
  if (m.includes("compostable") || m.includes("biodegradable") || m.includes("bagasse") || m.includes("pla")) {
    return "Compostable";
  }
  // Unrecognized: the first word before any parenthetical, as published.
  const firstWord = material.split(/[\s(/]/)[0].trim();
  return firstWord.length > 0 ? firstWord : "Other";
}

function toNumber(value: { toNumber(): number } | number | null): number | null {
  if (value === null) return null;
  return typeof value === "number" ? value : value.toNumber();
}

export function toProductVM(row: ProductWithRelations): ProductVM {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    material: row.material,
    materialFamily: materialFamily(row.material),
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    subcategory: row.subcategory,
    priceType: row.priceType as PriceTypeValue,
    basePrice: toNumber(row.basePrice),
    priceBasis: row.priceBasis,
    priceUnit: toNumber(row.priceUnit),
    moq: row.moq,
    moqUnit: row.moqUnit,
    leadTimeDays: row.leadTimeDays,
    stockOrCustom: row.stockOrCustom as StockOrCustomValue,
    samplePolicyVerified: row.samplePolicyVerified,
    sourceUrl: row.sourceUrl,
    sourceCapturedAt: row.sourceCapturedAt.toISOString(),
    quantityBreaks: row.quantityBreaks.map((b) => ({
      minQty: b.minQty,
      maxQty: b.maxQty,
      unitPrice: toNumber(b.unitPrice) as number,
    })),
    images: row.images.map((image) => ({ url: image.url, alt: image.alt })),
    primaryImage: row.images[0] ? { url: row.images[0].url, alt: row.images[0].alt } : null,
    supplier: {
      slug: row.supplier.slug,
      name: row.supplier.name,
      website: row.supplier.website,
      location: row.supplier.location,
      status: row.supplier.status as SupplierStatusValue,
      reviewScore: row.supplier.reviewScore,
      reviewCount: row.supplier.reviewCount,
      reviewPlatform: row.supplier.reviews[0]?.sourcePlatform ?? null,
      legalIdentity: row.supplier.legalIdentity,
    },
    certificationNames: row.supplier.certifications.map((c) => c.name),
  };
}
