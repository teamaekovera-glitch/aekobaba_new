import { beforeEach, describe, expect, it, vi } from "vitest";

// Route contract for POST /api/quotes (spec C11 + C9): auth gates resolve
// before any parse (401 anonymous → sign-in round trip, 403 supplier/admin),
// validation rejects bad payloads, and the happy path fans out through
// createQuoteRequest with the injected artwork uploader.

const mocks = vi.hoisted(() => ({
  getServerSessionUser: vi.fn(),
  getCurrentUserRole: vi.fn(),
  artworkUploader: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    product: { findMany: vi.fn(), findUnique: vi.fn() },
    quoteRequest: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    quoteRequestItem: { createMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getServerSessionUser: mocks.getServerSessionUser,
  getCurrentUserRole: mocks.getCurrentUserRole,
}));

vi.mock("@/lib/quotes/storage", () => ({
  artworkUploader: mocks.artworkUploader,
  MAX_ARTWORK_BYTES: 10 * 1024 * 1024,
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { POST } from "./route";

function postForm(payload: unknown, artwork?: File) {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  if (artwork) form.set("artwork", artwork);
  return POST(new Request("http://localhost:3000/api/quotes", { method: "POST", body: form }));
}

/** Wire the mocked db so createQuoteRequest's fan-out succeeds. */
function mockFanOutDb() {
  const db = mocks.db;
  db.user.findUnique.mockResolvedValue({ id: "user_1" });
  db.product.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
    where.id.in.map((pid: string) => ({
      id: pid,
      moq: pid === "p_moq" ? 500 : null,
      moqUnit: pid === "p_moq" ? "piece" : null,
      supplierId: `sup_${pid}`,
    })),
  );
  db.quoteRequest.create.mockResolvedValue({ id: "qr_new", status: "SENT" });
  db.quoteRequestItem.createMany.mockResolvedValue({ count: 2 });
  return db;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSessionUser.mockResolvedValue({
    supabaseUserId: "sb_brand",
    email: "brand@acme.test",
    emailVerified: true,
  });
  mocks.getCurrentUserRole.mockResolvedValue("BRAND");
});

describe("POST /api/quotes", () => {
  it("returns 401 for an anonymous visitor — the client redirects to sign-in, basket preserved", async () => {
    mocks.getServerSessionUser.mockResolvedValue(null);
    const res = await postForm({ items: [{ productId: "p_1", quantity: 100 }] });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
  });

  it("returns 403 for a SUPPLIER account — only brands send quote requests", async () => {
    mocks.getCurrentUserRole.mockResolvedValue("SUPPLIER");
    const res = await postForm({ items: [{ productId: "p_1", quantity: 100 }] });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "role_mismatch" });
  });

  it("returns 400 for a malformed payload envelope", async () => {
    const form = new FormData();
    form.set("payload", "not json");
    const res = await POST(new Request("http://localhost:3000/api/quotes", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_payload" });
  });

  it("returns 400 when the payload fails validation (no items, bad quantity)", async () => {
    for (const payload of [{ items: [] }, { items: [{ productId: "p_1", quantity: "lots" }] }]) {
      const res = await postForm(payload);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid_payload" });
    }
  });

  it("creates the fan-out and returns 201 with request id, counts, and no warnings", async () => {
    const db = await mockFanOutDb();
    const res = await postForm({
      items: [
        { productId: "p_1", quantity: 1000 },
        { productId: "p_2", quantity: 10 },
      ],
      deadline: "2026-10-15",
      artworkNotes: "Matte finish",
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      quoteRequest: { id: string; status: string };
      itemCount: number;
      supplierCount: number;
      warnings: unknown[];
    };
    expect(body.quoteRequest).toEqual({ id: "qr_new", status: "SENT" });
    expect(body.itemCount).toBe(2);
    expect(body.supplierCount).toBe(2);
    expect(body.warnings).toEqual([]);
    expect(vi.mocked(db.quoteRequest.create).mock.calls[0][0].data).toMatchObject({
      status: "SENT",
      artworkNotes: "Matte finish",
      deadline: new Date("2026-10-15T00:00:00.000Z"),
      artworkFileUrl: null,
    });
    expect(mocks.artworkUploader).not.toHaveBeenCalled();
  });

  it("returns below-MOQ warnings with the 201 — warning, never a block", async () => {
    await mockFanOutDb();
    const res = await postForm({ items: [{ productId: "p_moq", quantity: 100 }] });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { warnings: { productId: string; moq: number; quantity: number }[] };
    expect(body.warnings).toEqual([expect.objectContaining({ productId: "p_moq", moq: 500, quantity: 100 })]);
  });

  it("maps unknown_products with the offending ids and a 400", async () => {
    const db = await mockFanOutDb();
    vi.mocked(db.product.findMany).mockResolvedValue([]);
    const res = await postForm({ items: [{ productId: "ghost", quantity: 10 }] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "unknown_products", unknownProductIds: ["ghost"] });
  });

  it("uploads artwork through the factory uploader and stores the returned URL", async () => {
    const db = await mockFanOutDb();
    mocks.artworkUploader.mockResolvedValue(async () => "https://storage.example/artwork/logo.pdf");
    const res = await postForm(
      { items: [{ productId: "p_1", quantity: 100 }] },
      new File(["pdf"], "logo.pdf", { type: "application/pdf" }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { quoteRequest: { id: string } };
    expect(body.quoteRequest.id).toBe("qr_new");
    expect(vi.mocked(db.quoteRequest.create).mock.calls[0][0].data.artworkFileUrl).toBe(
      "https://storage.example/artwork/logo.pdf",
    );
  });

  it("returns 503 when artwork storage is not configured — never a fabricated URL", async () => {
    await mockFanOutDb();
    mocks.artworkUploader.mockResolvedValue(null);
    const res = await postForm(
      { items: [{ productId: "p_1", quantity: 100 }] },
      new File(["pdf"], "logo.pdf", { type: "application/pdf" }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "artwork_storage_unavailable" });
  });

  it("returns 413 for artwork beyond the 10 MiB ceiling", async () => {
    await mockFanOutDb();
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.pdf", { type: "application/pdf" });
    const res = await postForm({ items: [{ productId: "p_1", quantity: 100 }] }, oversized);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "artwork_too_large" });
  });
});
