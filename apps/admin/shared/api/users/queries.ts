'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdminUser } from '@/shared/api/users/types';
import { apiGet } from '@/shared/lib/http';

export const usersKeys = {
    all: ['users'] as const,
    list: () => [...usersKeys.all, 'list'] as const,
};

export function useUsers() {
    return useQuery({
        queryKey: usersKeys.list(),
        queryFn: () => apiGet<AdminUser[]>('/users'),
    });
}
