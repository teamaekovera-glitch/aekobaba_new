// Display formatting for catalog values.
//
// The product's truth rule lives here: a value the supplier never published
// formats as "Ask the supplier" — never a default, midpoint, or estimate.
// Every money and provenance string the UI shows goes through this module.

/** "$0.58" / "$5.61" — two decimals, thousands separators for whole units. */
export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** UTC-stable "21 Sep 2026" — the capture date must not drift by timezone. */
export function formatCaptureDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown date";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * The per-item price used for the "lowest price per item" sort: the computed
 * per-unit figure when the supplier provides one, otherwise the base price.
 * Null prices sort last (Infinity) — a missing price is never "free".
 */
export function effectiveUnitPrice(p: { priceUnit: number | null; basePrice: number | null }): number | null {
  return p.priceUnit ?? p.basePrice;
}

/** Price → basis line: "$5.61 per bucket (USD)" or "Ask the supplier". */
export function formatPriceLine(basePrice: number | null, priceBasis: string | null): string {
  if (basePrice === null) return "Ask the supplier";
  return priceBasis ? `${formatMoney(basePrice)} ${priceBasis}` : formatMoney(basePrice);
}

/** The per-unit figure shown next to the basis, e.g. "≈ $0.47 per unit". */
export function formatPerUnit(priceUnit: number | null): string | null {
  if (priceUnit === null) return null;
  return `≈ ${formatMoney(priceUnit)} per unit`;
}

/** "1 piece" / "500 units" — MOQ line, or "Ask the supplier" when null. */
export function formatMoq(moq: number | null, moqUnit: string | null): string {
  if (moq === null) return "Ask the supplier";
  const unit = moqUnit ?? "units";
  return `${moq.toLocaleString("en-US")} ${unit}${moq === 1 ? "" : ""}`;
}

/** "14 days" / "Ask the supplier" for lead time. */
export function formatLeadTime(leadTimeDays: number | null): string {
  if (leadTimeDays === null) return "Ask the supplier";
  return `${leadTimeDays} day${leadTimeDays === 1 ? "" : "s"}`;
}

/** Quantity-break range label: "1–249" / "1,000+" for an open top tier. */
export function formatBreakRange(minQty: number, maxQty: number | null): string {
  const min = minQty.toLocaleString("en-US");
  if (maxQty === null) return `${min}+`;
  return `${min}–${maxQty.toLocaleString("en-US")}`;
}

/** "From $0.39" badge for FROM price type; null for the others. */
export function priceTypeLabel(priceType: string): string {
  switch (priceType) {
    case "EXACT":
      return "Exact price";
    case "FROM":
      return "From price";
    case "CALCULATOR":
      return "Calculator quote";
    case "QUOTE_ONLY":
      return "Quote only";
    default:
      return priceType;
  }
}

/** Human tier names for supplier status badges. */
export function supplierStatusLabel(status: string): string {
  switch (status) {
    case "RECOMMENDED":
      return "Recommended";
    case "LISTED":
      return "Listed";
    case "QUOTE_ONLY":
      return "Quote only";
    case "PENDING":
      return "Pending verification";
    case "DISABLED":
      return "Disabled";
    default:
      return status;
  }
}
