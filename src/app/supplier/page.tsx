import { redirect } from "next/navigation";

// /supplier is guarded by middleware; route to the inbox. New supplier
// sessions without an owned listing land on the inbox's claim prompt.

export default function SupplierIndexPage() {
  redirect("/supplier/inbox");
}
