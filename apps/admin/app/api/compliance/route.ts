import { NextResponse } from 'next/server';
import { getComplianceBundle } from '@/shared/api/compliance/server';
import { jsonOk } from '@/shared/lib/api-handler';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId')?.trim() ?? '';
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return NextResponse.json({ error: 'year/month invalid' }, { status: 400 });
    }

    return jsonOk(() => getComplianceBundle(userId, year, month));
}
