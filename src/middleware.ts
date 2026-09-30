import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  DEV_AUTH_COOKIE,
  devAuthEnabled,
  devAuthRole,
} from "@/lib/auth/dev-auth";
import { guardDecision, guardForPath } from "@/lib/auth/guard";
import { parseUserRole } from "@/lib/auth/roles";
import { supabaseEnv } from "@/lib/supabase/server";

// Edge middleware (Node.js middleware runtime is unavailable in Next 15.5 —
// a `runtime: "nodejs"` config silently drops the middleware from the build).
//
// Two responsibilities:
// 1. Always refresh Supabase auth cookies, so Server Components observe a
//    current session.
// 2. Enforce role guards on /supplier/* and /admin/*. The role is read live
//    from the database through the `current_user_role` RPC (docs/
//    supabase-setup.md) — the DB is the source of truth, never the JWT.
//    Failures of every kind (no env, no session, no RPC function, unknown
//    role) resolve to "no access" — the guard never fails open.

export async function middleware(request: NextRequest) {
  const requiredRole = guardForPath(request.nextUrl.pathname);

  // Public route: forward as-is. Anonymous browsing never touches auth.
  if (!requiredRole) return NextResponse.next({ request });

  // Dev harness (pending Supabase creds): role comes from the dev cookie and
  // the same fail-closed decision matrix. Inert in production builds.
  if (devAuthEnabled()) {
    const devRole = devAuthRole(request.cookies.get(DEV_AUTH_COOKIE)?.value);
    const devDecision = guardDecision({
      pathWithQuery: request.nextUrl.pathname + request.nextUrl.search,
      hasSession: devRole !== null,
      role: devRole,
    });
    if (devDecision.kind === "redirect") {
      return NextResponse.redirect(
        new URL(devDecision.to, request.nextUrl.origin),
      );
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const env = supabaseEnv();

  // No Supabase config → no session can exist → fail closed.
  if (!env) return redirectToSignIn(request);

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return redirectToSignIn(request);

  // Role read from the DB at request time. Any failure → null → denied.
  const { data: roleValue, error: roleError } = await supabase.rpc(
    "current_user_role",
  );
  const role = roleError ? null : parseUserRole(roleValue);

  const decision = guardDecision({
    pathWithQuery: request.nextUrl.pathname + request.nextUrl.search,
    hasSession: true,
    role,
  });

  if (decision.kind === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.nextUrl.origin));
  }

  return response;
}

function redirectToSignIn(request: NextRequest): NextResponse {
  const target = new URL("/auth/sign-in", request.nextUrl.origin);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (next && next !== "/") target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}

export const config = {
  matcher: [
    // Everything except static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
