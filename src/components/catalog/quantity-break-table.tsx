import { formatBreakRange, formatMoney } from "@/lib/catalog/format";
import type { QuantityBreakVM } from "@/lib/catalog/view-models";

// Quantity-break table on the product detail page — the supplier's own
// published tiers, in the order they publish them (ascending by minimum).

export function QuantityBreakTable({ breaks }: { breaks: QuantityBreakVM[] }) {
  if (breaks.length === 0) return null;
  return (
    <div data-testid="quantity-breaks">
      <h3 className="text-sm font-semibold text-ink">Quantity breaks</h3>
      <table className="mt-2 w-full max-w-sm text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th scope="col" className="py-1.5 pr-4 font-medium">
              Quantity
            </th>
            <th scope="col" className="py-1.5 font-medium">
              Unit price
            </th>
          </tr>
        </thead>
        <tbody>
          {breaks.map((brk, index) => (
            <tr key={`${brk.minQty}-${index}`} className="border-b border-neutral-100 last:border-0">
              <td className="py-1.5 pr-4 text-neutral-700">{formatBreakRange(brk.minQty, brk.maxQty)}</td>
              <td className="py-1.5 font-medium text-ink">{formatMoney(brk.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
