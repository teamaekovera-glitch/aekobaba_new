"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction, type AuthFormState } from "@/app/auth/actions";

import { FormField } from "./form-field";
import { ErrorAlert } from "./sign-in-form";
import { SubmitButton } from "./submit-button";

const INITIAL_STATE: AuthFormState = {};

// Create an account with email + password. When the Supabase project requires
// email confirmation, the honest next step is "check your inbox" — the account
// and its User row are completed through the auth callback.

export function SignUpForm({ next }: { next: string }) {
  const [state, submit] = useActionState(signUpAction, INITIAL_STATE);

  if (state.checkEmail) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          Check your inbox — we sent a confirmation link. Open it on this
          device to finish setting up your account.
        </p>
        <p className="text-sm text-stone-600">
          Didn&apos;t get it? Check spam, or{" "}
          <Link
            href="/auth/sign-in"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            try signing in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? <ErrorAlert message={state.error} /> : null}
      <FormField
        id="email"
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@company.com"
        error={state.fieldErrors?.email}
      />
      <FormField
        id="password"
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      />
      <SubmitButton pendingLabel="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link
          href={
            next === "/"
              ? "/auth/sign-in"
              : `/auth/sign-in?next=${encodeURIComponent(next)}`
          }
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
