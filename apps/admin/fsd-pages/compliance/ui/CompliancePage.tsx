'use client';

import { Download, FileSpreadsheet, Printer, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { complianceFilename, complianceToCsv, downloadText } from '@/shared/api/compliance/csv';
import { useComplianceBundle } from '@/shared/api/compliance/queries';
import type { ComplianceDocKind } from '@/shared/api/compliance/types';
import { useUsers } from '@/shared/api/users/queries';
import { clsx } from '@/shared/lib/format';
import { KpiCard, Panel } from '@/shared/ui/Panel';
import { QueryError, QueryLoading } from '@/shared/ui/QueryState';
import { ComplianceDocView } from '@/widgets/compliance/ComplianceDocs';
import { TopBar } from '@/widgets/shell/TopBar';

const DOC_TABS: { id: ComplianceDocKind; label: string }[] = [
    { id: 'material', label: '원료수불부' },
    { id: 'production', label: '생산작업일지' },
    { id: 'transaction', label: '거래기록서' },
];

function currentYm(): { year: number; month: number } {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function CompliancePage() {
    const now = currentYm();
    const [userQuery, setUserQuery] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [year, setYear] = useState(now.year);
    const [month, setMonth] = useState(now.month);
    const [doc, setDoc] = useState<ComplianceDocKind>('material');

    const { data: users, isPending: usersLoading, isError: usersError, error: usersErr } = useUsers();
    const bundleQ = useComplianceBundle(userId, year, month);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        const q = userQuery.trim().toLowerCase();
        const base = users.filter((u) => u.roast_count > 0 || u.plan !== 'free');
        const list = q
            ? base.filter(
                  (u) =>
                      (u.email ?? '').toLowerCase().includes(q) ||
                      (u.display_name ?? '').toLowerCase().includes(q) ||
                      (u.business_name ?? '').toLowerCase().includes(q) ||
                      u.id.toLowerCase().includes(q),
              )
            : base;
        return list.slice(0, 40);
    }, [users, userQuery]);

    const selected = users?.find((u) => u.id === userId) ?? null;

    const handlePrint = () => {
        window.print();
    };

    const handleCsv = () => {
        if (!bundleQ.data) return;
        downloadText(complianceToCsv(bundleQ.data, doc), complianceFilename(bundleQ.data, doc));
    };

    if (usersLoading) return <QueryLoading label="Loading users" />;
    if (usersError || !users) return <QueryError message={usersErr?.message} />;

    return (
        <>
            <TopBar title="Compliance Docs" subtitle="원료수불부 · 생산작업일지 · 거래기록서 (로스터리 요청 시 추출)" />
            <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 print:hidden">
                <Panel title="대상 선택" subtitle="user + 연월 지정 후 문서 추출">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <label className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                User
                            </span>
                            <div className="relative">
                                <Search
                                    size={14}
                                    className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--faint)]"
                                />
                                <input
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    placeholder="email / business / name"
                                    className="w-full border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-8 pr-2 font-mono text-[12px] text-[var(--fg)] outline-none focus:border-[var(--accent)]/40"
                                />
                            </div>
                            <select
                                value={userId ?? ''}
                                onChange={(e) => setUserId(e.target.value || null)}
                                className="w-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 font-mono text-[12px] text-[var(--fg)] outline-none focus:border-[var(--accent)]/40"
                            >
                                <option value="">Select user…</option>
                                {filteredUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {(u.business_name || u.display_name || u.email || u.id.slice(0, 8)) +
                                            (u.email ? ` · ${u.email}` : '') +
                                            ` · roasts ${u.roast_count}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex w-28 flex-col gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                Year
                            </span>
                            <input
                                type="number"
                                min={2020}
                                max={2100}
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 font-mono text-[12px] text-[var(--fg)] outline-none"
                            />
                        </label>
                        <label className="flex w-24 flex-col gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                Month
                            </span>
                            <select
                                value={month}
                                onChange={(e) => setMonth(Number(e.target.value))}
                                className="border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 font-mono text-[12px] text-[var(--fg)] outline-none"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {selected && (
                        <div className="mt-3 font-mono text-[11px] text-[var(--muted)]">
                            Selected:{' '}
                            <span className="text-[var(--accent)]">
                                {selected.business_name || selected.display_name || '—'}
                            </span>{' '}
                            · {selected.email || selected.id} · plan {selected.plan}
                        </div>
                    )}
                </Panel>

                {!userId && (
                    <div className="border border-dashed border-[var(--border)] px-4 py-10 text-center font-mono text-[12px] text-[var(--faint)]">
                        Select a user to load compliance documents
                    </div>
                )}

                {userId && bundleQ.isPending && <QueryLoading label="Building documents" />}
                {userId && bundleQ.isError && <QueryError message={bundleQ.error?.message} />}

                {userId && bundleQ.data && (
                    <>
                        <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                            <KpiCard label="원료 입고" value={`${bundleQ.data.totals.materialInKg} kg`} />
                            <KpiCard label="원료 출고" value={`${bundleQ.data.totals.materialOutKg} kg`} />
                            <KpiCard label="생산 투입" value={`${bundleQ.data.totals.productionInputKg} kg`} />
                            <KpiCard
                                label="생산 산출"
                                value={`${bundleQ.data.totals.productionOutputKg} kg`}
                                tone="good"
                            />
                            <KpiCard label="매입 합계" value={bundleQ.data.totals.purchaseAmount.toLocaleString()} />
                            <KpiCard
                                label="판매 합계"
                                value={bundleQ.data.totals.saleAmount.toLocaleString()}
                                tone="accent"
                            />
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                            <div className="flex gap-1">
                                {DOC_TABS.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setDoc(t.id)}
                                        className={clsx(
                                            'border px-3 py-1.5 font-mono text-[11px] transition-colors',
                                            doc === t.id
                                                ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]'
                                                : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]',
                                        )}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleCsv}
                                    className="inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 font-mono text-[11px] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                                >
                                    <Download size={13} />
                                    CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-1.5 border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1.5 font-mono text-[11px] text-[var(--accent)] hover:bg-[var(--accent)]/20"
                                >
                                    <Printer size={13} />
                                    Print / PDF
                                </button>
                            </div>
                        </div>

                        <Panel
                            title={DOC_TABS.find((t) => t.id === doc)?.label}
                            subtitle={`A4 preview · ${bundleQ.data.period.from} ~ ${bundleQ.data.period.to}`}
                            className="flex min-h-0 flex-1 flex-col"
                            bodyClassName="min-h-0 flex-1 overflow-auto p-0"
                            action={
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--faint)]">
                                    <FileSpreadsheet size={12} />
                                    {doc === 'material' && `${bundleQ.data.materialLedger.length} rows`}
                                    {doc === 'production' && `${bundleQ.data.productionLog.length} rows`}
                                    {doc === 'transaction' && `${bundleQ.data.transactions.length} rows`}
                                </span>
                            }
                        >
                            {/* Desk stage — centers A4 page (210×297mm) like print layout */}
                            <div className="compliance-a4-stage flex min-h-full justify-center overflow-auto bg-[#1a1e22] p-6">
                                <div className="compliance-a4-sheet shrink-0 shadow-[0_12px_48px_rgba(0,0,0,0.45)] ring-1 ring-black/40">
                                    <ComplianceDocView bundle={bundleQ.data} kind={doc} />
                                </div>
                            </div>
                        </Panel>
                    </>
                )}
            </main>

            {/* print-only root */}
            {bundleQ.data && (
                <div id="compliance-print-root" className="hidden print:block">
                    <ComplianceDocView bundle={bundleQ.data} kind={doc} />
                </div>
            )}
        </>
    );
}
