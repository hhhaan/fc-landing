"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCoupons,
  disableCoupon,
  fetchCoupons,
  issueCoupon,
} from "./api";
import type { CreateCouponsInput, IssueCouponInput } from "./types";

export const couponsKeys = {
  all: ["coupons"] as const,
  list: () => [...couponsKeys.all, "list"] as const,
};

export function useCoupons() {
  return useQuery({
    queryKey: couponsKeys.list(),
    queryFn: fetchCoupons,
  });
}

export function useCreateCoupons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCouponsInput) => createCoupons(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: couponsKeys.all });
    },
  });
}

export function useIssueCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: IssueCouponInput) => issueCoupon(body ?? {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: couponsKeys.all });
    },
  });
}

export function useDisableCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => disableCoupon(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: couponsKeys.all });
    },
  });
}
