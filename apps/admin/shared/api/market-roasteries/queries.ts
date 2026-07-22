'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMarketRoasteries, fetchMarketRoasteriesMap } from '@/shared/api/market-roasteries/api';
import type { MarketRoasteriesQuery } from '@/shared/api/market-roasteries/types';

export const marketRoasteriesKeys = {
    all: ['market-roasteries'] as const,
    list: (params: MarketRoasteriesQuery) => [...marketRoasteriesKeys.all, 'list', params] as const,
    map: (params: Pick<MarketRoasteriesQuery, 'market' | 'q'>) => [...marketRoasteriesKeys.all, 'map', params] as const,
};

export function useMarketRoasteries(params: MarketRoasteriesQuery) {
    return useQuery({
        queryKey: marketRoasteriesKeys.list(params),
        queryFn: () => fetchMarketRoasteries(params),
        placeholderData: (prev) => prev,
    });
}

export function useMarketRoasteriesMap(params: Pick<MarketRoasteriesQuery, 'market' | 'q'>, enabled = true) {
    return useQuery({
        queryKey: marketRoasteriesKeys.map(params),
        queryFn: () => fetchMarketRoasteriesMap(params),
        enabled,
        placeholderData: (prev) => prev,
        staleTime: 5 * 60_000,
    });
}
