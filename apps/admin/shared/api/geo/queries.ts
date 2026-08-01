'use client';

import { useQuery } from '@tanstack/react-query';
import type { GeoData } from '@/shared/api/geo/types';
import { apiGet } from '@/shared/lib/http';

export const geoKeys = {
    all: ['geo'] as const,
    map: () => [...geoKeys.all, 'map'] as const,
};

export function useGeo() {
    return useQuery({
        queryKey: geoKeys.map(),
        queryFn: () => apiGet<GeoData>('/geo'),
    });
}
