'use client';

import { useSeo } from '@/shared/api/seo/queries';
import type { SeoIndexStatus } from '@/shared/api/seo/types';
import { clsx, fmtDate, fmtNum, fmtPct } from '@/shared/lib/format';
import { Badge, KpiCard, Panel } from '@/shared/ui/Panel';
import { QueryError, QueryLoading } from '@/shared/ui/QueryState';
import { TrafficChart } from '@/widgets/seo/TrafficChart';
import { TopBar } from '@/widgets/shell/TopBar';

function fmtPos(n: number): string {
    if (!n || Number.isNaN(n)) return '—';
    return n.toFixed(1);
}

function fmtCtr(n: number): string {
    if (n == null || Number.isNaN(n)) return '—';
    return fmtPct(n * 100);
}

function shortPage(url: string): string {
    try {
        const u = new URL(url);
        return u.pathname === '/' ? '/' : u.pathname;
    } catch {
        return url;
    }
}

function verdictTone(v: string | null): 'good' | 'warn' | 'default' {
    if (!v) return 'default';
    const s = v.toUpperCase();
    if (s === 'PASS') return 'good';
    if (s === 'PARTIAL' || s === 'NEUTRAL') return 'warn';
    if (s === 'FAIL') return 'warn';
    return 'default';
}

function IndexRow({ row }: { row: SeoIndexStatus }) {
    if (row.error) {
        return (
            <tr className="border-b border-[var(--border)]/40">
                <td className="py-2 pr-3 font-mono text-[11px]">{shortPage(row.url)}</td>
                <td colSpan={4} className="py-2 font-mono text-[10px] text-[var(--warn)]">
                    {row.error}
                </td>
            </tr>
        );
    }
    return (
        <tr className="border-b border-[var(--border)]/40">
            <td className="py-2 pr-3 font-mono text-[11px]">{shortPage(row.url)}</td>
            <td className="py-2 pr-3">
                <Badge tone={verdictTone(row.verdict)}>{row.verdict ?? '—'}</Badge>
            </td>
            <td className="max-w-[180px] truncate py-2 pr-3 font-mono text-[10px] text-[var(--muted)]">
                {row.coverageState ?? '—'}
            </td>
            <td className="max-w-[140px] truncate py-2 pr-3 font-mono text-[10px] text-[var(--muted)]">
                {row.indexingState ?? '—'}
            </td>
            <td className="py-2 font-mono text-[10px] text-[var(--faint)]">
                {row.lastCrawlTime ? fmtDate(row.lastCrawlTime) : '—'}
            </td>
        </tr>
    );
}

export default function SeoPage() {
    const { data, isPending, isError, error } = useSeo();

    if (isPending) return <QueryLoading label="Loading SEO" />;
    if (isError || !data) return <QueryError message={error?.message} />;

    const { totals: t } = data;
    const indexedPass = data.indexStatus.filter((r) => (r.verdict ?? '').toUpperCase() === 'PASS').length;

    return (
        <>
            <TopBar
                title="SEO"
                subtitle={`Search Console · ${data.siteUrl} · ${data.startDate} → ${data.endDate}`}
                refreshedAt={data.generatedAt}
            />
            <main className="flex-1 space-y-3 overflow-auto p-4">
                {!data.configured && (
                    <div className="border border-[var(--warn)]/30 bg-[var(--warn)]/5 px-3 py-2 font-mono text-[11px] text-[var(--muted)]">
                        <span className="text-[var(--warn)]">NOT CONFIGURED</span>
                        {' · '}
                        {data.setupHint}
                    </div>
                )}

                {data.configured && t.impressions === 0 && t.clicks === 0 && (
                    <div className="border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-[11px] text-[var(--muted)]">
                        <span className="text-[var(--faint)]">NO SEARCH DATA</span>
                        {' · '}
                        Window has zero impressions/clicks. Submit sitemap + request indexing in GSC; metrics appear
                        after crawl + lag (~2 days).
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                    <KpiCard
                        label="Clicks"
                        value={fmtNum(t.clicks)}
                        hint="28d window"
                        tone={t.clicks > 0 ? 'good' : 'default'}
                    />
                    <KpiCard
                        label="Impressions"
                        value={fmtNum(t.impressions)}
                        hint="28d window"
                        tone={t.impressions > 0 ? 'accent' : 'default'}
                    />
                    <KpiCard label="CTR" value={fmtCtr(t.ctr)} hint="clicks / impressions" />
                    <KpiCard label="Avg position" value={fmtPos(t.position)} hint="impression-weighted" />
                    <KpiCard
                        label="Index PASS"
                        value={`${indexedPass}/${data.indexStatus.length}`}
                        hint="URL Inspection sample"
                        tone={
                            data.indexStatus.length === 0
                                ? 'default'
                                : indexedPass === data.indexStatus.length
                                  ? 'good'
                                  : 'warn'
                        }
                    />
                    <KpiCard label="Top queries" value={fmtNum(data.queries.length)} hint="rows returned" />
                </div>

                <Panel title="Traffic" subtitle="Daily clicks + impressions (Search Analytics)">
                    {data.daily.length === 0 ? (
                        <p className="font-mono text-[12px] text-[var(--faint)]">No daily series yet.</p>
                    ) : (
                        <TrafficChart data={data.daily} />
                    )}
                </Panel>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <Panel title="Top queries" subtitle="By clicks · 28d">
                        {data.queries.length === 0 ? (
                            <p className="font-mono text-[12px] text-[var(--faint)]">No query rows.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[12px]">
                                    <thead>
                                        <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                            <th className="pb-2 pr-3 font-medium">Query</th>
                                            <th className="pb-2 pr-3 font-medium">Clicks</th>
                                            <th className="pb-2 pr-3 font-medium">Impr</th>
                                            <th className="pb-2 pr-3 font-medium">CTR</th>
                                            <th className="pb-2 font-medium">Pos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.queries.map((q) => (
                                            <tr key={q.query} className="border-b border-[var(--border)]/40">
                                                <td className="max-w-[220px] truncate py-2 pr-3">{q.query}</td>
                                                <td className="py-2 pr-3 font-mono tabular-nums">{fmtNum(q.clicks)}</td>
                                                <td className="py-2 pr-3 font-mono tabular-nums text-[var(--muted)]">
                                                    {fmtNum(q.impressions)}
                                                </td>
                                                <td className="py-2 pr-3 font-mono tabular-nums text-[var(--muted)]">
                                                    {fmtCtr(q.ctr)}
                                                </td>
                                                <td className="py-2 font-mono tabular-nums text-[var(--muted)]">
                                                    {fmtPos(q.position)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>

                    <Panel title="Top pages" subtitle="By clicks · 28d">
                        {data.pages.length === 0 ? (
                            <p className="font-mono text-[12px] text-[var(--faint)]">No page rows.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[12px]">
                                    <thead>
                                        <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                            <th className="pb-2 pr-3 font-medium">Page</th>
                                            <th className="pb-2 pr-3 font-medium">Clicks</th>
                                            <th className="pb-2 pr-3 font-medium">Impr</th>
                                            <th className="pb-2 pr-3 font-medium">CTR</th>
                                            <th className="pb-2 font-medium">Pos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.pages.map((p) => (
                                            <tr key={p.page} className="border-b border-[var(--border)]/40">
                                                <td
                                                    className="max-w-[240px] truncate py-2 pr-3 font-mono text-[11px]"
                                                    title={p.page}
                                                >
                                                    {shortPage(p.page)}
                                                </td>
                                                <td className="py-2 pr-3 font-mono tabular-nums">{fmtNum(p.clicks)}</td>
                                                <td className="py-2 pr-3 font-mono tabular-nums text-[var(--muted)]">
                                                    {fmtNum(p.impressions)}
                                                </td>
                                                <td className="py-2 pr-3 font-mono tabular-nums text-[var(--muted)]">
                                                    {fmtCtr(p.ctr)}
                                                </td>
                                                <td className="py-2 font-mono tabular-nums text-[var(--muted)]">
                                                    {fmtPos(p.position)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <Panel title="Countries" subtitle="By impressions · 28d">
                        {data.countries.length === 0 ? (
                            <p className="font-mono text-[12px] text-[var(--faint)]">No country rows.</p>
                        ) : (
                            <table className="w-full text-left text-[12px]">
                                <thead>
                                    <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                        <th className="pb-2 pr-3 font-medium">Country</th>
                                        <th className="pb-2 pr-3 font-medium">Clicks</th>
                                        <th className="pb-2 pr-3 font-medium">Impr</th>
                                        <th className="pb-2 font-medium">Pos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.countries.map((c) => (
                                        <tr key={c.country} className="border-b border-[var(--border)]/40">
                                            <td className="py-2 pr-3 font-mono">{c.country}</td>
                                            <td className="py-2 pr-3 font-mono tabular-nums">{fmtNum(c.clicks)}</td>
                                            <td className="py-2 pr-3 font-mono tabular-nums text-[var(--muted)]">
                                                {fmtNum(c.impressions)}
                                            </td>
                                            <td className="py-2 font-mono tabular-nums text-[var(--muted)]">
                                                {fmtPos(c.position)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Panel>

                    <Panel title="URL Inspection" subtitle="Key public pages · index coverage sample">
                        {data.indexStatus.length === 0 ? (
                            <p className="font-mono text-[12px] text-[var(--faint)]">
                                No inspections (credentials required).
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[480px] text-left text-[12px]">
                                    <thead>
                                        <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                            <th className="pb-2 pr-3 font-medium">URL</th>
                                            <th className="pb-2 pr-3 font-medium">Verdict</th>
                                            <th className="pb-2 pr-3 font-medium">Coverage</th>
                                            <th className="pb-2 pr-3 font-medium">Indexing</th>
                                            <th className="pb-2 font-medium">Last crawl</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.indexStatus.map((row) => (
                                            <IndexRow key={row.url} row={row} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>
                </div>

                <p className={clsx('font-mono text-[10px] text-[var(--faint)]')}>
                    Source: Google Search Console Search Analytics + URL Inspection API. Property must match
                    GSC_SITE_URL (URL-prefix or sc-domain:…).
                </p>
            </main>
        </>
    );
}
