import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-charcoal-edge bg-charcoal">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-on-dark sm:flex-row sm:items-center sm:justify-between">
        <p className="text-on-dark-muted">
          Aekobaba — packaging discovery for CPG brands. Prices are verified snapshots from supplier pages, always dated.
        </p>
        <div className="flex gap-4">
          <Link href="/suppliers" className="hover:underline">
            Suppliers
          </Link>
          <Link href="/auth/sign-in" className="hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
