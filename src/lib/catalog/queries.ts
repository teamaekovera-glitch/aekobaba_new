import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import type {
  CategoryVM,
  ProductVM,
  ReviewVM,
  SupplierDetailVM,
} from "./view-models";
import { toProductVM } from "./view-models";
import { selectFeaturedProducts } from "./featured";

// Server-side catalog loaders. Pages call these; components never do.
//
// The demo catalog is small (70 products), so the Results page loads the full
// product list once per request and filters in memory — that keeps facet
// counts and sorts pure and testable. When the catalog outgrows this, these
// are the only functions that change.

const productInclude = {
  supplier: {
    include: {
      reviews: { orderBy: [{ reviewedAt: "desc" }] },
      certifications: { orderBy: { name: "asc" } },
    },
  },
  category: true,
  quantityBreaks: { orderBy: { minQty: "asc" } },
  // Lowest sortOrder first — the seed writes exactly one primary image per
  // product, so the first row is the card/detail image.
  images: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

export async function getAllProducts(): Promise<ProductVM[]> {
  const rows = await db.product.findMany({
    include: productInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => toProductVM(row));
}

export async function getProduct(id: string): Promise<ProductVM | null> {
  const row = await db.product.findUnique({
    where: { id },
    include: productInclude,
  });
  return row ? toProductVM(row) : null;
}

export async function getCategories(): Promise<CategoryVM[]> {
  const rows = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    productCount: row._count.products,
  }));
}

/** Rail size for the home featured section. */
export const FEATURED_PRODUCT_CAP = 10;

/**
 * Featured products for the home rail: one pass over the catalog, then the
 * pure verified-first / category-spread selection — no extra round-trips.
 */
export async function getFeaturedProducts(cap: number = FEATURED_PRODUCT_CAP): Promise<ProductVM[]> {
  const products = await getAllProducts();
  return selectFeaturedProducts(products, cap);
}

export interface SupplierWithCatalog extends SupplierDetailVM {
  products: ProductVM[];
}

export async function getSupplier(slug: string): Promise<SupplierWithCatalog | null> {
  const row = await db.supplier.findUnique({
    where: { slug },
    include: {
      reviews: { orderBy: { reviewedAt: "desc" } },
      certifications: { orderBy: { name: "asc" } },
      products: {
        include: {
          category: true,
          quantityBreaks: { orderBy: { minQty: "asc" } },
          images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row) return null;

  const reviews: ReviewVM[] = row.reviews.map((r) => ({
    score: r.score,
    sourcePlatform: r.sourcePlatform,
    reviewedAt: r.reviewedAt.toISOString(),
    sourceUrl: r.sourceUrl,
    sourceCapturedAt: r.sourceCapturedAt.toISOString(),
    summary: r.summary,
  }));

  const supplierSummary = {
    slug: row.slug,
    name: row.name,
    website: row.website,
    location: row.location,
    status: row.status,
    reviewScore: row.reviewScore,
    reviewCount: row.reviewCount,
    legalIdentity: row.legalIdentity,
    reviews: row.reviews.map((r) => ({ sourcePlatform: r.sourcePlatform })),
    certifications: row.certifications.map((c) => ({ name: c.name })),
  };

  const detail: SupplierWithCatalog = {
    slug: row.slug,
    name: row.name,
    website: row.website,
    location: row.location,
    status: row.status,
    reviewScore: row.reviewScore,
    reviewCount: row.reviewCount,
    reviewPlatform: row.reviews[0]?.sourcePlatform ?? null,
    legalIdentity: row.legalIdentity,
    lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : null,
    reviews,
    certifications: row.certifications.map((c) => ({
      name: c.name,
      sourceUrl: c.sourceUrl,
      sourceCapturedAt: c.sourceCapturedAt.toISOString(),
    })),
    products: row.products.map((p) => toProductVM({ ...p, supplier: supplierSummary })),
  };
  return detail;
}
