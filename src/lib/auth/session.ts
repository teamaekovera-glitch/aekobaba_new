import { ensureUserProvisioned } from "@/lib/auth/provisioning";
import { parseUserRole, type UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  createSupabaseServerClient,
  supabaseEnv,
} from "@/lib/supabase/server";

// Server-side session helpers for Server Components, Actions, and Route
// Handlers (Node runtime).

export interface ServerSessionUser {
  supabaseUserId: string;
  email: string | undefined;
}

export async function getServerSessionUser(): Promise<ServerSessionUser | null> {
  const env = supabaseEnv();
  if (!env) return null;

  const supabase = await createSupabaseServerClient(env);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { supabaseUserId: user.id, email: user.email };
}

/**
 * The signed-in user's role, read from the database (source of truth).
 * Returns null for anonymous visitors, unprovisioned users, and unknown
 * role values — never an assumption.
 */
export async function getCurrentUserRole(
  supabaseUserId: string,
): Promise<UserRole | null> {
  const row = await db.user.findUnique({
    where: { supabaseUserId },
    select: { role: true },
  });
  return row ? parseUserRole(row.role) : null;
}

/**
 * Provision the User row for a just-authenticated identity. Called at auth
 * transitions (callback exchange, password sign-in, immediate-session
 * sign-up) — never on plain page reads.
 */
export function provisionUser(identity: {
  supabaseUserId: string;
  email: string;
}) {
  return ensureUserProvisioned(db, identity);
}
