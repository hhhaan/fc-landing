import type { AstroCookies } from "astro";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase";

export type TrialCta = {
  href: string;
  label: string;
};

/** Primary trial CTA: signup → compare-plans → download by auth + subscription. */
export async function resolveTrialCta(context: {
  request: Request;
  cookies: AstroCookies;
  user: User | null;
}): Promise<TrialCta> {
  if (!context.user) {
    return { href: "/signup", label: "Start 14-day trial" };
  }

  const supabase = createClient({
    request: context.request,
    cookies: context.cookies,
  });

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", context.user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscription) {
    return { href: "/download", label: "Download app" };
  }

  return { href: "/compare-plans", label: "Start 14-day trial" };
}