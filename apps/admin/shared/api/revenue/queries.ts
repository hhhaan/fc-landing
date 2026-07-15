"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRevenue } from "@/shared/api/revenue/api";

export const revenueKeys = {
  all: ["revenue"] as const,
  detail: () => [...revenueKeys.all, "detail"] as const,
};

export function useRevenue() {
  return useQuery({
    queryKey: revenueKeys.detail(),
    queryFn: fetchRevenue,
  });
}
