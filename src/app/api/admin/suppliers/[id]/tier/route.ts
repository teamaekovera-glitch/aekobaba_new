import { jsonError, requireApiRole } from "@/lib/auth/api";
import { db } from "@/lib/db";
import { parseSupplierTier } from "@/lib/admin/tiers";
import { tierSchema } from "@/lib/admin/validation";

// PATCH /api/admin/suppliers/[id]/tier — assign a verification tier.
//
// Persists Supplier.status so the public supplier page's badge reflects the
// admin's decision (spec C12). Middleware does not guard /api/* paths — the
// ADMIN role is enforced here, fail-closed.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRole("ADMIN");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json");
  }

  const parsed = tierSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_tier");

  // parseSupplierTier is the untrusted-value gate; the zod schema already
  // narrowed it, but the parse keeps the enum honest if the schema drifts.
  const tier = parseSupplierTier(parsed.data.tier);
  if (!tier) return jsonError(400, "invalid_tier");

  const supplier = await db.supplier.update({
    where: { id },
    data: { status: tier },
    select: { id: true, slug: true, name: true, status: true },
  });

  return Response.json({ supplier });
}
