import { parseUserRole, type UserRole } from "./roles";

// User provisioning (build spec: "upsert User keyed on supabaseUserId, role
// BRAND by default, subsequent role reads from DB").
//
// The store is a narrow interface — PrismaClient satisfies it structurally —
// so the behavior is unit-testable against a stub without a live database.

export interface AuthIdentity {
  supabaseUserId: string;
  email: string;
}

export interface ProvisionedUser {
  supabaseUserId: string;
  email: string;
  role: UserRole | null;
}

export interface ProvisionResult {
  created: boolean;
  user: ProvisionedUser;
}

/**
 * The slice of PrismaClient this module touches. `upsert` is used even on the
 * create path so a concurrent first sign-in (two tabs, both exchanging codes)
 * cannot trip a unique violation — the loser lands in the update branch and
 * the role default survives either way.
 */
export interface UserProvisionerStore {
  user: {
    findUnique(args: {
      where: { supabaseUserId: string };
    }): Promise<{ supabaseUserId: string; email: string; role: string } | null>;
    upsert(args: {
      where: { supabaseUserId: string };
      create: { supabaseUserId: string; email: string; role: "BRAND" };
      update: { email: string };
    }): Promise<{ supabaseUserId: string; email: string; role: string }>;
  };
}

/**
 * Ensure a User row exists for a just-authenticated Supabase identity.
 *
 * - New identity → row created with role BRAND.
 * - Existing row → email synced when it changed; role NEVER overwritten here.
 *   Roles change through the admin surface, not by signing in again.
 *
 * The identity always comes from the verified session — never from a
 * client-sent field.
 */
export async function ensureUserProvisioned(
  store: UserProvisionerStore,
  identity: AuthIdentity,
): Promise<ProvisionResult> {
  const existing = await store.user.findUnique({
    where: { supabaseUserId: identity.supabaseUserId },
  });

  if (!existing) {
    const created = await store.user.upsert({
      where: { supabaseUserId: identity.supabaseUserId },
      create: {
        supabaseUserId: identity.supabaseUserId,
        email: identity.email,
        role: "BRAND",
      },
      update: { email: identity.email },
    });
    return {
      created: true,
      user: toProvisionedUser(created),
    };
  }

  if (existing.email === identity.email) {
    return { created: false, user: toProvisionedUser(existing) };
  }

  // Email changed upstream (Supabase is the identity source of truth).
  // The update payload intentionally omits role.
  const updated = await store.user.upsert({
    where: { supabaseUserId: identity.supabaseUserId },
    create: {
      supabaseUserId: identity.supabaseUserId,
      email: identity.email,
      role: "BRAND",
    },
    update: { email: identity.email },
  });
  return { created: false, user: toProvisionedUser(updated) };
}

function toProvisionedUser(row: {
  supabaseUserId: string;
  email: string;
  role: string;
}): ProvisionedUser {
  return {
    supabaseUserId: row.supabaseUserId,
    email: row.email,
    role: parseUserRole(row.role),
  };
}
