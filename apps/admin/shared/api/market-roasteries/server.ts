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
let idToMarketCache: Map<string, MarketCode> | null = null;

function loadAll(): DirectoryRow[] {
    if (cache) return cache;
    const path = join(process.cwd(), 'data', 'market-roasteries.json');
    const raw = readFileSync(path, 'utf8');
    cache = JSON.parse(raw) as DirectoryRow[];
    const idMap = new Map<string, MarketCode>();
    for (const row of cache) {
        idMap.set(row.id, row.market);
    }
    idToMarketCache = idMap;
    return cache;
}

async function loadHiddenIds(): Promise<Set<string>> {
    const sb = getAdminClient();
    const { data, error } = await sb.from('market_roastery_hidden').select('roastery_id');
    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((r) => r.roastery_id));
}

function filterRoasteries(query: MarketRoasteriesQuery, hidden: Set<string>): DirectoryRow[] {
    const all = loadAll();
    const market = (query.market ?? 'ALL') as MarketCode | 'ALL';
    const q = (query.q ?? '').trim().toLowerCase();

    let filtered = all.filter((r) => !hidden.has(r.id));
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

function byMarketFrom(rows: DirectoryRow[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const row of rows) {
        counts[row.market] = (counts[row.market] ?? 0) + 1;
    }
    return counts;
}

async function loadContactMap(ids: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (ids.length === 0) return map;

    const sb = getAdminClient();
    const { data, error } = await sb
        .from('market_roastery_contacts')
        .select('roastery_id, contacted_at')
        .in('roastery_id', ids)
        .eq('contacted', true);

    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
        map.set(row.roastery_id, row.contacted_at);
    }
    return map;
}

async function loadContactedByMarket(hidden: Set<string>): Promise<Record<string, number>> {
    loadAll();
    const idToMarket = idToMarketCache ?? new Map();
    const sb = getAdminClient();
    const { data, error } = await sb.from('market_roastery_contacts').select('roastery_id').eq('contacted', true);
    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
        if (hidden.has(row.roastery_id)) continue;
        const market = idToMarket.get(row.roastery_id);
        if (!market) continue;
        counts[market] = (counts[market] ?? 0) + 1;
    }
    return counts;
}

export async function getMarketRoasteries(query: MarketRoasteriesQuery = {}): Promise<MarketRoasteriesResponse> {
    const hidden = await loadHiddenIds();
    const allVisible = loadAll().filter((r) => !hidden.has(r.id));
    const byMarket = byMarketFrom(allVisible);

    const filtered = filterRoasteries(query, hidden);
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
    const offset = Math.max(query.offset ?? 0, 0);
    const page = filtered.slice(offset, offset + limit);
    const [contacts, contactedByMarket] = await Promise.all([
        loadContactMap(page.map((r) => r.id)),
        loadContactedByMarket(hidden),
    ]);

    return {
        total: filtered.length,
        limit,
        offset,
        byMarket,
        contactedByMarket,
        items: page.map((r) => ({
            ...r,
            contacted: contacts.has(r.id),
            contacted_at: contacts.get(r.id) ?? null,
        })),
        generatedAt: new Date().toISOString(),
    };
}

export async function getMarketRoasteriesMap(query: MarketRoasteriesQuery = {}): Promise<MarketRoasteriesMapResponse> {
    const hidden = await loadHiddenIds();
    const allVisible = loadAll().filter((r) => !hidden.has(r.id));
    const byMarket = byMarketFrom(allVisible);
    const filtered = filterRoasteries(query, hidden);
    const contactedByMarket = await loadContactedByMarket(hidden);
    return {
        total: filtered.length,
        byMarket,
        contactedByMarket,
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

export async function hideMarketRoastery(roasteryId: string): Promise<{ roasteryId: string }> {
    const id = roasteryId.trim();
    if (!id) throw new Error('roasteryId is required');

    const sb = getAdminClient();
    const now = new Date().toISOString();
    const { error } = await sb
        .from('market_roastery_hidden')
        .upsert({ roastery_id: id, hidden_at: now }, { onConflict: 'roastery_id' });
    if (error) throw new Error(error.message);

    // also drop contact flag if present
    await sb.from('market_roastery_contacts').delete().eq('roastery_id', id);

    return { roasteryId: id };
}
