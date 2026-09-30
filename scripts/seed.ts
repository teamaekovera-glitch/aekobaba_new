import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  createCategoryIndexWalker,
  productImageRow,
  writePrimaryImage,
} from "../data/image-mapping";
import { parseSeedFile, type SeedProduct, type SeedSupplier } from "../data/seed-schema";

// Same env loading as prisma.config.ts — the documented `npm run db:seed`
// reads DATABASE_URL from .env (dotenv is otherwise only wired for the CLI).
import "dotenv/config";

/**
 * Idempotent seed importer: npm run db:seed
 *
 * Reads data/aekobaba-seed.json, validates it against the provenance schema,
 * and applies it to Postgres in one transaction:
 *  - categories upserted by slug
 *  - suppliers upserted by slug
 *  - products upserted by (supplierId, title) — the schema's @@unique pair
 *  - quantity breaks / images / reviews replaced per parent (no natural key)
 *  - certifications upserted by (supplierId, name)
 *
 * Re-running against a seeded database updates rows in place; row counts do
 * not grow. No row is ever created without the provenance the schema demands.
 */

const prisma = new PrismaClient({
  // Prisma 7 requires a driver adapter; the connection string comes from
  // DATABASE_URL (local dev: direct Postgres; Supabase: the pooler URL).
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

type Counts = { created: number; updated: number };
const emptyCounts = (): Counts => ({ created: 0, updated: 0 });
const bump = (counts: Counts, existed: boolean): void => {
  counts[existed ? "updated" : "created"] += 1;
};

function loadSeedFile(): ReturnType<typeof parseSeedFile> {
  const dataPath = path.resolve(import.meta.dirname, "../data/aekobaba-seed.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf8"));
  return parseSeedFile(raw);
}

function checkCategoryReferences(seed: ReturnType<typeof parseSeedFile>): void {
  const known = new Set(seed.categories.map((c) => c.slug));
  const unknown = new Set(
    seed.suppliers
      .flatMap((s) => s.products.map((p) => p.categorySlug))
      .filter((slug) => !known.has(slug)),
  );
  if (unknown.size > 0) {
    throw new Error(
      `Products reference categories missing from the seed file: ${[...unknown].join(", ")}`,
    );
  }
}

async function upsertProduct(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  supplierId: string,
  product: SeedProduct,
  categoryId: string,
  counts: { products: Counts; images: number },
  nextImageIndex: (categorySlug: string) => number,
): Promise<number> {
  const values = {
    supplierId,
    title: product.title,
    description: product.description ?? null,
    material: product.material,
    subcategory: product.subcategory ?? null,
    categoryId,
    priceType: product.priceType,
    basePrice: product.basePrice,
    priceBasis: product.priceBasis,
    priceUnit: product.priceUnit,
    moq: product.moq,
    moqUnit: product.moqUnit,
    leadTimeDays: product.leadTimeDays,
    stockOrCustom: product.stockOrCustom,
    samplePolicyVerified: product.samplePolicyVerified,
    sourceUrl: product.sourceUrl,
    sourceCapturedAt: new Date(product.sourceCapturedAt),
  };

  const existing = await tx.product.findUnique({
    where: { supplierId_title: { supplierId, title: product.title } },
  });
  const saved = existing
    ? await tx.product.update({ where: { id: existing.id }, data: values })
    : await tx.product.create({ data: values });
  bump(counts.products, existing !== null);

  // Breaks carry no natural key — replace them so re-runs converge on the
  // dataset's tier table exactly.
  await tx.quantityBreak.deleteMany({ where: { productId: saved.id } });
  if (product.quantityBreaks.length > 0) {
    await tx.quantityBreak.createMany({
      data: product.quantityBreaks.map((b) => ({
        productId: saved.id,
        minQty: b.minQty,
        maxQty: b.maxQty,
        unitPrice: b.unitPrice,
      })),
    });
  }

  // Exactly one primary representative image per product, assigned by the
  // deterministic category mapping (the stable per-category index rotates
  // variants). Replace per product like the breaks — re-runs never
  // duplicate Image rows.
  await writePrimaryImage(tx, saved.id, productImageRow(product, nextImageIndex(product.categorySlug)));
  counts.images += 1;
  return product.quantityBreaks.length;
}

async function upsertSupplier(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  supplier: SeedSupplier,
  categoryIds: Map<string, string>,
  counts: { suppliers: Counts; products: Counts; quantityBreaks: number; images: number },
  nextImageIndex: (categorySlug: string) => number,
): Promise<void> {
  const values = {
    slug: supplier.slug,
    name: supplier.name,
    website: supplier.website,
    location: supplier.location,
    legalIdentity: supplier.legalIdentity,
    status: supplier.status,
    isPartner: supplier.isPartner,
    reviewScore: supplier.review?.score ?? null,
    reviewCount: supplier.review?.count ?? 0,
    lastVerifiedAt: new Date(supplier.sourceCapturedAt),
  };

  const existing = await tx.supplier.findUnique({ where: { slug: supplier.slug } });
  const saved = existing
    ? await tx.supplier.update({ where: { id: existing.id }, data: values })
    : await tx.supplier.create({ data: values });
  bump(counts.suppliers, existing !== null);

  if (supplier.review) {
    const r = supplier.review;
    await tx.review.deleteMany({ where: { supplierId: saved.id, sourcePlatform: r.platform } });
    await tx.review.create({
      data: {
        supplierId: saved.id,
        score: r.score,
        sourcePlatform: r.platform,
        reviewedAt: new Date(r.sourceCapturedAt),
        sourceUrl: r.sourceUrl,
        sourceCapturedAt: new Date(r.sourceCapturedAt),
      },
    });
  }

  for (const cert of supplier.certifications) {
    await tx.certification.upsert({
      where: { supplierId_name: { supplierId: saved.id, name: cert.name } },
      create: {
        supplierId: saved.id,
        name: cert.name,
        sourceUrl: cert.sourceUrl,
        sourceCapturedAt: new Date(cert.sourceCapturedAt),
      },
      update: { sourceUrl: cert.sourceUrl, sourceCapturedAt: new Date(cert.sourceCapturedAt) },
    });
  }

  for (const product of supplier.products) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(
        `Category "${product.categorySlug}" not found for product "${product.title}"`,
      );
    }
    counts.quantityBreaks += await upsertProduct(
      tx,
      saved.id,
      product,
      categoryId,
      counts,
      nextImageIndex,
    );
  }
}

async function main(): Promise<void> {
  const seed = loadSeedFile();
  checkCategoryReferences(seed);

  const counts = {
    categories: emptyCounts(),
    suppliers: emptyCounts(),
    products: emptyCounts(),
    quantityBreaks: 0,
    images: 0,
  };

  await prisma.$transaction(async (tx) => {
    // Categories first, parents before children (the file is pre-ordered).
    const categoryIds = new Map<string, string>();
    for (const category of seed.categories) {
      const values = {
        slug: category.slug,
        name: category.name,
        description: category.description,
      };
      const existing = await tx.category.findUnique({ where: { slug: category.slug } });
      const saved = existing
        ? await tx.category.update({ where: { id: existing.id }, data: values })
        : await tx.category.create({ data: values });
      bump(counts.categories, existing !== null);
      categoryIds.set(saved.slug, saved.id);
    }
    for (const category of seed.categories) {
      if (category.parentSlug) {
        await tx.category.update({
          where: { slug: category.slug },
          data: { parent: { connect: { slug: category.parentSlug } } },
        });
      }
    }

    const nextImageIndex = createCategoryIndexWalker();
    for (const supplier of seed.suppliers) {
      await upsertSupplier(tx, supplier, categoryIds, counts, nextImageIndex);
    }
  });

  console.log(
    JSON.stringify(
      {
        result: "seeded",
        categories: counts.categories,
        suppliers: counts.suppliers,
        products: counts.products,
        quantityBreakRows: counts.quantityBreaks,
        imageRows: counts.images,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
