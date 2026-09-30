import { formatMoq, formatPerUnit, formatPriceLine } from "@/lib/catalog/format";
import { assessMoq } from "@/lib/quotes/moq";
import type { BasketItem } from "@/lib/basket/store";

// One basket line — presentational, prop-driven, no store or API access so
// tests can server-render it. The MOQ warning renders from the supplier's
// published minimum only; a null MOQ never warns (nothing published to be
// below — spec submission honesty).

export interface BasketLineProps {
  item: BasketItem;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function BasketLine({ item, onQuantityChange, onRemove }: BasketLineProps) {
  const { product, quantity } = item;
  const moq = assessMoq(quantity, product.moq, product.moqUnit);

  return (
    <div data-testid="basket-line" className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{product.title}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {product.supplier.name} · {product.material} · {product.categoryName}
          </p>
          <p className="mt-1 text-sm text-ink">{formatPriceLine(product.basePrice, product.priceBasis)}</p>
          <p className="text-xs text-neutral-500">
            {formatPerUnit(product.priceUnit) ?? ""}
            {product.priceUnit !== null && product.moq !== null ? " · " : ""}
            {product.moq !== null ? `Minimum ${formatMoq(product.moq, product.moqUnit)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-neutral-500" htmlFor={`basket-qty-${product.id}`}>
            Qty
          </label>
          <input
            id={`basket-qty-${product.id}`}
            data-testid="basket-quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => onQuantityChange(product.id, Math.max(1, Number(event.target.value) || 1))}
            className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            data-testid="basket-remove"
            onClick={() => onRemove(product.id)}
            className="text-xs text-neutral-500 hover:text-rose-700"
          >
            Remove
          </button>
        </div>
      </div>
      {moq.message ? (
        <p
          data-testid="moq-warning"
          role="note"
          className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800"
        >
          {moq.message}
        </p>
      ) : null}
    </div>
  );
}
