import { createHmac, timingSafeEqual } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { COUNTRY_HEADER, REGION_HEADER, resolveRequestGeoFromNext } from '@/shared/lib/geo-region';

const COOKIE = 'fc_admin_session';

function verify(token: string | undefined): boolean {
    if (!token) return false;
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev';
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [ok, expStr, sig] = parts;
    if (ok !== 'ok') return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const payload = `${ok}.${expStr}`;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    try {
        return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
        return false;
    }
}

/** Attach pricing region (CF-IPCountry → KR|JP|US/USD) for downstream handlers. */
function withGeoHeaders(request: NextRequest, res: NextResponse): NextResponse {
    const geo = resolveRequestGeoFromNext(request);
    res.headers.set(REGION_HEADER, geo.region);
    res.headers.set(COUNTRY_HEADER, geo.countryCode);
    return res;
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico'
    ) {
        return withGeoHeaders(request, NextResponse.next());
    }

    const token = request.cookies.get(COOKIE)?.value;
    if (!verify(token)) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', pathname);
        // 303 after any non-GET so follow-up is GET (307 re-POSTs → 405 on pages)
        return withGeoHeaders(request, NextResponse.redirect(url, 303));
    }

    // Request headers for Server Components / Route Handlers (Next request clone)
    const requestHeaders = new Headers(request.headers);
    const geo = resolveRequestGeoFromNext(request);
    requestHeaders.set(REGION_HEADER, geo.region);
    requestHeaders.set(COUNTRY_HEADER, geo.countryCode);

    const res = NextResponse.next({
        request: { headers: requestHeaders },
    });
    return withGeoHeaders(request, res);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
