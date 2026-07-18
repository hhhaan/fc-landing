'use client';

import { Copy, Ticket } from 'lucide-react';
import { useState } from 'react';
import { useCoupons, useCreateCoupons, useDisableCoupon, useIssueCoupon } from '@/shared/api/coupons/queries';
import type {
    CouponDuration,
    CouponProductScope,
    CouponStatus,
    CouponType,
    PolarCoupon,
} from '@/shared/api/coupons/types';
import { clsx, fmtRel } from '@/shared/lib/format';
import { Badge, KpiCard, Panel } from '@/shared/ui/Panel';
import { QueryError, QueryLoading } from '@/shared/ui/QueryState';
import { TopBar } from '@/widgets/shell/TopBar';

function statusTone(s: CouponStatus): 'default' | 'good' | 'warn' | 'accent' {
    if (s === 'idle') return 'default';
    if (s === 'issued') return 'accent';
    if (s === 'redeemed') return 'good';
    return 'warn';
}

function discountLabel(c: PolarCoupon): string {
    if (c.type === 'percentage' && c.basis_points != null) {
        return `${(c.basis_points / 100).toFixed(c.basis_points % 100 === 0 ? 0 : 1)}%`;
    }
    if (c.type === 'fixed' && c.amount_cents != null) {
        return `$${(c.amount_cents / 100).toFixed(2)}`;
    }
    return '—';
}

function durationLabel(c: PolarCoupon): string {
    if (c.duration === 'repeating' && c.duration_in_months) {
        return `${c.duration_in_months}mo`;
    }
    return c.duration;
}

function scopeLabel(s: CouponProductScope | undefined): string {
    if (s === 'yearly') return 'yearly';
    if (s === 'all') return 'all';
    return 'monthly';
}

export default function CouponsPage() {
    const { data, isPending, isError, error } = useCoupons();
    const createMut = useCreateCoupons();
    const issueMut = useIssueCoupon();
    const disableMut = useDisableCoupon();

    const [count, setCount] = useState(5);
    const [name, setName] = useState('Welcome');
    const [type, setType] = useState<CouponType>('percentage');
    const [percent, setPercent] = useState(20);
    const [amountUsd, setAmountUsd] = useState(10);
    const [duration, setDuration] = useState<CouponDuration>('once');
    const [durationMonths, setDurationMonths] = useState(3);
    const [productScope, setProductScope] = useState<CouponProductScope>('monthly');
    const [note, setNote] = useState('');
    const [lastIssued, setLastIssued] = useState<PolarCoupon | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (isPending) return <QueryLoading label="Loading coupons" />;
    if (isError || !data) return <QueryError message={error?.message} />;

    const { coupons, counts } = data;

    async function onCreate(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null);
        try {
            await createMut.mutateAsync({
                count,
                name,
                type,
                basis_points: type === 'percentage' ? Math.round(percent * 100) : undefined,
                amount_cents: type === 'fixed' ? Math.round(amountUsd * 100) : undefined,
                duration,
                duration_in_months: duration === 'repeating' ? durationMonths : undefined,
                product_scope: productScope,
                note: note || undefined,
            });
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Create failed');
        }
    }

    async function onIssueNext() {
        setFormError(null);
        try {
            const c = await issueMut.mutateAsync({});
            setLastIssued(c);
            await navigator.clipboard.writeText(c.code).catch(() => undefined);
            setCopiedId(c.id);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Issue failed');
        }
    }

    async function onIssueOne(id: string) {
        setFormError(null);
        try {
            const c = await issueMut.mutateAsync({ id });
            setLastIssued(c);
            await navigator.clipboard.writeText(c.code).catch(() => undefined);
            setCopiedId(c.id);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Issue failed');
        }
    }

    async function onCopy(c: PolarCoupon) {
        await navigator.clipboard.writeText(c.code).catch(() => undefined);
        setCopiedId(c.id);
    }

    async function onDisable(id: string) {
        if (!confirm('Disable this coupon on Polar?')) return;
        setFormError(null);
        try {
            await disableMut.mutateAsync(id);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Disable failed');
        }
    }

    const inputCls =
        'w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 font-mono text-[12px] text-[var(--fg)] outline-none focus:border-[var(--accent)]/50';
    const labelCls = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]';

    return (
        <>
            <TopBar title="Coupons" subtitle="Polar single-use codes · idle pool → issue → redeem" />
            <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
                <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
                    <KpiCard label="Idle" value={counts.idle} tone="default" />
                    <KpiCard label="Issued" value={counts.issued} tone="accent" />
                    <KpiCard label="Redeemed" value={counts.redeemed} tone="good" />
                    <KpiCard label="Disabled" value={counts.disabled} tone="warn" />
                </div>

                {(formError || lastIssued) && (
                    <div className="shrink-0 space-y-1">
                        {formError && (
                            <div className="border border-[var(--bad)]/40 bg-[var(--bad)]/10 px-3 py-2 font-mono text-[12px] text-[var(--bad)]">
                                {formError}
                            </div>
                        )}
                        {lastIssued && (
                            <div className="flex items-center gap-3 border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 font-mono text-[12px] text-[var(--accent)]">
                                <Ticket size={14} strokeWidth={1.75} />
                                <span>
                                    Issued <strong className="tracking-wider">{lastIssued.code}</strong>
                                    {copiedId === lastIssued.id ? ' · copied' : ''}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[320px_1fr]">
                    <Panel title="Create batch" subtitle="1–50 single-use · Polar products scope">
                        <form onSubmit={onCreate} className="space-y-3">
                            <div>
                                <label className={labelCls} htmlFor="coupon-name">
                                    Name
                                </label>
                                <input
                                    id="coupon-name"
                                    className={inputCls}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelCls} htmlFor="coupon-scope">
                                    Product scope
                                </label>
                                <select
                                    id="coupon-scope"
                                    className={inputCls}
                                    value={productScope}
                                    onChange={(e) => setProductScope(e.target.value as CouponProductScope)}
                                >
                                    <option value="monthly">Monthly only (Pro / Pro+)</option>
                                    <option value="yearly">Yearly only (Pro / Pro+)</option>
                                    <option value="all">All products</option>
                                </select>
                                <p className="mt-1 font-mono text-[10px] leading-snug text-[var(--faint)]">
                                    {productScope === 'monthly' &&
                                        'Applies to monthly US·KR·JP only — yearly checkout rejects.'}
                                    {productScope === 'yearly' &&
                                        'Applies to yearly US·KR·JP only — monthly checkout rejects.'}
                                    {productScope === 'all' &&
                                        'No product filter — any Polar product can use the code.'}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className={labelCls} htmlFor="coupon-count">
                                        Count
                                    </label>
                                    <input
                                        id="coupon-count"
                                        type="number"
                                        min={1}
                                        max={50}
                                        className={inputCls}
                                        value={count}
                                        onChange={(e) => setCount(Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls} htmlFor="coupon-type">
                                        Type
                                    </label>
                                    <select
                                        id="coupon-type"
                                        className={inputCls}
                                        value={type}
                                        onChange={(e) => setType(e.target.value as CouponType)}
                                    >
                                        <option value="percentage">Percentage</option>
                                        <option value="fixed">Fixed USD</option>
                                    </select>
                                </div>
                            </div>
                            {type === 'percentage' ? (
                                <div>
                                    <label className={labelCls} htmlFor="coupon-pct">
                                        Percent
                                    </label>
                                    <input
                                        id="coupon-pct"
                                        type="number"
                                        min={0.01}
                                        max={100}
                                        step={0.01}
                                        className={inputCls}
                                        value={percent}
                                        onChange={(e) => setPercent(Number(e.target.value))}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className={labelCls} htmlFor="coupon-amt">
                                        Amount (USD)
                                    </label>
                                    <input
                                        id="coupon-amt"
                                        type="number"
                                        min={0.01}
                                        step={0.01}
                                        className={inputCls}
                                        value={amountUsd}
                                        onChange={(e) => setAmountUsd(Number(e.target.value))}
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className={labelCls} htmlFor="coupon-dur">
                                        Duration
                                    </label>
                                    <select
                                        id="coupon-dur"
                                        className={inputCls}
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value as CouponDuration)}
                                    >
                                        <option value="once">Once</option>
                                        <option value="forever">Forever</option>
                                        <option value="repeating">Repeating</option>
                                    </select>
                                </div>
                                {duration === 'repeating' && (
                                    <div>
                                        <label className={labelCls} htmlFor="coupon-months">
                                            Months
                                        </label>
                                        <input
                                            id="coupon-months"
                                            type="number"
                                            min={1}
                                            max={999}
                                            className={inputCls}
                                            value={durationMonths}
                                            onChange={(e) => setDurationMonths(Number(e.target.value))}
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className={labelCls} htmlFor="coupon-note">
                                    Note
                                </label>
                                <input
                                    id="coupon-note"
                                    className={inputCls}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="optional"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={createMut.isPending}
                                className="w-full border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)]/25 disabled:opacity-50"
                            >
                                {createMut.isPending ? 'Creating…' : `Create ${count} codes`}
                            </button>
                        </form>
                    </Panel>

                    <Panel
                        title="Pool"
                        subtitle="Issue next takes oldest idle"
                        className="flex min-h-0 flex-col"
                        bodyClassName="min-h-0 flex-1 overflow-auto"
                        action={
                            <button
                                type="button"
                                onClick={() => void onIssueNext()}
                                disabled={issueMut.isPending || counts.idle === 0}
                                className="border border-[var(--accent)]/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-40"
                            >
                                Issue next
                            </button>
                        }
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-[12px]">
                                <thead>
                                    <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                        <th className="pb-2 pr-3 font-medium">Code</th>
                                        <th className="pb-2 pr-3 font-medium">Status</th>
                                        <th className="pb-2 pr-3 font-medium">Name</th>
                                        <th className="pb-2 pr-3 font-medium">Discount</th>
                                        <th className="pb-2 pr-3 font-medium">Dur</th>
                                        <th className="pb-2 pr-3 font-medium">Scope</th>
                                        <th className="pb-2 pr-3 font-medium">Redeem</th>
                                        <th className="pb-2 pr-3 font-medium">Created</th>
                                        <th className="pb-2 pr-3 font-medium">Issued</th>
                                        <th className="pb-2 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={10}
                                                className="py-8 text-center font-mono text-[12px] text-[var(--faint)]"
                                            >
                                                No coupons yet — create a batch
                                            </td>
                                        </tr>
                                    )}
                                    {coupons.map((c) => (
                                        <tr
                                            key={c.id}
                                            className="border-b border-[var(--border)]/50 hover:bg-[var(--surface)]/40"
                                        >
                                            <td className="py-2 pr-3">
                                                <button
                                                    type="button"
                                                    onClick={() => void onCopy(c)}
                                                    className="inline-flex items-center gap-1 font-mono text-[12px] tracking-wide text-[var(--fg)] hover:text-[var(--accent)]"
                                                    title="Copy code"
                                                >
                                                    {c.code}
                                                    <Copy
                                                        size={11}
                                                        strokeWidth={1.75}
                                                        className="text-[var(--faint)]"
                                                    />
                                                </button>
                                                {copiedId === c.id && (
                                                    <span className="ml-1 text-[10px] text-[var(--accent)]">
                                                        copied
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3">
                                                <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                                            </td>
                                            <td className="py-2 pr-3">
                                                <div>{c.name}</div>
                                                {c.note && (
                                                    <div className="font-mono text-[10px] text-[var(--faint)]">
                                                        {c.note}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3 font-mono tabular-nums">{discountLabel(c)}</td>
                                            <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                                                {durationLabel(c)}
                                            </td>
                                            <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                                                {scopeLabel(c.product_scope)}
                                            </td>
                                            <td className="py-2 pr-3 font-mono tabular-nums text-[var(--muted)]">
                                                {c.redemptions_count}/{c.max_redemptions}
                                            </td>
                                            <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                                                {fmtRel(c.created_at)}
                                            </td>
                                            <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                                                {c.issued_at ? fmtRel(c.issued_at) : '—'}
                                            </td>
                                            <td className="py-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {c.status === 'idle' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void onIssueOne(c.id)}
                                                            disabled={issueMut.isPending}
                                                            className={clsx(
                                                                'border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]',
                                                            )}
                                                        >
                                                            Issue
                                                        </button>
                                                    )}
                                                    {(c.status === 'idle' || c.status === 'issued') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void onDisable(c.id)}
                                                            disabled={disableMut.isPending}
                                                            className="border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--muted)] hover:border-[var(--bad)]/40 hover:text-[var(--bad)]"
                                                        >
                                                            Disable
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                </div>
            </main>
        </>
    );
}
