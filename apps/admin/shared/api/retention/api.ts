import type { RetentionData } from '@/shared/api/retention/types';
import { api } from '@/shared/lib/axios';

export async function fetchRetention(): Promise<RetentionData> {
    const { data } = await api.get<RetentionData>('/retention');
    return data;
}
