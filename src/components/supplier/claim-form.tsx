"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InlineErrorAlert } from "@/components/ui/alerts";

// Claim entry point for suppliers not yet onboarded. The API enforces the
// verified-email gate and the PENDING queue state; this form just surfaces
// those outcomes honestly.

const FRIENDLY_ERRORS: Record<string, string> = {
  unauthenticated: "Sign in first — a claim attaches to your account.",
  email_not_verified:
    "Verify your email first — the claim confirmation goes to that address.",
  not_found: "That listing no longer exists.",
  already_claimed: "Someone already claimed this listing.",
  account_missing: "Your account is not provisioned yet — sign in again.",
  already_owns_supplier: "You already own a supplier listing.",
  invalid_slug: "Pick a listing to claim.",
  invalid_json: "Something went wrong sending the claim. Try again.",
};

export function ClaimForm({
  suppliers,
}: {
  suppliers: Array<{ slug: string; name: string; location: string }>;
}) {
  const router = useRouter();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim(slug: string) {
    setClaiming(slug);
    setError(null);
    try {
      const res = await fetch("/api/supplier/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const payload: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(FRIENDLY_ERRORS[payload.error ?? ""] ?? "Could not claim this listing.");
        return;
      }
      setClaimed(slug);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setClaiming(null);
    }
  }

  if (claimed) {
    return (
      <div
        role="status"
        className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
      >
        Claim submitted for <strong>{claimed}</strong> — it is now{" "}
        <strong>pending admin verification</strong>. You can open your lead
        inbox once an admin verifies the listing.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <InlineErrorAlert message={error} /> : null}
      <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {suppliers.map((s) => (
          <li
            key={s.slug}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-stone-900">{s.name}</p>
              <p className="text-xs text-stone-500">{s.location}</p>
            </div>
            <button
              type="button"
              onClick={() => claim(s.slug)}
              disabled={claiming !== null}
              aria-busy={claiming === s.slug}
              className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {claiming === s.slug ? "Claiming…" : "Claim this listing"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
