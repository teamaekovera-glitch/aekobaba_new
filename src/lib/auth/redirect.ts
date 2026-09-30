// Post-sign-in redirect targets arrive from the query string, i.e. from the
// browser. Only same-origin relative paths may pass — never an open redirect.

/**
 * Reduce an untrusted `next` value to a safe relative path. Absolute URLs,
 * protocol-relative URLs ("//evil.test"), scheme tricks, and backslash
 * bypasses all fall back to "/". Empty input falls back too — "/" is the
 * honest default, not a guess.
 */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  // Reject control characters and any "scheme:" that could re-enter a URL
  // parser (e.g. "javascript:" or "/\tafter-decode" style payloads).
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";
  return value;
}
