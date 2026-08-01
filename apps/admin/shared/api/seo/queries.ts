'use client';

import { useQuery } from '@tanstack/react-query';
import type { SeoData } from '@/shared/api/seo/types';
import { apiGet } from '@/shared/lib/http';

export const seoKeys = {
    all: ['seo'] as const,
    detail: () => [...seoKeys.all, 'detail'] as const,
};

export function useSeo() {
    return useQuery({
        queryKey: seoKeys.detail(),
        queryFn: () => apiGet<SeoData>('/seo'),
        staleTime: 5 * 60_000,
    });
}
