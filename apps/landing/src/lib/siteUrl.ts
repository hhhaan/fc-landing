import { safeRedirectPath } from "./safeRedirect";

/**
 * Origin used in Supabase `redirectTo` for web OAuth.
 *
 * Prefer the host the user is actually on (request/tab origin). A fixed
 * PUBLIC_SITE_URL must not override it — e.g. browsing firstcrackiscoming.com
 * while PUBLIC_SITE_URL is fc-landing.pages.dev would send the wrong redirectTo,
 * Supabase would reject it, and fall back to Site URL (still firstcrack:// → app opens).
 */
export function getSiteOrigin(fallbackOrigin?: string): string {
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  const configured = import.meta.env.PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:4321";
}

/**
 * Web OAuth / email-confirm callback URL passed to Supabase as `redirectTo`.
 *
 * Must match Supabase Dashboard → Authentication → Redirect URLs for the
 * same host (e.g. `https://firstcrackiscoming.com/**`). On mismatch Supabase
 * falls back to Site URL — if that is still `firstcrack://`, macOS opens the app.
 */
export function buildWebAuthCallbackUrl(
  next: string | null | undefined,
  requestOrigin?: string,
): string {
  const origin = getSiteOrigin(requestOrigin);
  const path = safeRedirectPath(next);
  return `${origin}/auth/callback?next=${encodeURIComponent(path)}`;
}