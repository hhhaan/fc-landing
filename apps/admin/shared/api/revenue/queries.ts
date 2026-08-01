'use client';

import { useQuery } from '@tanstack/react-query';
import type { RevenueData } from '@/shared/api/revenue/types';
import { apiGet } from '@/shared/lib/http';

export const revenueKeys = {
    all: ['revenue'] as const,
    detail: () => [...revenueKeys.all, 'detail'] as const,
};

export function useRevenue() {
    return useQuery({
        queryKey: revenueKeys.detail(),
        queryFn: () => apiGet<RevenueData>('/revenue'),
    });
}
