import 'server-only';
import type { CountryAgg, GeoData, GeoPoint, SessionIpRow } from './types';

export type { CountryAgg, GeoData, GeoPoint, SessionIpRow };

import { geocodeSessionIps } from '@/shared/lib/ip-geo';
import { getAdminClient } from '@/shared/lib/supabase/admin';

export async function getGeoData(): Promise<GeoData> {
    const sb = getAdminClient();
    const { data, error } = await sb.rpc('admin_auth_session_ips');
    if (error) throw error;

    const rows: SessionIpRow[] = (data ?? []).map((r) => ({
        ip: r.ip,
        session_count: Number(r.session_count),
        user_count: Number(r.user_count),
        last_seen: r.last_seen,
    }));

    const { points, countries, unresolved } = await geocodeSessionIps(rows);

    return {
        points,
        countries,
        unresolved,
        generatedAt: new Date().toISOString(),
    };
}
