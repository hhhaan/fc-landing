import { safeRedirectPath } from "./safeRedirect";

/**
 * Canonical HTTPS origin for the landing site (Cloudflare env).
 * Falls back to the current request/tab origin in dev.
 */
export function getSiteOrigin(fallbackOrigin?: string): string {
  const configured = import.meta.env.PUBLIC_SITE_URL;
  const raw = configured || fallbackOrigin || "http://localhost:4321";
  return raw.replace(/\/$/, "");
}

/**
 * Web OAuth / email-confirm callback URL passed to Supabase as `redirectTo`.
 *
 * Must exactly match an entry in Supabase Dashboard → Authentication →
 * URL Configuration → Redirect URLs. If it does not match, Supabase falls
 * back to Site URL — when Site URL is `firstcrack://…` (desktop), the browser
 * shows "Open First Crack.app" even during a website login.
 */
export function buildWebAuthCallbackUrl(
  next: string | null | undefined,
  fallbackOrigin?: string,
): string {
  const origin = getSiteOrigin(fallbackOrigin);
  const path = safeRedirectPath(next);
  return `${origin}/auth/callback?next=${encodeURIComponent(path)}`;
}