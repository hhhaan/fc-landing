import type { MarketRoasteriesQuery, MarketRoasteriesResponse } from '@/shared/api/market-roasteries/types';
import { api } from '@/shared/lib/axios';

export async function fetchMarketRoasteries(params: MarketRoasteriesQuery = {}): Promise<MarketRoasteriesResponse> {
    const { data } = await api.get<MarketRoasteriesResponse>('/market-roasteries', {
        params: {
            market: params.market && params.market !== 'ALL' ? params.market : undefined,
            q: params.q || undefined,
            limit: params.limit ?? 100,
            offset: params.offset ?? 0,
        },
    });
    return data;
}
