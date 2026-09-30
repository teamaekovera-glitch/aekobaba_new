import { describe, expect, it } from "vitest";

import {
  fieldErrorsOf,
  magicLinkSchema,
  signInSchema,
  signUpSchema,
} from "./validation";

describe("signInSchema", () => {
  it("accepts a valid submission", () => {
    expect(
      signInSchema.safeParse({
        email: "Brand@Example.com",
        password: "hunter2222",
      }).success,
    ).toBe(true);
  });

  it("requires the password field", () => {
    const result = signInSchema.safeParse({ email: "a@b.co", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects malformed emails", () => {
    expect(
      signInSchema.safeParse({ email: "not-an-email", password: "x" }).success,
    ).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("enforces the 8-character password minimum", () => {
    const short = signUpSchema.safeParse({
      email: "a@b.co",
      password: "short1!",
    });
    expect(short.success).toBe(false);

    const ok = signUpSchema.safeParse({
      email: "a@b.co",
      password: "longenough1",
    });
    expect(ok.success).toBe(true);
  });

  it("enforces the 72-character password maximum", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.co",
      password: "x".repeat(73),
    });
    expect(result.success).toBe(false);
  });
});

describe("magicLinkSchema", () => {
  it("needs only an email", () => {
    expect(magicLinkSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
  });
});

describe("fieldErrorsOf", () => {
  it("flattens a Zod failure into one message per field", () => {
    const result = signUpSchema.safeParse({ email: "nope", password: "" });
    if (result.success) throw new Error("expected failure");
    const errors = fieldErrorsOf(result.error);
    expect(Object.keys(errors).sort()).toEqual(["email", "password"]);
  });
});
