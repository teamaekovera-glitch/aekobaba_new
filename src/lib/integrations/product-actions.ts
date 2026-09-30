// ─── Integration point: product action handlers ─────────────────────────────
//
// The three product actions (Quote Basket, Shortlist, Compare) are wired
// client-side. Quote Basket is live (zustand store, anonymous collection);
// Shortlist, Compare, and Sample land in their own PRs and stay honest
// stubs — no button pretends a feature exists.
//
// Components and pages never change: they resolve handlers through this
// module only.

import type { ProductVM } from "@/lib/catalog/view-models";
import { useQuoteBasketStore } from "@/lib/basket/store";

export type ProductActionHandler = (product: ProductVM) => void;

function stub(action: string): ProductActionHandler {
  return (product) => {
    console.info(
      `[aekobaba] ${action} is not wired yet — "${product.title}" (${product.id}). ` +
        `See src/lib/integrations/product-actions.ts, the integration point for product actions.`,
    );
  };
}

/**
 * Quote Basket collection is anonymous and client-side: the full ProductVM is
 * snapshotted into the zustand basket (localStorage-persisted) with a
 * MOQ-defaulted quantity, and the header badge count updates in place.
 */
export const addToQuoteBasket: ProductActionHandler = (product) => {
  useQuoteBasketStore.getState().addProduct(product);
};

/** Wire the signed-in shortlist flow here. */
export const addToShortlist: ProductActionHandler = stub("Add to Shortlist");

/** Wire the compare tray (up to four products) here. */
export const compareProduct: ProductActionHandler = stub("Compare");

/**
 * Sample requests go through the supplier-admin PR's sample route once the
 * basket/auth flows land; until then the button logs the intent.
 */
export const requestSample: ProductActionHandler = stub("Request Sample");

/** Defaults a ProductActions component uses when no handler prop is passed. */
export const defaultProductActionHandlers = {
  onAddToQuoteBasket: addToQuoteBasket,
  onAddToShortlist: addToShortlist,
  onCompare: compareProduct,
  onRequestSample: requestSample,
} as const;
