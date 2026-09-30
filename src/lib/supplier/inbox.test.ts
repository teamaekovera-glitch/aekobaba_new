import { describe, expect, it, vi } from "vitest";

import {
  firstResponseHours,
  groupLeadsByRequest,
  respondToLeadItem,
  type InboxStore,
} from "./inbox";

// Lead inbox against a stub store — no live database. Covers grouping, the
// tenancy boundary, the one-way SENT→QUOTED/DECLINED transition, first-
// response capture, and the SENT→RESPONDED request flip (data contract).

const OWNED_SUPPLIER_ID = "sup_owned";

function itemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "item_1",
    status: "SENT" as const,
    createdAt: new Date("2026-09-30T10:00:00Z"),
    quoteRequest: { id: "qr_1", status: "SENT" },
    product: {
      supplier: {
        id: OWNED_SUPPLIER_ID,
        ownerUserId: "user_supplier",
        responseTimeHours: null,
      },
    },
    ...overrides,
  };
}

function storeFixture(item: Record<string, unknown> | null) {
  const writes: Array<Record<string, unknown>> = [];

  const store: InboxStore = {
    quoteRequestItem: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(item),
      update: vi.fn().mockImplementation((args: {
        where: { id: string };
        data: { status: "QUOTED" | "DECLINED" };
      }) => {
        writes.push({ kind: "item.update", ...args });
        return Promise.resolve({ id: args.where.id, status: args.data.status });
      }),
    },
    supplier: {
      update: vi.fn().mockImplementation((args: {
        where: { id: string };
        data: { responseTimeHours: number };
      }) => {
        writes.push({ kind: "supplier.update", ...args });
        return Promise.resolve({});
      }),
    },
    quoteRequest: {
      update: vi.fn().mockImplementation((args: {
        where: { id: string };
        data: { status: "RESPONDED" };
      }) => {
        writes.push({ kind: "request.update", ...args });
        return Promise.resolve({});
      }),
    },
  };

  return { store, writes };
}

describe("groupLeadsByRequest", () => {
  it("groups item rows under their parent request", () => {
    const rows = [
      {
        id: "i1",
        quantity: 1000,
        status: "SENT" as const,
        createdAt: new Date("2026-09-30T10:00:00Z"),
        quoteRequest: {
          id: "qr_1",
          status: "SENT",
          deadline: null,
          artworkNotes: "Matte finish",
          createdAt: new Date("2026-09-30T09:00:00Z"),
        },
        product: {
          id: "p1",
          title: "12 oz Amber PET Bottle",
          material: "Plastic (PET)",
          priceType: "EXACT",
          basePrice: 0.58,
          priceBasis: "per piece",
          moq: 1,
          sourceCapturedAt: new Date("2026-09-18"),
        },
      },
      {
        id: "i2",
        quantity: 500,
        status: "SENT" as const,
        createdAt: new Date("2026-09-30T10:05:00Z"),
        quoteRequest: {
          id: "qr_1",
          status: "SENT",
          deadline: null,
          artworkNotes: "Matte finish",
          createdAt: new Date("2026-09-30T09:00:00Z"),
        },
        product: {
          id: "p2",
          title: "Stand-up Pouch",
          material: "Plastic (PET)",
          priceType: "QUOTE_ONLY",
          basePrice: null,
          priceBasis: null,
          moq: null,
          sourceCapturedAt: new Date("2026-09-18"),
        },
      },
    ];

    const groups = groupLeadsByRequest(rows);

    expect(groups).toHaveLength(1);
    expect(groups[0].request.id).toBe("qr_1");
    expect(groups[0].items.map((i) => i.id)).toEqual(["i1", "i2"]);
  });

  it("keeps separate requests in separate groups", () => {
    const request = (id: string) => ({
      id,
      status: "SENT",
      deadline: null,
      artworkNotes: null,
      createdAt: new Date("2026-09-30T09:00:00Z"),
    });
    const groups = groupLeadsByRequest([
      { id: "a", quantity: 1, status: "SENT" as const, createdAt: new Date(), quoteRequest: request("qr_1"), product: {} as never },
      { id: "b", quantity: 1, status: "SENT" as const, createdAt: new Date(), quoteRequest: request("qr_2"), product: {} as never },
    ]);
    expect(groups.map((g) => g.request.id)).toEqual(["qr_1", "qr_2"]);
  });
});

describe("respondToLeadItem", () => {
  it("marks an item quoted and captures first-response time", async () => {
    const item = itemFixture();
    const { store, writes } = storeFixture(item);

    const result = await respondToLeadItem(store, {
      ownerUserId: "user_supplier",
      itemId: "item_1",
      action: "quoted",
      respondedAt: new Date("2026-09-30T14:00:00Z"),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.item.status).toBe("QUOTED");

    // 10:00 → 14:00 = 4 hours, captured on the supplier.
    expect(writes.find((w) => w.kind === "supplier.update")).toMatchObject({
      data: { responseTimeHours: 4 },
    });
    // Parent request flips SENT → RESPONDED per the data contract.
    expect(writes.find((w) => w.kind === "request.update")).toMatchObject({
      data: { status: "RESPONDED" },
    });
  });

  it("marks an item declined", async () => {
    const { store } = storeFixture(itemFixture());

    const result = await respondToLeadItem(store, {
      ownerUserId: "user_supplier",
      itemId: "item_1",
      action: "declined",
      respondedAt: new Date("2026-09-30T11:00:00Z"),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.item.status).toBe("DECLINED");
  });

  it("does not overwrite an existing response time (first response wins)", async () => {
    const item = itemFixture({
      product: {
        supplier: {
          id: OWNED_SUPPLIER_ID,
          ownerUserId: "user_supplier",
          responseTimeHours: 6,
        },
      },
    });
    const { store, writes } = storeFixture(item);

    await respondToLeadItem(store, {
      ownerUserId: "user_supplier",
      itemId: "item_1",
      action: "quoted",
      respondedAt: new Date("2026-09-30T11:00:00Z"),
    });

    expect(writes.find((w) => w.kind === "supplier.update")).toBeUndefined();
  });

  it("rejects a supplier answering another supplier's lead (tenancy)", async () => {
    const item = itemFixture({
      product: {
        supplier: {
          id: "sup_other",
          ownerUserId: "user_other",
          responseTimeHours: null,
        },
      },
    });
    const { store, writes } = storeFixture(item);

    const result = await respondToLeadItem(store, {
      ownerUserId: "user_supplier",
      itemId: "item_1",
      action: "quoted",
    });

    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(writes).toEqual([]);
  });

  it("refuses an already-answered item — no status regression", async () => {
    const { store, writes } = storeFixture(itemFixture({ status: "QUOTED" }));

    const result = await respondToLeadItem(store, {
      ownerUserId: "user_supplier",
      itemId: "item_1",
      action: "declined",
    });

    expect(result).toEqual({ ok: false, reason: "not_actionable" });
    expect(writes).toEqual([]);
  });

  it("reports a missing item", async () => {
    const { store } = storeFixture(null);

    const result = await respondToLeadItem(store, {
      ownerUserId: "user_supplier",
      itemId: "ghost",
      action: "quoted",
    });

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("firstResponseHours", () => {
  it("rounds to the nearest hour", () => {
    expect(
      firstResponseHours(
        new Date("2026-09-30T10:00:00Z"),
        new Date("2026-09-30T14:00:00Z"),
      ),
    ).toBe(4);
  });

  it("clamps a sub-half-hour answer to 1 — never zero", () => {
    expect(
      firstResponseHours(
        new Date("2026-09-30T10:00:00Z"),
        new Date("2026-09-30T10:10:00Z"),
      ),
    ).toBe(1);
  });
});
