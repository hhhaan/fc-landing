import type { AdminOrganization } from '@/shared/api/organizations/types';
import { api } from '@/shared/lib/axios';

export async function fetchOrganizations(): Promise<AdminOrganization[]> {
    const { data } = await api.get<AdminOrganization[]>('/organizations');
    return data;
}
