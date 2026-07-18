import type { ComplianceBundle } from '@/shared/api/compliance/types';
import { api } from '@/shared/lib/axios';

export async function fetchComplianceBundle(userId: string, from: string, to: string): Promise<ComplianceBundle> {
    const { data } = await api.get<ComplianceBundle>('/compliance', {
        params: { userId, from, to },
    });
    return data;
}
