import type { ComplianceBundle } from '@/shared/api/compliance/types';
import { api } from '@/shared/lib/axios';

export async function fetchComplianceBundle(userId: string, year: number, month: number): Promise<ComplianceBundle> {
    const { data } = await api.get<ComplianceBundle>('/compliance', {
        params: { userId, year, month },
    });
    return data;
}
