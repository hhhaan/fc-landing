'use client';

import { useQuery } from '@tanstack/react-query';
import type { OverviewData } from '@/shared/api/kpis/types';
import { apiGet } from '@/shared/lib/http';

export const kpisKeys = {
    all: ['kpis'] as const,
    overview: () => [...kpisKeys.all, 'overview'] as const,
};

export function useOverview() {
    return useQuery({
        queryKey: kpisKeys.overview(),
        queryFn: () => apiGet<OverviewData>('/kpis'),
    });
}
