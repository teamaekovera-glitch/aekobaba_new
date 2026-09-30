import { describe, expect, it } from "vitest";

import { friendlyAuthError } from "./errors";

// The mapping is the honesty contract: known codes get a specific, honest
// message; anything unknown gets the generic retry message — never provider
// internals, never a guess.

describe("friendlyAuthError", () => {
  it("maps known Supabase codes to specific messages", () => {
    expect(friendlyAuthError("invalid_credentials")).toBe(
      "Incorrect email or password.",
    );
    expect(friendlyAuthError("email_not_confirmed")).toMatch(/confirm/i);
    expect(friendlyAuthError("over_email_send_rate_limit")).toMatch(
      /too many emails/i,
    );
    expect(friendlyAuthError("otp_disabled")).toMatch(/expired/i);
  });

  it("maps callback-specific codes", () => {
    expect(friendlyAuthError("missing_code")).toMatch(/incomplete or was already used/i);
    expect(friendlyAuthError("exchange_failed")).toMatch(/try again/i);
    expect(friendlyAuthError("missing_email")).toMatch(/email address/i);
  });

  it("never leaks unknown codes", () => {
    const message = friendlyAuthError("some_internal_provider_code");
    expect(message).toBe("We couldn't complete that request. Please try again.");
    expect(message).not.toContain("some_internal_provider_code");
  });

  it("handles missing codes", () => {
    expect(friendlyAuthError(null)).toBe(
      "We couldn't complete that request. Please try again.",
    );
    expect(friendlyAuthError(undefined)).toBe(
      "We couldn't complete that request. Please try again.",
    );
  });
});
