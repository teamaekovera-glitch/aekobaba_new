// Supplier lead inbox (build spec art_MObD9666, supplier & admin surfaces).
//
// One QuoteRequest fans out into one QuoteRequestItem per product; a supplier's
// inbox is the item rows whose product belongs to the supplier they own,
// grouped by their parent request. The supplier answers per item — QUOTED or
// DECLINED — and every answer feeds two honest metrics:
//
// - Supplier.responseTimeHours: captured on the FIRST response only (the
//   first-response time). Never estimated from anything else.
// - QuoteRequest.status: SENT → RESPONDED once any item is answered (the data
//   contract in prisma/schema.prisma).
//
// Realtime is NOT wired here — the Quote Basket PR completes the live loop.
// Actions are plain API calls. The store is a narrow interface so the logic is
// unit-testable against a stub (live Supabase credentials pending per spec).

import type { Prisma, QuoteItemStatus } from "@prisma/client";

/** The supplier-facing answer to a lead. */
export const LEAD_ACTIONS = ["quoted", "declined"] as const;
export type LeadAction = (typeof LEAD_ACTIONS)[number];

export type LeadActionFailureReason =
  | "not_found"
  | "forbidden"
  | "not_actionable";

/** One item row as the inbox renders it — basePrice already a number. */
export interface InboxLeadItem {
  id: string;
  quantity: number;
  status: QuoteItemStatus;
  createdAt: Date;
  product: {
    id: string;
    title: string;
    material: string;
    priceType: string;
    basePrice: number | null;
    priceBasis: string | null;
    moq: number | null;
    sourceCapturedAt: Date;
  };
}

/**
 * The raw row the store's findMany returns — basePrice is still Prisma's
 * Decimal. The boundary conversion to InboxLeadItem happens in
 * listSupplierLeads, keeping Decimal out of the pure grouping layer.
 */
export type InboxStoreLeadRow = {
  id: string;
  quantity: number;
  status: QuoteItemStatus;
  createdAt: Date;
  product: {
    id: string;
    title: string;
    material: string;
    priceType: string;
    basePrice: Prisma.Decimal | null;
    priceBasis: string | null;
    moq: number | null;
    sourceCapturedAt: Date;
  };
  quoteRequest: {
    id: string;
    status: string;
    deadline: Date | null;
    artworkNotes: string | null;
    createdAt: Date;
  };
};

/** A request group: the brand's ask plus its item rows for this supplier. */
export interface InboxLeadGroup {
  request: {
    id: string;
    status: string;
    deadline: Date | null;
    artworkNotes: string | null;
    createdAt: Date;
  };
  items: InboxLeadItem[];
}

/** The slice of PrismaClient the inbox reads/writes. */
export interface InboxStore {
  quoteRequestItem: {
    findMany(args: {
      where: { product: { supplier: { ownerUserId: string } } };
      orderBy: { createdAt: "desc" };
      select: {
        id: true;
        quantity: true;
        status: true;
        createdAt: true;
        product: {
          select: {
            id: true;
            title: true;
            material: true;
            priceType: true;
            basePrice: true;
            priceBasis: true;
            moq: true;
            sourceCapturedAt: true;
          };
        };
        quoteRequest: {
          select: {
            id: true;
            status: true;
            deadline: true;
            artworkNotes: true;
            createdAt: true;
          };
        };
      };
    }): Promise<InboxStoreLeadRow[]>;
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        status: true;
        createdAt: true;
        quoteRequest: {
          select: { id: true; status: true };
        };
        product: {
          select: {
            supplier: { select: { id: true; ownerUserId: true; responseTimeHours: true } };
          };
        };
      };
    }): Promise<{
      id: string;
      status: QuoteItemStatus;
      createdAt: Date;
      quoteRequest: { id: string; status: string };
      product: {
        supplier: { id: string; ownerUserId: string | null; responseTimeHours: number | null };
      };
    } | null>;
    update(args: {
      where: { id: string };
      data: { status: "QUOTED" | "DECLINED" };
      select: { id: true; status: true };
    }): Promise<{ id: string; status: string }>;
  };
  supplier: {
    update(args: {
      where: { id: string };
      data: { responseTimeHours: number };
    }): Promise<unknown>;
  };
  quoteRequest: {
    update(args: {
      where: { id: string };
      data: { status: "RESPONDED" };
    }): Promise<unknown>;
  };
}

/** Group flat item rows into per-request groups, newest request first. */
export function groupLeadsByRequest(
  rows: Array<InboxLeadItem & { quoteRequest: InboxLeadGroup["request"] }>,
): InboxLeadGroup[] {
  const groups = new Map<string, InboxLeadGroup>();
  for (const row of rows) {
    let group = groups.get(row.quoteRequest.id);
    if (!group) {
      group = { request: row.quoteRequest, items: [] };
      groups.set(row.quoteRequest.id, group);
    }
    group.items.push({
      id: row.id,
      quantity: row.quantity,
      status: row.status,
      createdAt: row.createdAt,
      product: row.product,
    });
  }
  return [...groups.values()];
}

/** Boundary conversion: Decimal → number once, at the store edge. */
function toLeadItem(
  row: InboxStoreLeadRow,
): InboxLeadItem & { quoteRequest: InboxLeadGroup["request"] } {
  return {
    ...row,
    product: {
      ...row.product,
      basePrice:
        row.product.basePrice === null ? null : Number(row.product.basePrice),
    },
  };
}

/** Read a supplier's leads, newest first, grouped by request. */
export async function listSupplierLeads(
  store: InboxStore,
  ownerUserId: string,
): Promise<InboxLeadGroup[]> {
  const rows = await store.quoteRequestItem.findMany({
    where: { product: { supplier: { ownerUserId } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quantity: true,
      status: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          title: true,
          material: true,
          priceType: true,
          basePrice: true,
          priceBasis: true,
          moq: true,
          sourceCapturedAt: true,
        },
      },
      quoteRequest: {
        select: {
          id: true,
          status: true,
          deadline: true,
          artworkNotes: true,
          createdAt: true,
        },
      },
    },
  });

  return groupLeadsByRequest(rows.map(toLeadItem));
}

/**
 * Hours between a lead's arrival and the supplier's answer, rounded to the
 * nearest hour. A sub-30-minute answer rounds to 0, which reads as broken —
 * clamp to 1. Exported for tests.
 */
export function firstResponseHours(from: Date, to: Date): number {
  const hours = Math.round((to.getTime() - from.getTime()) / 3_600_000);
  return Math.max(1, hours);
}

/**
 * Answer a lead item. Tenancy is enforced here, not just at the route: the
 * item must belong to a product whose supplier is owned by this user.
 *
 * - Unknown item → not_found.
 * - Item exists but this user does not own its supplier → forbidden.
 * - Item already answered (or expired) → not_actionable. Status transitions
 *   run one way from SENT; a QUOTED answer never silently becomes DECLINED.
 * - Success → item status updated, first-response time captured when the
 *   supplier has none yet, and a SENT parent request flips to RESPONDED.
 */
export async function respondToLeadItem(
  store: InboxStore,
  input: {
    ownerUserId: string;
    itemId: string;
    action: LeadAction;
    respondedAt?: Date;
  },
): Promise<
  | { ok: true; item: { id: string; status: string } }
  | { ok: false; reason: LeadActionFailureReason }
> {
  const item = await store.quoteRequestItem.findUnique({
    where: { id: input.itemId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      quoteRequest: { select: { id: true, status: true } },
      product: {
        select: {
          supplier: {
            select: { id: true, ownerUserId: true, responseTimeHours: true },
          },
        },
      },
    },
  });

  if (!item) return { ok: false, reason: "not_found" };
  if (item.product.supplier.ownerUserId !== input.ownerUserId) {
    return { ok: false, reason: "forbidden" };
  }
  if (item.status !== "SENT") {
    return { ok: false, reason: "not_actionable" };
  }

  const respondedAt = input.respondedAt ?? new Date();
  const status: "QUOTED" | "DECLINED" =
    input.action === "quoted" ? "QUOTED" : "DECLINED";

  const updated = await store.quoteRequestItem.update({
    where: { id: item.id },
    data: { status },
    select: { id: true, status: true },
  });

  // First response only — the supplier's response time is their
  // first-response time, captured once real data exists.
  if (item.product.supplier.responseTimeHours === null) {
    await store.supplier.update({
      where: { id: item.product.supplier.id },
      data: {
        responseTimeHours: firstResponseHours(item.createdAt, respondedAt),
      },
    });
  }

  // Data contract: a request becomes RESPONDED once any supplier answers.
  if (item.quoteRequest.status === "SENT") {
    await store.quoteRequest.update({
      where: { id: item.quoteRequest.id },
      data: { status: "RESPONDED" },
    });
  }

  return { ok: true, item: updated };
}
