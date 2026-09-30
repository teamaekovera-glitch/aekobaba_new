import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CategoryManager } from "@/components/admin/category-manager";
import { WorkspaceShell } from "@/components/workspace/shell";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Categories · Aekobaba",
  description: "Manage the packaging taxonomy — create, rename, and prune categories.",
};

// Admin category management: the taxonomy rows are seeded from the CPG
// Packaging Taxonomy research; this surface only moves rows (create, rename,
// re-parent via parent picker on create, delete empty leaves). Deletion of a
// category that products still reference is refused at the API — the UI
// disables the button and says why.

export default async function AdminCategoriesPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth/sign-in?next=%2Fadmin%2Fcategories");

  const [categories, productCounts, childCounts] = await Promise.all([
    db.category.findMany({
      select: { id: true, slug: true, name: true, description: true, parentId: true },
      orderBy: { name: "asc" },
    }),
    db.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
    db.category.groupBy({ by: ["parentId"], _count: { _all: true } }),
  ]);

  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const productsBy = new Map(productCounts.map((p) => [p.categoryId, p._count._all]));
  const childCountBy = (id: string) =>
    childCounts.find((c) => c.parentId === id)?._count._all ?? 0;

  const rows = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    parentId: c.parentId,
    parentName: c.parentId ? (nameById.get(c.parentId) ?? null) : null,
    productCount: productsBy.get(c.id) ?? 0,
    childCount: childCountBy(c.id),
  }));

  return (
    <WorkspaceShell
      area="admin"
      title="Categories"
      subtitle="The taxonomy brands filter and browse by. Seeded from the packaging research; edit here when it needs to grow."
    >
      <CategoryManager categories={rows} />
    </WorkspaceShell>
  );
}
