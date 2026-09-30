import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

// Route contract for POST /api/admin/categories. Role gate + create mapping.

const mocks = vi.hoisted(() => ({
  getServerSessionUser: vi.fn(),
  getCurrentUserRole: vi.fn(),
  createCategory: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getServerSessionUser: mocks.getServerSessionUser,
  getCurrentUserRole: mocks.getCurrentUserRole,
}));

vi.mock("@/lib/admin/categories", () => ({
  createCategory: mocks.createCategory,
}));

function post(body: unknown) {
  return POST(
    new Request("http://localhost:3000/api/admin/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
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

describe("POST /api/admin/categories", () => {
  it("returns 403 for a non-admin", async () => {
    mocks.getCurrentUserRole.mockResolvedValue("BRAND");
    const res = await post({ name: "Pouches" });
    expect(res.status).toBe(403);
    expect(mocks.createCategory).not.toHaveBeenCalled();
  });

  it("creates a category and returns 201", async () => {
    mocks.createCategory.mockResolvedValue({
      ok: true,
      category: { id: "cat_new", slug: "pouches", name: "Pouches", parentId: null },
    });
    const res = await post({ name: "Pouches" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      category: { id: "cat_new", slug: "pouches", name: "Pouches", parentId: null },
    });
    expect(mocks.createCategory).toHaveBeenCalledWith(expect.anything(), {
      name: "Pouches",
    });
  });

  it("rejects an empty name with 400", async () => {
    const res = await post({ name: "   " });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_category" });
  });

  it("maps slug_taken to 409 and parent_missing to 400", async () => {
    mocks.createCategory.mockResolvedValue({ ok: false, reason: "slug_taken" });
    expect((await post({ name: "Pouches" })).status).toBe(409);

    mocks.createCategory.mockResolvedValue({ ok: false, reason: "parent_missing" });
    expect((await post({ name: "Pouches", parentId: "ghost" })).status).toBe(400);
  });
});
