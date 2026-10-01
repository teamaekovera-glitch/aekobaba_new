"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

// Submit button with an honest pending state — the label changes and the
// button stops accepting presses while the action runs.

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  const styles =
    variant === "primary"
      ? "bg-action text-white hover:bg-action-strong"
      : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
