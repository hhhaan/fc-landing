import { api } from "@/shared/lib/axios";
import type { ActivityData } from "@/shared/api/activity/types";

export async function fetchActivity(): Promise<ActivityData> {
  const { data } = await api.get<ActivityData>("/activity");
  return data;
}
