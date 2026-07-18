'use client';

import { useRetention } from '@/shared/api/retention/queries';
import type { IdleUser } from '@/shared/api/retention/types';
import { clsx, fmtDate, fmtNum, fmtPct, fmtRel } from '@/shared/lib/format';
import { Badge, KpiCard, Panel } from '@/shared/ui/Panel';
import { QueryError, QueryLoading } from '@/shared/ui/QueryState';
import { TopBar } from '@/widgets/shell/TopBar';

function userLabel(u: Pick<IdleUser, 'displayName' | 'email' | 'userId'>) {
    return u.displayName || u.email || u.userId.slice(0, 8);
}

function intervalLabel(iv: string) {
    if (iv === 'month') return 'Monthly';
    if (iv === 'year') return 'Yearly';
    return iv;
}

export default function RetentionPage() {
    const { data, isPending, isError, error } = useRetention();

    if (isPending) return <QueryLoading label="Loading retention" />;
    if (isError || !data) return <QueryError message={error?.message} />;

    const { kpis } = data;

    return (
        <>
            <TopBar
                title="Retention"
                subtitle="Paid idle · interval churn · cohorts · reactivation"
                refreshedAt={data.generatedAt}
            />
            <main className="flex-1 space-y-3 overflow-auto p-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                    <KpiCard
                        label="Paid billable"
                        value={fmtNum(kpis.paidBillable)}
                        hint="active / past_due"
                        tone="good"
                    />
                    <KpiCard
                        label="Paid idle 30d"
                        value={fmtNum(kpis.paidIdle30d)}
                        hint={
                            kpis.paidIdleRate != null
                                ? `${fmtPct(kpis.paidIdleRate)} of billable`
                                : 'no product activity'
                        }
                        tone={kpis.paidIdle30d > 0 ? 'warn' : 'default'}
                    />
                    <KpiCard
                        label="Canceling"
                        value={fmtNum(kpis.canceling)}
                        hint="cancel at period end"
                        tone={kpis.canceling > 0 ? 'warn' : 'default'}
                    />
                    <KpiCard
                        label="Monthly churn"
                        value={kpis.monthlyChurnRate != null ? fmtPct(kpis.monthlyChurnRate) : '—'}
                        hint="canceled / (billable+canceled)"
                    />
                    <KpiCard
                        label="Yearly churn"
                        value={kpis.yearlyChurnRate != null ? fmtPct(kpis.yearlyChurnRate) : '—'}
                        hint="may mask delayed churn"
                    />
                    <KpiCard
                        label="Reactivated"
                        value={fmtNum(kpis.reactivated)}
                        hint="canceled → billable again"
                        tone={kpis.reactivated > 0 ? 'good' : 'default'}
                    />
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <Panel
                        title="Interval health"
                        subtitle="Churn by billing interval — yearly can look sticky while product-idle"
                    >
                        {data.intervalHealth.length === 0 ? (
                            <p className="font-mono text-[12px] text-[var(--faint)]">No subscription rows yet.</p>
                        ) : (
                            <table className="w-full text-left text-[12px]">
                                <thead>
                                    <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                        <th className="pb-2 pr-3 font-medium">Interval</th>
                                        <th className="pb-2 pr-3 font-medium">Billable</th>
                                        <th className="pb-2 pr-3 font-medium">Canceling</th>
                                        <th className="pb-2 pr-3 font-medium">Canceled</th>
                                        <th className="pb-2 pr-3 font-medium">Churn</th>
                                        <th className="pb-2 font-medium">Idle 30d</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.intervalHealth.map((h) => (
                                        <tr key={h.interval} className="border-b border-[var(--border)]/50">
                                            <td className="py-2 pr-3">
                                                <Badge tone={h.interval === 'month' ? 'accent' : 'default'}>
                                                    {intervalLabel(h.interval)}
                                                </Badge>
                                            </td>
                                            <td className="py-2 pr-3 font-mono tabular-nums">{fmtNum(h.billable)}</td>
                                            <td className="py-2 pr-3 font-mono tabular-nums text-[var(--warn)]">
                                                {fmtNum(h.canceling)}
                                                {h.cancelingRate != null && (
                                                    <span className="ml-1 text-[10px] text-[var(--faint)]">
                                                        {fmtPct(h.cancelingRate)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3 font-mono tabular-nums">{fmtNum(h.canceled)}</td>
                                            <td className="py-2 pr-3 font-mono tabular-nums">
                                                {h.churnRate != null ? fmtPct(h.churnRate) : '—'}
                                            </td>
                                            <td
                                                className={clsx(
                                                    'py-2 font-mono tabular-nums',
                                                    h.idle30d > 0 ? 'text-[var(--warn)]' : 'text-[var(--muted)]',
                                                )}
                                            >
                                                {fmtNum(h.idle30d)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Panel>

                    <Panel
                        title="Signup cohorts · product"
                        subtitle="M0–M3 = roast activity that calendar month (not login)"
                    >
                        {data.cohorts.length === 0 ? (
                            <p className="font-mono text-[12px] text-[var(--faint)]">No signup cohorts in window.</p>
                        ) : (
                            <table className="w-full text-left text-[12px]">
                                <thead>
                                    <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                        <th className="pb-2 pr-3 font-medium">Cohort</th>
                                        <th className="pb-2 pr-3 font-medium">Size</th>
                                        <th className="pb-2 pr-3 font-medium">M0</th>
                                        <th className="pb-2 pr-3 font-medium">M1</th>
                                        <th className="pb-2 pr-3 font-medium">M2</th>
                                        <th className="pb-2 font-medium">M3</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.cohorts.map((c) => (
                                        <tr key={c.month} className="border-b border-[var(--border)]/50">
                                            <td className="py-2 pr-3 font-mono">{c.month}</td>
                                            <td className="py-2 pr-3 font-mono tabular-nums">{fmtNum(c.size)}</td>
                                            {(
                                                [
                                                    [c.m0, c.m0Count],
                                                    [c.m1, c.m1Count],
                                                    [c.m2, c.m2Count],
                                                    [c.m3, c.m3Count],
                                                ] as const
                                            ).map(([rate, count], i) => (
                                                <td
                                                    key={i}
                                                    className={clsx(
                                                        'py-2 font-mono tabular-nums',
                                                        i < 3 ? 'pr-3' : '',
                                                        rate != null && rate >= 40
                                                            ? 'text-[var(--good)]'
                                                            : rate != null && rate < 15
                                                              ? 'text-[var(--warn)]'
                                                              : '',
                                                    )}
                                                >
                                                    {rate != null ? (
                                                        <>
                                                            {fmtPct(rate)}
                                                            <span className="ml-1 text-[10px] text-[var(--faint)]">
                                                                {count}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Panel>
                </div>

                <Panel
                    title="Paid & idle · delayed churn candidates"
                    subtitle="Billable subscription + no roast/machine in 30d — yearly plans can hide this"
                    className="min-h-0"
                    bodyClassName="overflow-x-auto"
                >
                    {data.paidIdle.length === 0 ? (
                        <p className="font-mono text-[12px] text-[var(--faint)]">
                            No idle paying users in the last 30 days.
                        </p>
                    ) : (
                        <table className="w-full min-w-[900px] text-left text-[12px]">
                            <thead>
                                <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                    <th className="pb-2 pr-3 font-medium">User</th>
                                    <th className="pb-2 pr-3 font-medium">Plan</th>
                                    <th className="pb-2 pr-3 font-medium">Interval</th>
                                    <th className="pb-2 pr-3 font-medium">Status</th>
                                    <th className="pb-2 pr-3 font-medium">Last product</th>
                                    <th className="pb-2 pr-3 font-medium">Last sign-in</th>
                                    <th className="pb-2 font-medium">Period end</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.paidIdle.map((u) => (
                                    <tr
                                        key={u.userId}
                                        className="border-b border-[var(--border)]/50 hover:bg-[var(--surface)]/40"
                                    >
                                        <td className="py-2.5 pr-3">
                                            <div className="font-medium">{userLabel(u)}</div>
                                            <div className="font-mono text-[10px] text-[var(--faint)]">
                                                {u.email || u.userId.slice(0, 8)}
                                            </div>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <Badge tone="good">{u.plan}</Badge>
                                        </td>
                                        <td className="py-2.5 pr-3 font-mono text-[var(--muted)]">
                                            {intervalLabel(u.interval)}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <Badge tone={u.cancelAtPeriodEnd ? 'warn' : 'default'}>
                                                {u.cancelAtPeriodEnd ? 'canceling' : u.status}
                                            </Badge>
                                        </td>
                                        <td className="py-2.5 pr-3 text-[var(--warn)]">
                                            {u.lastProductAt ? fmtRel(u.lastProductAt) : 'never'}
                                            {u.daysSinceProduct != null && (
                                                <span className="ml-1 font-mono text-[10px] text-[var(--faint)]">
                                                    {u.daysSinceProduct}d
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-3 text-[var(--muted)]">
                                            {u.lastSignInAt ? fmtRel(u.lastSignInAt) : '—'}
                                        </td>
                                        <td className="py-2.5 font-mono text-[11px] text-[var(--muted)]">
                                            {fmtDate(u.periodEnd)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Panel>

                <Panel
                    title="Reactivations"
                    subtitle="Canceled then later billable again"
                    bodyClassName="overflow-x-auto"
                >
                    {data.reactivations.length === 0 ? (
                        <p className="font-mono text-[12px] text-[var(--faint)]">
                            No reactivations detected from subscription history.
                        </p>
                    ) : (
                        <table className="w-full min-w-[720px] text-left text-[12px]">
                            <thead>
                                <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                    <th className="pb-2 pr-3 font-medium">User</th>
                                    <th className="pb-2 pr-3 font-medium">Canceled</th>
                                    <th className="pb-2 pr-3 font-medium">Back</th>
                                    <th className="pb-2 pr-3 font-medium">Days away</th>
                                    <th className="pb-2 font-medium">Interval now</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.reactivations.map((r) => (
                                    <tr
                                        key={`${r.userId}-${r.reactivatedAt}`}
                                        className="border-b border-[var(--border)]/50"
                                    >
                                        <td className="py-2.5 pr-3">
                                            <div className="font-medium">
                                                {r.displayName || r.email || r.userId.slice(0, 8)}
                                            </div>
                                            <div className="font-mono text-[10px] text-[var(--faint)]">
                                                {r.email || '—'}
                                            </div>
                                        </td>
                                        <td className="py-2.5 pr-3 font-mono text-[11px] text-[var(--muted)]">
                                            {fmtDate(r.canceledAt)}
                                        </td>
                                        <td className="py-2.5 pr-3 font-mono text-[11px] text-[var(--good)]">
                                            {fmtDate(r.reactivatedAt)}
                                        </td>
                                        <td className="py-2.5 pr-3 font-mono tabular-nums">{fmtNum(r.daysAway)}</td>
                                        <td className="py-2.5 font-mono text-[var(--muted)]">
                                            {intervalLabel(r.interval)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Panel>
            </main>
        </>
    );
}
