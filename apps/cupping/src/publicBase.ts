/** Canonical public origin for invite QR / share links (matches fc-desktop). */
export const DEFAULT_CUPPING_PUBLIC_BASE = 'https://cup.firstcrackiscoming.com';

export function cuppingPublicBaseUrl(): string {
    const fromEnv = import.meta.env.VITE_CUPPING_PUBLIC_BASE_URL;
    if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '');
    return DEFAULT_CUPPING_PUBLIC_BASE;
}

/** Share/QR URL: production uses custom domain; dev keeps current origin (LAN). */
export function cuppingSessionUrl(token: string): string {
    const path = `/c/${encodeURIComponent(token)}`;
    if (import.meta.env.DEV) {
        return `${window.location.origin}${path}`;
    }
    return `${cuppingPublicBaseUrl()}${path}`;
}

/** Post-session results page. */
export function cuppingResultsUrl(token: string): string {
    const path = `/r/${encodeURIComponent(token)}`;
    if (import.meta.env.DEV) {
        return `${window.location.origin}${path}`;
    }
    return `${cuppingPublicBaseUrl()}${path}`;
}
