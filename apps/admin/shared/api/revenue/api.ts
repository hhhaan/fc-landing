import { api } from "@/shared/lib/axios";
import type { RevenueData } from "@/shared/api/revenue/types";

export async function fetchRevenue(): Promise<RevenueData> {
  const { data } = await api.get<RevenueData>("/revenue");
  return data;
}
