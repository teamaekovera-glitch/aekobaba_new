// Status pills for the quote lifecycle — the brand and supplier surfaces read
// the same contract values, so the colors stay shared. Plain presentational
// component: no state, no fetches, safe to server-render in tests.

const ITEM_STYLES: Record<string, string> = {
  SENT: "border-neutral-300 bg-white text-neutral-600",
  QUOTED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DECLINED: "border-rose-200 bg-rose-50 text-rose-800",
  EXPIRED: "border-neutral-200 bg-neutral-100 text-neutral-500",
};

const REQUEST_STYLES: Record<string, string> = {
  DRAFT: "border-neutral-300 bg-white text-neutral-600",
  SENT: "border-steel/40 bg-steel/10 text-ink",
  RESPONDED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CLOSED: "border-neutral-200 bg-neutral-100 text-neutral-500",
};

const pill = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

export function QuoteItemStatusPill({ status }: { status: string }) {
  return (
    <span
      data-testid="quote-item-status"
      data-status={status}
      className={`${pill} ${ITEM_STYLES[status] ?? ITEM_STYLES.SENT}`}
    >
      {status === "SENT" ? "Sent" : status === "QUOTED" ? "Quoted" : status === "DECLINED" ? "Declined" : status}
    </span>
  );
}

export function QuoteRequestStatusPill({ status }: { status: string }) {
  const label = status === "RESPONDED" ? "Responded" : status === "SENT" ? "Sent" : status;
  return (
    <span
      data-testid="quote-request-status"
      data-status={status}
      className={`${pill} ${REQUEST_STYLES[status] ?? REQUEST_STYLES.SENT}`}
    >
      {label}
    </span>
  );
}
