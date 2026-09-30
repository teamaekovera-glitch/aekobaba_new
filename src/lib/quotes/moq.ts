import { formatMoq } from "@/lib/catalog/format";

// MOQ honesty rule (build spec, submission honesty): the submitted quantity is
// validated against the product's published MOQ — the UI warns when quantity
// is below MOQ but never blocks. A brand may deliberately ask a supplier to
// bend their minimum; the supplier decides.

export interface MoqAssessment {
  belowMoq: boolean;
  /** Human message for the warning, null when the quantity is fine. */
  message: string | null;
}

/**
 * Compare a requested quantity with the supplier's published MOQ. An unknown
 * MOQ (null — "Ask the supplier") can never warn: there is no published
 * minimum to be below.
 */
export function assessMoq(quantity: number, moq: number | null, moqUnit: string | null): MoqAssessment {
  if (moq === null || quantity >= moq) return { belowMoq: false, message: null };
  return {
    belowMoq: true,
    message: `Below the supplier's published minimum of ${formatMoq(moq, moqUnit)}. You can still send — the supplier decides.`,
  };
}
