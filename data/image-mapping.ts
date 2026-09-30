/**
 * Deterministic product → representative-image mapping for the seed layer.
 *
 * The generated packshot library (public/products/) holds one studio-style
 * asset per packaging archetype, with extra variants for the deepest
 * categories. Assignment is data, not code: this table plus a pure selection
 * function is the single source the seed importer uses to fill the existing
 * Image model, so the same product always resolves to the same image across
 * runs.
 *
 * Selection, per product:
 *  1. a category-specific signal (subcategory/title/material wording) picks
 *     the closest variant where one matches;
 *  2. otherwise a multi-variant category rotates through its variant pool by
 *     the product's stable per-category index (seed-file order), so grids get
 *     variety without ever being non-deterministic; single-asset categories
 *     always return their archetype.
 *
 * Honesty rule: these are generated, representative images — never photos of
 * the actual supplier's stock. Every alt text says "representative".
 */

export const IMAGE_URL_PREFIX = "/products";

/** Asset file names under public/products/, without the .png extension. */
export const CATEGORY_VARIANTS: Record<string, readonly string[]> = {
  "pouches-bags": ["stand-up-pouch", "kraft-pouch", "coffee-valve-pouch"],
  "plastic-bottles": ["plastic-bottle"],
  "plastic-jars": ["plastic-jar"],
  "tubs-pails": ["tub-cup"],
  "folding-cartons": ["folding-carton"],
  labels: ["label-roll"],
  closures: ["closure-caps"],
  "pumps-sprayers": ["airless-pump"],
  corrugated: ["corrugated-box"],
  "glass-bottles": ["glass-bottle", "glass-bottle-amber"],
  "glass-jars": ["glass-jar"],
  "collapsible-tubes": ["laminate-tube"],
  "metal-cans": ["metal-can"],
  "metal-tins": ["metal-tin"],
  "sachets-stick-packs": ["sachet-stick"],
  rollstock: ["film-roll"],
  "shrink-sleeves": ["shrink-sleeve"],
  thermoforms: ["blister-clamshell"],
  "setup-boxes": ["rigid-box"],
  "droppers-vials": ["dropper-vial"],
  aerosols: ["aerosol-can"],
  mailers: ["mailer-bag", "mailer-kraft"],
  "cr-cannabis": ["child-resistant-jar"],
  compostables: ["compostable-pouch"],
  "brand-accessories": ["hang-tag-sticker"],
};

export interface SeedProductImageInput {
  categorySlug: string;
  /** Optional in the seed schema, nullable in the database — both mean "none". */
  subcategory?: string | null;
  title: string;
  material: string;
}

export interface ProductImageRow {
  url: string;
  alt: string;
  sortOrder: number;
}

/**
 * Ordered signal rules per multi-variant category, matched case-insensitively
 * against "<subcategory> <title> <material>". First match wins — e.g. a
 * kraft-and-coffee pouch is a kraft pouch. Categories not listed here rotate
 * (or return their single asset).
 */
const CATEGORY_SIGNALS: Partial<Record<string, readonly { pattern: RegExp; asset: string }[]>> = {
  // Kraft → kraft pouch; coffee or a one-way valve → the valve-pouch
  // archetype; everything else is the generic stand-up pouch.
  "pouches-bags": [
    { pattern: /\bkraft\b/, asset: "kraft-pouch" },
    { pattern: /\bcoffee\b|\bvalve\b/, asset: "coffee-valve-pouch" },
  ],
  // Boston rounds: match the bottle colour the product actually states.
  "glass-bottles": [
    { pattern: /\bamber\b/, asset: "glass-bottle-amber" },
    { pattern: /\bflint\b|\bclear\b/, asset: "glass-bottle" },
  ],
  // Rigid cardboard postal formats (boxes, book wraps, tubes — including the
  // French "boîte" listings) read as the kraft mailer, not the poly bag.
  mailers: [
    { pattern: /cardboard|corrugated|kraft|\bbox(es)?\b|postal tube|bo[îi]te/, asset: "mailer-kraft" },
  ],
};

/**
 * A stable per-category product index: walk the seed file in order and count
 * products per category. Exported so the importer and the tests walk products
 * in the same order and rotation stays reproducible.
 */
export function createCategoryIndexWalker(): (categorySlug: string) => number {
  const counters = new Map<string, number>();
  return (categorySlug) => {
    const index = counters.get(categorySlug) ?? 0;
    counters.set(categorySlug, index + 1);
    return index;
  };
}

/** The representative asset for one product. Throws on an unknown category. */
export function productImageAsset(product: SeedProductImageInput, indexInCategory: number): string {
  const variants = CATEGORY_VARIANTS[product.categorySlug];
  if (!variants) {
    throw new Error(
      `No representative image mapping for category "${product.categorySlug}" (product "${product.title}")`,
    );
  }

  const haystack = `${product.subcategory ?? ""} ${product.title} ${product.material}`.toLowerCase();
  const signal = CATEGORY_SIGNALS[product.categorySlug]?.find(({ pattern }) => pattern.test(haystack));
  if (signal) return signal.asset;

  return variants[indexInCategory % variants.length];
}

/** The exactly-one primary Image row the seeder writes for a product. */
export function productImageRow(product: SeedProductImageInput, indexInCategory: number): ProductImageRow {
  const asset = productImageAsset(product, indexInCategory);
  return {
    url: `${IMAGE_URL_PREFIX}/${asset}.png`,
    alt: `${product.title} — representative packaging image`,
    sortOrder: 0,
  };
}

/**
 * Category-level representative asset for navigation surfaces (home popular
 * tiles, category grid rows): the category's first variant — its archetypal
 * packshot. Categories outside the mapping table (or the hero composition)
 * return null so callers can fall back to a text-only tile.
 */
export function categoryImageAsset(categorySlug: string): string | null {
  const variants = CATEGORY_VARIANTS[categorySlug];
  return variants ? `${IMAGE_URL_PREFIX}/${variants[0]}.png` : null;
}

/** Minimal Prisma delegate shape the image writer needs. */
export interface ImageWriteDelegate {
  image: {
    deleteMany(args: { where: { productId: string } }): Promise<unknown>;
    createMany(args: {
      data: { productId: string; url: string; alt: string; sortOrder: number }[];
    }): Promise<unknown>;
  };
}

/**
 * Replace a product's image rows with its single primary representative
 * image. Image rows carry no natural key, so delete-then-create is what keeps
 * re-seeding idempotent: exactly one Image row per product, no matter how
 * many times the importer runs.
 */
export async function writePrimaryImage(
  tx: ImageWriteDelegate,
  productId: string,
  image: ProductImageRow,
): Promise<void> {
  await tx.image.deleteMany({ where: { productId } });
  await tx.image.createMany({
    data: [{ productId, url: image.url, alt: image.alt, sortOrder: image.sortOrder }],
  });
}
