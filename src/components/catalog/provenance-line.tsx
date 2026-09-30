import { formatCaptureDate } from "@/lib/catalog/format";

// The provenance line (spec C6): every price and value carries the date we
// verified it and a link to the exact supplier page it came from. This is
// the product's core trust asset — it renders on every card and detail page.

export function ProvenanceLine({
  sourceUrl,
  sourceCapturedAt,
  variant = "sm",
}: {
  sourceUrl: string;
  sourceCapturedAt: string;
  variant?: "sm" | "md";
}) {
  const textClass = variant === "md" ? "text-sm" : "text-xs";
  return (
    <p data-testid="provenance-line" className={`${textClass} text-neutral-500`}>
      Verified from{" "}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-neutral-300 underline-offset-2 hover:text-accent"
      >
        supplier&rsquo;s page
      </a>{" "}
      on {formatCaptureDate(sourceCapturedAt)}
    </p>
  );
}
