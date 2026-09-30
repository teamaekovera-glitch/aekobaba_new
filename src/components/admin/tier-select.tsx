"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InlineErrorAlert, InlineSuccessAlert } from "@/components/ui/alerts";

const TIERS = [
  { value: "RECOMMENDED", label: "Recommended" },
  { value: "LISTED", label: "Listed" },
  { value: "QUOTE_ONLY", label: "Quote only" },
  { value: "DISABLED", label: "Disabled" },
] as const;

const FRIENDLY_ERRORS: Record<string, string> = {
  unauthenticated: "Sign in again to make admin changes.",
  missing_role: "Your account is not an administrator.",
  role_mismatch: "This surface is for administrators.",
  invalid_tier: "Pick a valid tier.",
  not_found: "Supplier not found — refresh and try again.",
  invalid_json: "Something went wrong. Try again.",
};

// Tier assignment for one supplier row. Saves via
// PATCH /api/admin/suppliers/[id]/tier, which persists Supplier.status —
// the public badge reads that column.

export function TierSelect({
  supplierId,
  currentTier,
}: {
  supplierId: string;
  currentTier: string;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(currentTier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/tier`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const payload: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(FRIENDLY_ERRORS[payload.error ?? ""] ?? "Could not save the tier.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={`tier-${supplierId}`} className="sr-only">
          Tier
        </label>
        <select
          id={`tier-${supplierId}`}
          value={tier}
          onChange={(e) => {
            setTier(e.target.value);
            setSaved(false);
          }}
          className="h-9 rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-900 focus:outline-2 focus:outline-accent"
        >
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={saving || tier === currentTier}
          aria-busy={saving}
          className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save tier"}
        </button>
      </div>
      {error ? <InlineErrorAlert message={error} /> : null}
      {saved && !error ? (
        <InlineSuccessAlert>Tier saved — badge updated.</InlineSuccessAlert>
      ) : null}
    </div>
  );
}
