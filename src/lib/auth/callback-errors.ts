import { SIGN_IN_PATH } from "./guard";

// Callback failures are reported on the sign-in page via a small `error`
// code in the query string — enough to show the right honest message,
// never a provider stack trace in a URL.

/** Sign-in URL carrying a callback error code. */
export function getAuthCallbackErrorPath(code: string | null | undefined) {
  if (!code) return `${SIGN_IN_PATH}?error=auth_exchange_failed`;
  return `${SIGN_IN_PATH}?error=${encodeURIComponent(code)}`;
}

/** The error code a callback left on the sign-in URL, if any. */
export function authErrorFromSearchParams(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    return null;
  }
  return value;
}
