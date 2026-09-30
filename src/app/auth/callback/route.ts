import { NextResponse, type NextRequest } from "next/server";

import { getAuthCallbackErrorPath } from "@/lib/auth/callback-errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { provisionUser } from "@/lib/auth/session";
import {
  createSupabaseServerClient,
  supabaseEnv,
} from "@/lib/supabase/server";

// OAuth (Google) and magic-link arrivals land here with a one-time code.
// Exchange it for a session, provision the User row on first sign-in, then
// return the visitor to the page they were headed for.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const env = supabaseEnv();

  if (!code || !env) {
    return NextResponse.redirect(
      new URL(getAuthCallbackErrorPath("missing_code"), origin),
    );
  }

  const supabase = await createSupabaseServerClient(env);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(getAuthCallbackErrorPath(error.code), origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(getAuthCallbackErrorPath("exchange_failed"), origin),
    );
  }

  // First sign-in → User row with role BRAND. A missing email (possible for
  // some OAuth identities) cannot be provisioned honestly — surface it.
  if (!user.email) {
    return NextResponse.redirect(
      new URL(getAuthCallbackErrorPath("missing_email"), origin),
    );
  }

  await provisionUser({ supabaseUserId: user.id, email: user.email });

  return NextResponse.redirect(new URL(next, origin));
}
