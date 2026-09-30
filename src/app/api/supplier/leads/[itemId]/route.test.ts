import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "./route";

// Route contract for PATCH /api/supplier/leads/[itemId]: role gate first,
// then tenancy/transition mapping. Logic modules stubbed (unit-tested
// separately).

const mocks = vi.hoisted(() => ({
  getServerSessionUser: vi.fn(),
  getCurrentUserRole: vi.fn(),
  respondToLeadItem: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getServerSessionUser: mocks.getServerSessionUser,
  getCurrentUserRole: mocks.getCurrentUserRole,
}));

vi.mock("@/lib/supplier/inbox", () => ({
  respondToLeadItem: mocks.respondToLeadItem,
}));

function patch(itemId: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost:3000/api/supplier/leads/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ itemId }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSessionUser.mockResolvedValue({
    supabaseUserId: "sb_1",
    email: "owner@jars.example",
    emailVerified: true,
  });
  mocks.getCurrentUserRole.mockResolvedValue("SUPPLIER");
});

describe("PATCH /api/supplier/leads/[itemId]", () => {
  it("returns 401 when signed out", async () => {
    mocks.getServerSessionUser.mockResolvedValue(null);
    const res = await patch("item_1", { action: "quoted" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
  });

  it("returns 403 for a BRAND user — middleware does not guard /api paths, the route does", async () => {
    mocks.getCurrentUserRole.mockResolvedValue("BRAND");
    const res = await patch("item_1", { action: "quoted" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "role_mismatch" });
    expect(mocks.respondToLeadItem).not.toHaveBeenCalled();
  });

  it("rejects an unknown action with 400", async () => {
    const res = await patch("item_1", { action: "maybe" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_action" });
  });

  it("returns the updated item status", async () => {
    mocks.respondToLeadItem.mockResolvedValue({
      ok: true,
      item: { id: "item_1", status: "QUOTED" },
    });
    const res = await patch("item_1", { action: "quoted" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ item: { id: "item_1", status: "QUOTED" } });
    expect(mocks.respondToLeadItem).toHaveBeenCalledWith(expect.anything(), {
      ownerUserId: "sb_1",
      itemId: "item_1",
      action: "quoted",
    });
  });

  it("maps tenancy to 403 and stale items to 409", async () => {
    mocks.respondToLeadItem.mockResolvedValue({ ok: false, reason: "forbidden" });
    expect((await patch("item_1", { action: "quoted" })).status).toBe(403);

    mocks.respondToLeadItem.mockResolvedValue({ ok: false, reason: "not_actionable" });
    expect((await patch("item_1", { action: "declined" })).status).toBe(409);

    mocks.respondToLeadItem.mockResolvedValue({ ok: false, reason: "not_found" });
    expect((await patch("ghost", { action: "quoted" })).status).toBe(404);
  });
});
