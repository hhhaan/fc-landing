import type { AstroCookies } from "astro";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase";

/** Current viewer from the session cookie (for nav / header UI). */
export async function getViewer(context: {
  request: Request;
  cookies: AstroCookies;
}): Promise<User | null> {
  const supabase = createClient({
    request: context.request,
    cookies: context.cookies,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}