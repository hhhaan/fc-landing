import { NextResponse } from 'next/server';
import { getComplianceBundle } from '@/shared/api/compliance/server';
import { jsonOk } from '@/shared/lib/api-handler';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId')?.trim() ?? '';
    const from = searchParams.get('from')?.trim() ?? '';
    const to = searchParams.get('to')?.trim() ?? '';

    // Back-compat: year+month → calendar month range
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    let fromDate = from;
    let toDate = to;
    if ((!fromDate || !toDate) && Number.isFinite(year) && month >= 1 && month <= 12) {
        fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (!DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) {
        return NextResponse.json({ error: 'from/to required as YYYY-MM-DD' }, { status: 400 });
    }
    if (fromDate > toDate) {
        return NextResponse.json({ error: 'from must be ≤ to' }, { status: 400 });
    }

    return jsonOk(() => getComplianceBundle(userId, fromDate, toDate));
}
