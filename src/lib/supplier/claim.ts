// Claim-listing flow (build spec art_MObD9666, supplier & admin surfaces).
//
// A supplier claims their public listing: the claimed Supplier row is bound to
// the claiming user (ownerUserId) and lands in the admin queue at PENDING —
// tiering is the admin's call, never an automatic upgrade. The claiming user's
// role becomes SUPPLIER so the existing middleware guard lets them into the
// lead inbox.
//
// Preconditions enforced ABOVE this module (route layer):
//   - the session is authenticated (identity from Supabase, never a form field)
//   - the session email is verified (Supabase email_confirmed_at)
//
// The store is a narrow interface — PrismaClient satisfies it structurally —
// so the decision logic is unit-testable against a stub without a live
// database (live Supabase credentials remain pending per the spec).

export type ClaimFailureReason =
  | "not_found"
  | "already_claimed"
  | "account_missing"
  | "already_owns_supplier";

export type ClaimResult =
  | {
      ok: true;
      supplier: { id: string; slug: string; name: string; status: string };
    }
  | { ok: false; reason: ClaimFailureReason };

/**
 * The slice of PrismaClient the claim transaction touches. Every field is
 * selected explicitly so the caller cannot accidentally widen the query
 * surface (commercial facts, reviews, etc. stay unread).
 */
export interface ClaimStore {
  supplier: {
    findUnique(args: {
      where: { slug: string };
      select: { id: true; slug: true; name: true; status: true; ownerUserId: true };
    }): Promise<{
      id: string;
      slug: string;
      name: string;
      status: string;
      ownerUserId: string | null;
    } | null>;
    update(args: {
      where: { id: string };
      data: { ownerUserId: string; status: "PENDING" };
      select: { id: true; slug: true; name: true; status: true };
    }): Promise<{ id: string; slug: string; name: string; status: string }>;
    findFirst(args: {
      where: { ownerUserId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  user: {
    findUnique(args: {
      where: { supabaseUserId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    update(args: {
      where: { id: string };
      data: { role: "SUPPLIER" };
      select: { id: true; role: true };
    }): Promise<{ id: string; role: string }>;
  };
}

/**
 * Claim an unclaimed supplier listing for the signed-in user.
 *
 * - Unknown slug → not_found.
 * - Listing already claimed (owner set) → already_claimed. One owner per
 *   listing, enforced again by the DB unique constraint on ownerUserId.
 * - Session identity with no User row → account_missing. Provisioning runs at
 *   sign-in, so this means the session raced (or bypassed) provisioning —
 *   surfaced, never papered over.
 * - User already owns a different supplier → already_owns_supplier. The spec's
 *   role model gives a SUPPLIER user exactly one claimed supplier's inbox.
 * - Success → supplier PENDING (queued for admin), user role SUPPLIER.
 */
export async function claimListing(
  store: ClaimStore,
  input: { supabaseUserId: string; slug: string },
): Promise<ClaimResult> {
  const supplier = await store.supplier.findUnique({
    where: { slug: input.slug },
    select: { id: true, slug: true, name: true, status: true, ownerUserId: true },
  });

  if (!supplier) return { ok: false, reason: "not_found" };
  if (supplier.ownerUserId !== null) return { ok: false, reason: "already_claimed" };

  const user = await store.user.findUnique({
    where: { supabaseUserId: input.supabaseUserId },
    select: { id: true },
  });

  if (!user) return { ok: false, reason: "account_missing" };

  const existingOwner = await store.supplier.findFirst({
    where: { ownerUserId: user.id },
    select: { id: true },
  });

  if (existingOwner) return { ok: false, reason: "already_owns_supplier" };

  // Claim + role upgrade. Two writes (no interactive transaction in the narrow
  // store): a failure between them leaves the listing claimed but the role
  // unchanged — the user can retry sign-in, and the admin queue still sees the
  // PENDING claim. Role is never derived from the supplier row on read.
  const claimed = await store.supplier.update({
    where: { id: supplier.id },
    data: { ownerUserId: user.id, status: "PENDING" },
    select: { id: true, slug: true, name: true, status: true },
  });

  await store.user.update({
    where: { id: user.id },
    data: { role: "SUPPLIER" },
    select: { id: true, role: true },
  });

  return { ok: true, supplier: claimed };
}
