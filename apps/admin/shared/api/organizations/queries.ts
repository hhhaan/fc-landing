'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchOrganizations } from '@/shared/api/organizations/api';

export const organizationsKeys = {
    all: ['organizations'] as const,
    list: () => [...organizationsKeys.all, 'list'] as const,
};

export function useOrganizations() {
    return useQuery({
        queryKey: organizationsKeys.list(),
        queryFn: fetchOrganizations,
    });
}
