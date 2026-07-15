import { api } from "@/shared/lib/axios";
import type { OverviewData } from "@/shared/api/kpis/types";

export async function fetchOverview(): Promise<OverviewData> {
  const { data } = await api.get<OverviewData>("/kpis");
  return data;
}
