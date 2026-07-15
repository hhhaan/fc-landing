import { api } from "@/shared/lib/axios";
import type { GeoData } from "@/shared/api/geo/types";

export async function fetchGeo(): Promise<GeoData> {
  const { data } = await api.get<GeoData>("/geo");
  return data;
}
