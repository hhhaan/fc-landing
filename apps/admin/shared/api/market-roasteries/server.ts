import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
    MarketCode,
    MarketRoasteriesMapResponse,
    MarketRoasteriesQuery,
    MarketRoasteriesResponse,
    MarketRoastery,
} from './types';

let cache: MarketRoastery[] | null = null;
let byMarketCache: Record<string, number> | null = null;

function loadAll(): MarketRoastery[] {
    if (cache) return cache;
    const path = join(process.cwd(), 'data', 'market-roasteries.json');
    const raw = readFileSync(path, 'utf8');
    cache = JSON.parse(raw) as MarketRoastery[];
    const counts: Record<string, number> = {};
    for (const row of cache) {
        counts[row.market] = (counts[row.market] ?? 0) + 1;
    }
    byMarketCache = counts;
    return cache;
}

function filterRoasteries(query: MarketRoasteriesQuery): MarketRoastery[] {
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

export function getMarketRoasteries(query: MarketRoasteriesQuery = {}): MarketRoasteriesResponse {
    const filtered = filterRoasteries(query);
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
    const offset = Math.max(query.offset ?? 0, 0);

    return {
        total: filtered.length,
        limit,
        offset,
        byMarket: byMarketCache ?? {},
        items: filtered.slice(offset, offset + limit),
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
