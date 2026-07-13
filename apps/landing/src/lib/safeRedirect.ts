/**
 * Post-auth redirect guard for the landing site.
 *
 * ## Why this exists
 *
 * Login/signup thread a `?next=` destination through the whole auth flow:
 *   /login?next=… → Google OAuth → /auth/callback?next=… → redirect(next)
 *   /login?next=… → email/password → window.location.href = next
 *
 * Previously every hop trusted `next` verbatim. That allowed non-web targets
 * (e.g. `firstcrack://auth/callback`, the desktop app's OAuth deep link) to
 * reach `Astro.redirect(next)` or `window.location.href = next`. The browser
 * then navigated to the custom URL scheme and macOS showed "Open First Crack.app"
 * — even though the user signed in on the website.
 *
 * Desktop OAuth should stay in the app (`firstcrack://` via Supabase redirectTo
 * in fc-desktop). The landing site must only ever send users to same-site paths.
 *
 * If OAuth still opens the desktop app, check Supabase Dashboard → Authentication
 * → URL Configuration: Site URL must be the HTTPS landing URL (not firstcrack://),
 * and every web callback origin must be listed under Redirect URLs.
 *
 * ## Rules
 *
 * - Allow: `/`, `/account`, `/start-pro?plan=monthly`, …
 * - Block: `firstcrack://…`, `https://…`, `//evil.com`, protocol-relative URLs
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next) return fallback;

  let path = next;
  try {
    path = decodeURIComponent(next);
  } catch {
    return fallback;
  }

  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return fallback;

  return path;
}