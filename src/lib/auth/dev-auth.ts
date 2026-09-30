import { parseUserRole, type UserRole } from "./roles";

// Dev-only auth harness for local dogfooding.
//
// Live Supabase credentials are pending (spec open question), but the supplier
// and admin surfaces are rendered UI that must be walked in a browser before
// merge. When this harness is enabled, the middleware and server session read
// the role from a plain cookie instead of Supabase Auth, and DB queries run
// against a local Postgres with fixture rows (scripts/dev-fixtures.sql).
//
// Hard stops that keep this out of production:
//   - the enable flag requires NODE_ENV !== "production", so a production
//     build ignores AEKOBABA_DEV_AUTH entirely (pinned by dev-auth.test.ts);
//   - the role must still be one of the real role values.

export const DEV_AUTH_COOKIE = "aekobaba-dev-role";

/** Fixture identities the dev session reports once the role cookie is set. */
export function devAuthUserId(role: UserRole): string {
  return `dev-${role.toLowerCase()}-user`;
}

export function devAuthEmail(role: UserRole): string {
  return `${role.toLowerCase()}@dev.aekobaba.test`;
}

/** The harness is live only outside production builds AND when explicitly
 *  enabled by env — both conditions, never either alone. */
export function devAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.AEKOBABA_DEV_AUTH === "1"
  );
}

/** Resolve the dev session role from the cookie value, or null. */
export function devAuthRole(cookieValue: string | undefined): UserRole | null {
  return parseUserRole(cookieValue);
}
