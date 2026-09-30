import type { Metadata } from "next";

import { safeNextPath } from "@/lib/auth/redirect";
import { getServerSessionUser } from "@/lib/auth/session";

import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SignedInPanel } from "@/components/auth/signed-in-panel";

export const metadata: Metadata = {
  title: "Create an account · Aekobaba",
  description:
    "Create an Aekobaba account to request quotes from packaging suppliers and track everything in one place.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next: nextParam } = await searchParams;
  const next = safeNextPath(nextParam);

  const sessionUser = await getServerSessionUser();

  if (sessionUser) {
    return (
      <AuthCard
        title="You're signed in"
        subtitle="This browser already has an active session."
      >
        <SignedInPanel sessionUser={sessionUser} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="One account for quoting, samples, and shortlists across every supplier."
    >
      <SignUpForm next={next} />
    </AuthCard>
  );
}
