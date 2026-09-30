import Link from "next/link";

import { formatLeadTime, formatMoq } from "@/lib/catalog/format";
import type { ProductVM } from "@/lib/catalog/view-models";
import { PriceTagInline } from "./price-display";
import { ProvenanceLine } from "./provenance-line";
import { ReviewScore } from "./review-score";
import { TierBadge } from "./tier-badge";

// Results-grid card (spec C5/C6): title, supplier + tier + reviews, price
// with basis, MOQ, lead time, and the provenance line. The whole card links
// to the product page; actions live on the detail page to keep the grid calm.

export function ProductCard({ product }: { product: ProductVM }) {
  return (
    <article
      data-testid="product-card"
      data-product-id={product.id}
      className="flex flex-col rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">
            <Link href={`/products/${product.id}`} className="hover:underline">
              {product.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            <Link href={`/suppliers/${product.supplier.slug}`} className="hover:text-accent hover:underline">
              {product.supplier.name}
            </Link>{" "}
            · {product.categoryName}
            {product.subcategory ? ` · ${product.subcategory}` : ""}
          </p>
        </div>
        <TierBadge status={product.supplier.status} />
      </div>

      <div className="mt-3">
        <PriceTagInline product={product} />
      </div>

      <dl className="mt-2 space-y-1 text-xs text-neutral-600">
        <div className="flex gap-2">
          <dt className="shrink-0 text-neutral-400">Min order:</dt>
          <dd>{formatMoq(product.moq, product.moqUnit)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-neutral-400">Lead time:</dt>
          <dd>{formatLeadTime(product.leadTimeDays)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-neutral-400">Material:</dt>
          <dd className="truncate">{product.material}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-3">
        <ReviewScore
          reviewScore={product.supplier.reviewScore}
          reviewCount={product.supplier.reviewCount}
          reviewPlatform={product.supplier.reviewPlatform}
        />
        <ProvenanceLine sourceUrl={product.sourceUrl} sourceCapturedAt={product.sourceCapturedAt} />
      </div>
    </article>
  );
}
