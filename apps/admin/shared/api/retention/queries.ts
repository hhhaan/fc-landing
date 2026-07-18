'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchRetention } from '@/shared/api/retention/api';

export const retentionKeys = {
    all: ['retention'] as const,
    detail: () => [...retentionKeys.all, 'detail'] as const,
};

export function useRetention() {
    return useQuery({
        queryKey: retentionKeys.detail(),
        queryFn: fetchRetention,
    });
}
