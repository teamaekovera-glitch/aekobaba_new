"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { UserRole } from "@/lib/auth/roles";
import { useQuoteBasketStore } from "@/lib/basket/store";
import { groupBasketBySupplier, useBasketHydrated } from "@/lib/basket/use-basket";

import { BasketLine } from "./basket-line";

// The Quote Basket page (spec C8/C9/C11). The basket itself is anonymous —
// collection and editing need no session. Submission is auth-gated at the
// API: an anonymous visitor is sent to sign-in (basket preserved in
// localStorage) and lands back here; a non-BRAND session is told plainly.
// No API calls in component bodies — one fetch at the submit action, the
// one mutation this form owns.

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; message: string; code?: string };

export interface BasketViewProps {
  /** The signed-in role, or null when anonymous. */
  signedInRole: UserRole | null;
}

export function BasketView({ signedInRole }: BasketViewProps) {
  const router = useRouter();
  const hydrated = useBasketHydrated();
  const items = useQuoteBasketStore((state) => state.items);
  const setQuantity = useQuoteBasketStore((state) => state.setQuantity);
  const removeItem = useQuoteBasketStore((state) => state.removeItem);
  const clear = useQuoteBasketStore((state) => state.clear);

  const [deadline, setDeadline] = useState("");
  const [artworkNotes, setArtworkNotes] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const groups = groupBasketBySupplier(items);
  const supplierCount = groups.length;

  async function submit() {
    if (items.length === 0 || submitState.kind === "sending") return;
    setSubmitState({ kind: "sending" });

    const form = new FormData();
    form.set(
      "payload",
      JSON.stringify({
        items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        deadline: deadline || undefined,
        artworkNotes: artworkNotes.trim() ? artworkNotes.trim() : undefined,
      }),
    );
    if (artworkFile) form.set("artwork", artworkFile);

    try {
      const response = await fetch("/api/quotes", { method: "POST", body: form });
      if (response.status === 201) {
        const body = (await response.json()) as { quoteRequest: { id: string } };
        clear();
        router.push(`/account/requests/${body.quoteRequest.id}?submitted=1`);
        return;
      }
      if (response.status === 401) {
        // Basket lives in localStorage — it survives the sign-in round trip.
        router.push("/auth/sign-in?next=%2Fbasket");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      const messages: Record<string, string> = {
        role_mismatch: "Quote requests are sent by brand accounts. You are signed in as a supplier or admin.",
        missing_role: "Your account has no marketplace role yet. Contact support to get set up.",
        artwork_storage_unavailable:
          "Artwork storage is not configured yet. Submit again without the file, or ask the team to enable Supabase Storage.",
        artwork_too_large: "That artwork file is over the 10 MB limit. Try a smaller file.",
        artwork_upload_failed: "The artwork file could not be uploaded. Try again or submit without it.",
        unknown_products: "A product in your basket is no longer available. Refresh and try again.",
      };
      setSubmitState({
        kind: "error",
        code: body.error,
        message: messages[body.error ?? ""] ?? "The request could not be sent. Try again.",
      });
    } catch (fetchError) {
      console.error("[aekobaba] quote submission failed", fetchError);
      setSubmitState({ kind: "error", message: "The request could not be sent — the network dropped. Try again." });
    }
  }

  if (hydrated && items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center" data-testid="basket-empty">
        <h1 className="text-xl font-semibold text-ink">Your quote basket is empty</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Add packaging products from any supplier, then send one request to all of them.
        </p>
        <Link
          href="/results"
          className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Browse packaging
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-semibold text-ink sm:text-2xl">Quote Basket</h1>
      <p className="mt-1 text-sm text-neutral-600">
        One request, {supplierCount === 1 ? "1 supplier" : `${supplierCount} suppliers`} — fill the form once and
        every supplier in your basket receives it.
      </p>

      {signedInRole === null ? (
        <p
          data-testid="basket-signin-prompt"
          className="mt-4 rounded-md border border-steel/30 bg-accent-soft px-3 py-2 text-sm text-ink"
        >
          <Link href="/auth/sign-in?next=%2Fbasket" className="font-medium text-accent underline">
            Sign in
          </Link>{" "}
          to send your request — your basket is saved on this device.
        </p>
      ) : null}
      {signedInRole !== null && signedInRole !== "BRAND" ? (
        <p
          data-testid="basket-role-note"
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          You are signed in as a {signedInRole === "SUPPLIER" ? "supplier" : "admin"} account — only brand accounts
          send quote requests.
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        {groups.map((group) => (
          <section key={group.supplierSlug}>
            <h2 className="text-sm font-medium text-neutral-700">{group.supplierName}</h2>
            <div className="mt-2 space-y-3">
              {group.items.map((item) => (
                <BasketLine key={item.product.id} item={item} onQuantityChange={setQuantity} onRemove={removeItem} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <form
        data-testid="basket-form"
        className="mt-8 rounded-md border border-neutral-200 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 className="text-sm font-semibold text-ink">Request details</h2>
        <p className="mt-0.5 text-xs text-neutral-500">Sent identically to every supplier in your basket.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="basket-deadline" className="block text-xs font-medium text-neutral-600">
              Needed by (optional)
            </label>
            <input
              id="basket-deadline"
              data-testid="basket-deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="basket-artwork" className="block text-xs font-medium text-neutral-600">
              Artwork file (optional)
            </label>
            <input
              id="basket-artwork"
              data-testid="basket-artwork"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.ai,.eps"
              onChange={(event) => setArtworkFile(event.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm text-ink"
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="basket-notes" className="block text-xs font-medium text-neutral-600">
            Artwork &amp; print notes (optional)
          </label>
          <textarea
            id="basket-notes"
            data-testid="basket-notes"
            rows={3}
            value={artworkNotes}
            onChange={(event) => setArtworkNotes(event.target.value)}
            placeholder="e.g. Single-color logo on the front panel, matte finish"
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>

        {submitState.kind === "error" ? (
          <p
            data-testid="basket-error"
            role="alert"
            className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {submitState.message}
          </p>
        ) : null}

        <button
          type="submit"
          data-testid="submit-quote-request"
          disabled={submitState.kind === "sending"}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          {submitState.kind === "sending"
            ? "Sending…"
            : `Send request to ${supplierCount === 1 ? "1 supplier" : `${supplierCount} suppliers`}`}
        </button>
      </form>
    </div>
  );
}
