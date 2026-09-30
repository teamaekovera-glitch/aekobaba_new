// Tier assignment for the admin verification queue (build spec art_MObD9666).
//
// A tier is any SupplierStatus except PENDING — PENDING is the pre-verification
// state a claim produces, not something an admin assigns. The union is
// re-declared here (not imported from Prisma) for the same reason roles.ts
// exists: API/edge layers validate against a plain union, and a contract test
// pins this list against prisma/schema.prisma so the two cannot drift.

export const TIER_VALUES = [
  "LISTED",
  "RECOMMENDED",
  "QUOTE_ONLY",
  "DISABLED",
] as const;

export type SupplierTier = (typeof TIER_VALUES)[number];

/** Validate an untrusted tier value (request body). Anything else → null. */
export function parseSupplierTier(value: unknown): SupplierTier | null {
  if (typeof value !== "string") return null;
  return (TIER_VALUES as readonly string[]).includes(value)
    ? (value as SupplierTier)
    : null;
}

/** Human label for the public tier badge. */
export const TIER_LABELS: Record<SupplierTier, string> = {
  LISTED: "Listed",
  RECOMMENDED: "Recommended",
  QUOTE_ONLY: "Quote only",
  DISABLED: "Disabled",
};
