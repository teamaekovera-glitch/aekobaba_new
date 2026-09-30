import { describe, expect, it } from "vitest";

// View-model mapping from the Prisma rows the pages query to the props the
// quote pages render — money as numbers, dates as ISO strings, statuses as
// the shared contract values.

import { toQuoteRequestDetailVM, toQuoteRequestSummaryVM } from "./view-models";

function prismaRequest() {
  return {
    id: "qr_1",
    brandUserId: "user_1",
    status: "SENT" as const,
    deadline: new Date("2026-10-15T00:00:00.000Z"),
    artworkNotes: "Matte finish",
    artworkFileUrl: null,
    createdAt: new Date("2026-09-30T08:00:00.000Z"),
    items: [
      {
        id: "item_1",
        status: "QUOTED" as const,
        quantity: 500,
        product: {
          id: "p_1",
          title: "12 oz Amber PET Boston Round Bottle",
          supplier: { id: "sup_1", name: "Container & Packaging", slug: "container-and-packaging" },
        },
      },
      {
        id: "item_2",
        status: "SENT" as const,
        quantity: 250,
        product: {
          id: "p_2",
          title: "Custom Mailer Box",
          supplier: { id: "sup_2", name: "Packlane", slug: "packlane" },
        },
      },
    ],
  };
}

describe("quote view models", () => {
  it("maps the detail view model with ISO dates and contract statuses", () => {
    const vm = toQuoteRequestDetailVM(prismaRequest());
    expect(vm.id).toBe("qr_1");
    expect(vm.status).toBe("SENT");
    expect(vm.deadline).toBe("2026-10-15T00:00:00.000Z");
    expect(vm.artworkNotes).toBe("Matte finish");
    expect(vm.items).toHaveLength(2);
    expect(vm.items[0]).toMatchObject({
      id: "item_1",
      status: "QUOTED",
      quantity: 500,
      productTitle: "12 oz Amber PET Boston Round Bottle",
      supplierName: "Container & Packaging",
    });
  });

  it("summarizes item and supplier counts for the list page", () => {
    const vm = toQuoteRequestSummaryVM(prismaRequest());
    expect(vm.itemCount).toBe(2);
    expect(vm.supplierNames).toEqual(["Container & Packaging", "Packlane"]);
    expect(vm.status).toBe("SENT");
    expect(vm.createdAt).toBe("2026-09-30T08:00:00.000Z");
    expect(vm.deadline).toBe("2026-10-15T00:00:00.000Z");
  });

  it("omits null deadline from the summary", () => {
    const row = { ...prismaRequest(), deadline: null };
    expect(toQuoteRequestSummaryVM(row).deadline).toBeNull();
  });
});
