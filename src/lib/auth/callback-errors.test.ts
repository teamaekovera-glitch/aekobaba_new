import { describe, expect, it } from "vitest";

import { authErrorFromSearchParams, getAuthCallbackErrorPath } from "./callback-errors";

describe("authErrorFromSearchParams", () => {
  it("passes through a plain code", () => {
    expect(authErrorFromSearchParams("missing_code")).toBe("missing_code");
  });

  it("rejects non-strings and oversized values", () => {
    expect(authErrorFromSearchParams(undefined)).toBeNull();
    expect(authErrorFromSearchParams(["missing_code"])).toBeNull();
    expect(authErrorFromSearchParams("x".repeat(65))).toBeNull();
    expect(authErrorFromSearchParams("")).toBeNull();
  });
});

describe("getAuthCallbackErrorPath", () => {
  it("defaults to a generic code when none is given", () => {
    expect(getAuthCallbackErrorPath(null)).toBe(
      "/auth/sign-in?error=auth_exchange_failed",
    );
  });

  it("encodes the given code", () => {
    expect(getAuthCallbackErrorPath("otp_disabled")).toBe(
      "/auth/sign-in?error=otp_disabled",
    );
  });
});
