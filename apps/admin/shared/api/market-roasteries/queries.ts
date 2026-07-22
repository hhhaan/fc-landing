'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMarketRoasteries } from '@/shared/api/market-roasteries/api';
import type { MarketRoasteriesQuery } from '@/shared/api/market-roasteries/types';

export const marketRoasteriesKeys = {
    all: ['market-roasteries'] as const,
    list: (params: MarketRoasteriesQuery) => [...marketRoasteriesKeys.all, 'list', params] as const,
};

export function useMarketRoasteries(params: MarketRoasteriesQuery) {
    return useQuery({
        queryKey: marketRoasteriesKeys.list(params),
        queryFn: () => fetchMarketRoasteries(params),
        placeholderData: (prev) => prev,
    });
}
