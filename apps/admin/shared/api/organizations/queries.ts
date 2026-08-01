'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdminOrganization } from '@/shared/api/organizations/types';
import { apiGet } from '@/shared/lib/http';

export const organizationsKeys = {
    all: ['organizations'] as const,
    list: () => [...organizationsKeys.all, 'list'] as const,
};

export function useOrganizations() {
    return useQuery({
        queryKey: organizationsKeys.list(),
        queryFn: () => apiGet<AdminOrganization[]>('/organizations'),
    });
}
