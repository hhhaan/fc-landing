import 'server-only';
import type { AdminOrganization } from './types';

export type { AdminOrganization };

import { getAdminClient } from '@/shared/lib/supabase/admin';

export async function getOrganizations(): Promise<AdminOrganization[]> {
    const sb = getAdminClient();

    const { data: orgs, error } = await sb
        .from('organizations')
        .select('id, name, owner_id, seat_limit, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
    if (error) throw error;
    if (!orgs?.length) return [];

    const orgIds = orgs.map((o) => o.id as string);
    const ownerIds = [...new Set(orgs.map((o) => o.owner_id as string))];

    const [{ data: members }, { data: profiles }, { data: users }] = await Promise.all([
        sb.from('organization_members').select('org_id').in('org_id', orgIds),
        sb.from('profiles').select('id, plan, business_name, display_name').in('id', ownerIds),
        sb.rpc('admin_user_roster'),
    ]);

    const memberCount = new Map<string, number>();
    for (const m of members ?? []) {
        const id = m.org_id as string;
        memberCount.set(id, (memberCount.get(id) ?? 0) + 1);
    }

    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p] as const));
    const emailById = new Map(
        ((users as { id: string; email: string | null }[] | null) ?? []).map((u) => [u.id, u.email] as const),
    );

    return orgs.map((o) => {
        const ownerId = o.owner_id as string;
        const profile = profileById.get(ownerId);
        return {
            id: o.id as string,
            name: o.name as string,
            owner_id: ownerId,
            seat_limit: o.seat_limit as number,
            created_at: o.created_at as string,
            member_count: memberCount.get(o.id as string) ?? 0,
            owner_email: emailById.get(ownerId) ?? null,
            owner_business_name: (profile?.business_name as string | null) ?? null,
            owner_display_name: (profile?.display_name as string | null) ?? null,
            plan: (profile?.plan as string) ?? 'unknown',
        };
    });
}
