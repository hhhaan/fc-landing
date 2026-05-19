// src/lib/auth.ts
import { createClient } from './supabase';

export async function requireLogin(Astro: any, redirectTo: string = '/') {
    const supabase = createClient({
        request: Astro.request,
        cookies: Astro.cookies,
    });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        const loginUrl = new URL('/login', Astro.url.origin);
        loginUrl.searchParams.set('next', redirectTo);
        return Astro.redirect(loginUrl.toString());
    }

    return user; // 로그인 되어 있으면 user 객체 반환
}
