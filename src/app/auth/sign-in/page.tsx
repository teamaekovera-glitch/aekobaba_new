import type { Metadata } from "next";

import { authErrorFromSearchParams } from "@/lib/auth/callback-errors";
import { friendlyAuthError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { getServerSessionUser } from "@/lib/auth/session";

import { AuthCard } from "@/components/auth/auth-card";
import { ErrorAlert } from "@/components/auth/sign-in-form";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignedInPanel } from "@/components/auth/signed-in-panel";

export const metadata: Metadata = {
  title: "Sign in · Aekobaba",
  description:
    "Sign in to request quotes, save shortlists, and manage your packaging suppliers.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next: nextParam, error: errorParam } = await searchParams;
  const next = safeNextPath(nextParam);
  const callbackError = friendlyAuthError(authErrorFromSearchParams(errorParam));

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
      title="Sign in"
      subtitle="Request quotes, track samples, and keep your packaging shortlists in one place."
    >
      <div className="space-y-4">
        {authErrorFromSearchParams(errorParam) ? (
          <ErrorAlert message={callbackError} />
        ) : null}
        <SignInForm next={next} />
      </div>
    </AuthCard>
  );
}
