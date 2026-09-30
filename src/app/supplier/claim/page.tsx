import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ClaimForm } from "@/components/supplier/claim-form";
import { WorkspaceShell } from "@/components/workspace/shell";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Claim a listing · Aekobaba",
  description:
    "Claim your company's supplier listing on Aekobaba to receive quote leads.",
};

// Claim-listing entry point. The claim itself is a POST /api/supplier/claim;
// this page renders the state: unverified email gate, existing ownership,
// or the unclaimed listings a supplier can claim.

export default async function SupplierClaimPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth/sign-in?next=%2Fsupplier%2Fclaim");

  const owned = await db.supplier.findFirst({
    where: { ownerUserId: session.supabaseUserId },
    select: { id: true, slug: true, name: true, status: true },
  });

  const unclaimed = await db.supplier.findMany({
    where: { ownerUserId: null },
    select: { slug: true, name: true, location: true },
    orderBy: { name: "asc" },
  });

  return (
    <WorkspaceShell
      area="supplier"
      title="Claim a listing"
      subtitle="Verify your company's listing to receive quote leads from brands."
    >
      {!session.emailVerified ? (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-medium">Verify your email to claim a listing.</p>
          <p className="mt-1">
            The claim attaches to your account, and the confirmation goes to
            your verified address. Check your inbox for the verification link,
            then return here.
          </p>
        </div>
      ) : owned ? (
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-600">You own the listing for</p>
          <p className="mt-1 text-lg font-semibold text-stone-900">
            {owned.name}
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/supplier/inbox"
              className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-dark"
            >
              Open lead inbox
            </Link>
          </div>
        </div>
      ) : unclaimed.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-600">
          There are no unclaimed listings right now. If your company should be
          listed, contact the Aekobaba team.
        </div>
      ) : (
        <ClaimForm suppliers={unclaimed} />
      )}
    </WorkspaceShell>
  );
}
