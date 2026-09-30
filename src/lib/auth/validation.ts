import { z } from "zod";

// Shared validation for the auth forms. The same schemas run in the server
// actions and in the tests — the browser never gets to define the contract.

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter your email address.")
  .max(254)
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  next: z.string().optional(),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
  next: z.string().optional(),
});

export type FieldErrors = Record<string, string>;

/** Flatten a Zod failure into a `{ fieldName: message }` map for the form. */
export function fieldErrorsOf(
  error: z.ZodError,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
