"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGeo } from "@/shared/api/geo/api";

export const geoKeys = {
  all: ["geo"] as const,
  map: () => [...geoKeys.all, "map"] as const,
};

export function useGeo() {
  return useQuery({
    queryKey: geoKeys.map(),
    queryFn: fetchGeo,
  });
}
