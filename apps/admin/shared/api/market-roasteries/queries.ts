'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchMarketRoasteries,
    fetchMarketRoasteriesMap,
    setMarketRoasteryContacted,
} from '@/shared/api/market-roasteries/api';
import type {
    MarketRoasteriesQuery,
    MarketRoasteriesResponse,
    SetMarketRoasteryContactedInput,
} from '@/shared/api/market-roasteries/types';

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

export function useSetMarketRoasteryContacted() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: SetMarketRoasteryContactedInput) => setMarketRoasteryContacted(body),
        onMutate: async ({ roasteryId, contacted }) => {
            await qc.cancelQueries({ queryKey: marketRoasteriesKeys.all });
            const snapshots = qc.getQueriesData<MarketRoasteriesResponse>({
                queryKey: [...marketRoasteriesKeys.all, 'list'],
            });
            for (const [key, data] of snapshots) {
                if (!data) continue;
                qc.setQueryData<MarketRoasteriesResponse>(key, {
                    ...data,
                    items: data.items.map((item) =>
                        item.id === roasteryId
                            ? {
                                  ...item,
                                  contacted,
                                  contacted_at: contacted ? (item.contacted_at ?? new Date().toISOString()) : null,
                              }
                            : item,
                    ),
                });
            }
            return { snapshots };
        },
        onError: (_err, _vars, ctx) => {
            if (!ctx?.snapshots) return;
            for (const [key, data] of ctx.snapshots) {
                qc.setQueryData(key, data);
            }
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: marketRoasteriesKeys.all });
        },
    });
}
