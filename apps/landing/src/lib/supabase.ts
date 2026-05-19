import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;

export function createClient({ request, cookies }: { request: Request; cookies: AstroCookies }) {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                const cookieHeader = request.headers.get('Cookie') ?? '';
                const parsed = parseCookieHeader(cookieHeader);

                // ← 핵심: value가 undefined인 경우 빈 문자열로 변환
                return parsed.map(({ name, value }) => ({
                    name,
                    value: value ?? '', // 이 부분이 타입 에러를 해결
                }));
            },

            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    cookies.set(name, value, options);
                });
            },
        },
    });
}
