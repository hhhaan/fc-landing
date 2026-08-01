'use client';

import { useQuery } from '@tanstack/react-query';
import type { RetentionData } from '@/shared/api/retention/types';
import { apiGet } from '@/shared/lib/http';

export const retentionKeys = {
    all: ['retention'] as const,
    detail: () => [...retentionKeys.all, 'detail'] as const,
};

export function useRetention() {
    return useQuery({
        queryKey: retentionKeys.detail(),
        queryFn: () => apiGet<RetentionData>('/retention'),
    });
}
