import { getRetentionData } from '@/shared/api/retention/server';
import { jsonOk } from '@/shared/lib/api-handler';

export async function GET() {
    return jsonOk(() => getRetentionData());
}
