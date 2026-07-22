import { NextResponse } from 'next/server';
import {
    getMarketRoasteries,
    getMarketRoasteriesMap,
    setMarketRoasteryContacted,
} from '@/shared/api/market-roasteries/server';
import type { MarketCode, SetMarketRoasteryContactedInput } from '@/shared/api/market-roasteries/types';
import { jsonOk } from '@/shared/lib/api-handler';

const MARKETS = new Set(['KR', 'JP', 'US', 'HK', 'TW', 'EU', 'ALL']);

export async function GET(req: Request) {
    return jsonOk(async () => {
        const url = new URL(req.url);
        const marketRaw = (url.searchParams.get('market') ?? 'ALL').toUpperCase();
        const market = MARKETS.has(marketRaw) ? (marketRaw as MarketCode | 'ALL') : 'ALL';
        const q = url.searchParams.get('q') ?? undefined;
        const view = url.searchParams.get('view') === 'map' ? 'map' : 'list';

        if (view === 'map') {
            return getMarketRoasteriesMap({ market, q, view: 'map' });
        }

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

export async function PATCH(req: Request) {
    try {
        const body = (await req.json()) as SetMarketRoasteryContactedInput;
        if (!body?.roasteryId || typeof body.contacted !== 'boolean') {
            return NextResponse.json({ error: 'roasteryId and contacted are required' }, { status: 400 });
        }
        const result = await setMarketRoasteryContacted(body.roasteryId, body.contacted);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error';
        console.error('[api/market-roasteries PATCH]', message, err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
