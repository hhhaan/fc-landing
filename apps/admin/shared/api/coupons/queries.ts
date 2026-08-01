'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/shared/lib/http';
import type { CouponsListResponse, CreateCouponsInput, IssueCouponInput, PolarCoupon } from './types';

export const couponsKeys = {
    all: ['coupons'] as const,
    list: () => [...couponsKeys.all, 'list'] as const,
};

export function useCoupons() {
    return useQuery({
        queryKey: couponsKeys.list(),
        queryFn: () => apiGet<CouponsListResponse>('/coupons'),
    });
}

export function useCreateCoupons() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateCouponsInput) => apiPost<PolarCoupon[]>('/coupons', body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: couponsKeys.all });
        },
    });
}

export function useIssueCoupon() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body?: IssueCouponInput) => apiPost<PolarCoupon>('/coupons/issue', body ?? {}),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: couponsKeys.all });
        },
    });
}

export function useDisableCoupon() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiPatch<PolarCoupon>(`/coupons/${id}`, { action: 'disable' }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: couponsKeys.all });
        },
    });
}
