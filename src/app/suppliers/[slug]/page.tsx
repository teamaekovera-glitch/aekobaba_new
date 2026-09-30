import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/catalog/product-card";
import { TierBadge } from "@/components/catalog/tier-badge";
import { formatCaptureDate } from "@/lib/catalog/format";
import { getSupplier } from "@/lib/catalog/queries";

// Supplier profile (spec): legal identity, review evidence with source
// platform + capture date, full catalog, tier badge, and a Claim This
// Listing entry point linking the existing claim flow from PR #3's
// successor — the flow is not rebuilt here.

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

interface SupplierPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SupplierPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supplier = await getSupplier(slug);
  return { title: supplier ? supplier.name : "Supplier" };
}

export default async function SupplierPage({ params }: SupplierPageProps) {
  const { slug } = await params;
  const supplier = await getSupplier(slug);
  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 data-testid="supplier-name" className="text-xl font-semibold text-ink sm:text-2xl">
              {supplier.name}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              {supplier.location} ·{" "}
              {supplier.website ? (
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  {new URL(supplier.website).host}
                </a>
              ) : (
                "No website published"
              )}
            </p>
            {supplier.legalIdentity ? (
              <p data-testid="supplier-legal-identity" className="mt-1 text-xs text-neutral-500">
                Registered as {supplier.legalIdentity}
              </p>
            ) : null}
            {supplier.lastVerifiedAt ? (
              <p className="mt-1 text-xs text-neutral-500">
                Listing last verified {formatCaptureDate(supplier.lastVerifiedAt)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <TierBadge status={supplier.status} />
            {/* No seeded supplier has an owning user yet, so the claim CTA
                shows on every profile. The supplier-admin work replaces this
                with an ownership check (claimed listings hide the CTA). */}
            <a
              href={`/suppliers/${supplier.slug}/claim`}
              data-testid="claim-listing"
              className="rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-white"
            >
              Is this your company? Claim This Listing
            </a>
          </div>
        </div>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Review evidence</h2>
        {supplier.reviews.length > 0 ? (
          <ul data-testid="review-evidence" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supplier.reviews.map((review, index) => (
              <li key={index} className="rounded-md border border-neutral-200 bg-white p-4 text-sm shadow-sm">
                <p className="font-medium text-ink">
                  {review.score.toFixed(1)} ★ · {review.sourcePlatform}
                </p>
                {review.summary ? <p className="mt-1 text-xs text-neutral-600">{review.summary}</p> : null}
                <p className="mt-2 text-xs text-neutral-500">
                  Captured {formatCaptureDate(review.sourceCapturedAt)} ·{" "}
                  <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    source
                  </a>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No third-party reviews captured yet.</p>
        )}
      </section>

      {supplier.certifications.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Certifications</h2>
          <ul data-testid="supplier-certifications" className="mt-3 flex flex-wrap gap-2">
            {supplier.certifications.map((cert) => (
              <li key={cert.name} className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700 shadow-sm">
                {cert.name} · verified {formatCaptureDate(cert.sourceCapturedAt)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Catalog ({supplier.products.length})
        </h2>
        <div data-testid="supplier-catalog" className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {supplier.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
