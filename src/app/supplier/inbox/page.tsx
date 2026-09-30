import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LeadItemActions } from "@/components/supplier/lead-item-actions";
import { InlineSuccessAlert } from "@/components/ui/alerts";
import { StatusChip, WorkspaceShell } from "@/components/workspace/shell";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listSupplierLeads, type InboxLeadGroup } from "@/lib/supplier/inbox";

export const metadata: Metadata = {
  title: "Lead inbox · Aekobaba",
  description: "Quote leads from brands, grouped by request.",
};

// The supplier lead inbox: incoming QuoteRequestItems grouped by their parent
// request, newest first. Items the supplier has not answered yet carry the
// quoted/declined actions; answered items show their status honestly.

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function priceLine(product: {
  priceType: string;
  basePrice: number | null;
  priceBasis: string | null;
}): string {
  if (product.priceType === "QUOTE_ONLY" || product.basePrice === null) {
    return "Ask the supplier";
  }
  const amount = product.basePrice;
  return `${amount.toFixed(2)} ${product.priceBasis ?? ""}`.trim();
}

export default async function SupplierInboxPage() {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth/sign-in?next=%2Fsupplier%2Finbox");

  const user = await db.user.findUnique({
    where: { supabaseUserId: session.supabaseUserId },
    select: { id: true },
  });

  const supplier = user
    ? await db.supplier.findFirst({
        where: { ownerUserId: user.id },
        select: { id: true, name: true, status: true, responseTimeHours: true },
      })
    : null;

  if (!supplier) {
    return (
      <WorkspaceShell
        area="supplier"
        title="Lead inbox"
        subtitle="Quote leads from brands arrive here once you own a listing."
      >
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-600">
            You don&apos;t own a supplier listing yet. Claim your company&apos;s
            listing to start receiving leads.
          </p>
          <Link
            href="/supplier/claim"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Claim a listing
          </Link>
        </div>
      </WorkspaceShell>
    );
  }

  const groups: InboxLeadGroup[] = user
    ? await listSupplierLeads(db, user.id)
    : [];
  const openCount = groups.reduce(
    (count, group) =>
      count + group.items.filter((item) => item.status === "SENT").length,
    0,
  );

  return (
    <WorkspaceShell
      area="supplier"
      title={`Lead inbox — ${supplier.name}`}
      subtitle={
        openCount === 0
          ? "No open leads. New quote requests will appear here."
          : `${openCount} open lead${openCount === 1 ? "" : "s"} awaiting an answer.`
      }
      actions={<StatusChip tone={supplier.status.toLowerCase() as never}>{supplier.status}</StatusChip>}
    >
      {supplier.responseTimeHours !== null ? (
        <div className="mb-4">
          <InlineSuccessAlert>
            Median first response on record: {supplier.responseTimeHours}{" "}
            {supplier.responseTimeHours === 1 ? "hour" : "hours"}.
          </InlineSuccessAlert>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-600">
          No leads yet. Once brands include your products in a quote request,
          the items show up here grouped by that request.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.request.id}
              className="overflow-hidden rounded-lg border border-stone-200 bg-white"
            >
              <header className="border-b border-stone-200 bg-stone-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-900">
                    Request · {group.request.id}
                  </p>
                  <p className="text-xs text-stone-500">
                    Sent {formatDate(group.request.createdAt)}
                    {group.request.deadline
                      ? ` · Deadline ${formatDate(group.request.deadline)}`
                      : ""}
                  </p>
                </div>
                {group.request.artworkNotes ? (
                  <p className="mt-1 text-xs text-stone-600">
                    Artwork notes: {group.request.artworkNotes}
                  </p>
                ) : null}
              </header>
              <ul className="divide-y divide-stone-200">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {item.product.title}
                      </p>
                      <p className="text-xs text-stone-500">
                        Quantity: {item.quantity}
                        {item.product.moq !== null
                          ? ` · MOQ ${item.product.moq}`
                          : ""}{" "}
                        · {priceLine(item.product)}
                      </p>
                    </div>
                    {item.status === "SENT" ? (
                      <LeadItemActions itemId={item.id} />
                    ) : (
                      <span className="text-xs font-medium text-stone-600">
                        {item.status === "QUOTED"
                          ? "Quoted"
                          : item.status === "DECLINED"
                            ? "Declined"
                            : item.status}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
