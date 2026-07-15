import { api } from "@/shared/lib/axios";
import type { AdminUser } from "@/shared/api/users/types";

export async function fetchUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>("/users");
  return data;
}
