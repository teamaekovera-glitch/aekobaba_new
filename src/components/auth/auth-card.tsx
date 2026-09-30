import Link from "next/link";
import type { ReactNode } from "react";

// Shared shell for the auth pages: wordmark, calm neutral surface, one card.
// Deliberately minimal — these are the first rendered pages of the product.

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="font-sans flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-lg font-semibold tracking-tight text-stone-900"
      >
        Aekobaba
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? (
        <div className="mt-6 text-sm text-stone-600">{footer}</div>
      ) : null}
    </div>
  );
}
