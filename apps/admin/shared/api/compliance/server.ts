import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/shared/lib/supabase/admin';
import type { ComplianceBundle, MaterialLedgerRow, ProductionLogRow, TransactionRow } from './types';

/** Admin generated types lag desktop schema (orders, output_weight_grams). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = SupabaseClient<any>;

const DEFAULT_SHRINK = 0.82;
const SHRINK_BY_LEVEL: Record<string, number> = {
    Light: 0.88,
    'Medium-Light': 0.865,
    Medium: 0.85,
    'Medium-Dark': 0.835,
    Dark: 0.82,
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const gToKg = (g: number) => round3(g / 1000);

function periodBounds(year: number, month: number): { from: string; to: string; fromIso: string; toIso: string } {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return {
        from,
        to,
        fromIso: `${from}T00:00:00.000Z`,
        toIso: `${to}T23:59:59.999Z`,
    };
}

function roastWeights(
    greenGrams: number | null | undefined,
    outputGrams: number | null | undefined,
    roastLevel: string | null | undefined,
) {
    const inputKg = (greenGrams ?? 0) / 1000;
    const measured = outputGrams != null && outputGrams > 0;
    const factor = SHRINK_BY_LEVEL[roastLevel ?? ''] ?? DEFAULT_SHRINK;
    const outputKg = measured ? outputGrams / 1000 : inputKg * factor;
    const lossKg = inputKg - outputKg;
    const lossRate = inputKg > 0 ? (lossKg / inputKg) * 100 : 0;
    return {
        inputKg: round3(inputKg),
        outputKg: round3(outputKg),
        lossKg: round3(lossKg),
        lossRate: Math.round(lossRate * 10) / 10,
        measured,
    };
}

type StockEvent = {
    id: string;
    bean_id: string;
    delta_grams: number;
    event_type: string;
    note: string | null;
    created_at: string;
};

type BeanRow = {
    id: string;
    name: string;
    origin: string | null;
    vendor: string | null;
    cost_per_kg: number | null;
};

function buildMaterialLedger(
    beans: BeanRow[],
    events: StockEvent[],
    fromIso: string,
    toIso: string,
): MaterialLedgerRow[] {
    const beanById = new Map(beans.map((b) => [b.id, b]));
    const byBean = new Map<string, StockEvent[]>();
    for (const e of events) {
        const list = byBean.get(e.bean_id) ?? [];
        list.push(e);
        byBean.set(e.bean_id, list);
    }

    const rows: MaterialLedgerRow[] = [];

    for (const [beanId, list] of byBean) {
        const bean = beanById.get(beanId);
        if (!bean) continue;
        const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
        let balanceG = 0;

        for (const e of sorted) {
            if (e.created_at < fromIso) {
                balanceG += e.delta_grams;
                continue;
            }
            if (e.created_at > toIso) continue;

            const openingG = balanceG;
            balanceG += e.delta_grams;
            const inG = e.delta_grams > 0 ? e.delta_grams : 0;
            const outG = e.delta_grams < 0 ? -e.delta_grams : 0;

            rows.push({
                date: e.created_at.slice(0, 10),
                beanName: bean.name,
                origin: bean.origin,
                openingKg: gToKg(openingG),
                inKg: gToKg(inG),
                outKg: gToKg(outG),
                closingKg: gToKg(balanceG),
                eventType: e.event_type,
                note: e.note,
            });
        }
    }

    return rows.sort((a, b) => a.date.localeCompare(b.date) || a.beanName.localeCompare(b.beanName));
}

function buildProductionLog(
    sessions: {
        roasted_at: string | null;
        weight_grams: number;
        output_weight_grams?: number | null;
        roast_level: string | null;
        notes: string | null;
        beans: { name: string } | null;
        roast_profiles: { name: string } | null;
    }[],
): ProductionLogRow[] {
    return sessions
        .map((s) => {
            const w = roastWeights(s.weight_grams, s.output_weight_grams, s.roast_level);
            return {
                date: s.roasted_at ? s.roasted_at.slice(0, 10) : '',
                beanLot: s.beans?.name ?? '—',
                inputKg: w.inputKg,
                outputKg: w.outputKg,
                lossKg: w.lossKg,
                lossRate: w.lossRate,
                measured: w.measured,
                profile: s.roast_profiles?.name ?? '—',
                roastLevel: s.roast_level ?? '—',
                note: s.notes,
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
}

function buildTransactions(
    beans: BeanRow[],
    events: StockEvent[],
    fromIso: string,
    toIso: string,
    orders: {
        ordered_at: string;
        buyer_name: string | null;
        platform: string;
        platform_order_id: string;
        total_amount: number | null;
        currency: string | null;
        status: string;
    }[],
): TransactionRow[] {
    const beanById = new Map(beans.map((b) => [b.id, b]));
    const rows: TransactionRow[] = [];

    for (const e of events) {
        if (e.created_at < fromIso || e.created_at > toIso) continue;
        const bean = beanById.get(e.bean_id);
        if (!bean) continue;

        const isPurchase = e.event_type === 'purchase' || (e.event_type === 'adjustment' && e.delta_grams > 0);
        if (!isPurchase && e.event_type !== 'write_off') continue;

        const qtyKg = gToKg(Math.abs(e.delta_grams));
        const unit = bean.cost_per_kg;
        const amount = unit != null ? Math.round(unit * qtyKg) : null;

        rows.push({
            date: e.created_at.slice(0, 10),
            kind: isPurchase ? 'purchase' : 'other',
            kindLabel: isPurchase ? '원료매입' : '원료폐기/조정',
            counterparty: bean.vendor ?? '—',
            item: bean.name,
            qtyKg,
            unitPrice: unit,
            amount,
            currency: 'KRW',
            note: e.note ?? e.event_type,
        });
    }

    for (const o of orders) {
        rows.push({
            date: o.ordered_at.slice(0, 10),
            kind: 'sale',
            kindLabel: '판매',
            counterparty: o.buyer_name ?? '—',
            item: `${o.platform} #${o.platform_order_id}`,
            qtyKg: null,
            unitPrice: null,
            amount: o.total_amount,
            currency: o.currency,
            note: o.status,
        });
    }

    return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getComplianceBundle(userId: string, year: number, month: number): Promise<ComplianceBundle> {
    if (!userId) throw new Error('userId required');
    if (!Number.isFinite(year) || month < 1 || month > 12) throw new Error('invalid period');

    const sb = getAdminClient();
    const loose = sb as LooseClient;
    const { from, to, fromIso, toIso } = periodBounds(year, month);

    const [profileRes, beansRes, eventsRes, sessionsRes, ordersRes, emailRes] = await Promise.all([
        sb
            .from('profiles')
            .select('id, business_name, display_name, business_registration_number')
            .eq('id', userId)
            .maybeSingle(),
        sb.from('beans').select('id, name, origin, vendor, cost_per_kg').eq('user_id', userId),
        sb
            .from('bean_stock_events')
            .select('id, bean_id, delta_grams, event_type, note, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(10000),
        // Explicit profile FK — two relationships exist (profile_id vs source_session_id).
        // output_weight_grams may be absent until that desktop migration is applied.
        loose
            .from('roast_sessions')
            .select(
                'roasted_at, weight_grams, roast_level, notes, status, beans(name), roast_profiles!roast_sessions_profile_id_fkey(name)',
            )
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('roasted_at', fromIso)
            .lte('roasted_at', toIso)
            .order('roasted_at', { ascending: true })
            .limit(5000),
        loose
            .from('orders')
            .select('ordered_at, buyer_name, platform, platform_order_id, total_amount, currency, status')
            .eq('user_id', userId)
            .gte('ordered_at', fromIso)
            .lte('ordered_at', toIso)
            .order('ordered_at', { ascending: true })
            .limit(5000),
        sb.rpc('admin_user_roster'),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (beansRes.error) throw beansRes.error;
    if (eventsRes.error) throw eventsRes.error;
    if (sessionsRes.error) throw sessionsRes.error;

    type SessionRow = {
        roasted_at: string | null;
        weight_grams: number;
        output_weight_grams?: number | null;
        roast_level: string | null;
        notes: string | null;
        beans: { name: string } | null;
        roast_profiles: { name: string } | null;
    };

    const sessions = (sessionsRes.data ?? []) as unknown as SessionRow[];

    const orders =
        ordersRes.error || !ordersRes.data
            ? []
            : (ordersRes.data as {
                  ordered_at: string;
                  buyer_name: string | null;
                  platform: string;
                  platform_order_id: string;
                  total_amount: number | null;
                  currency: string | null;
                  status: string;
              }[]);

    const roster = (emailRes.data as { id: string; email: string | null }[] | null) ?? [];
    const email = roster.find((u) => u.id === userId)?.email ?? null;

    const beans = (beansRes.data ?? []) as BeanRow[];
    const events = (eventsRes.data ?? []) as StockEvent[];

    const materialLedger = buildMaterialLedger(beans, events, fromIso, toIso);
    const productionLog = buildProductionLog(sessions);
    const transactions = buildTransactions(beans, events, fromIso, toIso, orders);

    const materialInKg = round3(materialLedger.reduce((s, r) => s + r.inKg, 0));
    const materialOutKg = round3(materialLedger.reduce((s, r) => s + r.outKg, 0));
    const productionInputKg = round3(productionLog.reduce((s, r) => s + r.inputKg, 0));
    const productionOutputKg = round3(productionLog.reduce((s, r) => s + r.outputKg, 0));
    const purchaseAmount = transactions
        .filter((t) => t.kind === 'purchase' && t.amount != null)
        .reduce((s, t) => s + (t.amount ?? 0), 0);
    const saleAmount = transactions
        .filter((t) => t.kind === 'sale' && t.amount != null)
        .reduce((s, t) => s + (t.amount ?? 0), 0);

    const p = profileRes.data;

    return {
        subject: {
            userId,
            email,
            businessName: (p?.business_name as string | null) ?? null,
            displayName: (p?.display_name as string | null) ?? null,
            bizRegNo: (p?.business_registration_number as string | null) ?? null,
        },
        period: { year, month, from, to },
        materialLedger,
        productionLog,
        transactions,
        totals: {
            materialInKg,
            materialOutKg,
            productionInputKg,
            productionOutputKg,
            purchaseAmount,
            saleAmount,
        },
    };
}
