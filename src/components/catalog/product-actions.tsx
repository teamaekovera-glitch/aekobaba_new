"use client";

// Product action buttons — prop-driven so pages and tests inject handlers.
// Click handlers resolve through src/lib/integrations/product-actions.ts
// (the named integration point); the Quote Basket PR wires real store calls
// there without touching this component.

import { defaultProductActionHandlers } from "@/lib/integrations/product-actions";
import type { ProductVM } from "@/lib/catalog/view-models";

export interface ProductActionsProps {
  product: ProductVM;
  onAddToQuoteBasket?: (product: ProductVM) => void;
  onAddToShortlist?: (product: ProductVM) => void;
  onCompare?: (product: ProductVM) => void;
  onRequestSample?: (product: ProductVM) => void;
}

export function ProductActions({
  product,
  onAddToQuoteBasket = defaultProductActionHandlers.onAddToQuoteBasket,
  onAddToShortlist = defaultProductActionHandlers.onAddToShortlist,
  onCompare = defaultProductActionHandlers.onCompare,
  onRequestSample = defaultProductActionHandlers.onRequestSample,
}: ProductActionsProps) {
  const compact = "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-testid="add-to-quote-basket"
        onClick={() => onAddToQuoteBasket(product)}
        className={`${compact} bg-accent text-white hover:bg-accent-dark`}
      >
        Add to Quote Basket
      </button>
      <button
        type="button"
        data-testid="add-to-shortlist"
        onClick={() => onAddToShortlist(product)}
        className={`${compact} border-neutral-300 bg-white text-ink hover:bg-accent-soft`}
      >
        Add to Shortlist
      </button>
      <button
        type="button"
        data-testid="compare"
        onClick={() => onCompare(product)}
        className={`${compact} border-neutral-300 bg-white text-ink hover:bg-accent-soft`}
      >
        Compare
      </button>
      {/* The sample button never lies (spec C7): rendered only when the
          supplier's sample policy is verified. */}
      {product.samplePolicyVerified ? (
        <button
          type="button"
          data-testid="request-sample"
          onClick={() => onRequestSample(product)}
          className={`${compact} border-accent/40 bg-accent-soft text-accent hover:bg-accent hover:text-white`}
        >
          Request Sample
        </button>
      ) : null}
    </div>
  );
}
