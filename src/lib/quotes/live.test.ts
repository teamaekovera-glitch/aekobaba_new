import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Live status contract (spec C10): item events fold into the item list by id
// (an event patches the matching row; unknown ids are dropped — the list is
// the server snapshot), and the request-level pill flips SENT → RESPONDED as
// soon as any item has been answered. The dev bridge (no Supabase env) is a
// server-sent events stream with the same event contract.

import { applyItemEvent, displayRequestStatus, subscribeToQuoteItems, type QuoteItemEvent } from "./live";
import type { QuoteRequestItemVM } from "./view-models";

function item(overrides: Partial<QuoteRequestItemVM> = {}): QuoteRequestItemVM {
  return {
    id: "item_1",
    productId: "p_1",
    productTitle: "12 oz Amber PET Boston Round Bottle",
    supplierName: "Container & Packaging",
    supplierSlug: "container-and-packaging",
    quantity: 500,
    status: "SENT",
    ...overrides,
  };
}

describe("applyItemEvent", () => {
  it("patches the status of the matching item", () => {
    const items = [item(), item({ id: "item_2", productId: "p_2", productTitle: "Mailer Box" })];
    const next = applyItemEvent(items, { id: "item_2", status: "QUOTED" });
    expect(next.find((entry) => entry.id === "item_2")?.status).toBe("QUOTED");
    expect(next.find((entry) => entry.id === "item_1")?.status).toBe("SENT");
    // Original list untouched — pure reduction.
    expect(items.find((entry) => entry.id === "item_2")?.status).toBe("SENT");
  });

  it("drops events for ids not in the snapshot (the list owns rows, the socket owns statuses)", () => {
    const next = applyItemEvent([item()], { id: "item_ghost", status: "QUOTED" });
    expect(next).toEqual([item()]);
  });
});

describe("displayRequestStatus", () => {
  it("stays SENT while every item is unanswered", () => {
    expect(displayRequestStatus("SENT", [item(), item({ id: "i2" })])).toBe("SENT");
  });

  it("flips to RESPONDED as soon as any item is QUOTED", () => {
    expect(displayRequestStatus("SENT", [item({ status: "QUOTED" })])).toBe("RESPONDED");
  });

  it("flips to RESPONDED on a DECLINE too — a decline is a response", () => {
    expect(displayRequestStatus("SENT", [item({ status: "DECLINED" })])).toBe("RESPONDED");
  });

  it("does not flip on EXPIRED alone — expiry is not an answer", () => {
    expect(displayRequestStatus("SENT", [item({ status: "EXPIRED" })])).toBe("SENT");
  });

  it("never upgrades a CLOSED request", () => {
    expect(displayRequestStatus("CLOSED", [item({ status: "QUOTED" })])).toBe("CLOSED");
  });

  it("preserves DRAFT (defensive — drafts are not subscribed)", () => {
    expect(displayRequestStatus("DRAFT", [item({ status: "QUOTED" })])).toBe("DRAFT");
  });
});

describe("subscribeToQuoteItems — dev SSE bridge", () => {
  class FakeEventSource {
    static instances: FakeEventSource[] = [];
    url: string;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    closed = false;
    constructor(url: string) {
      this.url = url;
      FakeEventSource.instances.push(this);
    }
    close(): void {
      this.closed = true;
    }
  }

  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("subscribes to the request's events endpoint and emits parsed item events", async () => {
    const events: QuoteItemEvent[] = [];
    const subscription = await subscribeToQuoteItems({
      requestId: "qr_1",
      onEvent: (event) => events.push(event),
    });
    const source = FakeEventSource.instances[0];
    expect(source.url).toContain("/api/quotes/qr_1/events");

    source.onmessage?.({ data: JSON.stringify({ id: "item_1", status: "QUOTED" }) });
    source.onmessage?.({ data: JSON.stringify({ id: "item_2", status: "DECLINED" }) });
    expect(events).toEqual([
      { id: "item_1", status: "QUOTED" },
      { id: "item_2", status: "DECLINED" },
    ]);

    subscription.unsubscribe();
    expect(source.closed).toBe(true);
  });

  it("never lets a malformed frame kill the stream — logs and continues", async () => {
    const events: QuoteItemEvent[] = [];
    await subscribeToQuoteItems({ requestId: "qr_1", onEvent: (event) => events.push(event) });
    const source = FakeEventSource.instances[0];
    source.onmessage?.({ data: "{broken" });
    source.onmessage?.({ data: JSON.stringify({ id: "item_1", status: "QUOTED" }) });
    expect(events).toEqual([{ id: "item_1", status: "QUOTED" }]);
    expect(console.error).toHaveBeenCalled();
  });

  it("ignores frames without a string id/status and bridge error frames", async () => {
    const events: QuoteItemEvent[] = [];
    await subscribeToQuoteItems({ requestId: "qr_1", onEvent: (event) => events.push(event) });
    const source = FakeEventSource.instances[0];
    source.onmessage?.({ data: JSON.stringify({ error: "db_down" }) });
    source.onmessage?.({ data: JSON.stringify({ status: "QUOTED" }) });
    expect(events).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "[aekobaba] live updates: bridge reported",
      "db_down",
    );
  });
});
