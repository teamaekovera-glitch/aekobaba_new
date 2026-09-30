import { describe, expect, it, vi } from "vitest";

import { claimListing, type ClaimStore } from "./claim";

// Claim flow against a stub store — no live database (Supabase creds pending
// per the spec). The store stub records writes so tests can assert both the
// decision and the persisted shape.

function storeFixture(
  overrides: {
    supplier?: Record<string, unknown> | null;
    user?: { id: string } | null;
    ownedSupplier?: { id: string } | null;
  } = {},
) {
  const writes: Array<Record<string, unknown>> = [];

  const store: ClaimStore = {
    supplier: {
      findUnique: vi.fn().mockResolvedValue(
        overrides.supplier === undefined
          ? {
              id: "sup_1",
              slug: "claimable-jars",
              name: "Claimable Jars Ltd",
              status: "PENDING",
              ownerUserId: null,
            }
          : (overrides.supplier ?? null),
      ),
      update: vi.fn().mockImplementation((args: {
        where: { id: string };
        data: { ownerUserId: string; status: "PENDING" };
      }) => {
        writes.push({ kind: "supplier.update", ...args });
        return Promise.resolve({
          id: args.where.id,
          slug: "claimable-jars",
          name: "Claimable Jars Ltd",
          status: "PENDING",
        });
      }),
      findFirst: vi.fn().mockResolvedValue(overrides.ownedSupplier ?? null),
    },
    user: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides.user === undefined ? { id: "user_1" } : overrides.user,
        ),
      update: vi.fn().mockImplementation((args: {
        where: { id: string };
        data: { role: "SUPPLIER" };
      }) => {
        writes.push({ kind: "user.update", ...args });
        return Promise.resolve({ id: args.where.id, role: "SUPPLIER" });
      }),
    },
  };

  return { store, writes };
}

describe("claimListing", () => {
  it("claims an unclaimed listing: owner set, status PENDING, role SUPPLIER", async () => {
    const { store, writes } = storeFixture();

    const result = await claimListing(store, {
      supabaseUserId: "sb_1",
      slug: "claimable-jars",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.supplier.status).toBe("PENDING");

    const supplierWrite = writes.find((w) => w.kind === "supplier.update");
    expect(supplierWrite).toMatchObject({
      data: { ownerUserId: "user_1", status: "PENDING" },
    });

    const userWrite = writes.find((w) => w.kind === "user.update");
    expect(userWrite).toMatchObject({ data: { role: "SUPPLIER" } });
  });

  it("rejects an unknown slug without writing", async () => {
    const { store, writes } = storeFixture({ supplier: null });

    const result = await claimListing(store, {
      supabaseUserId: "sb_1",
      slug: "ghost",
    });

    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(writes).toEqual([]);
  });

  it("refuses an already-claimed listing without writing", async () => {
    const { store, writes } = storeFixture({
      supplier: {
        id: "sup_1",
        slug: "claimable-jars",
        name: "Claimable Jars Ltd",
        status: "LISTED",
        ownerUserId: "someone_else",
      },
    });

    const result = await claimListing(store, {
      supabaseUserId: "sb_1",
      slug: "claimable-jars",
    });

    expect(result).toEqual({ ok: false, reason: "already_claimed" });
    expect(writes).toEqual([]);
  });

  it("refuses when the session identity has no User row", async () => {
    const { store, writes } = storeFixture({ user: null });

    const result = await claimListing(store, {
      supabaseUserId: "sb_ghost",
      slug: "claimable-jars",
    });

    expect(result).toEqual({ ok: false, reason: "account_missing" });
    expect(writes).toEqual([]);
  });

  it("refuses a user who already owns another supplier", async () => {
    const { store, writes } = storeFixture({
      ownedSupplier: { id: "sup_mine" },
    });

    const result = await claimListing(store, {
      supabaseUserId: "sb_1",
      slug: "claimable-jars",
    });

    expect(result).toEqual({ ok: false, reason: "already_owns_supplier" });
    expect(writes).toEqual([]);
  });
});
