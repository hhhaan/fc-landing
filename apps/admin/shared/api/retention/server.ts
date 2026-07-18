import 'server-only';
import type { IdleUser, IntervalHealth, Reactivation, RetentionData, SignupCohort } from './types';

export type { RetentionData };

import { BILLABLE_STATUSES, catalogByProductId } from '@/shared/lib/pricing';
import { getAdminClient } from '@/shared/lib/supabase/admin';

const DAY_MS = 864e5;
const IDLE_DAYS = 30;
const COHORT_MONTHS = 8;
const ROAST_LIMIT = 20000;
const MACHINE_LIMIT = 10000;

const CANCELED = new Set(['canceled', 'cancelled', 'revoked']);

function normInterval(raw: string | null | undefined, productId: string | null | undefined): string {
    const s = (raw ?? '').toLowerCase();
    if (s === 'month' || s === 'monthly' || s === 'monthy') return 'month';
    if (s === 'year' || s === 'yearly' || s === 'annual' || s === 'annually') return 'year';
    const cat = catalogByProductId(productId);
    if (cat?.interval === 'month') return 'month';
    if (cat?.interval === 'year') return 'year';
    return s || 'unknown';
}

function monthKey(iso: string): string {
    return iso.slice(0, 7);
}

function addMonths(ym: string, n: number): string {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthsBetween(fromYm: string, toYm: string): number {
    const [y1, m1] = fromYm.split('-').map(Number);
    const [y2, m2] = toYm.split('-').map(Number);
    return (y2 - y1) * 12 + (m2 - m1);
}

function pct(num: number, den: number): number | null {
    if (den <= 0) return null;
    return Math.round((num / den) * 1000) / 10;
}

export async function getRetentionData(): Promise<RetentionData> {
    const sb = getAdminClient();
    const now = Date.now();
    const sinceIdle = new Date(now - IDLE_DAYS * DAY_MS).toISOString();
    const sinceCohort = new Date(now - (COHORT_MONTHS + 1) * 31 * DAY_MS).toISOString();
    const currentYm = monthKey(new Date(now).toISOString());

    const [subsRes, rosterRes, roastsRes, machinesRes] = await Promise.all([
        sb
            .from('subscriptions')
            .select(
                'id, user_id, status, polar_product_id, recurring_interval, current_period_end, cancel_at_period_end, canceled_at, started_at, created_at',
            )
            .order('created_at', { ascending: false })
            .limit(2000),
        sb.rpc('admin_user_roster'),
        sb
            .from('roast_sessions')
            .select('user_id, created_at, roasted_at')
            .gte('created_at', sinceCohort)
            .order('created_at', { ascending: false })
            .limit(ROAST_LIMIT),
        sb
            .from('machine_connection_logs')
            .select('user_id, created_at')
            .gte('created_at', sinceIdle)
            .order('created_at', { ascending: false })
            .limit(MACHINE_LIMIT),
    ]);

    if (subsRes.error) throw subsRes.error;
    if (rosterRes.error) throw rosterRes.error;
    if (roastsRes.error) throw roastsRes.error;
    if (machinesRes.error) throw machinesRes.error;

    const roster = rosterRes.data ?? [];
    const identity = new Map(
        roster.map((u) => [
            u.id,
            {
                email: u.email ?? null,
                displayName: u.display_name ?? null,
                plan: u.plan ?? 'unknown',
                lastSignInAt: u.last_sign_in_at ?? null,
                createdAt: u.created_at,
            },
        ]),
    );

    /** Latest product event (roast or machine) per user */
    const lastProduct = new Map<string, string>();
    /** Roast activity months per user (for cohorts) */
    const roastMonths = new Map<string, Set<string>>();

    for (const r of roastsRes.data ?? []) {
        const at = r.roasted_at ?? r.created_at;
        if (!at || !r.user_id) continue;
        const prev = lastProduct.get(r.user_id);
        if (!prev || at > prev) lastProduct.set(r.user_id, at);
        const set = roastMonths.get(r.user_id) ?? new Set();
        set.add(monthKey(at));
        roastMonths.set(r.user_id, set);
    }
    for (const m of machinesRes.data ?? []) {
        if (!m.created_at || !m.user_id) continue;
        const prev = lastProduct.get(m.user_id);
        if (!prev || m.created_at > prev) lastProduct.set(m.user_id, m.created_at);
    }

    type SubLite = {
        id: string;
        user_id: string;
        status: string;
        interval: string;
        cancel_at_period_end: boolean;
        canceled_at: string | null;
        started_at: string | null;
        created_at: string;
        period_end: string | null;
    };

    const subs: SubLite[] = (subsRes.data ?? []).map((s) => ({
        id: s.id,
        user_id: s.user_id,
        status: (s.status ?? 'unknown').toLowerCase(),
        interval: normInterval(s.recurring_interval, s.polar_product_id),
        cancel_at_period_end: Boolean(s.cancel_at_period_end),
        canceled_at: s.canceled_at,
        started_at: s.started_at ?? s.created_at,
        created_at: s.created_at,
        period_end: s.current_period_end,
    }));

    // Prefer one "current" billable sub per user (latest started)
    const billableByUser = new Map<string, SubLite>();
    for (const s of subs) {
        if (!BILLABLE_STATUSES.has(s.status)) continue;
        const prev = billableByUser.get(s.user_id);
        if (!prev || (s.started_at ?? '') > (prev.started_at ?? '')) {
            billableByUser.set(s.user_id, s);
        }
    }

    // ── Interval health ──
    const intervalMap = new Map<string, { billable: number; canceling: number; canceled: number; idle30d: number }>();
    const touch = (iv: string) => {
        let row = intervalMap.get(iv);
        if (!row) {
            row = { billable: 0, canceling: 0, canceled: 0, idle30d: 0 };
            intervalMap.set(iv, row);
        }
        return row;
    };

    // Canceled = not currently billable (unique users per interval)
    const canceledUsersByInterval = new Map<string, Set<string>>();

    for (const s of billableByUser.values()) {
        const row = touch(s.interval);
        row.billable += 1;
        if (s.cancel_at_period_end) row.canceling += 1;

        const lastAt = lastProduct.get(s.user_id) ?? null;
        if (!lastAt || lastAt < sinceIdle) row.idle30d += 1;
    }

    for (const s of subs) {
        if (!CANCELED.has(s.status)) continue;
        // Skip if user currently has billable sub (reactivated or multi-sub noise)
        if (billableByUser.has(s.user_id)) continue;
        const set = canceledUsersByInterval.get(s.interval) ?? new Set();
        set.add(s.user_id);
        canceledUsersByInterval.set(s.interval, set);
    }

    for (const [iv, users] of canceledUsersByInterval) {
        const row = touch(iv);
        row.canceled = users.size;
    }

    const intervalHealth: IntervalHealth[] = [...intervalMap.entries()]
        .map(([interval, v]) => {
            const total = v.billable + v.canceled;
            return {
                interval,
                billable: v.billable,
                canceling: v.canceling,
                canceled: v.canceled,
                total,
                churnRate: pct(v.canceled, total),
                cancelingRate: pct(v.canceling, v.billable),
                idle30d: v.idle30d,
            };
        })
        .sort((a, b) => b.total - a.total);

    // ── Paid idle list ──
    const paidIdle: IdleUser[] = [];
    for (const s of billableByUser.values()) {
        const lastAt = lastProduct.get(s.user_id) ?? null;
        if (lastAt && lastAt >= sinceIdle) continue;
        const who = identity.get(s.user_id);
        const daysSinceProduct = lastAt ? Math.floor((now - new Date(lastAt).getTime()) / DAY_MS) : null;
        paidIdle.push({
            userId: s.user_id,
            email: who?.email ?? null,
            displayName: who?.displayName ?? null,
            plan: who?.plan ?? 'unknown',
            interval: s.interval,
            status: s.status,
            startedAt: s.started_at,
            periodEnd: s.period_end,
            lastProductAt: lastAt,
            lastSignInAt: who?.lastSignInAt ?? null,
            daysSinceProduct,
            cancelAtPeriodEnd: s.cancel_at_period_end,
        });
    }
    paidIdle.sort((a, b) => {
        const da = a.daysSinceProduct ?? 99999;
        const db = b.daysSinceProduct ?? 99999;
        return db - da;
    });

    // ── Signup product cohorts ──
    const cohortBuckets = new Map<string, string[]>(); // month → userIds
    for (const u of roster) {
        if (!u.created_at) continue;
        const m = monthKey(u.created_at);
        const age = monthsBetween(m, currentYm);
        if (age < 0 || age > COHORT_MONTHS) continue;
        const list = cohortBuckets.get(m) ?? [];
        list.push(u.id);
        cohortBuckets.set(m, list);
    }

    const cohorts: SignupCohort[] = [...cohortBuckets.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, userIds]) => {
            const age = monthsBetween(month, currentYm);
            const size = userIds.length;
            const countIn = (offset: number) => {
                const target = addMonths(month, offset);
                let n = 0;
                for (const id of userIds) {
                    if (roastMonths.get(id)?.has(target)) n += 1;
                }
                return n;
            };
            const m0Count = countIn(0);
            const m1Count = age >= 1 ? countIn(1) : 0;
            const m2Count = age >= 2 ? countIn(2) : 0;
            const m3Count = age >= 3 ? countIn(3) : 0;
            return {
                month,
                size,
                m0Count,
                m1Count,
                m2Count,
                m3Count,
                m0: pct(m0Count, size),
                m1: age >= 1 ? pct(m1Count, size) : null,
                m2: age >= 2 ? pct(m2Count, size) : null,
                m3: age >= 3 ? pct(m3Count, size) : null,
            };
        });

    // ── Reactivations: canceled sub then later billable sub ──
    const byUser = new Map<string, SubLite[]>();
    for (const s of subs) {
        const list = byUser.get(s.user_id) ?? [];
        list.push(s);
        byUser.set(s.user_id, list);
    }

    const reactivations: Reactivation[] = [];
    for (const [userId, list] of byUser) {
        const canceled = list
            .filter((s) => CANCELED.has(s.status) && s.canceled_at)
            .sort((a, b) => ((a.canceled_at ?? '') > (b.canceled_at ?? '') ? 1 : -1));
        const laterBillable = list
            .filter((s) => BILLABLE_STATUSES.has(s.status))
            .sort((a, b) => ((a.started_at ?? '') > (b.started_at ?? '') ? 1 : -1));

        for (const c of canceled) {
            const restart = laterBillable.find((b) => (b.started_at ?? b.created_at) > (c.canceled_at ?? c.created_at));
            if (!restart) continue;
            const canceledAt = c.canceled_at;
            if (!canceledAt) continue;
            const reactivatedAt = restart.started_at ?? restart.created_at;
            const daysAway = Math.max(
                0,
                Math.floor((new Date(reactivatedAt).getTime() - new Date(canceledAt).getTime()) / DAY_MS),
            );
            const who = identity.get(userId);
            reactivations.push({
                userId,
                email: who?.email ?? null,
                displayName: who?.displayName ?? null,
                canceledAt,
                reactivatedAt,
                daysAway,
                interval: restart.interval,
            });
            break; // one row per user
        }
    }
    reactivations.sort((a, b) => b.reactivatedAt.localeCompare(a.reactivatedAt));

    const paidBillable = billableByUser.size;
    const paidIdle30d = paidIdle.length;
    const canceling = [...billableByUser.values()].filter((s) => s.cancel_at_period_end).length;

    const monthHealth = intervalHealth.find((h) => h.interval === 'month');
    const yearHealth = intervalHealth.find((h) => h.interval === 'year');

    return {
        kpis: {
            paidBillable,
            paidIdle30d,
            paidIdleRate: pct(paidIdle30d, paidBillable),
            canceling,
            reactivated: reactivations.length,
            monthlyChurnRate: monthHealth?.churnRate ?? null,
            yearlyChurnRate: yearHealth?.churnRate ?? null,
        },
        intervalHealth,
        paidIdle,
        cohorts,
        reactivations,
        generatedAt: new Date().toISOString(),
    };
}
