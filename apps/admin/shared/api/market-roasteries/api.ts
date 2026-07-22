import type {
    MarketRoasteriesMapResponse,
    MarketRoasteriesQuery,
    MarketRoasteriesResponse,
    SetMarketRoasteryContactedInput,
    SetMarketRoasteryContactedResult,
} from '@/shared/api/market-roasteries/types';
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

export async function fetchMarketRoasteriesMap(
    params: Pick<MarketRoasteriesQuery, 'market' | 'q'> = {},
): Promise<MarketRoasteriesMapResponse> {
    const { data } = await api.get<MarketRoasteriesMapResponse>('/market-roasteries', {
        params: {
            view: 'map',
            market: params.market && params.market !== 'ALL' ? params.market : undefined,
            q: params.q || undefined,
        },
    });
    return data;
}

export async function setMarketRoasteryContacted(
    body: SetMarketRoasteryContactedInput,
): Promise<SetMarketRoasteryContactedResult> {
    const { data } = await api.patch<SetMarketRoasteryContactedResult>('/market-roasteries', body);
    return data;
}
