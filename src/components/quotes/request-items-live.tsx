"use client";

import { useEffect, useState } from "react";

import { applyItemEvent, displayRequestStatus, subscribeToQuoteItems } from "@/lib/quotes/live";
import type { QuoteRequestDetailVM } from "@/lib/quotes/view-models";

import { QuoteItemStatusPill, QuoteRequestStatusPill } from "./status-pill";

// The brand's request-detail item list with live status (spec C10). Receives
// the server-rendered snapshot as props, subscribes once, folds item events
// into local state, and mirrors the request-level SENT → RESPONDED flip
// between server refreshes. No API calls — the subscription is the only wire.

export interface RequestItemsLiveProps {
  request: QuoteRequestDetailVM;
  /** Show the "updated live" hint once an event has landed. */
  onLiveEvent?: () => void;
}

export function QuoteItemRow({ item }: { item: QuoteRequestDetailVM["items"][number] }) {
  return (
    <div data-testid="request-item-row" className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{item.productTitle}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {item.supplierName} · Qty {item.quantity}
          </p>
        </div>
        <QuoteItemStatusPill status={item.status} />
      </div>
    </div>
  );
}

export function RequestItemsLive({ request, onLiveEvent }: RequestItemsLiveProps) {
  const [items, setItems] = useState(request.items);

  // Re-sync when the server snapshot changes after a navigation/refresh.
  useEffect(() => setItems(request.items), [request.items]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void subscribeToQuoteItems({
      requestId: request.id,
      onEvent: (event) => {
        if (cancelled) return;
        setItems((current) => applyItemEvent(current, event));
        onLiveEvent?.();
      },
    }).then((subscription) => {
      if (cancelled) {
        subscription.unsubscribe();
        return;
      }
      unsubscribe = subscription.unsubscribe;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [request.id, onLiveEvent]);

  const status = displayRequestStatus(request.status, items);

  return (
    <div>
      <div className="flex items-center justify-between">
        <QuoteRequestStatusPill status={status} />
        <span data-testid="live-hint" className="text-xs text-neutral-400">
          Statuses update live
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <QuoteItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
