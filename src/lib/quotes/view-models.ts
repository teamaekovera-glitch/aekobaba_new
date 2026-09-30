// Serializable view models for the brand's request-tracking pages. Server
// Components map Prisma rows to these plain objects; the live client
// component receives them as props and never touches the database.

import type { QuoteItemStatus } from "./live";

export interface QuoteRequestItemVM {
  id: string;
  productId: string;
  productTitle: string;
  supplierName: string;
  supplierSlug: string;
  quantity: number;
  status: QuoteItemStatus;
}

export interface QuoteRequestSummaryVM {
  id: string;
  status: string;
  createdAt: string;
  deadline: string | null;
  itemCount: number;
  supplierNames: string[];
}

export interface QuoteRequestDetailVM {
  id: string;
  status: string;
  createdAt: string;
  deadline: string | null;
  artworkNotes: string | null;
  artworkFileUrl: string | null;
  items: QuoteRequestItemVM[];
}

/** Minimal structural shape the mapper accepts (subset of the Prisma include). */
export interface QuoteRequestRow {
  id: string;
  status: string;
  createdAt: Date;
  deadline: Date | null;
  artworkNotes: string | null;
  artworkFileUrl: string | null;
  items: {
    id: string;
    quantity: number;
    status: string;
    product: {
      id: string;
      title: string;
      supplier: { name: string; slug: string };
    };
  }[];
}

function toItemStatus(status: string): QuoteItemStatus {
  // Fail honest: an unknown status value from the database renders as itself
  // would be a lie — map only the known contract values and default SENT.
  const known: QuoteItemStatus[] = ["SENT", "QUOTED", "DECLINED", "EXPIRED"];
  return known.includes(status as QuoteItemStatus) ? (status as QuoteItemStatus) : "SENT";
}

export function toQuoteRequestSummaryVM(row: QuoteRequestRow): QuoteRequestSummaryVM {
  const supplierNames = [...new Set(row.items.map((item) => item.product.supplier.name))];
  return {
    id: row.id,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    deadline: row.deadline ? row.deadline.toISOString() : null,
    itemCount: row.items.length,
    supplierNames,
  };
}

export function toQuoteRequestDetailVM(row: QuoteRequestRow): QuoteRequestDetailVM {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    deadline: row.deadline ? row.deadline.toISOString() : null,
    artworkNotes: row.artworkNotes,
    artworkFileUrl: row.artworkFileUrl,
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productTitle: item.product.title,
      supplierName: item.product.supplier.name,
      supplierSlug: item.product.supplier.slug,
      quantity: item.quantity,
      status: toItemStatus(item.status),
    })),
  };
}
