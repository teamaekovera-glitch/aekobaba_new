// Role model for auth guards. The Prisma `Role` enum (BRAND | SUPPLIER | ADMIN)
// is the database contract; this module re-declares those values as a plain
// union so edge middleware can validate roles WITHOUT importing Prisma into
// the edge bundle. guard.test.ts pins the two against prisma/schema.prisma so
// they cannot drift apart.

export const ROLE_VALUES = ["BRAND", "SUPPLIER", "ADMIN"] as const;

export type UserRole = (typeof ROLE_VALUES)[number];

/** Validate an untrusted role value (DB/RPC payload). Anything else → null. */
export function parseUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") return null;
  return (ROLE_VALUES as readonly string[]).includes(value)
    ? (value as UserRole)
    : null;
}
