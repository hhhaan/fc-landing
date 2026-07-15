"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOverview } from "@/shared/api/kpis/api";

export const kpisKeys = {
  all: ["kpis"] as const,
  overview: () => [...kpisKeys.all, "overview"] as const,
};

export function useOverview() {
  return useQuery({
    queryKey: kpisKeys.overview(),
    queryFn: fetchOverview,
  });
}
