"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "@/shared/api/users/api";

export const usersKeys = {
  all: ["users"] as const,
  list: () => [...usersKeys.all, "list"] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: usersKeys.list(),
    queryFn: fetchUsers,
  });
}
