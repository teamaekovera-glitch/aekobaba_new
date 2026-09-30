import { describe, expect, it } from "vitest";

// Dev-bridge NOTIFY parsing: only this request's well-formed item payloads
// become events; everything else is filtered, never thrown.

import { notificationToEvent } from "./notifications";

describe("notificationToEvent", () => {
  it("parses a payload belonging to the requested quote request", () => {
    const payload = JSON.stringify({ id: "item_1", quoteRequestId: "qr_1", status: "QUOTED" });
    expect(notificationToEvent(payload, "qr_1")).toEqual({ id: "item_1", status: "QUOTED" });
  });

  it("filters payloads for other quote requests", () => {
    const payload = JSON.stringify({ id: "item_1", quoteRequestId: "qr_other", status: "QUOTED" });
    expect(notificationToEvent(payload, "qr_1")).toBeNull();
  });

  it("returns null for empty, malformed, or shape-mismatched payloads", () => {
    expect(notificationToEvent(undefined, "qr_1")).toBeNull();
    expect(notificationToEvent("{broken", "qr_1")).toBeNull();
    expect(notificationToEvent(JSON.stringify({ status: "QUOTED" }), "qr_1")).toBeNull();
    expect(
      notificationToEvent(JSON.stringify({ id: 42, quoteRequestId: "qr_1", status: "QUOTED" }), "qr_1"),
    ).toBeNull();
  });
});
