import { api } from "@/shared/lib/axios";
import type { SystemData } from "@/shared/api/system/types";

export async function fetchSystem(): Promise<SystemData> {
  const { data } = await api.get<SystemData>("/system");
  return data;
}
