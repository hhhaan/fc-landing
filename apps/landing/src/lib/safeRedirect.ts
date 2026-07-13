/** Same-site relative paths only — blocks open redirects and deep links in ?next=. */
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

/** Supabase OAuth `redirectTo` for the web (must match Redirect URLs allowlist). */
export function webAuthCallbackUrl(
  origin: string,
  next?: string | null,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback?next=${encodeURIComponent(safeRedirectPath(next))}`;
}