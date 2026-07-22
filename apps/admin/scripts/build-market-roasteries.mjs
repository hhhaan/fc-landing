/**
 * Rebuild data/market-roasteries.json from data/raw scrape outputs.
 *
 * Usage (from apps/admin):
 *   node scripts/build-market-roasteries.mjs
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADMIN = resolve(__dirname, '..');
const RAW = join(ADMIN, 'data', 'raw');
const OUT_DIR = join(ADMIN, 'data');
const OUT = join(OUT_DIR, 'market-roasteries.json');

async function readJsonl(path) {
    if (!existsSync(path)) return [];
    const rows = [];
    const rl = createInterface({
        input: createReadStream(path, 'utf8'),
        crlfDelay: Infinity,
    });
    for await (const line of rl) {
        if (!line.trim()) continue;
        rows.push(JSON.parse(line));
    }
    return rows;
}

const items = [];
const matchByRid = new Map();
for (const r of await readJsonl(join(RAW, 'diningcode-google-match.jsonl'))) {
    matchByRid.set(r.v_rid, r);
}

for (const r of await readJsonl(join(RAW, 'diningcode-roastery.jsonl'))) {
    const m = matchByRid.get(r.v_rid) || {};
    items.push({
        id: `kr:dc:${r.v_rid}`,
        market: 'KR',
        country: 'KR',
        name: r.name || '',
        addr: r.road_addr || r.addr || '',
        lat: r.lat,
        lng: r.lng,
        phone: r.phone || null,
        rating: r.user_score ?? null,
        rating_count: r.review_cnt ?? null,
        score: r.score ?? null,
        maps_url: m.g_maps_url || r.profile_url || null,
        source: 'diningcode',
        g_status: m.status ?? null,
        g_name: m.g_name || null,
    });
}

async function loadGoogle(file, market, countryFn) {
    const rows = await readJsonl(join(RAW, file));
    let n = 0;
    for (const r of rows) {
        if (r.lat == null || r.lng == null) continue;
        const pid = r.place_id || `${market}:${n}`;
        items.push({
            id: `${market.toLowerCase()}:g:${pid}`,
            market,
            country: countryFn(r),
            name: r.name || '',
            addr: r.addr || '',
            lat: r.lat,
            lng: r.lng,
            phone: null,
            rating: r.rating ?? null,
            rating_count: r.user_rating_count ?? null,
            score: null,
            maps_url: r.maps_url || null,
            source: 'google',
            g_status: null,
            g_name: null,
        });
        n++;
    }
    return n;
}

const counts = {
    jp: await loadGoogle('japan-google-roastery.jsonl', 'JP', () => 'JP'),
    us: await loadGoogle('us-google-roastery.jsonl', 'US', (r) => r.state || 'US'),
    hk: await loadGoogle('hk-google-roastery.jsonl', 'HK', () => 'HK'),
    tw: await loadGoogle('tw-google-roastery.jsonl', 'TW', () => 'TW'),
    eu: await loadGoogle('europe-google-roastery.jsonl', 'EU', (r) => r.country || 'EU'),
    au: await loadGoogle('australia-google-roastery.jsonl', 'AU', (r) => r.country || 'AU'),
    sea: await loadGoogle('seasia-google-roastery.jsonl', 'SEA', (r) => r.country || 'SEA'),
};

const filtered = items.filter((x) => typeof x.lat === 'number' && typeof x.lng === 'number');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(filtered));
const byMarket = {};
for (const r of filtered) byMarket[r.market] = (byMarket[r.market] || 0) + 1;
writeFileSync(
    join(OUT_DIR, 'market-roasteries.meta.json'),
    JSON.stringify({ total: filtered.length, byMarket, sources: counts }, null, 2),
);
console.log({ total: filtered.length, byMarket, out: OUT });
