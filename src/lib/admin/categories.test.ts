import { describe, expect, it, vi } from "vitest";

import {
  createCategory,
  deleteCategory,
  slugifyCategory,
  updateCategory,
  type CategoryRow,
  type CategoryStore,
} from "./categories";

// Category CRUD against a stub store — the taxonomy rows themselves come from
// the seed importer; these tests only cover the mutation rules.

function row(partial: Partial<CategoryRow> & { id: string }): CategoryRow {
  return {
    slug: partial.id,
    name: partial.id,
    description: null,
    parentId: null,
    ...partial,
  };
}

function storeFixture(categories: CategoryRow[], productCount = 0) {
  const writes: Array<Record<string, unknown>> = [];

  const store: CategoryStore = {
    category: {
      findUnique: vi.fn().mockImplementation(
        (args: {
          where: { id?: string; slug?: string };
        }): Promise<CategoryRow | null> => {
          const hit = categories.find(
            (c) =>
              (args.where.id !== undefined && c.id === args.where.id) ||
              (args.where.slug !== undefined && c.slug === args.where.slug),
          );
          return Promise.resolve(hit ?? null);
        },
      ),
      findMany: vi.fn().mockImplementation(
        (args?: { where?: { parentId?: string } }): Promise<CategoryRow[]> =>
          Promise.resolve(
            args?.where?.parentId !== undefined
              ? categories.filter((c) => c.parentId === args.where?.parentId)
              : categories,
          ),
      ),
      create: vi.fn().mockImplementation((args: {
        data: { slug: string; name: string; description?: string; parentId?: string };
      }) => {
        writes.push({ kind: "create", ...args });
        return Promise.resolve(
          row({
            id: "cat_new",
            slug: args.data.slug,
            name: args.data.name,
            parentId: args.data.parentId ?? null,
          }),
        );
      }),
      update: vi.fn().mockImplementation((args: {
        where: { id: string };
        data: { name?: string; description?: string | null; parentId?: string | null };
      }) => {
        writes.push({ kind: "update", ...args });
        const existing = categories.find((c) => c.id === args.where.id);
        return Promise.resolve(
          row({
            id: args.where.id,
            slug: existing?.slug ?? args.where.id,
            name: args.data.name ?? existing?.name ?? "",
            parentId:
              args.data.parentId !== undefined
                ? args.data.parentId
                : (existing?.parentId ?? null),
          }),
        );
      }),
      delete: vi.fn().mockImplementation((args: { where: { id: string } }) => {
        writes.push({ kind: "delete", ...args });
        return Promise.resolve({});
      }),
    },
    product: {
      count: vi.fn().mockResolvedValue(productCount),
    },
  };

  return { store, writes };
}

describe("slugifyCategory", () => {
  it("lowercases and dashes a plain name", () => {
    expect(slugifyCategory("Stand-Up Pouches")).toBe("stand-up-pouches");
  });

  it("collapses punctuation and non-ascii runs into single dashes", () => {
    expect(slugifyCategory("Sauce & Condiment Bottles")).toBe(
      "sauce-condiment-bottles",
    );
  });

  it("never returns surrounding dashes", () => {
    expect(slugifyCategory("  Jars!  ")).toBe("jars");
  });
});

describe("createCategory", () => {
  it("generates the slug from the name", async () => {
    const { store, writes } = storeFixture([]);

    const result = await createCategory(store, { name: "Flexible Films" });

    expect(result.ok).toBe(true);
    expect(writes[0]).toMatchObject({ data: { slug: "flexible-films" } });
  });

  it("uses an explicit slug (normalized) when supplied", async () => {
    const { store, writes } = storeFixture([]);

    await createCategory(store, { name: "Bottles", slug: "custom-bottles" });

    expect(writes[0]).toMatchObject({ data: { slug: "custom-bottles" } });
  });

  it("rejects a name that slugifies to nothing", async () => {
    const { store } = storeFixture([]);
    expect(await createCategory(store, { name: "!!!" })).toEqual({
      ok: false,
      reason: "invalid_name",
    });
  });

  it("refuses a duplicate slug without writing", async () => {
    const { store, writes } = storeFixture([row({ id: "cat_1", slug: "jars" })]);

    const result = await createCategory(store, { name: "Jars" });

    expect(result).toEqual({ ok: false, reason: "slug_taken" });
    expect(writes).toEqual([]);
  });

  it("reports a missing parent", async () => {
    const { store, writes } = storeFixture([]);

    const result = await createCategory(store, { name: "Nested", parentId: "ghost" });

    expect(result).toEqual({ ok: false, reason: "parent_missing" });
    expect(writes).toEqual([]);
  });
});

describe("updateCategory", () => {
  it("renames without touching the slug", async () => {
    const { store, writes } = storeFixture([
      row({ id: "cat_1", slug: "bottles-jars", name: "Bottles & Jars" }),
    ]);

    const result = await updateCategory(store, {
      id: "cat_1",
      name: "Bottles + Jars",
    });

    expect(result.ok).toBe(true);
    expect(writes[0]).toMatchObject({ data: { name: "Bottles + Jars" } });
  });

  it("refuses re-parenting into its own subtree (cycle)", async () => {
    const { store } = storeFixture([
      row({ id: "c1", slug: "one", name: "One", parentId: null }),
      row({ id: "c2", slug: "two", name: "Two", parentId: "c1" }),
      row({ id: "c3", slug: "three", name: "Three", parentId: "c2" }),
    ]);

    const result = await updateCategory(store, { id: "c1", parentId: "c3" });

    expect(result).toEqual({ ok: false, reason: "parent_cycle" });
  });

  it("reports a missing parent", async () => {
    const { store } = storeFixture([row({ id: "cat_1", slug: "bottles-jars" })]);

    const result = await updateCategory(store, {
      id: "cat_1",
      parentId: "ghost",
    });

    expect(result).toEqual({ ok: false, reason: "parent_missing" });
  });

  it("detaches to root (parentId null) — promoting a subtree is legitimate", async () => {
    const { store, writes } = storeFixture([
      row({ id: "c1", slug: "one", name: "One", parentId: "root" as never }),
    ]);

    const result = await updateCategory(store, { id: "c1", parentId: null });

    expect(result.ok).toBe(true);
    expect(writes[0]).toMatchObject({ data: { parentId: null } });
  });

  it("rejects an empty rename", async () => {
    const { store } = storeFixture([row({ id: "cat_1", slug: "one" })]);
    expect(
      await updateCategory(store, { id: "cat_1", name: "   " }),
    ).toEqual({ ok: false, reason: "invalid_name" });
  });

  it("reports a missing category", async () => {
    const { store } = storeFixture([]);
    expect(await updateCategory(store, { id: "ghost", name: "x" })).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});

describe("deleteCategory", () => {
  it("deletes an empty, childless leaf", async () => {
    const { store, writes } = storeFixture(
      [row({ id: "cat_1", slug: "leaf", name: "Leaf" })],
      0,
    );

    const result = await deleteCategory(store, "cat_1");

    expect(result.ok).toBe(true);
    expect(writes.find((w) => w.kind === "delete")).toMatchObject({
      where: { id: "cat_1" },
    });
  });

  it("refuses to delete a category that products still reference", async () => {
    const { store, writes } = storeFixture(
      [row({ id: "cat_1", slug: "leaf", name: "Leaf" })],
      7,
    );

    const result = await deleteCategory(store, "cat_1");

    expect(result).toEqual({ ok: false, reason: "has_products" });
    expect(writes).toEqual([]);
  });

  it("refuses to delete a category with children", async () => {
    const { store } = storeFixture([
      row({ id: "c1", slug: "one", name: "One" }),
      row({ id: "c2", slug: "two", name: "Two", parentId: "c1" }),
    ]);

    const result = await deleteCategory(store, "c1");

    expect(result).toEqual({ ok: false, reason: "has_children" });
  });

  it("reports a missing category", async () => {
    const { store } = storeFixture([]);
    expect(await deleteCategory(store, "ghost")).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});
