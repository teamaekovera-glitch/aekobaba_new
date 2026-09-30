import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

// Route contract for POST /api/supplier/claim. The logic module and the
// session are stubbed (unit-tested separately); these tests pin the HTTP
// behavior: status codes, error codes, and payload shape.

const mocks = vi.hoisted(() => ({
  getServerSessionUser: vi.fn(),
  claimListing: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getServerSessionUser: mocks.getServerSessionUser,
}));

vi.mock("@/lib/supplier/claim", () => ({
  claimListing: mocks.claimListing,
}));

function post(body: unknown) {
  return POST(
    new Request("http://localhost:3000/api/supplier/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSessionUser.mockResolvedValue({
    supabaseUserId: "sb_1",
    email: "owner@jars.example",
    emailVerified: true,
  });
});

describe("POST /api/supplier/claim", () => {
  it("returns 401 when signed out", async () => {
    mocks.getServerSessionUser.mockResolvedValue(null);
    const res = await post({ slug: "claimable-jars" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
  });

  it("returns 403 when the session email is not verified — a claim is only as honest as its address", async () => {
    mocks.getServerSessionUser.mockResolvedValue({
      supabaseUserId: "sb_1",
      email: "owner@jars.example",
      emailVerified: false,
    });
    const res = await post({ slug: "claimable-jars" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "email_not_verified" });
    expect(mocks.claimListing).not.toHaveBeenCalled();
  });

  it("rejects a malformed body with 400", async () => {
    const res = await post({ wrong: "shape" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_slug" });
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/supplier/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json at all",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
  });

  it("maps a successful claim to the supplier payload", async () => {
    mocks.claimListing.mockResolvedValue({
      ok: true,
      supplier: { slug: "claimable-jars", name: "Claimable Jars Ltd", status: "PENDING" },
    });
    const res = await post({ slug: "claimable-jars" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      supplier: { slug: "claimable-jars", name: "Claimable Jars Ltd", status: "PENDING" },
    });
    expect(mocks.claimListing).toHaveBeenCalledWith(expect.anything(), {
      supabaseUserId: "sb_1",
      slug: "claimable-jars",
    });
  });

  it("maps failure reasons to honest status codes", async () => {
    mocks.claimListing.mockResolvedValue({ ok: false, reason: "not_found" });
    expect((await post({ slug: "ghost" })).status).toBe(404);

    mocks.claimListing.mockResolvedValue({ ok: false, reason: "already_claimed" });
    expect((await post({ slug: "x" })).status).toBe(409);

    mocks.claimListing.mockResolvedValue({ ok: false, reason: "already_owns_supplier" });
    expect((await post({ slug: "x" })).status).toBe(409);

    mocks.claimListing.mockResolvedValue({ ok: false, reason: "account_missing" });
    expect((await post({ slug: "x" })).status).toBe(409);
  });
});
