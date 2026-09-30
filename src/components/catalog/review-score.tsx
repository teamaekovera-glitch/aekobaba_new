import type { SupplierSummaryVM } from "@/lib/catalog/view-models";

// Review evidence line: "4.5 ★ (214) via Trustpilot". When the supplier has
// no aggregate, we say so plainly — no stars are drawn from thin air.

export function ReviewScore({
  reviewScore,
  reviewCount,
  reviewPlatform,
  size = "sm",
}: Pick<SupplierSummaryVM, "reviewScore" | "reviewCount" | "reviewPlatform"> & { size?: "sm" | "md" }) {
  const textClass = size === "md" ? "text-sm" : "text-xs";
  if (reviewScore === null) {
    return (
      <span className={`text-neutral-500 ${textClass}`}>
        No published reviews
        <span data-testid="review-unsupported" className="sr-only">
          (review score not published)
        </span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${textClass} text-neutral-700`}>
      <span aria-hidden className="text-amber-500">
        ★
      </span>
      <span>
        {reviewScore.toFixed(1)} ({reviewCount})
      </span>
      {reviewPlatform ? <span className="text-neutral-400">via {reviewPlatform}</span> : null}
    </span>
  );
}
