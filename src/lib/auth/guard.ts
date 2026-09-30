import type { UserRole } from "./roles";

// Route guards per the build spec: /supplier/* is for SUPPLIER users, /admin/*
// for ADMIN. Everything else — the entire public brand journey — is anonymous.
// Pure logic so middleware wiring stays thin and the decision matrix is unit-
// testable without a live provider.

export interface GuardedPrefix {
  prefix: string;
  requiredRole: UserRole;
}

export const GUARD_RULES: readonly GuardedPrefix[] = [
  { prefix: "/supplier", requiredRole: "SUPPLIER" },
  { prefix: "/admin", requiredRole: "ADMIN" },
];

/**
 * Paths under a guarded prefix that ANY signed-in user may open. The claim
 * page is how a brand user becomes a supplier — requiring SUPPLIER there
 * would make the flow unreachable. Anything else under /supplier and /admin
 * keeps its strict role.
 */
export const ANY_AUTH_PATHS: readonly string[] = ["/supplier/claim"];

export const SIGN_IN_PATH = "/auth/sign-in";
export const ACCESS_DENIED_PATH = "/auth/access-denied";

/**
 * The role required to open this path, or null when the path is public.
 * `/supplier` and `/supplier/inbox/123` both guard; `/suppliers` (no slash
 * boundary) must not.
 */
export function guardForPath(pathname: string): UserRole | null {
  for (const rule of GUARD_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.requiredRole;
    }
  }
  return null;
}

/** True when the path opens to any signed-in user (see ANY_AUTH_PATHS). */
export function isAnyAuthPath(pathname: string): boolean {
  return ANY_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export type GuardDecision =
  | { kind: "allow" }
  | { kind: "redirect"; to: string };

/**
 * Decide what happens to this request. Fail-closed: a missing row, missing
 * role, or unknown role never grants access to a guarded area.
 *
 * @param pathWithQuery the full request target, e.g. "/supplier/inbox?page=2"
 *   — the guarded match uses the pathname; a sign-in redirect preserves the
 *   whole target as its `next` parameter.
 */
export function guardDecision(input: {
  pathWithQuery: string;
  hasSession: boolean;
  role: UserRole | null;
}): GuardDecision {
  const [pathname, search = ""] = splitPathQuery(input.pathWithQuery);
  const requiredRole = guardForPath(pathname);
  if (!requiredRole) return { kind: "allow" };

  if (!input.hasSession) {
    // Preserve where the visitor was headed so sign-in can return them there.
    const next = encodeURIComponent(`${pathname}${search}`);
    return { kind: "redirect", to: `${SIGN_IN_PATH}?next=${next}` };
  }

  if (input.role !== requiredRole && !isAnyAuthPath(pathname)) {
    return { kind: "redirect", to: ACCESS_DENIED_PATH };
  }

  return { kind: "allow" };
}

/** Split "/inbox?page=2" into ["/inbox", "?page=2"]. */
function splitPathQuery(pathWithQuery: string): [string, string] {
  const queryStart = pathWithQuery.indexOf("?");
  if (queryStart === -1) return [pathWithQuery, ""];
  return [pathWithQuery.slice(0, queryStart), pathWithQuery.slice(queryStart)];
}

/**
 * Convenience for future server-component guards (supplier/admin layouts):
 * same decision, wrapped for the `authorize-or-redirect` shape.
 */
export function authorizePath(
  pathWithQuery: string,
  session: { role: UserRole | null } | null,
): GuardDecision {
  return guardDecision({
    pathWithQuery,
    hasSession: session !== null,
    role: session?.role ?? null,
  });
}
