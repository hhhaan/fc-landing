'use client';

import { useQuery } from '@tanstack/react-query';
import type { ActivityData } from '@/shared/api/activity/types';
import { apiGet } from '@/shared/lib/http';

export const activityKeys = {
    all: ['activity'] as const,
    detail: () => [...activityKeys.all, 'detail'] as const,
};

export function useActivity() {
    return useQuery({
        queryKey: activityKeys.detail(),
        queryFn: () => apiGet<ActivityData>('/activity'),
        refetchInterval: 60_000,
    });
}
