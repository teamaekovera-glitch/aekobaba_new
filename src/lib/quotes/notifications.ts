// NOTIFY payload parsing for the dev SSE bridge (quote request page live
// updates). Kept out of the route module: Next.js route files may export only
// handlers, and the parse is pure — testable without a database.

interface QuoteItemNotifyPayload {
  id: string;
  quoteRequestId: string;
  status: string;
}

/** Parse + filter a NOTIFY payload for this request. */
export function notificationToEvent(
  payload: string | undefined,
  requestId: string,
): { id: string; status: string } | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as Partial<QuoteItemNotifyPayload>;
    if (parsed.quoteRequestId !== requestId) return null;
    if (typeof parsed.id !== "string" || typeof parsed.status !== "string") return null;
    return { id: parsed.id, status: parsed.status };
  } catch {
    return null;
  }
}
