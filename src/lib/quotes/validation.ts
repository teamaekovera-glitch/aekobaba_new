import { z } from "zod";

// Shared validation for the quote-submission API. The same schemas run in the
// handler and in the tests — the browser never gets to define the contract.

export const quoteItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(10_000_000),
});

export const quoteSubmitSchema = z.object({
  items: z.array(quoteItemInputSchema).min(1).max(50),
  /** The date the brand needs packaging by (YYYY-MM-DD from the date input). */
  deadline: z.iso.date().optional(),
  artworkNotes: z.string().trim().max(2000).optional(),
});
