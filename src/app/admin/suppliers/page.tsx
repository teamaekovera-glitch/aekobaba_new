import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TierSelect } from "@/components/admin/tier-select";
import { StatusChip, WorkspaceShell } from "@/components/workspace/shell";
import { assessVerificationGates, gatesPassed } from "@/lib/admin/gates";
import type { SupplierGateFacts } from "@/lib/admin/gates";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Supplier verification · Aekobaba",
  description: "Queue suppliers against the four verification gates and assign tiers.",
};

// The admin verification queue: every supplier scored against the plan's four
// gates (real operating company / verifiable prices / sells to CPG in our
// categories / no unresolved trust problems), with the evidence for each gate
// visible next to the verdict. Tier assignment persists Supplier.status, which
// the public supplier page badge reads.

const STATUS_ORDER = ["PENDING", "QUOTE_ONLY", "LISTED", "RECOMMENDED", "DISABLED"] as const;

async function gateFactsBySupplier(): Promise<Map<string, SupplierGateFacts>> {
  // Three set-based queries instead of per-supplier rounds.
  const [totals, priced, categoryPairs] = await Promise.all([
    db.product.groupBy({ by: ["supplierId"], _count: { _all: true } }),
    db.product.groupBy({
      by: ["supplierId"],
      _count: { _all: true },
      where: {
        OR: [{ basePrice: { not: null } }, { priceType: { in: ["EXACT", "CALCULATOR", "FROM"] } }],
      },
    }),
    // Distinct (supplier, category) pairs — "sells to CPG in our categories".
    db.product.findMany({
      select: { supplierId: true, categoryId: true },
      distinct: ["supplierId", "categoryId"],
    }),
  ]);

  const totalBy = new Map(totals.map((t) => [t.supplierId, t._count._all]));
  const pricedBy = new Map(priced.map((t) => [t.supplierId, t._count._all]));
  const categoriesBy = new Map<string, Set<string>>();
  for (const pair of categoryPairs) {
    const set = categoriesBy.get(pair.supplierId) ?? new Set<string>();
    set.add(pair.categoryId);
    categoriesBy.set(pair.supplierId, set);
  }

  const facts = new Map<string, SupplierGateFacts>();
  for (const supplierId of totalBy.keys()) {
    const categorySet = categoriesBy.get(supplierId) ?? new Set<string>();
    facts.set(supplierId, {
      legalIdentity: null, // filled from the supplier row below
      productCount: totalBy.get(supplierId) ?? 0,
      pricedProductCount: pricedBy.get(supplierId) ?? 0,
      categoryCount: categorySet.size,
      reviewCount: 0,
      reviewScore: null,
    });
  }
  return facts;
}

export default async function AdminSuppliersPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth/sign-in?next=%2Fadmin%2Fsuppliers");

  const [suppliers, factsBySupplier] = await Promise.all([
    db.supplier.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        location: true,
        website: true,
        status: true,
        legalIdentity: true,
        reviewScore: true,
        reviewCount: true,
        lastVerifiedAt: true,
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    gateFactsBySupplier(),
  ]);

  const pendingCount = suppliers.filter((s) => s.status === "PENDING").length;

  const rows = [...suppliers].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status as (typeof STATUS_ORDER)[number]) -
        STATUS_ORDER.indexOf(b.status as (typeof STATUS_ORDER)[number]) ||
      a.name.localeCompare(b.name),
  );

  return (
    <WorkspaceShell
      area="admin"
      title="Supplier verification"
      subtitle={
        pendingCount === 0
          ? "No suppliers are waiting for verification."
          : `${pendingCount} supplier${pendingCount === 1 ? "" : "s"} pending verification.`
      }
    >
      <div className="space-y-4">
        {rows.map((supplier) => {
          const facts = factsBySupplier.get(supplier.id);
          const gates = assessVerificationGates({
            legalIdentity: supplier.legalIdentity,
            productCount: facts?.productCount ?? 0,
            pricedProductCount: facts?.pricedProductCount ?? 0,
            categoryCount: facts?.categoryCount ?? 0,
            reviewCount: supplier.reviewCount,
            reviewScore: supplier.reviewScore,
          });
          const passed = gatesPassed(gates);

          return (
            <section
              key={supplier.id}
              className="overflow-hidden rounded-lg border border-stone-200 bg-white"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    {supplier.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {supplier.location} · {supplier.website}
                    {supplier.lastVerifiedAt
                      ? ` · verified ${supplier.lastVerifiedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip tone={supplier.status.toLowerCase() as never}>
                    {supplier.status}
                  </StatusChip>
                  <TierSelect supplierId={supplier.id} currentTier={supplier.status} />
                </div>
              </header>

              <div className="grid gap-3 px-4 py-3 md:grid-cols-2">
                {gates.map((gate) => (
                  <div
                    key={gate.number}
                    className="rounded-md border border-stone-200 px-3 py-2"
                  >
                    <p className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-stone-900">
                        Gate {gate.number}: {gate.name}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          gate.status === "pass"
                            ? "text-green-700"
                            : gate.status === "fail"
                              ? "text-red-700"
                              : "text-amber-700"
                        }`}
                      >
                        {gate.status === "pass"
                          ? "Pass"
                          : gate.status === "fail"
                            ? "Fail"
                            : "Manual review"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-stone-600">{gate.evidence}</p>
                  </div>
                ))}
              </div>

              <footer className="border-t border-stone-200 bg-white px-4 py-2 text-xs text-stone-500">
                {passed} of 3 assessable gates pass · tier assignment is the
                admin&apos;s call; this scorecard is the evidence, not the decision.
              </footer>
            </section>
          );
        })}
      </div>
    </WorkspaceShell>
  );
}
