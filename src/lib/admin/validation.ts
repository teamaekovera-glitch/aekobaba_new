import { z } from "zod";

import { TIER_VALUES } from "./tiers";

// Shared validation for the admin-side API routes. The same schemas run in
// the handlers and in the tests — the browser never gets to define the
// contract.

export const tierSchema = z.object({
  tier: z.enum(TIER_VALUES),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "Slug may contain lowercase letters, numbers, dashes.")
    .optional(),
  description: z.string().trim().max(500).optional(),
  parentId: z.string().trim().min(1).optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  parentId: z.string().trim().min(1).nullable().optional(),
});
