import type { Metadata } from "next";

import { getCurrentUserRole, getServerSessionUser } from "@/lib/auth/session";
import { BasketView } from "@/components/quotes/basket-view";

// The Quote Basket page. Basket collection is anonymous; the signed-in role
// is passed down so the view can explain the sign-in gate before submission.

export const metadata: Metadata = {
  title: "Quote Basket — Aekobaba",
  description: "One quote request, sent to every supplier in your basket.",
};

export default async function BasketPage() {
  const session = await getServerSessionUser();
  const role = session ? await getCurrentUserRole(session.supabaseUserId) : null;
  return <BasketView signedInRole={role} />;
}
