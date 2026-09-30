import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireBrandPage } from "@/lib/auth/page-guards";
import { db } from "@/lib/db";
import { toQuoteRequestDetailVM } from "@/lib/quotes/view-models";

import { RequestItemsLive } from "@/components/quotes/request-items-live";

// The brand's request detail — per-item status with live updates (spec C10).
// Owns only the brand's own requests: another brand's id renders 404.

export const metadata: Metadata = {
  title: "Quote request — Aekobaba",
};

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function QuoteRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await requireBrandPage(`/account/requests/${id}`);

  const row = await db.quoteRequest.findFirst({
    where: { id, brandUserId: brand.id },
    include: { items: { include: { product: { include: { supplier: true } } } } },
  });
  if (!row) notFound();

  const request = toQuoteRequestDetailVM(row);
  const supplierCount = new Set(request.items.map((item) => item.supplierName)).size;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/account/requests" className="text-sm text-neutral-500 hover:text-ink">
        ← My quote requests
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-ink sm:text-2xl">
        Quote request sent {formatDate(request.createdAt)}
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        {request.items.length} {request.items.length === 1 ? "item" : "items"} · {supplierCount}{" "}
        {supplierCount === 1 ? "supplier" : "suppliers"}
        {request.deadline ? ` · needed by ${formatDate(request.deadline)}` : ""}
      </p>

      <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4">
        <RequestItemsLive request={request} />
        {request.artworkNotes ? (
          <div className="mt-4 border-t border-neutral-100 pt-3">
            <h2 className="text-xs font-medium text-neutral-600">Artwork &amp; print notes</h2>
            <p data-testid="request-artwork-notes" className="mt-1 text-sm text-ink">
              {request.artworkNotes}
            </p>
          </div>
        ) : null}
        {request.artworkFileUrl ? (
          <div className="mt-3">
            <h2 className="text-xs font-medium text-neutral-600">Artwork file</h2>
            <a
              data-testid="request-artwork-file"
              href={request.artworkFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent underline"
            >
              View attached artwork
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
