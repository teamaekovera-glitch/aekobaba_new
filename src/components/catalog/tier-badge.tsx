import { supplierStatusLabel } from "@/lib/catalog/format";
import type { SupplierStatusValue } from "@/lib/catalog/view-models";

// Supplier tier badge — the plan's tier semantics in one glance:
// Recommended (verified, meets all four gates), Listed (verified),
// Quote only (sells but publishes no prices), Pending / Disabled.

const STYLES: Record<SupplierStatusValue, string> = {
  RECOMMENDED: "bg-accent-soft text-accent border-accent/30",
  LISTED: "bg-neutral-100 text-neutral-700 border-neutral-300",
  QUOTE_ONLY: "bg-amber-50 text-amber-800 border-amber-200",
  PENDING: "bg-neutral-50 text-neutral-500 border-neutral-200",
  DISABLED: "bg-red-50 text-red-700 border-red-200",
};

export function TierBadge({ status }: { status: SupplierStatusValue }) {
  return (
    <span
      data-testid="tier-badge"
      data-tier={status}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {supplierStatusLabel(status)}
    </span>
  );
}
