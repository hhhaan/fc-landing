import { getOrganizations } from '@/shared/api/organizations/server';
import { jsonOk } from '@/shared/lib/api-handler';

export async function GET() {
    return jsonOk(() => getOrganizations());
}
