import type { ReactNode } from "react";

// Inline feedback for workspace (supplier/admin) surfaces. The auth pages have
// their own alerts; these keep the role areas self-contained without importing
// across feature folders.

export function InlineErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {message}
    </div>
  );
}

export function InlineSuccessAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
    >
      {children}
    </div>
  );
}
