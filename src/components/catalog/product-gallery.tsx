import Image from "next/image";

import type { ProductImageVM } from "@/lib/catalog/view-models";

// Product gallery (spec art_AjaTUf9x): renders the product's actual Image
// rows — primary large on a neutral background, remaining rows as a thumbnail
// strip. No invented views: today the seed writes exactly one row, so the
// strip is hidden; when real supplier photography lands as new rows, the
// gallery grows with the data. The visible "Representative image" caption is
// the honesty rule — it sits near the ProvenanceLine so imagery and evidence
// read as distinct blocks.

export function ProductGallery({ images, title }: { images: ProductImageVM[]; title: string }) {
  if (images.length === 0) return null;

  const [primary, ...rest] = images;
  const altFor = (image: ProductImageVM) => image.alt ?? `${title} — representative packaging image`;

  return (
    <figure data-testid="product-gallery">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        <Image
          src={primary.url}
          alt={altFor(primary)}
          fill
          priority
          sizes="(min-width: 1024px) 672px, 100vw"
          className="object-contain"
        />
      </div>
      <figcaption data-testid="representative-image-caption" className="mt-2 text-xs text-neutral-500">
        Representative image — generated illustration, not a photo of the supplier&rsquo;s actual stock.
      </figcaption>

      {rest.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2" data-testid="gallery-thumbs">
          {rest.map((image) => (
            <div
              key={image.url}
              className="relative h-16 w-16 overflow-hidden rounded border border-neutral-200 bg-neutral-50"
            >
              <Image src={image.url} alt={altFor(image)} fill sizes="64px" className="object-contain" />
            </div>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
