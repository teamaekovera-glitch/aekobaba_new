import { describe, expect, it } from "vitest";

import {
  effectiveUnitPrice,
  formatBreakRange,
  formatCaptureDate,
  formatLeadTime,
  formatMoney,
  formatMoq,
  formatPerUnit,
  formatPriceLine,
} from "./format";

// The truth rule lives in formatting: unpublished values format as
// "Ask the supplier", never a default or estimate (spec C2).

describe("formatMoney", () => {
  it("renders dollars with two decimals", () => {
    expect(formatMoney(0.58)).toBe("$0.58");
    expect(formatMoney(5.6)).toBe("$5.60");
    expect(formatMoney(1234.5)).toBe("$1,234.50");
  });
});

describe("formatCaptureDate", () => {
  it("formats as UTC-stable 'D Mon YYYY' regardless of local timezone", () => {
    // 2026-09-18T00:00:00Z must be 18 Sep 2026 even at UTC-12.
    expect(formatCaptureDate("2026-09-18T00:00:00Z")).toBe("18 Sep 2026");
    expect(formatCaptureDate("2026-09-18T23:59:59Z")).toBe("18 Sep 2026");
  });
});

describe("effectiveUnitPrice", () => {
  it("prefers the computed per-unit figure, then the base price", () => {
    expect(effectiveUnitPrice({ priceUnit: 0.47, basePrice: 0.58 })).toBe(0.47);
    expect(effectiveUnitPrice({ priceUnit: null, basePrice: 0.58 })).toBe(0.58);
    expect(effectiveUnitPrice({ priceUnit: null, basePrice: null })).toBeNull();
  });
});

describe("formatPriceLine", () => {
  it("renders 'Ask the supplier' for a null price — never a number", () => {
    expect(formatPriceLine(null, "per bucket")).toBe("Ask the supplier");
    expect(formatPriceLine(null, null)).toBe("Ask the supplier");
  });

  it("joins price and basis", () => {
    expect(formatPriceLine(5.61, "per bucket (USD)")).toBe("$5.61 per bucket (USD)");
    expect(formatPriceLine(0.58, null)).toBe("$0.58");
  });
});

describe("formatPerUnit", () => {
  it("returns null for a missing per-unit figure", () => {
    expect(formatPerUnit(null)).toBeNull();
    expect(formatPerUnit(0.47)).toBe("≈ $0.47 per unit");
  });
});

describe("formatMoq", () => {
  it("renders 'Ask the supplier' when no MOQ is published", () => {
    expect(formatMoq(null, null)).toBe("Ask the supplier");
  });

  it("formats published minimums with thousands separators", () => {
    expect(formatMoq(1, "piece")).toBe("1 piece");
    expect(formatMoq(1000, "units")).toBe("1,000 units");
    expect(formatMoq(500, null)).toBe("500 units");
  });
});

describe("formatLeadTime", () => {
  it("renders 'Ask the supplier' when lead time is unpublished", () => {
    expect(formatLeadTime(null)).toBe("Ask the supplier");
  });

  it("formats days", () => {
    expect(formatLeadTime(14)).toBe("14 days");
    expect(formatLeadTime(1)).toBe("1 day");
  });
});

describe("formatBreakRange", () => {
  it("formats closed and open tiers", () => {
    expect(formatBreakRange(1, 249)).toBe("1–249");
    expect(formatBreakRange(1000, null)).toBe("1,000+");
  });
});
