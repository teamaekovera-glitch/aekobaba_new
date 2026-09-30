import { z } from "zod";

// Shared validation for the supplier-side API routes. The same schemas run in
// the handlers and in the tests — the browser never gets to define the
// contract.

export const claimSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

export const leadActionSchema = z.object({
  action: z.enum(["quoted", "declined"]),
});
