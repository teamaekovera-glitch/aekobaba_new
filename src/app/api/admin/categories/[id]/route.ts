import { jsonError, requireApiRole } from "@/lib/auth/api";
import { db } from "@/lib/db";
import {
  deleteCategory,
  updateCategory,
  type CategoryFailureReason,
} from "@/lib/admin/categories";
import { categoryUpdateSchema } from "@/lib/admin/validation";

// PATCH /api/admin/categories/[id] — rename / re-parent / re-describe.
// DELETE /api/admin/categories/[id] — delete an empty, childless category.
//
// slug is intentionally absent from the update schema: it is the public key
// used by URLs and the seed importer, so it never changes after create.
// Middleware does not guard /api/* paths — the ADMIN role is enforced here.

const FAILURE_STATUS: Record<CategoryFailureReason, number> = {
  not_found: 404,
  slug_taken: 409,
  parent_missing: 400,
  parent_cycle: 400,
  has_products: 409,
  has_children: 409,
  invalid_name: 400,
};

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

  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_category");

  const result = await updateCategory(db, { id, ...parsed.data });

  if (!result.ok) {
    return jsonError(FAILURE_STATUS[result.reason], result.reason);
  }

  return Response.json({ category: result.category });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRole("ADMIN");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);

  const { id } = await params;

  const result = await deleteCategory(db, id);

  if (!result.ok) {
    return jsonError(FAILURE_STATUS[result.reason], result.reason);
  }

  return Response.json({ ok: true });
}
