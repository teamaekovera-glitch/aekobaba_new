"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InlineErrorAlert, InlineSuccessAlert } from "@/components/ui/alerts";

// Category CRUD for the admin surface. The taxonomy data comes from the seed
// importer; this UI only moves rows (create / rename / re-parent / delete).
// Slug is immutable after create — it is the public key URLs and the seed
// importer key on.

type CategoryRowVm = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
  childCount: number;
};

const CREATE_ERRORS: Record<string, string> = {
  slug_taken: "A category with that slug already exists.",
  parent_missing: "Parent category not found.",
  invalid_name: "Give the category a name.",
};

const MUTATE_ERRORS: Record<string, string> = {
  ...CREATE_ERRORS,
  has_products: "Reassign its products first — deleting would orphan sourced SKUs.",
  has_children: "Move or delete its subcategories first.",
  parent_cycle: "That parent would create a cycle.",
  not_found: "Category not found — refresh and try again.",
};

export function CategoryManager({ categories }: { categories: CategoryRowVm[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          ...(parentId ? { parentId } : {}),
        }),
      });
      const payload: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(CREATE_ERRORS[payload.error ?? ""] ?? "Could not create the category.");
        return;
      }
      setName("");
      setParentId("");
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setCreating(false);
    }
  }

  async function rename(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: renameValue }),
      });
      const payload: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(MUTATE_ERRORS[payload.error ?? ""] ?? "Could not rename the category.");
        return;
      }
      setRenaming(null);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const payload: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(MUTATE_ERRORS[payload.error ?? ""] ?? "Could not delete the category.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <InlineErrorAlert message={error} /> : null}

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <div className="grow">
          <label
            htmlFor="category-name"
            className="block text-sm font-medium text-stone-800"
          >
            New category
          </label>
          <input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sustainable Films"
            className="mt-1 block h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-2 focus:outline-accent"
          />
        </div>
        <div>
          <label
            htmlFor="category-parent"
            className="block text-sm font-medium text-stone-800"
          >
            Parent
          </label>
          <select
            id="category-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="mt-1 block h-10 rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-900 focus:outline-2 focus:outline-accent"
          >
            <option value="">— top level —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating || name.trim().length === 0}
          aria-busy={creating}
          className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Parent</th>
              <th className="px-4 py-2">Products</th>
              <th className="px-4 py-2">Subcategories</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2">
                  {renaming === c.id ? (
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-8 w-full rounded-md border border-stone-300 px-2 text-sm focus:outline-2 focus:outline-accent"
                      aria-label="Category name"
                    />
                  ) : (
                    <>
                      <span className="font-medium text-stone-900">{c.name}</span>
                      <span className="ml-2 text-xs text-stone-400">{c.slug}</span>
                    </>
                  )}
                </td>
                <td className="px-4 py-2 text-stone-600">
                  {c.parentName ?? "—"}
                </td>
                <td className="px-4 py-2 text-stone-600">{c.productCount}</td>
                <td className="px-4 py-2 text-stone-600">{c.childCount}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    {renaming === c.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void rename(c.id)}
                          disabled={busy !== null || renameValue.trim().length === 0}
                          className="h-8 rounded-md bg-accent px-2 text-xs font-medium text-white hover:bg-accent-dark disabled:opacity-60"
                        >
                          {busy === c.id ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenaming(null)}
                          className="h-8 rounded-md border border-stone-300 px-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRenaming(c.id);
                            setRenameValue(c.name);
                          }}
                          disabled={busy !== null}
                          className="h-8 rounded-md border border-stone-300 px-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(c.id)}
                          disabled={
                            busy !== null || c.productCount > 0 || c.childCount > 0
                          }
                          title={
                            c.productCount > 0
                              ? "Reassign its products first"
                              : c.childCount > 0
                                ? "Move or delete its subcategories first"
                                : "Delete category"
                          }
                          className="h-8 rounded-md border border-red-200 px-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy === c.id ? "Deleting…" : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-stone-500">
            No categories yet — create the first one above.
          </p>
        ) : null}
      </div>
      <InlineSuccessAlert>
        Slug is fixed after create — URLs and the seed importer key on it.
      </InlineSuccessAlert>
    </div>
  );
}
