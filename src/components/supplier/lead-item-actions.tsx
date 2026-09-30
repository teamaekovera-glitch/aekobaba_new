"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InlineErrorAlert } from "@/components/ui/alerts";

// Per-item quoted/declined actions. Plain API calls — realtime wiring lands
// with the Quote Basket PR.

const FRIENDLY_ERRORS: Record<string, string> = {
  unauthenticated: "Sign in again to answer leads.",
  missing_role:
    "Your account is not a supplier account — claims are approved by admins.",
  role_mismatch: "This inbox belongs to a supplier account.",
  forbidden: "This lead belongs to another supplier.",
  not_actionable: "This lead was already answered.",
  not_found: "Lead not found — it may have been removed.",
  invalid_action: "Unknown action.",
  invalid_json: "Something went wrong. Try again.",
};

export function LeadItemActions({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"quoted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "quoted" | "declined") {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/supplier/leads/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(FRIENDLY_ERRORS[payload.error ?? ""] ?? "Could not record the answer.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => act("quoted")}
          disabled={pending !== null}
          aria-busy={pending === "quoted"}
          className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "quoted" ? "Saving…" : "Mark quoted"}
        </button>
        <button
          type="button"
          onClick={() => act("declined")}
          disabled={pending !== null}
          aria-busy={pending === "declined"}
          className="h-9 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "declined" ? "Saving…" : "Decline"}
        </button>
      </div>
      {error ? <InlineErrorAlert message={error} /> : null}
    </div>
  );
}
