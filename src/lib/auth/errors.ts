// Map Supabase auth error codes to honest, non-leaky user-facing messages.
// The mapping is pure and tested; unknown codes get the generic message —
// never the raw provider error.

const KNOWN_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  user_not_found: "Incorrect email or password.",
  user_banned: "This account has been disabled. Contact support.",
  email_not_confirmed:
    "Confirm your email address first — check your inbox for the confirmation link.",
  over_email_send_rate_limit:
    "Too many emails sent. Wait a minute, then try again.",
  otp_disabled: "This sign-in link has expired. Request a new one.",
  // Callback-specific codes (see src/app/auth/callback/route.ts).
  missing_code:
    "This sign-in link is incomplete or was already used. Request a new one.",
  exchange_failed:
    "We couldn't complete sign-in. Please try again from the beginning.",
  missing_email:
    "Your Google account didn't share an email address, which we need to set up your account.",
};

/**
 * A friendly message for a Supabase Auth error code. Unknown or missing codes
 * produce the generic retry message — we never surface provider internals.
 */
export function friendlyAuthError(code: string | undefined | null): string {
  if (code && code in KNOWN_MESSAGES) return KNOWN_MESSAGES[code];
  return "We couldn't complete that request. Please try again.";
}

/** The generic message, for unexpected (non-Auth) failures. */
export const GENERIC_AUTH_ERROR = friendlyAuthError(null);
