import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getAdminClient } from '@/shared/lib/supabase/admin';

import type {
    MarketCode,
    MarketRoasteriesMapResponse,
    MarketRoasteriesQuery,
    MarketRoasteriesResponse,
    MarketRoastery,
    SetMarketRoasteryContactedResult,
} from './types';

type DirectoryRow = Omit<MarketRoastery, 'contacted' | 'contacted_at'>;

let cache: DirectoryRow[] | null = null;
let byMarketCache: Record<string, number> | null = null;

function loadAll(): DirectoryRow[] {
    if (cache) return cache;
    const path = join(process.cwd(), 'data', 'market-roasteries.json');
    const raw = readFileSync(path, 'utf8');
    cache = JSON.parse(raw) as DirectoryRow[];
    const counts: Record<string, number> = {};
    for (const row of cache) {
        counts[row.market] = (counts[row.market] ?? 0) + 1;
    }
    byMarketCache = counts;
    return cache;
}

function filterRoasteries(query: MarketRoasteriesQuery): DirectoryRow[] {
    const all = loadAll();
    const market = (query.market ?? 'ALL') as MarketCode | 'ALL';
    const q = (query.q ?? '').trim().toLowerCase();

    let filtered = all;
    if (market !== 'ALL') {
        filtered = filtered.filter((r) => r.market === market);
    }
    if (q) {
        filtered = filtered.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                r.addr.toLowerCase().includes(q) ||
                r.country.toLowerCase().includes(q) ||
                (r.phone ?? '').toLowerCase().includes(q),
        );
    }
    return filtered;
}

async function loadContactMap(ids: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (ids.length === 0) return map;

    const sb = getAdminClient();
    // Supabase .in() chunks stay reasonable for page size ≤500
    const { data, error } = await sb
        .from('market_roastery_contacts')
        .select('roastery_id, contacted, contacted_at')
        .in('roastery_id', ids)
        .eq('contacted', true);

    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
        map.set(row.roastery_id, row.contacted_at);
    }
    return map;
}

export async function getMarketRoasteries(query: MarketRoasteriesQuery = {}): Promise<MarketRoasteriesResponse> {
    const filtered = filterRoasteries(query);
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
    const offset = Math.max(query.offset ?? 0, 0);
    const page = filtered.slice(offset, offset + limit);
    const contacts = await loadContactMap(page.map((r) => r.id));

    return {
        total: filtered.length,
        limit,
        offset,
        byMarket: byMarketCache ?? {},
        items: page.map((r) => ({
            ...r,
            contacted: contacts.has(r.id),
            contacted_at: contacts.get(r.id) ?? null,
        })),
        generatedAt: new Date().toISOString(),
    };
}

export function getMarketRoasteriesMap(query: MarketRoasteriesQuery = {}): MarketRoasteriesMapResponse {
    const filtered = filterRoasteries(query);
    return {
        total: filtered.length,
        byMarket: byMarketCache ?? {},
        points: filtered.map((r) => ({
            id: r.id,
            market: r.market,
            name: r.name,
            lat: r.lat,
            lng: r.lng,
            rating: r.rating,
            maps_url: r.maps_url,
        })),
        generatedAt: new Date().toISOString(),
    };
}

export async function setMarketRoasteryContacted(
    roasteryId: string,
    contacted: boolean,
): Promise<SetMarketRoasteryContactedResult> {
    const id = roasteryId.trim();
    if (!id) throw new Error('roasteryId is required');

    const sb = getAdminClient();
    const now = new Date().toISOString();

    if (!contacted) {
        const { error } = await sb.from('market_roastery_contacts').delete().eq('roastery_id', id);
        if (error) throw new Error(error.message);
        return { roasteryId: id, contacted: false, contacted_at: null };
    }

    const { data, error } = await sb
        .from('market_roastery_contacts')
        .upsert(
            {
                roastery_id: id,
                contacted: true,
                contacted_at: now,
                updated_at: now,
            },
            { onConflict: 'roastery_id' },
        )
        .select('roastery_id, contacted, contacted_at')
        .single();

    if (error) throw new Error(error.message);
    return {
        roasteryId: data.roastery_id,
        contacted: data.contacted,
        contacted_at: data.contacted_at,
    };
}
