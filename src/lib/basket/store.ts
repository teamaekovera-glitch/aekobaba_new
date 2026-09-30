import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ProductVM } from "@/lib/catalog/view-models";

// The Quote Basket store (build spec C8). Anonymous by design: the basket
// lives in localStorage so a signed-out visitor collects products while
// browsing — nothing requires sign-in until submission. Each line snapshots
// the ProductVM the visitor saw (serializable by contract), so the basket
// renders exactly what was added even if the catalog changes later.

export interface BasketItem {
  product: ProductVM;
  quantity: number;
  addedAt: string;
}

interface QuoteBasketState {
  items: BasketItem[];
  /**
   * Add a product (or refresh its snapshot). A new line starts at the
   * supplier's published MOQ when one exists; re-adding an existing line
   * keeps the quantity the visitor already chose.
   */
  addProduct: (product: ProductVM, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

export const BASKET_STORAGE_KEY = "aekobaba-quote-basket";
export const BASKET_STORAGE_VERSION = 1;

/**
 * Storage for the persist middleware. `localStorage` exists only in the
 * browser; when the getter runs on the server it must still return a no-op
 * Storage — zustand skips attaching the whole `persist` API (including
 * `hasHydrated()` and `rehydrate()`) when storage is missing, which crashes
 * the server render of the basket badge. Read through `globalThis` so test
 * environments that stub the global (node, no `window`) resolve too.
 */
function browserStorageOrNoop(): Storage {
  try {
    const storage = globalThis.localStorage;
    if (storage) return storage;
  } catch {
    // Some browsers throw SecurityError on localStorage access; fall through.
  }
  return {
    get length(): number {
      return 0;
    },
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
  } satisfies Storage;
}

function defaultQuantity(product: ProductVM): number {
  return product.moq ?? 1;
}

export const useQuoteBasketStore = create<QuoteBasketState>()(
  persist(
    (set) => ({
      items: [],
      addProduct: (product, quantity) =>
        set((state) => {
          const existing = state.items.find((item) => item.product.id === product.id);
          if (existing) {
            // One record per real SKU: a second add refreshes the snapshot and
            // only rewrites the quantity when one was explicitly passed.
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, product, quantity: quantity ?? item.quantity }
                  : item,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { product, quantity: quantity ?? defaultQuantity(product), addedAt: new Date().toISOString() },
            ],
          };
        }),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          // Clamp at the store: a zero/negative edit must never reach the
          // submission payload, where it would fail validation after the
          // visitor filled the form.
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item,
          ),
        })),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.product.id !== productId) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: BASKET_STORAGE_KEY,
      version: BASKET_STORAGE_VERSION,
      storage: createJSONStorage(browserStorageOrNoop),
      // The server renders an empty basket; hydration is explicit (the
      // BasketHydrator calls rehydrate() after mount) so localStorage can
      // never mismatch the server HTML.
      skipHydration: true,
    },
  ),
);
