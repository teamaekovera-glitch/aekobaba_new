import { jsonError } from "@/lib/auth/api";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { claimListing, type ClaimFailureReason } from "@/lib/supplier/claim";
import { claimSchema } from "@/lib/supplier/validation";

// POST /api/supplier/claim — claim an unclaimed supplier listing.
//
// The session identity is the claimer; the email must be Supabase-verified
// before a claim is accepted (the listing owner receives the lead inbox, so
// an unverified claim would be an unaddressable one). On success the supplier
// lands in the admin queue at PENDING and the user's role becomes SUPPLIER.

const CLAIM_FAILURE_STATUS: Record<ClaimFailureReason, number> = {
  not_found: 404,
  already_claimed: 409,
  account_missing: 409,
  already_owns_supplier: 409,
};

export async function POST(request: Request) {
  const session = await getServerSessionUser();
  if (!session) return jsonError(401, "unauthenticated");

  if (!session.emailVerified) return jsonError(403, "email_not_verified");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json");
  }

  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_slug");

  // The narrow store keeps the claim transaction explicit; db satisfies it
  // structurally.
  const result = await claimListing(db, {
    supabaseUserId: session.supabaseUserId,
    slug: parsed.data.slug,
  });

  if (!result.ok) {
    return jsonError(CLAIM_FAILURE_STATUS[result.reason], result.reason);
  }

  return Response.json({
    supplier: {
      slug: result.supplier.slug,
      name: result.supplier.name,
      status: result.supplier.status,
    },
  });
}
