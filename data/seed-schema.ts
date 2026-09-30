import { z } from "zod";

/**
 * Validation contract for data/aekobaba-seed.json.
 *
 * The Aekobaba truth rule lives here: every commercial fact (price, MOQ,
 * lead time, review score, certification) must carry a dated snapshot of the
 * page it was read from. Absent values are OMITTED — never estimated, never
 * defaulted — so the UI can render "Ask the supplier" honestly.
 *
 * Every object is strict: a misspelled key fails validation instead of being
 * silently stripped, because a silently dropped field is silently dropped
 * provenance.
 */

/** ISO date string ("YYYY-MM-DD") — the day the source page was captured. */
const isoDate = z.string().date();

/** Verbatim source URL of the page a fact was read from. */
const sourceUrl = z.url();

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase-hyphen slug");

/** Where a fact came from. Required inline on suppliers, products, reviews, and certifications. */
const provenance = { sourceUrl, sourceCapturedAt: isoDate } as const;

export const priceTypeSchema = z.enum(["EXACT", "CALCULATOR", "FROM", "QUOTE_ONLY"]);
export type PriceType = z.infer<typeof priceTypeSchema>;

export const stockOrCustomSchema = z.enum(["STOCK", "CUSTOM"]);
export type StockOrCustom = z.infer<typeof stockOrCustomSchema>;

export const supplierStatusSchema = z.enum([
  "PENDING",
  "LISTED",
  "RECOMMENDED",
  "QUOTE_ONLY",
  "DISABLED",
]);
export type SupplierStatus = z.infer<typeof supplierStatusSchema>;

/**
 * Quantity-tier pricing ("500-999 → $0.47"). The top tier may stay open
 * (maxQty null). unitPrice is the price the supplier page publishes for that
 * tier, in the product's published basis — a per-order total is never stored
 * here, because it would render as a per-unit price.
 */
export const quantityBreakSchema = z
  .strictObject({
    minQty: z.number().int().min(1),
    maxQty: z.number().int().min(1).nullable(),
    unitPrice: z.number().positive(),
  })
  .superRefine((tier, ctx) => {
    if (tier.maxQty !== null && tier.maxQty < tier.minQty) {
      ctx.addIssue({
        code: "custom",
        path: ["maxQty"],
        message: `maxQty ${tier.maxQty} is below minQty ${tier.minQty}`,
      });
    }
  });
export type QuantityBreak = z.infer<typeof quantityBreakSchema>;

/**
 * One real SKU from one supplier. Nullable commercial fields (basePrice,
 * moq, leadTimeDays) mean the supplier does not publish the value — the UI
 * must render "Ask the supplier". A null must never be replaced with an
 * estimate, midpoint, or range.
 */
export const productSchema = z
  .strictObject({
    title: z.string().min(1),
    description: z.string().optional(),
    material: z.string().min(1),
    /** Taxonomy subtype label where the source docs name one (e.g. "Boston round"). */
    subcategory: z.string().min(1).optional(),
    /** Reference into the seeded Category tree (by slug). */
    categorySlug: slug,
    priceType: priceTypeSchema,
    /** null/absent ⇒ the supplier publishes no price — "Ask the supplier". */
    basePrice: z.number().positive().nullable(),
    /** The unit the price is quoted in, including currency ("per case of 24 (USD)"). */
    priceBasis: z.string().min(1).nullable(),
    /** Per-unit figure the source page itself states, shown next to the basis. */
    priceUnit: z.number().positive().nullable(),
    /** null ⇒ the supplier publishes no MOQ — "Ask the supplier". */
    moq: z.number().int().positive().nullable(),
    moqUnit: z.string().min(1).nullable(),
    /** null ⇒ the supplier publishes no lead time — "Ask the supplier". */
    leadTimeDays: z.number().int().positive().nullable(),
    stockOrCustom: stockOrCustomSchema,
    /** The sample-request button only renders when the sample policy is verified. */
    samplePolicyVerified: z.boolean(),
    ...provenance,
    quantityBreaks: z.array(quantityBreakSchema),
  })
  .superRefine((product, ctx) => {
    if (product.priceType === "EXACT" && product.basePrice === null) {
      ctx.addIssue({
        code: "custom",
        path: ["basePrice"],
        message: "an EXACT product must carry a basePrice — omit the priceType or use QUOTE_ONLY",
      });
    }
    if (product.priceType === "QUOTE_ONLY" && product.basePrice !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["basePrice"],
        message: "a QUOTE_ONLY product must not carry a basePrice",
      });
    }
    for (let i = 1; i < product.quantityBreaks.length; i++) {
      if (product.quantityBreaks[i].minQty <= product.quantityBreaks[i - 1].minQty) {
        ctx.addIssue({
          code: "custom",
          path: ["quantityBreaks", i, "minQty"],
          message: "quantity breaks must be strictly ascending by minQty",
        });
      }
    }
  });
export type SeedProduct = z.infer<typeof productSchema>;

/**
 * Aggregate review evidence as observed on a permitted platform: rating
 * value, review count, platform name, deep link, capture date. Review text is
 * never mirrored — the permissions doc allows attributed aggregates only.
 */
export const reviewSourceSchema = z.strictObject({
  score: z.number().positive(),
  count: z.number().int().min(0),
  platform: z.string().min(1),
  ...provenance,
});
export type ReviewSource = z.infer<typeof reviewSourceSchema>;

export const certificationSchema = z.strictObject({
  name: z.string().min(1),
  ...provenance,
});
export type SeedCertification = z.infer<typeof certificationSchema>;

export const supplierSchema = z.strictObject({
  slug,
  name: z.string().min(1),
  website: z.url(),
  location: z.string().min(1),
  /** Registered legal entity where the research docs name one — a verification gate. */
  legalIdentity: z.string().min(1).nullable(),
  status: supplierStatusSchema,
  isPartner: z.boolean(),
  /** Provenance for the supplier's own facts (name, location, legal identity). */
  ...provenance,
  review: reviewSourceSchema.nullable(),
  certifications: z.array(certificationSchema),
  products: z.array(productSchema),
});
export type SeedSupplier = z.infer<typeof supplierSchema>;

export const categorySchema = z.strictObject({
  slug,
  name: z.string().min(1),
  description: z.string().min(1).nullable(),
  /** Parent category slug, when the taxonomy nests this category. */
  parentSlug: slug.nullable(),
});
export type SeedCategory = z.infer<typeof categorySchema>;

export const seedFileSchema = z.strictObject({
  meta: z.strictObject({
    name: z.string().min(1),
    transcribedAt: isoDate,
    /** Artifact ids of the research corpus this dataset was transcribed from. */
    sources: z.array(z.string().min(1)).min(1),
  }),
  categories: z.array(categorySchema),
  suppliers: z.array(supplierSchema),
});
export type SeedFile = z.infer<typeof seedFileSchema>;

/**
 * Parse (and default-fill) a seed file, or throw a readable error listing
 * every violated rule. The importer refuses to touch the database unless the
 * whole file validates first.
 */
export function parseSeedFile(value: unknown): SeedFile {
  const result = seedFileSchema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 20)
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    const more =
      result.error.issues.length > issues.length
        ? `\n  ... and ${result.error.issues.length - issues.length} more`
        : "";
    throw new Error(`Seed dataset failed provenance validation:\n${issues.join("\n")}${more}`);
  }
  return result.data;
}
