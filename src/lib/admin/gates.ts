// Admin verification queue: the four supplier-quality gates (build spec
// art_MObD9666 — "supplier verification queue scored against the plan's four
// gates with visible gate evidence").
//
// The gates, verbatim from the spec:
//   1. Real operating company
//   2. Verifiable prices
//   3. Sells to CPG in our categories
//   4. No unresolved trust problems
//
// Each gate is assessed ONLY from data the supplier record actually carries —
// gate 4 has no automated signal in the data model (there is no flags table),
// so it assesses as "manual": a real status, not a fabricated pass. The
// assessment is advisory evidence for the admin; the admin alone assigns the
// tier. Nothing here may invent or estimate a fact.

export type GateStatus = "pass" | "fail" | "manual";

export interface GateResult {
  /** 1–4, in the spec's order. */
  number: number;
  name: string;
  status: GateStatus;
  /** What the verdict was read off — rendered next to the verdict. */
  evidence: string;
}

/**
 * The facts the gates read. A plain shape on purpose: the admin page assembles
 * it from one Prisma query (supplier + product/review counts), keeping this
 * module pure and the query surface explicit.
 */
export interface SupplierGateFacts {
  /** Registered legal entity — gate 1. Null = never recorded. */
  legalIdentity: string | null;
  /** Products in taxonomy categories — gate 3's breadth signal. */
  productCount: number;
  /** Distinct categories those products sit in. */
  categoryCount: number;
  /**
   * Products publishing some price mechanism (any PriceType except
   * QUOTE_ONLY) — gate 2.
   */
  pricedProductCount: number;
  /** Review evidence captured with provenance — feeds gate 4's context. */
  reviewCount: number;
  reviewScore: number | null;
}

export const GATE_NAMES = [
  "Real operating company",
  "Verifiable prices",
  "Sells to CPG in our categories",
  "No unresolved trust problems",
] as const;

export function assessVerificationGates(facts: SupplierGateFacts): GateResult[] {
  // Gate 1 — a registered legal identity on file. The claim flow does not
  // collect it; it is set from the supplier's own public record, so its
  // presence is the evidence.
  const hasLegalIdentity =
    facts.legalIdentity !== null && facts.legalIdentity.trim() !== "";
  const gate1: GateResult = {
    number: 1,
    name: GATE_NAMES[0],
    status: hasLegalIdentity ? "pass" : "fail",
    evidence: hasLegalIdentity
      ? `Registered entity on file: "${facts.legalIdentity}"`
      : "No registered legal identity recorded",
  };

  // Gate 2 — at least one product publishing a price mechanism. Dated
  // provenance on every product row is enforced by the schema itself, so it
  // needs no re-check here.
  const gate2: GateResult = {
    number: 2,
    name: GATE_NAMES[1],
    status: facts.pricedProductCount > 0 ? "pass" : "fail",
    evidence:
      facts.pricedProductCount > 0
        ? `${facts.pricedProductCount} of ${facts.productCount} products publish a price, each with a dated source page`
        : "No product publishes a price — every row is quote-only or empty",
  };

  // Gate 3 — products exist in the taxonomy (the FK guarantees they sit in
  // categories; breadth is the number of distinct categories).
  const gate3: GateResult = {
    number: 3,
    name: GATE_NAMES[2],
    status: facts.productCount > 0 ? "pass" : "fail",
    evidence:
      facts.productCount > 0
        ? `${facts.productCount} products across ${facts.categoryCount} categories`
        : "No products in the catalog — nothing maps to our categories",
  };

  // Gate 4 — deliberately "manual": the data model has no trust-flag table,
  // and review evidence alone neither proves nor disproves unresolved
  // problems. The admin reads the review context and decides.
  const reviewEvidence =
    facts.reviewCount > 0
      ? `${facts.reviewCount} sourced reviews on file (avg ${facts.reviewScore ?? "n/a"})`
      : "No sourced review evidence captured";
  const gate4: GateResult = {
    number: 4,
    name: GATE_NAMES[3],
    status: "manual",
    evidence: `${reviewEvidence}. Check for open disputes before tiering — no automated signal exists.`,
  };

  return [gate1, gate2, gate3, gate4];
}

/** How many gates passed outright — displayed as the queue's at-a-glance score. */
export function gatesPassed(results: GateResult[]): number {
  return results.filter((r) => r.status === "pass").length;
}
