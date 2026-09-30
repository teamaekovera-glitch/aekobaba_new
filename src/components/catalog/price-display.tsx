import { formatMoney, formatPerUnit, formatPriceLine, priceTypeLabel } from "@/lib/catalog/format";
import type { ProductVM } from "@/lib/catalog/view-models";

// Price panel (spec C2): price → basis → per-unit figure. When the supplier
// does not publish a price this renders "Ask the supplier" and NOTHING
// numeric — no $ sign, no estimate, not even in data attributes. A unit test
// asserts exactly that for a null-price fixture.

export function PriceDisplay({
  product,
  size = "md",
}: {
  product: Pick<ProductVM, "basePrice" | "priceBasis" | "priceUnit" | "priceType">;
  size?: "md" | "lg";
}) {
  if (product.basePrice === null) {
    return (
      <div data-testid="ask-supplier-price">
        <p data-testid="price-line" className={`font-semibold text-ink ${size === "lg" ? "text-2xl" : "text-lg"}`}>
          Ask the supplier
        </p>
        {product.priceBasis ? <p className="text-xs text-neutral-500">{product.priceBasis}</p> : null}
        <p className="mt-1 text-xs text-neutral-500">
          This supplier does not publish a price — request a quote to get one.
        </p>
      </div>
    );
  }

  const perUnit = formatPerUnit(product.priceUnit);
  return (
    <div data-testid="published-price">
      {product.priceType !== "EXACT" ? (
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {priceTypeLabel(product.priceType)}
        </p>
      ) : null}
      <p data-testid="price-line" className={`font-semibold text-ink ${size === "lg" ? "text-2xl" : "text-lg"}`}>
        {formatPriceLine(product.basePrice, product.priceBasis)}
      </p>
      {perUnit ? (
        <p data-testid="per-unit" className="text-xs text-neutral-500">
          {perUnit}
        </p>
      ) : null}
    </div>
  );
}

export function PriceTagInline({ product }: { product: ProductVM }) {
  if (product.basePrice === null) return <span className="text-sm font-medium text-ink">Ask the supplier</span>;
  return <span className="text-sm font-semibold text-ink">{formatMoney(product.basePrice)}</span>;
}
