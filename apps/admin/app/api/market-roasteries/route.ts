import { getMarketRoasteries } from '@/shared/api/market-roasteries/server';
import type { MarketCode } from '@/shared/api/market-roasteries/types';
import { jsonOk } from '@/shared/lib/api-handler';

const MARKETS = new Set(['KR', 'JP', 'US', 'HK', 'TW', 'EU', 'ALL']);

export async function GET(req: Request) {
    return jsonOk(async () => {
        const url = new URL(req.url);
        const marketRaw = (url.searchParams.get('market') ?? 'ALL').toUpperCase();
        const market = MARKETS.has(marketRaw) ? (marketRaw as MarketCode | 'ALL') : 'ALL';
        const q = url.searchParams.get('q') ?? undefined;
        const limit = Number(url.searchParams.get('limit') ?? '100');
        const offset = Number(url.searchParams.get('offset') ?? '0');
        return getMarketRoasteries({
            market,
            q,
            limit: Number.isFinite(limit) ? limit : 100,
            offset: Number.isFinite(offset) ? offset : 0,
        });
    });
}
