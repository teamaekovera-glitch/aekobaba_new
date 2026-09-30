"use client";

import Link from "next/link";

import { useQuoteBasketStore } from "@/lib/basket/store";
import { useBasketHydrated } from "@/lib/basket/use-basket";

// Header basket island — the one piece of client JS the server-rendered
// header carries. The count appears only after the persisted basket is
// restored (never during hydration), and only when there is something in it.

export function BasketBadge() {
  const hydrated = useBasketHydrated();
  const count = useQuoteBasketStore((state) => state.items.length);

  return (
    <Link
      href="/basket"
      data-testid="basket-link"
      className="relative flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/25 px-2.5 py-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
    >
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="text-current"
      >
        <path
          d="M6 6h15l-1.7 8.5a2 2 0 0 1-2 1.5H8.6a2 2 0 0 1-2-1.6L4.6 3.7A1 1 0 0 0 3.6 3H2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="20" r="1.4" />
        <circle cx="17.5" cy="20" r="1.4" />
      </svg>
      <span className="text-sm">Quote Basket</span>
      {hydrated && count > 0 ? (
        <span
          data-testid="basket-count"
          className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-accent"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
