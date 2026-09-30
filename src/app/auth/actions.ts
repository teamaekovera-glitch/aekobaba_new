"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { friendlyAuthError } from "@/lib/auth/errors";
import { PROVISIONING_FAILED_MESSAGE } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/redirect";
import { provisionUser } from "@/lib/auth/session";
import {
  magicLinkSchema,
  signInSchema,
  signUpSchema,
  fieldErrorsOf,
  type FieldErrors,
} from "@/lib/auth/validation";
import {
  createSupabaseServerClient,
  supabaseEnv,
} from "@/lib/supabase/server";

// Server actions for the auth forms. Every flow is server-side — the browser
// never touches Supabase directly, so cookies stay httpOnly and the identity
// always comes from the verified session.

export interface AuthFormState {
  /** Non-field error, shown in the alert region. */
  error?: string;
  /** Per-field validation messages. */
  fieldErrors?: FieldErrors;
  /** Email flow started — the provider sent a message, check the inbox. */
  checkEmail?: boolean;
}

/** Build the absolute callback URL Supabase redirects back to. */
async function callbackUrlFor(next: string): Promise<string> {
  const origin = await requestOrigin();
  const params = new URLSearchParams({ next });
  return `${origin}/auth/callback?${params.toString()}`;
}

async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function requireSupabase() {
  const env = supabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase environment is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createSupabaseServerClient(env);
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signInWithPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    next: formValue(formData, "next") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { email, password, next } = parsed.data;
  const supabase = await requireSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: friendlyAuthError(error.code) };
  if (!data.user) return { error: friendlyAuthError(null) };

  try {
    await provisionUser({ supabaseUserId: data.user.id, email });
  } catch (cause) {
    console.error("User provisioning failed after password sign-in", cause);
    return { error: PROVISIONING_FAILED_MESSAGE };
  }

  redirect(safeNextPath(next));
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    next: formValue(formData, "next") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { email, password, next } = parsed.data;
  const supabase = await requireSupabase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Confirmation and magic-link emails return through the callback, which
      // provisions the User row. Must be an allow-listed absolute URL (docs).
      emailRedirectTo: await callbackUrlFor(safeNextPath(next)),
    },
  });

  if (error) return { error: friendlyAuthError(error.code) };

  // Email confirmation disabled → session is live now; provision and continue.
  if (data.session && data.user?.email) {
    try {
      await provisionUser({
        supabaseUserId: data.user.id,
        email: data.user.email,
      });
    } catch (cause) {
      console.error("User provisioning failed after sign-up", cause);
      return { error: PROVISIONING_FAILED_MESSAGE };
    }
    redirect(safeNextPath(next));
  }

  // Email confirmation required → no session yet. The User row is created when
  // the confirmation link arrives at the callback.
  return { checkEmail: true };
}

export async function sendMagicLinkAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = magicLinkSchema.safeParse({
    email: formValue(formData, "email"),
    next: formValue(formData, "next") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { email, next } = parsed.data;
  const supabase = await requireSupabase();

  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: await callbackUrlFor(safeNextPath(next)),
    },
  });

  if (error) return { error: friendlyAuthError(error.code) };

  // supabase-js types the OTP success payload as { user: null; session: null },
  // but configurations with instant sign-in DO return a live session at
  // runtime. Read it through a structural type instead of trusting the
  // vendored (wrong) one — and handle both worlds honestly.
  const otpResult = data as unknown as {
    session: { user: { id: string; email?: string | null } } | null;
    user: { id: string; email?: string | null } | null;
  };
  const instantUser = otpResult.session?.user ?? otpResult.user;

  if (instantUser?.email) {
    try {
      await provisionUser({
        supabaseUserId: instantUser.id,
        email: instantUser.email,
      });
    } catch (cause) {
      console.error("User provisioning failed after magic-link sign-in", cause);
      return { error: PROVISIONING_FAILED_MESSAGE };
    }
    redirect(safeNextPath(next));
  }

  return { checkEmail: true };
}

export async function beginGoogleSignInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = safeNextPath(formValue(formData, "next") || undefined);
  const supabase = await requireSupabase();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: await callbackUrlFor(next),
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: friendlyAuthError(error.code) };
  if (!data.url) return { error: friendlyAuthError(null) };

  // External redirect — the browser leaves the app for Google, Supabase hands
  // the code back at /auth/callback.
  redirect(data.url);
}

export async function signOutAction(): Promise<void> {
  const supabase = await requireSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
