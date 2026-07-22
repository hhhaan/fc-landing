import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { MarketCode, MarketRoasteriesQuery, MarketRoasteriesResponse, MarketRoastery } from './types';

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

export function getMarketRoasteries(query: MarketRoasteriesQuery = {}): MarketRoasteriesResponse {
    const all = loadAll();
    const market = (query.market ?? 'ALL') as MarketCode | 'ALL';
    const q = (query.q ?? '').trim().toLowerCase();
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
    const offset = Math.max(query.offset ?? 0, 0);

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

    const items = filtered.slice(offset, offset + limit);
    return {
        total: filtered.length,
        limit,
        offset,
        byMarket: byMarketCache ?? {},
        items,
        generatedAt: new Date().toISOString(),
    };
}
