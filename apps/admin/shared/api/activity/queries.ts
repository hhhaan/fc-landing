"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchActivity } from "@/shared/api/activity/api";

export const activityKeys = {
  all: ["activity"] as const,
  detail: () => [...activityKeys.all, "detail"] as const,
};

export function useActivity() {
  return useQuery({
    queryKey: activityKeys.detail(),
    queryFn: fetchActivity,
    refetchInterval: 60_000,
  });
}
