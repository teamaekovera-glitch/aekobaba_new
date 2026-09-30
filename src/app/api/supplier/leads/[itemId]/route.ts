import { jsonError, requireApiRole } from "@/lib/auth/api";
import { db } from "@/lib/db";
import {
  respondToLeadItem,
  type LeadActionFailureReason,
} from "@/lib/supplier/inbox";
import { leadActionSchema } from "@/lib/supplier/validation";

// PATCH /api/supplier/leads/[itemId] — answer a lead item (quoted/declined).
//
// Middleware does not guard /api/* paths, so the SUPPLIER role is enforced
// here — and tenancy (the item's product must belong to the supplier this
// user owns) inside the logic module. Plain API call, no realtime: the Quote
// Basket PR completes the live loop.

const ACTION_FAILURE_STATUS: Record<LeadActionFailureReason, number> = {
  not_found: 404,
  forbidden: 403,
  not_actionable: 409,
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const auth = await requireApiRole("SUPPLIER");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);

  const { itemId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json");
  }

  const parsed = leadActionSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_action");

  const result = await respondToLeadItem(db, {
    ownerUserId: auth.supabaseUserId,
    itemId,
    action: parsed.data.action,
  });

  if (!result.ok) {
    return jsonError(ACTION_FAILURE_STATUS[result.reason], result.reason);
  }

  return Response.json({ item: result.item });
}
