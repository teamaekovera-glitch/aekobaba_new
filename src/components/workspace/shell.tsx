import Link from "next/link";
import type { ReactNode } from "react";

// Shell for the supplier and admin workspaces: wordmark home, area nav, calm
// neutral surface. Deliberately plain — the plan routes workspace polish for
// later; density and clarity are the requirement now.

export function WorkspaceShell({
  area,
  title,
  subtitle,
  actions,
  children,
}: {
  area: "supplier" | "admin";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="font-sans min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-stone-900"
          >
            Aekobaba
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {area === "supplier" ? (
              <>
                <Link
                  href="/supplier/inbox"
                  className="text-stone-600 hover:text-stone-900"
                >
                  Lead inbox
                </Link>
                <Link
                  href="/supplier/claim"
                  className="text-stone-600 hover:text-stone-900"
                >
                  Claim a listing
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/admin/suppliers"
                  className="text-stone-600 hover:text-stone-900"
                >
                  Suppliers
                </Link>
                <Link
                  href="/admin/categories"
                  className="text-stone-600 hover:text-stone-900"
                >
                  Categories
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
            ) : null}
          </div>
          {actions}
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}

/** Status chip shared by queue rows and badges. */
export function StatusChip({
  tone,
  children,
}: {
  tone: "pending" | "listed" | "recommended" | "quoteonly" | "disabled";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-800",
    listed: "border-stone-300 bg-white text-stone-700",
    recommended: "border-green-300 bg-green-50 text-green-800",
    quoteonly: "border-blue-200 bg-blue-50 text-blue-800",
    disabled: "border-red-200 bg-red-50 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
