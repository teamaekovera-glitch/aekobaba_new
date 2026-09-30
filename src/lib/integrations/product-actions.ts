// ─── Integration point: product action handlers ─────────────────────────────
//
// The three product actions (Quote Basket, Shortlist, Compare) are wired
// client-side, but their stores do not exist yet: the Quote Basket lands in
// the next PR. This module is the ONE place those handlers live. The
// quote-basket PR replaces these stubs with real store calls — the
// components and pages never change.
//
// Stubs are honest: they log to the console and do nothing visible. No
// button pretends a feature exists (no toast saying "added", no fake badge).

import type { ProductVM } from "@/lib/catalog/view-models";

export type ProductActionHandler = (product: ProductVM) => void;

function stub(action: string): ProductActionHandler {
  return (product) => {
    console.info(
      `[aekobaba] ${action} is not wired yet — "${product.title}" (${product.id}). ` +
        `See src/lib/integrations/product-actions.ts, the integration point for the Quote Basket PR.`,
    );
  };
}

/** Wire the real Quote Basket store here (next PR). */
export const addToQuoteBasket: ProductActionHandler = stub("Add to Quote Basket");

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
