import { NextResponse } from 'next/server';
import { checkPassword, sessionCookieName, signSessionToken } from '@/shared/lib/auth/session';

export async function POST(request: Request) {
    const form = await request.formData();
    const password = String(form.get('password') ?? '');
    const next = String(form.get('next') ?? '/');

    if (!checkPassword(password)) {
        const url = new URL('/login', request.url);
        url.searchParams.set('error', '1');
        if (next) url.searchParams.set('next', next);
        // 303 so the browser follows with GET (default 307 re-POSTs → 405 on pages)
        return NextResponse.redirect(url, 303);
    }

    const res = NextResponse.redirect(new URL(next || '/', request.url), 303);
    res.cookies.set(sessionCookieName(), signSessionToken(), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 14,
    });
    return res;
}
