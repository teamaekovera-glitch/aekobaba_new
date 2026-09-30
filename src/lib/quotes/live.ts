"use client";

import type { RealtimePostgresUpdatePayload } from "@supabase/supabase-js";

import { createSupabaseBrowserClient, supabaseBrowserEnv } from "@/lib/supabase/browser";

// Live item-status updates for the brand's request page (build spec C10):
// when a supplier marks an item QUOTED/DECLINED, the page reflects it without
// a reload. The production wire is Supabase Realtime (postgres_changes on
// this request's items). Before Supabase credentials exist, the subscription
// falls back to a dev SSE bridge over Postgres LISTEN/NOTIFY — same event
// contract, so callers and tests do not care which is live.

export type QuoteItemStatus = "SENT" | "QUOTED" | "DECLINED" | "EXPIRED";

export interface QuoteItemEvent {
  id: string;
  status: QuoteItemStatus;
}

export interface QuoteItemSubscription {
  unsubscribe(): void;
}

/** Pure reducer: fold an item event into the current item list. */
export function applyItemEvent<T extends { id: string; status: QuoteItemStatus }>(
  items: T[],
  event: QuoteItemEvent,
): T[] {
  return items.map((item) => (item.id === event.id ? { ...item, status: event.status } : item));
}

/**
 * The request-level status a brand should see: the database status, flipped to
 * RESPONDED once any item has been answered — the same flip the supplier API
 * writes on item responses (data contract), mirrored client-side between events.
 */
export function displayRequestStatus(requestStatus: string, items: { status: QuoteItemStatus }[]): string {
  const answered = items.some((item) => item.status !== "SENT" && item.status !== "EXPIRED");
  if (requestStatus === "SENT" && answered) return "RESPONDED";
  return requestStatus;
}

export async function subscribeToQuoteItems(options: {
  requestId: string;
  onEvent: (event: QuoteItemEvent) => void;
}): Promise<QuoteItemSubscription> {
  const env = supabaseBrowserEnv();
  if (env) {
    const supabase = createSupabaseBrowserClient(env);
    const channel = supabase
      .channel(`quote-request-${options.requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quote_request_items",
          filter: `quote_request_id=eq.${options.requestId}`,
        },
        (payload: RealtimePostgresUpdatePayload<{ id: string; status: string }>) => {
          const row = payload.new;
          if (typeof row.id === "string") {
            options.onEvent({ id: row.id, status: row.status as QuoteItemStatus });
          }
        },
      )
      .subscribe();
    return { unsubscribe: () => void supabase.removeChannel(channel) };
  }

  // Dev bridge: server-sent events from the Postgres NOTIFY trigger.
  const source = new EventSource(`/api/quotes/${encodeURIComponent(options.requestId)}/events`);
  source.onmessage = (message: MessageEvent<string>) => {
    try {
      const event = JSON.parse(message.data) as QuoteItemEvent & { error?: string; requestId?: string };
      if (event.error) {
        console.error("[aekobaba] live updates: bridge reported", event.error);
        return;
      }
      if (typeof event.id === "string" && typeof event.status === "string") {
        options.onEvent({ id: event.id, status: event.status as QuoteItemStatus });
      }
    } catch (parseError) {
      // A malformed frame must not kill the stream — but it is never silent.
      console.error("[aekobaba] live updates: malformed SSE frame", parseError);
    }
  };
  source.onerror = () => {
    // EventSource retries on its own; log so a dead bridge is discoverable.
    console.warn("[aekobaba] live updates: SSE connection interrupted, retrying");
  };
  return { unsubscribe: () => source.close() };
}
