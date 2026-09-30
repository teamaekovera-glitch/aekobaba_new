import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Aekobaba — packaging discovery for CPG brands. Prices are verified snapshots from supplier pages, always dated.
        </p>
        <div className="flex gap-4">
          <Link href="/suppliers" className="hover:text-accent hover:underline">
            Suppliers
          </Link>
          <Link href="/auth/sign-in" className="hover:text-accent hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
