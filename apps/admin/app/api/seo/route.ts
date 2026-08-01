import { getSeoData } from '@/shared/api/seo/server';
import { jsonOk } from '@/shared/lib/api-handler';

export async function GET() {
    return jsonOk(() => getSeoData());
}
