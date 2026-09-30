import { redirect } from "next/navigation";

import { db } from "@/lib/db";

import { ACCESS_DENIED_PATH, SIGN_IN_PATH } from "./guard";
import { getServerSessionUser } from "./session";

// Page-level guard for the brand's account areas (quote-request tracking).
// The middleware guard covers /supplier and /admin prefixes; these pages need
// the same fail-closed decision inline — session first, then the database
// role, never a client-supplied value. Returns the User row id the page
// scopes its queries by, so tenancy and authorization resolve together.

export async function requireBrandPage(nextPath: string): Promise<{ id: string }> {
  const session = await getServerSessionUser();
  if (!session) {
    redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(nextPath)}`);
  }

  const user = await db.user.findUnique({
    where: { supabaseUserId: session.supabaseUserId },
    select: { id: true, role: true },
  });
  // A session without a provisioned row (or a non-brand role) never grants
  // access — the same matrix as guardDecision, just inside a Server Component.
  if (!user || user.role !== "BRAND") {
    redirect(ACCESS_DENIED_PATH);
  }

  return { id: user.id };
}
