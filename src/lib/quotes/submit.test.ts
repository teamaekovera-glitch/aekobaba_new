import { beforeEach, describe, expect, it, vi } from "vitest";

// Submission fan-out (spec C9): one QuoteRequest, one QuoteRequestItem per
// product, item status SENT, below-MOQ lines warned — never blocked, never
// "fixed". The store is a hand-rolled Prisma-shaped stub: createQuoteRequest
// owns the write sequence, so the stub records what it writes.

import { createQuoteRequest, dedupeItems, type QuoteSubmitStore } from "./submit";

function makeStore(): QuoteSubmitStore & {
  quoteRequest: { create: ReturnType<typeof vi.fn> };
  quoteRequestItem: { createMany: ReturnType<typeof vi.fn> };
  product: { findMany: ReturnType<typeof vi.fn> };
} {
  let sequence = 0;
  const quoteRequest = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `qr_${++sequence}`,
      status: "SENT",
      ...data,
    })),
  };
  const quoteRequestItem = {
    createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
  };
  const product = {
    findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in
        .filter((pid: string) => ["p_1", "p_2", "p_moq"].includes(pid))
        .map((pid: string) => ({
          id: pid,
          moq: pid === "p_moq" ? 500 : null,
          moqUnit: pid === "p_moq" ? "piece" : null,
          supplierId: `sup_${pid}`,
        })),
    ),
  };
  const user = {
    findUnique: vi.fn(async ({ where }: { where: { supabaseUserId: string } }) =>
      where.supabaseUserId === "sb_brand" ? { id: "user_1" } : null,
    ),
  };
  return { user, product, quoteRequest, quoteRequestItem };
}

const baseInput = {
  supabaseUserId: "sb_brand",
  deadline: null,
  artworkNotes: null,
  artworkFileUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createQuoteRequest", () => {
  it("fans out one request with one item per product, all SENT", async () => {
    const store = makeStore();
    const result = await createQuoteRequest(store, {
      ...baseInput,
      items: [
        { productId: "p_1", quantity: 1000 },
        { productId: "p_2", quantity: 10 },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.status).toBe("SENT");
    expect(result.request.itemCount).toBe(2);
    expect(result.request.supplierCount).toBe(2);
    expect(result.warnings).toEqual([]);
    expect(store.quoteRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ brandUserId: "user_1", status: "SENT" }),
    });
    const written = store.quoteRequestItem.createMany.mock.calls[0][0].data as {
      quoteRequestId: string;
      productId: string;
      quantity: number;
      status: string;
    }[];
    expect(written).toHaveLength(2);
    for (const item of written) {
      expect(item.status).toBe("SENT");
      expect(item.quoteRequestId).toBe(result.request.id);
    }
  });

  it("warns below-MOQ lines without blocking or altering the quantity", async () => {
    const store = makeStore();
    const result = await createQuoteRequest(store, {
      ...baseInput,
      items: [{ productId: "p_moq", quantity: 100 }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.itemCount).toBe(1);
    expect(result.warnings).toEqual([
      expect.objectContaining({ productId: "p_moq", moq: 500, quantity: 100, moqUnit: "piece" }),
    ]);
    const written = store.quoteRequestItem.createMany.mock.calls[0][0].data as { quantity: number }[];
    expect(written[0].quantity).toBe(100);
  });

  it("accepts a product with no published MOQ with no warning", async () => {
    const store = makeStore();
    const result = await createQuoteRequest(store, {
      ...baseInput,
      items: [{ productId: "p_1", quantity: 3 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toEqual([]);
  });

  it("counts one supplier for two products from the same supplier", async () => {
    const store = makeStore();
    store.product.findMany.mockResolvedValue([
      { id: "p_1", moq: null, moqUnit: null, supplierId: "sup_same" },
      { id: "p_2", moq: null, moqUnit: null, supplierId: "sup_same" },
    ]);
    const result = await createQuoteRequest(store, {
      ...baseInput,
      items: [
        { productId: "p_1", quantity: 1 },
        { productId: "p_2", quantity: 1 },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.supplierCount).toBe(1);
  });

  it("rejects with unknown_products when any product id does not exist", async () => {
    const store = makeStore();
    const result = await createQuoteRequest(store, {
      ...baseInput,
      items: [{ productId: "ghost", quantity: 10 }],
    });
    expect(result).toMatchObject({ ok: false, reason: "unknown_products", unknownProductIds: ["ghost"] });
    expect(store.quoteRequest.create).not.toHaveBeenCalled();
  });

  it("rejects with no_brand_user when the session has no User row", async () => {
    const store = makeStore();
    const result = await createQuoteRequest(store, { ...baseInput, supabaseUserId: "sb_unknown", items: [{ productId: "p_1", quantity: 10 }] });
    expect(result).toMatchObject({ ok: false, reason: "no_brand_user" });
    expect(store.quoteRequest.create).not.toHaveBeenCalled();
  });

  it("rejects empty_items before touching the store", async () => {
    const store = makeStore();
    const result = await createQuoteRequest(store, { ...baseInput, items: [] });
    expect(result).toMatchObject({ ok: false, reason: "empty_items" });
    expect(store.user.findUnique).not.toHaveBeenCalled();
  });

  it("carries deadline, notes, and the artwork URL onto the created request", async () => {
    const store = makeStore();
    const deadline = new Date("2026-10-15T00:00:00Z");
    await createQuoteRequest(store, {
      ...baseInput,
      items: [{ productId: "p_1", quantity: 10 }],
      deadline,
      artworkNotes: "Matte finish",
      artworkFileUrl: "https://storage.example/artwork/logo.pdf",
    });
    expect(store.quoteRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deadline,
        artworkNotes: "Matte finish",
        artworkFileUrl: "https://storage.example/artwork/logo.pdf",
      }),
    });
  });
});

describe("dedupeItems", () => {
  it("keeps one line per product with the last quantity winning", () => {
    expect(
      dedupeItems([
        { productId: "p_1", quantity: 5 },
        { productId: "p_1", quantity: 9 },
        { productId: "p_2", quantity: 1 },
      ]),
    ).toEqual([
      { productId: "p_1", quantity: 9 },
      { productId: "p_2", quantity: 1 },
    ]);
  });
});
