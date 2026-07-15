import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy path → /revenue */
export default function BillingRedirect() {
  redirect("/revenue");
}
