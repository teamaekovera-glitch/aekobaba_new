import type { Metadata } from "next";
import Link from "next/link";

// Reached when middleware denies a role-restricted route. Says exactly why and
// what to do next — no dead ends, no invented account states.

export const metadata: Metadata = {
  title: "Access restricted · Aekobaba",
};

export default function AccessDeniedPage() {
  return (
    <div className="font-sans flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">
          This area is restricted
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Your account doesn&apos;t have access to this area. Supplier tools are for
          supplier accounts and admin tools are for the Aekobaba team. If you
          believe this is wrong, contact us and we&apos;ll sort it out.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/"
            className="flex h-10 items-center justify-center rounded-md bg-accent text-sm font-medium text-white transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Back to the marketplace
          </Link>
          <Link
            href="/auth/sign-in"
            className="flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
