import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PriceDisplay } from "@/components/catalog/price-display";
import { ProductActions } from "@/components/catalog/product-actions";
import { ProvenanceLine } from "@/components/catalog/provenance-line";
import { QuantityBreakTable } from "@/components/catalog/quantity-break-table";
import { ReviewScore } from "@/components/catalog/review-score";
import { TierBadge } from "@/components/catalog/tier-badge";
import { formatLeadTime, formatMoq } from "@/lib/catalog/format";
import { getProduct } from "@/lib/catalog/queries";

// Product detail — the "Judge" step: full price panel with quantity breaks,
// MOQ, lead time, certifications, supplier score, and the provenance line
// linking the exact supplier page and capture date (spec C2/C6/C7).

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product ? product.title : "Product" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="text-xs text-neutral-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-accent hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/results?category=${encodeURIComponent(product.categorySlug)}`} className="hover:text-accent hover:underline">
          {product.categoryName}
        </Link>{" "}
        / <span className="text-neutral-700">{product.title}</span>
      </nav>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 data-testid="product-title" className="text-xl font-semibold text-ink sm:text-2xl">
            {product.title}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            <Link href={`/suppliers/${product.supplier.slug}`} data-testid="product-supplier-link" className="font-medium text-accent hover:underline">
              {product.supplier.name}
            </Link>{" "}
            · {product.categoryName}
            {product.subcategory ? ` / ${product.subcategory}` : ""}
          </p>

          {product.description ? <p className="mt-4 text-sm text-neutral-700">{product.description}</p> : null}

          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2" data-testid="product-specs">
            <div className="flex gap-2 text-sm">
              <dt className="shrink-0 text-neutral-400">Material:</dt>
              <dd className="text-neutral-800">{product.material}</dd>
            </div>
            <div className="flex gap-2 text-sm">
              <dt className="shrink-0 text-neutral-400">Min order:</dt>
              <dd data-testid="product-moq" className="text-neutral-800">
                {formatMoq(product.moq, product.moqUnit)}
              </dd>
            </div>
            <div className="flex gap-2 text-sm">
              <dt className="shrink-0 text-neutral-400">Lead time:</dt>
              <dd data-testid="product-lead-time" className="text-neutral-800">
                {formatLeadTime(product.leadTimeDays)}
              </dd>
            </div>
            <div className="flex gap-2 text-sm">
              <dt className="shrink-0 text-neutral-400">Type:</dt>
              <dd className="text-neutral-800">{product.stockOrCustom === "STOCK" ? "Stock" : "Custom"}</dd>
            </div>
          </dl>

          {product.certificationNames.length > 0 ? (
            <div className="mt-4 text-sm">
              <span className="text-neutral-400">Certifications (supplier): </span>
              <span data-testid="product-certifications" className="text-neutral-800">
                {product.certificationNames.join(", ")}
              </span>
            </div>
          ) : null}

          <div className="mt-8">
            <QuantityBreakTable breaks={product.quantityBreaks} />
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <PriceDisplay product={product} size="lg" />

          <div className="mt-4 flex items-center justify-between gap-2">
            <TierBadge status={product.supplier.status} />
            <ReviewScore
              size="md"
              reviewScore={product.supplier.reviewScore}
              reviewCount={product.supplier.reviewCount}
              reviewPlatform={product.supplier.reviewPlatform}
            />
          </div>

          <div className="mt-4 border-t border-neutral-100 pt-4">
            <ProductActions product={product} />
          </div>

          <div className="mt-4 border-t border-neutral-100 pt-3">
            <ProvenanceLine variant="md" sourceUrl={product.sourceUrl} sourceCapturedAt={product.sourceCapturedAt} />
          </div>
        </aside>
      </div>
    </div>
  );
}
