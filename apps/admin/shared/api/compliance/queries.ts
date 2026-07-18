'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchComplianceBundle } from '@/shared/api/compliance/api';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const complianceKeys = {
    all: ['compliance'] as const,
    bundle: (userId: string, from: string, to: string) => [...complianceKeys.all, 'bundle', userId, from, to] as const,
};

export function useComplianceBundle(userId: string | null, from: string, to: string) {
    const validRange = DATE_RE.test(from) && DATE_RE.test(to) && from <= to;
    return useQuery({
        queryKey: complianceKeys.bundle(userId ?? '', from, to),
        queryFn: () => fetchComplianceBundle(userId!, from, to),
        enabled: Boolean(userId) && validRange,
    });
}
