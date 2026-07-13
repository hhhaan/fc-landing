import { createClient } from './supabase';
import { safeRedirectPath } from './safeRedirect';

export async function requireLogin(Astro: any, redirectTo?: string) {
    const supabase = createClient({
        request: Astro.request,
        cookies: Astro.cookies,
    });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        const returnPath = redirectTo ?? `${Astro.url.pathname}${Astro.url.search}`;
        const loginUrl = new URL('/login', Astro.url.origin);
        loginUrl.searchParams.set('next', safeRedirectPath(returnPath));
        return Astro.redirect(loginUrl.toString());
    }

    return user;
}
