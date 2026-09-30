import { redirect } from "next/navigation";

// /admin is guarded by middleware; the verification queue is the landing
// surface.

export default function AdminIndexPage() {
  redirect("/admin/suppliers");
}
