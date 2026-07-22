'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchMarketRoasteries,
    fetchMarketRoasteriesMap,
    hideMarketRoastery,
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
                const target = data.items.find((item) => item.id === roasteryId);
                const marketCode = target?.market;
                const was = target?.contacted ?? false;
                let contactedByMarket = data.contactedByMarket;
                if (marketCode && was !== contacted) {
                    const delta = contacted ? 1 : -1;
                    contactedByMarket = {
                        ...data.contactedByMarket,
                        [marketCode]: Math.max(0, (data.contactedByMarket[marketCode] ?? 0) + delta),
                    };
                }
                qc.setQueryData<MarketRoasteriesResponse>(key, {
                    ...data,
                    contactedByMarket,
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

export function useHideMarketRoastery() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (roasteryId: string) => hideMarketRoastery(roasteryId),
        onMutate: async (roasteryId) => {
            await qc.cancelQueries({ queryKey: marketRoasteriesKeys.all });
            const snapshots = qc.getQueriesData<MarketRoasteriesResponse>({
                queryKey: [...marketRoasteriesKeys.all, 'list'],
            });
            for (const [key, data] of snapshots) {
                if (!data) continue;
                const target = data.items.find((item) => item.id === roasteryId);
                const marketCode = target?.market;
                const wasContacted = target?.contacted ?? false;
                const contactedByMarket = { ...data.contactedByMarket };
                const byMarket = { ...data.byMarket };
                if (marketCode) {
                    byMarket[marketCode] = Math.max(0, (byMarket[marketCode] ?? 0) - 1);
                    if (wasContacted) {
                        contactedByMarket[marketCode] = Math.max(0, (contactedByMarket[marketCode] ?? 0) - 1);
                    }
                }
                qc.setQueryData<MarketRoasteriesResponse>(key, {
                    ...data,
                    total: Math.max(0, data.total - 1),
                    byMarket,
                    contactedByMarket,
                    items: data.items.filter((item) => item.id !== roasteryId),
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
