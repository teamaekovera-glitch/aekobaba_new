"use client";

import { useEffect, useState } from "react";

import { useQuoteBasketStore, type BasketItem } from "./store";

// Client hooks over the basket store. The badge and basket page render an
// empty basket on the server and rehydrate after mount — localStorage is
// never read during hydration, so there is no mismatch to paper over.

/** True once the persisted basket has been restored into the store. */
export function useBasketHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useQuoteBasketStore.persist.hasHydrated());

  useEffect(() => {
    // Any mounted consumer (header badge, basket page) triggers the one-time
    // restore; rehydrate() is idempotent, extra calls are no-ops.
    if (!useQuoteBasketStore.persist.hasHydrated()) {
      void useQuoteBasketStore.persist.rehydrate();
    }
    setHydrated(useQuoteBasketStore.persist.hasHydrated());
    return useQuoteBasketStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

export interface BasketSupplierGroup {
  supplierSlug: string;
  supplierName: string;
  items: BasketItem[];
}

/** Basket lines grouped per supplier, preserving add order. */
export function groupBasketBySupplier(items: BasketItem[]): BasketSupplierGroup[] {
  const groups = new Map<string, BasketSupplierGroup>();
  for (const item of items) {
    const slug = item.product.supplier.slug;
    const group = groups.get(slug);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(slug, { supplierSlug: slug, supplierName: item.product.supplier.name, items: [item] });
    }
  }
  return [...groups.values()];
}
