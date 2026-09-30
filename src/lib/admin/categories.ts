// Category management for the admin surface (build spec art_MObD9666 —
// "category management CRUD"; the taxonomy itself is seeded separately from
// the CPG Packaging Taxonomy research — this module moves rows, it never
// authors catalog data).
//
// Rules the CRUD enforces:
// - slug is the public key used by URLs and the seed importer → immutable
//   after create; generated from the name when not supplied.
// - a category with products cannot be deleted — the FK would orphan real,
//   sourced SKUs. Reassign them first.
// - a category with children cannot be deleted — reassign the subtree first.
// - a category cannot become its own descendant (the ancestor walk rejects
//   cycles before Prisma ever sees them).
//
// The store is a narrow interface so the logic is unit-testable against a
// stub without a live database.

export type CategoryFailureReason =
  | "not_found"
  | "slug_taken"
  | "parent_missing"
  | "parent_cycle"
  | "has_products"
  | "has_children"
  | "invalid_name";

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
}

/** The slice of PrismaClient the category CRUD touches. Method params mirror
 *  the shapes the implementation actually passes; Prisma satisfies these
 *  structurally (default selects return full rows, compatible with
 *  CategoryRow). */
export interface CategoryStore {
  category: {
    findUnique(args: {
      where: { slug: string } | { id: string };
      select?: {
        id: true;
        slug: true;
        name: true;
        description: true;
        parentId: true;
      };
    }): Promise<CategoryRow | null>;
    findMany(args: {
      where?: { parentId: string };
      select?: { id: true };
    }): Promise<Array<{ id: string }>>;
    create(args: {
      data: {
        slug: string;
        name: string;
        description?: string;
        parentId?: string;
      };
    }): Promise<CategoryRow>;
    update(args: {
      where: { id: string };
      data: { name?: string; description?: string | null; parentId?: string | null };
    }): Promise<CategoryRow>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
  product: {
    count(args: { where: { categoryId: string } }): Promise<number>;
  };
}

/** URL-safe slug: lowercase, trim, non-alphanumeric runs → single dash. */
export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Walk up the parent chain from `startId`. The walk terminates on a cycle or
 * a missing parent — a broken chain must never loop forever.
 */
async function ancestorIds(
  store: CategoryStore,
  startId: string,
): Promise<Set<string>> {
  const seen = new Set<string>();
  let currentId: string | null = startId;
  while (currentId !== null && !seen.has(currentId)) {
    seen.add(currentId);
    const row: CategoryRow | null = await store.category.findUnique({
      where: { id: currentId },
      select: { id: true, slug: true, name: true, description: true, parentId: true },
    });
    currentId = row?.parentId ?? null;
  }
  return seen;
}

export type CategoryWriteResult =
  | { ok: true; category: CategoryRow }
  | { ok: false; reason: CategoryFailureReason };

export async function createCategory(
  store: CategoryStore,
  input: {
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
  },
): Promise<CategoryWriteResult> {
  const name = input.name.trim();
  if (name.length === 0) return { ok: false, reason: "invalid_name" };

  const slug = slugifyCategory(input.slug ?? name);
  if (slug.length === 0) return { ok: false, reason: "invalid_name" };

  if (await store.category.findUnique({ where: { slug } })) {
    return { ok: false, reason: "slug_taken" };
  }

  if (input.parentId !== undefined) {
    const parent = await store.category.findUnique({
      where: { id: input.parentId },
    });
    if (!parent) return { ok: false, reason: "parent_missing" };
  }

  const category = await store.category.create({
    data: {
      slug,
      name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    },
  });

  return { ok: true, category };
}

export async function updateCategory(
  store: CategoryStore,
  input: {
    id: string;
    name?: string;
    description?: string | null;
    parentId?: string | null;
  },
): Promise<CategoryWriteResult> {
  const existing = await store.category.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, reason: "not_found" };

  if (input.name !== undefined && input.name.trim() === "") {
    return { ok: false, reason: "invalid_name" };
  }

  // Moving under a new parent: the new parent must exist and must not be a
  // descendant of (or equal to) this category — that would build a cycle the
  // tree renderer walks forever.
  if (input.parentId !== undefined && input.parentId !== null) {
    const parent = await store.category.findUnique({
      where: { id: input.parentId },
    });
    if (!parent) return { ok: false, reason: "parent_missing" };

    const ancestors = await ancestorIds(store, input.parentId);
    if (ancestors.has(input.id)) return { ok: false, reason: "parent_cycle" };
  }

  const category = await store.category.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    },
  });

  return { ok: true, category };
}

export async function deleteCategory(
  store: CategoryStore,
  id: string,
): Promise<{ ok: true } | { ok: false; reason: CategoryFailureReason }> {
  const existing = await store.category.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "not_found" };

  if ((await store.product.count({ where: { categoryId: id } })) > 0) {
    return { ok: false, reason: "has_products" };
  }

  const children = await store.category.findMany({
    where: { parentId: id },
    select: { id: true },
  });
  if (children.length > 0) return { ok: false, reason: "has_children" };

  await store.category.delete({ where: { id } });
  return { ok: true };
}
