import { describe, expect, it, vi } from "vitest";

import {
  ensureUserProvisioned,
  type UserProvisionerStore,
} from "./provisioning";

// Provisioning runs without a live database — the store is a narrow
// interface satisfied by this stub.

function stubStore(rows: {
  existing?: { supabaseUserId: string; email: string; role: string };
}): UserProvisionerStore {
  return {
    user: {
      findUnique: vi.fn(() => Promise.resolve(rows.existing ?? null)),
      upsert: vi.fn((args: {
        where: { supabaseUserId: string };
        create: { supabaseUserId: string; email: string; role: "BRAND" };
        update: { email: string };
      }) => {
        // Mirror Prisma semantics: update wins on conflict.
        return Promise.resolve({
          supabaseUserId: args.create.supabaseUserId,
          email: rows.existing ? args.update.email : args.create.email,
          role: rows.existing
            ? (rows.existing.role ?? "BRAND")
            : args.create.role,
        });
      }),
    },
  };
}

const IDENTITY = {
  supabaseUserId: "supabase-user-1",
  email: "brand@example.com",
};

describe("ensureUserProvisioned", () => {
  it("creates a row with role BRAND for a new identity", async () => {
    const store = stubStore({});
    const result = await ensureUserProvisioned(store, IDENTITY);

    expect(result.created).toBe(true);
    expect(result.user).toEqual({
      supabaseUserId: "supabase-user-1",
      email: "brand@example.com",
      role: "BRAND",
    });
    expect(store.user.upsert).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite the role of an existing row", async () => {
    const store = stubStore({
      existing: {
        supabaseUserId: "supabase-user-1",
        email: "brand@example.com",
        role: "ADMIN",
      },
    });
    const result = await ensureUserProvisioned(store, IDENTITY);

    expect(result.created).toBe(false);
    expect(result.user.role).toBe("ADMIN");
    // Existing row with unchanged email → no write at all.
    expect(store.user.upsert).not.toHaveBeenCalled();
  });

  it("syncs a changed email but never touches the role", async () => {
    const store = stubStore({
      existing: {
        supabaseUserId: "supabase-user-1",
        email: "old@example.com",
        role: "SUPPLIER",
      },
    });
    const result = await ensureUserProvisioned(store, IDENTITY);

    expect(result.created).toBe(false);
    expect(result.user.email).toBe("brand@example.com");
    expect(result.user.role).toBe("SUPPLIER");
    expect(store.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: "BRAND" }),
        update: { email: "brand@example.com" },
      }),
    );
  });
});
