import Image from "next/image";
import Link from "next/link";

import { formatLeadTime, formatMoq } from "@/lib/catalog/format";
import type { ProductVM } from "@/lib/catalog/view-models";
import { PriceTagInline } from "./price-display";
import { ProvenanceLine } from "./provenance-line";
import { ReviewScore } from "./review-score";
import { TierBadge } from "./tier-badge";

// Image-led results-grid card (imagery spec): representative packshot first,
// then title, supplier + tier + reviews, price, MOQ / lead time / material,
// and the provenance line. The whole card links to the product page via the
// title link's stretched :after overlay; the supplier and provenance links
// keep their own z-layer so they stay clickable on top of it. Actions live on
// the detail page to keep the grid calm.

export function ProductCard({ product }: { product: ProductVM }) {
  const image = product.primaryImage;
  // The "representative" label is a hard requirement: generated packshots are
  // illustrative, never supplier photography (spec honesty rule).
  const imageAlt = image?.alt ? `${image.alt} — representative image` : `Representative image of ${product.title}`;

  return (
    <article
      data-testid="product-card"
      data-product-id={product.id}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <Link
        href={`/products/${product.id}`}
        aria-label={`View ${product.title}`}
        className="block focus-visible:outline-2 focus-visible:outline-accent"
      >
        <div className="relative aspect-square overflow-hidden bg-neutral-50">
          {image ? (
            <Image
              src={image.url}
              alt={imageAlt}
              fill
              sizes="(min-width: 1280px) 312px, (min-width: 640px) 45vw, 100vw"
              className="object-contain p-3 transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
              No image available
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug text-ink">
            <Link
              href={`/products/${product.id}`}
              className="hover:underline after:absolute after:inset-0 after:z-10"
            >
              {product.title}
            </Link>
          </h3>
          <TierBadge status={product.supplier.status} />
        </div>

        <p className="mt-0.5 text-xs text-neutral-500">
          <Link
            href={`/suppliers/${product.supplier.slug}`}
            className="relative z-20 hover:text-accent hover:underline"
          >
            {product.supplier.name}
          </Link>{" "}
          · {product.categoryName}
          {product.subcategory ? ` · ${product.subcategory}` : ""}
        </p>

        <div className="mt-2">
          <ReviewScore
            reviewScore={product.supplier.reviewScore}
            reviewCount={product.supplier.reviewCount}
            reviewPlatform={product.supplier.reviewPlatform}
          />
        </div>

        <div className="mt-2">
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

        <div className="relative z-20 mt-auto pt-3">
          <ProvenanceLine sourceUrl={product.sourceUrl} sourceCapturedAt={product.sourceCapturedAt} />
        </div>
      </div>
    </article>
  );
}
