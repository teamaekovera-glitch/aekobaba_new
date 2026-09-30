import { jsonError, requireApiRole } from "@/lib/auth/api";
import { db } from "@/lib/db";
import { createCategory } from "@/lib/admin/categories";
import { categoryCreateSchema } from "@/lib/admin/validation";

// POST /api/admin/categories — create a category (admin CRUD).
//
// The taxonomy data itself is seeded separately from the CPG Packaging
// Taxonomy research; this route only moves rows. Middleware does not guard
// /api/* paths — the ADMIN role is enforced here, fail-closed.

const CREATE_FAILURE_STATUS: Record<string, number> = {
  invalid_name: 400,
  parent_missing: 400,
  slug_taken: 409,
};

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json");
  }

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_category");

  const result = await createCategory(db, parsed.data);

  if (!result.ok) {
    return jsonError(CREATE_FAILURE_STATUS[result.reason] ?? 400, result.reason);
  }

  return Response.json({ category: result.category }, { status: 201 });
}
