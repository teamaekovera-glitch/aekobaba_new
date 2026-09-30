import { beforeEach, describe, expect, it, vi } from "vitest";

// Quote Basket store (spec C8): anonymous collection in localStorage, one
// line per real SKU, MOQ-defaulted quantity, survives a reload. The storage
// stub is hoisted ABOVE the store import on purpose — zustand's
// createJSONStorage probes localStorage when the store module evaluates, so
// defining it later silently disables persistence.

const localStorageStub = vi.hoisted(() => {
  const backing = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => void backing.set(key, value),
      removeItem: (key: string) => void backing.delete(key),
      clear: () => void backing.clear(),
    },
    configurable: true,
  });
  return backing;
});

import { BASKET_STORAGE_KEY, BASKET_STORAGE_VERSION, useQuoteBasketStore } from "./store";
import type { ProductVM } from "@/lib/catalog/view-models";

function productVM(overrides: Partial<ProductVM> = {}): ProductVM {
  return {
    id: "p_1",
    title: "12 oz Amber PET Boston Round Bottle",
    description: null,
    material: "Plastic (PET)",
    materialFamily: "Plastic",
    categorySlug: "bottles-jars",
    categoryName: "Bottles & Jars",
    subcategory: "Boston rounds",
    priceType: "EXACT",
    basePrice: 0.58,
    priceBasis: "per piece",
    priceUnit: 0.58,
    moq: 500,
    moqUnit: "piece",
    leadTimeDays: 7,
    stockOrCustom: "STOCK",
    samplePolicyVerified: true,
    sourceUrl: "https://www.containerandpackaging.com/item/amber-boston",
    sourceCapturedAt: "2026-09-18T00:00:00.000Z",
    quantityBreaks: [{ minQty: 1, maxQty: null, unitPrice: 0.58 }],
    images: [
      {
        url: "/products/glass-bottle-amber.png",
        alt: "12 oz Amber PET Boston Round Bottle — representative packaging image",
      },
    ],
    primaryImage: {
      url: "/products/glass-bottle-amber.png",
      alt: "12 oz Amber PET Boston Round Bottle — representative packaging image",
    },
    supplier: {
      slug: "container-and-packaging",
      name: "Container & Packaging",
      website: "https://www.containerandpackaging.com",
      location: "US",
      status: "RECOMMENDED",
      reviewScore: 4.5,
      reviewCount: 214,
      reviewPlatform: "Trustpilot",
      legalIdentity: null,
    },
    certificationNames: ["FDA"],
    ...overrides,
  };
}

beforeEach(() => {
  localStorageStub.clear();
  useQuoteBasketStore.getState().clear();
});

describe("quote basket store", () => {
  it("adds a product with a MOQ-defaulted quantity", () => {
    useQuoteBasketStore.getState().addProduct(productVM());
    expect(useQuoteBasketStore.getState().items).toHaveLength(1);
    expect(useQuoteBasketStore.getState().items[0]).toMatchObject({
      product: { id: "p_1" },
      quantity: 500,
    });
  });

  it("defaults quantity to 1 when the supplier publishes no MOQ", () => {
    useQuoteBasketStore.getState().addProduct(productVM({ id: "p_no_moq", moq: null }));
    expect(useQuoteBasketStore.getState().items[0]?.quantity).toBe(1);
  });

  it("is idempotent per product — the second add keeps the existing line and quantity", () => {
    const store = useQuoteBasketStore.getState();
    store.addProduct(productVM());
    store.addProduct(productVM({ basePrice: 0.61 })); // fresher capture
    const items = useQuoteBasketStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(500);
    expect(items[0]?.product.basePrice).toBe(0.61);
  });

  it("collects products from different suppliers as separate lines", () => {
    useQuoteBasketStore.getState().addProduct(productVM());
    useQuoteBasketStore
      .getState()
      .addProduct(
        productVM({
          id: "p_2",
          title: "Mailer Box",
          supplier: { ...productVM().supplier, slug: "packlane", name: "Packlane" },
        }),
      );
    expect(useQuoteBasketStore.getState().items).toHaveLength(2);
  });

  it("clamps quantity edits to at least 1", () => {
    useQuoteBasketStore.getState().addProduct(productVM());
    useQuoteBasketStore.getState().setQuantity("p_1", 0);
    expect(useQuoteBasketStore.getState().items[0]?.quantity).toBe(1);
  });

  it("removes a line by product id and clears the basket", () => {
    useQuoteBasketStore.getState().addProduct(productVM());
    useQuoteBasketStore.getState().addProduct(productVM({ id: "p_2" }));
    useQuoteBasketStore.getState().removeItem("p_1");
    expect(useQuoteBasketStore.getState().items.map((item) => item.product.id)).toEqual(["p_2"]);
    useQuoteBasketStore.getState().clear();
    expect(useQuoteBasketStore.getState().items).toHaveLength(0);
  });

  it("persists to localStorage and a fresh store restores it (reload survival)", async () => {
    const first = useQuoteBasketStore;
    first.getState().addProduct(productVM(), 250);
    first.getState().addProduct(productVM({ id: "p_2", moq: null, supplier: { ...productVM().supplier, slug: "packlane", name: "Packlane" } }));

    const raw = localStorageStub.get(BASKET_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const persisted = JSON.parse(raw ?? "{}") as { version: number; state: { items: unknown[] } };
    expect(persisted.version).toBe(BASKET_STORAGE_VERSION);
    expect(persisted.state.items).toHaveLength(2);

    // A reload is a fresh module instance: the new store boots empty (the
    // server renders an empty basket) and restores on explicit rehydrate.
    vi.resetModules();
    const { useQuoteBasketStore: fresh } = await import("./store");
    expect(fresh.getState().items).toHaveLength(0);
    await fresh.persist.rehydrate();
    expect(fresh.getState().items).toHaveLength(2);
    expect(fresh.getState().items[0]).toMatchObject({ quantity: 250, product: { id: "p_1" } });
    expect(fresh.getState().items[1]).toMatchObject({ quantity: 1, product: { id: "p_2" } });
  });
});
