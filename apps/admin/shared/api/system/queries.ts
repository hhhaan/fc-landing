"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSystem } from "@/shared/api/system/api";

export const systemKeys = {
  all: ["system"] as const,
  detail: () => [...systemKeys.all, "detail"] as const,
};

export function useSystem() {
  return useQuery({
    queryKey: systemKeys.detail(),
    queryFn: fetchSystem,
  });
}
