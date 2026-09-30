import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "./route";

// Route contract for PATCH /api/admin/suppliers/[id]/tier. Role gate +
// persistence of Supplier.status so the public badge reflects the decision
// (spec C12). The db module is stubbed — no live database.

const mocks = vi.hoisted(() => ({
  getServerSessionUser: vi.fn(),
  getCurrentUserRole: vi.fn(),
  supplierUpdate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getServerSessionUser: mocks.getServerSessionUser,
  getCurrentUserRole: mocks.getCurrentUserRole,
}));

vi.mock("@/lib/db", () => ({
  db: {
    supplier: { update: mocks.supplierUpdate },
  },
}));

function patch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost:3000/api/admin/suppliers/${id}/tier`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
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

describe("PATCH /api/admin/suppliers/[id]/tier", () => {
  it("returns 401 when signed out", async () => {
    mocks.getServerSessionUser.mockResolvedValue(null);
    const res = await patch("sup_1", { tier: "LISTED" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin — SUPPLIER cannot reach admin surfaces", async () => {
    mocks.getCurrentUserRole.mockResolvedValue("SUPPLIER");
    const res = await patch("sup_1", { tier: "LISTED" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "role_mismatch" });
    expect(mocks.supplierUpdate).not.toHaveBeenCalled();
  });

  it("rejects an unknown tier with 400 before touching the database", async () => {
    const res = await patch("sup_1", { tier: "GOLD_PLUS" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_tier" });
    expect(mocks.supplierUpdate).not.toHaveBeenCalled();
  });

  it("persists Supplier.status and returns the updated record", async () => {
    mocks.supplierUpdate.mockResolvedValue({
      id: "sup_1",
      slug: "claimable-jars",
      name: "Claimable Jars Ltd",
      status: "RECOMMENDED",
    });
    const res = await patch("sup_1", { tier: "RECOMMENDED" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      supplier: {
        id: "sup_1",
        slug: "claimable-jars",
        name: "Claimable Jars Ltd",
        status: "RECOMMENDED",
      },
    });
    expect(mocks.supplierUpdate).toHaveBeenCalledWith({
      where: { id: "sup_1" },
      data: { status: "RECOMMENDED" },
      select: { id: true, slug: true, name: true, status: true },
    });
  });

  it("persists each of the four assignable tiers", async () => {
    for (const tier of ["RECOMMENDED", "LISTED", "QUOTE_ONLY", "DISABLED"]) {
      mocks.supplierUpdate.mockResolvedValue({ id: "sup_1", status: tier });
      const res = await patch("sup_1", { tier });
      expect(res.status).toBe(200);
      expect(mocks.supplierUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { status: tier } }),
      );
    }
  });
});
