import { NextResponse } from 'next/server';
import { sessionCookieName } from '@/shared/lib/auth/session';

export async function POST(request: Request) {
    // 303 so the browser follows with GET (default 307 re-POSTs → 405 on pages)
    const res = NextResponse.redirect(new URL('/login', request.url), 303);
    res.cookies.set(sessionCookieName(), '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
    });
    return res;
}
