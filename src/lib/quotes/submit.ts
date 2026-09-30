import { assessMoq, type MoqAssessment } from "./moq";

// Quote Basket submission (build spec C9): one form fans out into ONE
// QuoteRequest plus one QuoteRequestItem per selected product — products from
// five suppliers in one basket means five item rows in one request, grouped
// per supplier in their inboxes. The submission lands as SENT: the DRAFT
// stage is the client-side basket, not a database state a visitor manages.
//
// Store-injection pattern (same as the supplier inbox): the logic takes a
// Prisma-shaped subset so tests run against stubs with no live database.

export interface SubmitBasketItem {
  productId: string;
  quantity: number;
}

export interface SubmitBasketInput {
  /** The submitting user's Supabase Auth subject — identity from the session, never from the client. */
  supabaseUserId: string;
  items: SubmitBasketItem[];
  deadline: Date | null;
  artworkNotes: string | null;
  artworkFileUrl: string | null;
}

export interface BasketMoqWarning {
  productId: string;
  quantity: number;
  moq: number;
  moqUnit: string | null;
  message: string;
}

export interface SubmittedRequest {
  id: string;
  status: "SENT";
  itemCount: number;
  /** Supplier count the request fans out to (distinct products' suppliers). */
  supplierCount: number;
}

export type CreateQuoteRequestResult =
  | { ok: true; request: SubmittedRequest; warnings: BasketMoqWarning[] }
  | { ok: false; reason: "empty_items" | "no_brand_user" | "unknown_products"; unknownProductIds?: string[] };

/** Prisma subset the submission logic needs (mirrors InboxStore in supplier/inbox.ts). */
export interface QuoteSubmitStore {
  user: {
    findUnique(args: {
      where: { supabaseUserId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  product: {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true; moq: true; moqUnit: true; supplierId: true };
    }): Promise<{ id: string; moq: number | null; moqUnit: string | null; supplierId: string }[]>;
  };
  quoteRequest: {
    create(args: {
      data: {
        brandUserId: string;
        status: "SENT";
        deadline: Date | null;
        artworkNotes: string | null;
        artworkFileUrl: string | null;
      };
    }): Promise<{ id: string; status: string }>;
  };
  quoteRequestItem: {
    createMany(args: {
      data: { quoteRequestId: string; productId: string; quantity: number; status: "SENT" }[];
    }): Promise<{ count: number }>;
  };
}

/** Dedupe lines per product (a basket carries one line per SKU; the last quantity wins). */
export function dedupeItems(items: SubmitBasketItem[]): SubmitBasketItem[] {
  const byProduct = new Map<string, SubmitBasketItem>();
  for (const item of items) byProduct.set(item.productId, item);
  return [...byProduct.values()];
}

export async function createQuoteRequest(
  store: QuoteSubmitStore,
  input: SubmitBasketInput,
): Promise<CreateQuoteRequestResult> {
  if (input.items.length === 0) return { ok: false, reason: "empty_items" };

  const user = await store.user.findUnique({
    where: { supabaseUserId: input.supabaseUserId },
    select: { id: true },
  });
  if (!user) return { ok: false, reason: "no_brand_user" };

  const items = dedupeItems(input.items);
  const products = await store.product.findMany({
    where: { id: { in: items.map((item) => item.productId) } },
    select: { id: true, moq: true, moqUnit: true, supplierId: true },
  });
  const known = new Set(products.map((product) => product.id));
  const unknown = items.filter((item) => !known.has(item.productId)).map((item) => item.productId);
  if (unknown.length > 0) return { ok: false, reason: "unknown_products", unknownProductIds: unknown };

  // Warn below MOQ, never block (spec: submission honesty).
  const warnings: BasketMoqWarning[] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    const assessment: MoqAssessment = assessMoq(item.quantity, product.moq, product.moqUnit);
    if (assessment.message) {
      warnings.push({
        productId: item.productId,
        quantity: item.quantity,
        moq: product.moq as number,
        moqUnit: product.moqUnit,
        message: assessment.message,
      });
    }
  }

  const created = await store.quoteRequest.create({
    data: {
      brandUserId: user.id,
      status: "SENT",
      deadline: input.deadline,
      artworkNotes: input.artworkNotes,
      artworkFileUrl: input.artworkFileUrl,
    },
  });

  await store.quoteRequestItem.createMany({
    data: items.map((item) => ({
      quoteRequestId: created.id,
      productId: item.productId,
      quantity: item.quantity,
      status: "SENT" as const,
    })),
  });

  return {
    ok: true,
    request: {
      id: created.id,
      status: "SENT",
      itemCount: items.length,
      supplierCount: new Set(products.map((product) => product.supplierId)).size,
    },
    warnings,
  };
}
