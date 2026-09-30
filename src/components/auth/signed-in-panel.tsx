import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { getCurrentUserRole } from "@/lib/auth/session";
import type { ServerSessionUser } from "@/lib/auth/session";

// Shown on the auth pages when a session already exists. The role comes from
// the database (source of truth); an unprovisioned account simply shows the
// email — no invented label.

const ROLE_LABELS = {
  BRAND: "Brand account",
  SUPPLIER: "Supplier account",
  ADMIN: "Admin account",
} as const;

export async function SignedInPanel({
  sessionUser,
}: {
  sessionUser: ServerSessionUser;
}) {
  const role = await getCurrentUserRole(sessionUser.supabaseUserId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-700">
        Signed in as{" "}
        <span className="font-medium text-stone-900">
          {sessionUser.email ?? "your account"}
        </span>
        {role ? ` · ${ROLE_LABELS[role]}` : ""}
      </p>
      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="flex h-10 items-center justify-center rounded-md bg-accent text-sm font-medium text-white transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Continue to the marketplace
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center rounded-md border border-stone-300 bg-white text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
