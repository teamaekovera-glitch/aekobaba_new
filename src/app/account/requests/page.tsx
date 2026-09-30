import Link from "next/link";
import type { Metadata } from "next";

import { requireBrandPage } from "@/lib/auth/page-guards";
import { db } from "@/lib/db";
import { toQuoteRequestSummaryVM, type QuoteRequestSummaryVM } from "@/lib/quotes/view-models";

import { QuoteRequestStatusPill } from "@/components/quotes/status-pill";

// "My requests" — the brand's sent quote requests with per-item status
// summary (spec deliverable 4). Server-rendered from Prisma; the detail page
// carries the live subscription.

export const metadata: Metadata = {
  title: "My quote requests — Aekobaba",
};

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function QuoteRequestsPage() {
  const brand = await requireBrandPage("/account/requests");
  const rows = await db.quoteRequest.findMany({
    where: { brandUserId: brand.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { include: { supplier: true } } } } },
    take: 50,
  });
  const requests: QuoteRequestSummaryVM[] = rows.map(toQuoteRequestSummaryVM);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-semibold text-ink sm:text-2xl">My quote requests</h1>
      <p className="mt-1 text-sm text-neutral-600">Every request you have sent, with supplier responses.</p>

      {requests.length === 0 ? (
        <div data-testid="requests-empty" className="mt-10 rounded-md border border-neutral-200 bg-white p-8 text-center">
          <p className="text-sm text-neutral-600">No quote requests yet.</p>
          <Link
            href="/results"
            className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Browse packaging
          </Link>
        </div>
      ) : (
        <ul data-testid="requests-list" className="mt-6 space-y-3">
          {requests.map((request) => (
            <li key={request.id} className="rounded-md border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link
                    href={`/account/requests/${request.id}`}
                    data-testid="request-link"
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Request sent {formatDate(request.createdAt)}
                  </Link>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {request.itemCount} {request.itemCount === 1 ? "item" : "items"} ·{" "}
                    {request.supplierNames.length} {request.supplierNames.length === 1 ? "supplier" : "suppliers"} (
                    {request.supplierNames.join(", ")})
                    {request.deadline ? ` · needed by ${formatDate(request.deadline)}` : ""}
                  </p>
                </div>
                <QuoteRequestStatusPill status={request.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
