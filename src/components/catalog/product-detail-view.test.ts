import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductDetailView } from "./product-detail-view";
import { makeProduct } from "@/lib/catalog/test-fixtures";

// Rendered-DOM verification for the product page: the gallery renders the
// product's actual Image rows with the "Representative image" caption, the
// provenance line survives the redesign, and no action or spec is lost.

const render = (node: React.ReactElement): string => renderToStaticMarkup(node);

describe("ProductDetailView — gallery", () => {
  it("renders the primary image with the representative caption", () => {
    const html = render(createElement(ProductDetailView, { product: makeProduct() }));

    expect(html).toContain('data-testid="product-gallery"');
    expect(html).toContain("glass-jar.png");
    expect(html).toContain("representative packaging image");
    expect(html).toContain('data-testid="representative-image-caption"');
    expect(html).toContain("Representative image");
  });

  it("renders thumbnails only from actual Image rows — no invented views", () => {
    const single = render(createElement(ProductDetailView, { product: makeProduct() }));
    expect(single).not.toContain('data-testid="gallery-thumbs"');

    const multi = makeProduct({
      images: [
        { url: "/products/glass-jar.png", alt: "primary — representative packaging image" },
        { url: "/products/glass-bottle.png", alt: "angle two — representative packaging image" },
        { url: "/products/metal-tin.png", alt: "angle three — representative packaging image" },
      ],
    });
    const html = render(createElement(ProductDetailView, { product: multi }));

    expect(html).toContain('data-testid="gallery-thumbs"');
    expect(html).toContain("glass-bottle.png");
    expect(html).toContain("metal-tin.png");
  });

  it("renders nothing when the product has no Image rows", () => {
    const html = render(
      createElement(ProductDetailView, { product: makeProduct({ primaryImage: null }) }),
    );

    expect(html).not.toContain('data-testid="product-gallery"');
  });
});

describe("ProductDetailView — evidence and actions survive the redesign", () => {
  it("keeps the provenance line distinct from the imagery", () => {
    const html = render(createElement(ProductDetailView, { product: makeProduct() }));

    expect(html).toContain("Verified from");
    expect(html).toContain("https://supplier.example/");
  });

  it("keeps title, supplier, specs, and quote actions", () => {
    const html = render(createElement(ProductDetailView, { product: makeProduct() }));

    expect(html).toContain('data-testid="product-title"');
    expect(html).toContain('data-testid="product-supplier-link"');
    expect(html).toContain('data-testid="product-specs"');
    expect(html).toContain('data-testid="product-moq"');
    expect(html).toContain("Add to Quote Basket");
  });
});
