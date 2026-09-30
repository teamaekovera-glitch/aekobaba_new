import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "./route";

// Route contract for PATCH/DELETE /api/admin/categories/[id].

const mocks = vi.hoisted(() => ({
  getServerSessionUser: vi.fn(),
  getCurrentUserRole: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getServerSessionUser: mocks.getServerSessionUser,
  getCurrentUserRole: mocks.getCurrentUserRole,
}));

vi.mock("@/lib/admin/categories", () => ({
  updateCategory: mocks.updateCategory,
  deleteCategory: mocks.deleteCategory,
}));

function patch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost:3000/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function del(id: string) {
  return DELETE(
    new Request(`http://localhost:3000/api/admin/categories/${id}`, {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSessionUser.mockResolvedValue({
    supabaseUserId: "sb_admin",
    email: "admin@aekobaba.test",
    emailVerified: true,
  });
  mocks.getCurrentUserRole.mockResolvedValue("ADMIN");
});

describe("PATCH /api/admin/categories/[id]", () => {
  it("returns 403 for a non-admin", async () => {
    mocks.getCurrentUserRole.mockResolvedValue("SUPPLIER");
    const res = await patch("cat_1", { name: "Renamed" });
    expect(res.status).toBe(403);
    expect(mocks.updateCategory).not.toHaveBeenCalled();
  });

  it("updates and returns the category", async () => {
    mocks.updateCategory.mockResolvedValue({
      ok: true,
      category: { id: "cat_1", name: "Bottles & Jars", slug: "bottles-jars" },
    });
    const res = await patch("cat_1", { name: "Bottles & Jars" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      category: { id: "cat_1", name: "Bottles & Jars", slug: "bottles-jars" },
    });
    // The body is forwarded verbatim (minus unknown keys) — including
    // parentId: null, the detach case.
    expect(mocks.updateCategory).toHaveBeenCalledWith(expect.anything(), {
      id: "cat_1",
      name: "Bottles & Jars",
    });
  });

  it("maps not_found to 404 and has_children to 409", async () => {
    mocks.updateCategory.mockResolvedValue({ ok: false, reason: "not_found" });
    expect((await patch("ghost", { name: "x" })).status).toBe(404);

    mocks.updateCategory.mockResolvedValue({ ok: false, reason: "has_children" });
    expect((await patch("c1", { parentId: null })).status).toBe(409);
  });
});

describe("DELETE /api/admin/categories/[id]", () => {
  it("returns 403 for a non-admin", async () => {
    mocks.getCurrentUserRole.mockResolvedValue("BRAND");
    const res = await del("cat_1");
    expect(res.status).toBe(403);
    expect(mocks.deleteCategory).not.toHaveBeenCalled();
  });

  it("deletes an empty leaf and returns ok", async () => {
    mocks.deleteCategory.mockResolvedValue({ ok: true });
    const res = await del("cat_1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.deleteCategory).toHaveBeenCalledWith(expect.anything(), "cat_1");
  });

  it("maps has_products to 409", async () => {
    mocks.deleteCategory.mockResolvedValue({ ok: false, reason: "has_products" });
    expect((await del("cat_1")).status).toBe(409);
  });
});
