import type { UserRole } from "./roles";

import { getCurrentUserRole, getServerSessionUser } from "./session";

// Role enforcement for API route handlers.
//
// Edge middleware guards PAGE paths only: guardForPath matches /supplier and
// /admin prefixes, which /api/supplier/... and /api/admin/... are NOT under.
// Every API route therefore enforces its own role here — fail-closed, same
// decision matrix as the page guards.

export type ApiDeny =
  | { kind: "deny"; status: 401; code: "unauthenticated" }
  | { kind: "deny"; status: 403; code: "missing_role" | "role_mismatch" };

export type ApiAuth =
  | { kind: "ok"; supabaseUserId: string; role: UserRole }
  | ApiDeny;

/**
 * Require a signed-in session whose DB-backed role equals `role`.
 * Anonymous → 401; signed in without the right role → 403. The role is read
 * from the database at request time (source of truth), never from a claim.
 */
export async function requireApiRole(role: UserRole): Promise<ApiAuth> {
  const user = await getServerSessionUser();
  if (!user) return { kind: "deny", status: 401, code: "unauthenticated" };

  const dbRole = await getCurrentUserRole(user.supabaseUserId);
  if (!dbRole) return { kind: "deny", status: 403, code: "missing_role" };
  if (dbRole !== role) return { kind: "deny", status: 403, code: "role_mismatch" };

  return { kind: "ok", supabaseUserId: user.supabaseUserId, role: dbRole };
}

export function jsonError(status: number, code: string): Response {
  return Response.json({ error: code }, { status });
}
