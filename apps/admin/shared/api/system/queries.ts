'use client';

import { useQuery } from '@tanstack/react-query';
import type { SystemData } from '@/shared/api/system/types';
import { apiGet } from '@/shared/lib/http';

export const systemKeys = {
    all: ['system'] as const,
    detail: () => [...systemKeys.all, 'detail'] as const,
};

export function useSystem() {
    return useQuery({
        queryKey: systemKeys.detail(),
        queryFn: () => apiGet<SystemData>('/system'),
    });
}
