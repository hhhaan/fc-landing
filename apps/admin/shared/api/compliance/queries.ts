'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchComplianceBundle } from '@/shared/api/compliance/api';

export const complianceKeys = {
    all: ['compliance'] as const,
    bundle: (userId: string, year: number, month: number) =>
        [...complianceKeys.all, 'bundle', userId, year, month] as const,
};

export function useComplianceBundle(userId: string | null, year: number, month: number) {
    return useQuery({
        queryKey: complianceKeys.bundle(userId ?? '', year, month),
        queryFn: () => fetchComplianceBundle(userId!, year, month),
        enabled: Boolean(userId) && year >= 2020 && month >= 1 && month <= 12,
    });
}
