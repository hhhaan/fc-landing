'use client';

import { ExternalLink, List, Map as MapIcon, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMarketRoasteries, useMarketRoasteriesMap } from '@/shared/api/market-roasteries/queries';
import type { MarketCode } from '@/shared/api/market-roasteries/types';
import { fmtNum } from '@/shared/lib/format';
import { Badge, KpiCard, Panel } from '@/shared/ui/Panel';
import { QueryError, QueryLoading } from '@/shared/ui/QueryState';
import { RoasteriesMap } from '@/widgets/market-roasteries/RoasteriesMap';
import { TopBar } from '@/widgets/shell/TopBar';

const MARKETS: { code: MarketCode | 'ALL'; label: string }[] = [
    { code: 'ALL', label: 'All' },
    { code: 'KR', label: 'Korea' },
    { code: 'JP', label: 'Japan' },
    { code: 'US', label: 'US' },
    { code: 'HK', label: 'Hong Kong' },
    { code: 'TW', label: 'Taiwan' },
    { code: 'EU', label: 'Europe' },
];

const PAGE_SIZE = 100;

type ViewMode = 'list' | 'map';

export default function MarketRoasteriesPage() {
    const [view, setView] = useState<ViewMode>('list');
    const [market, setMarket] = useState<MarketCode | 'ALL'>('ALL');
    const [q, setQ] = useState('');
    const [qDraft, setQDraft] = useState('');
    const [offset, setOffset] = useState(0);

    const listParams = useMemo(() => ({ market, q, limit: PAGE_SIZE, offset }), [market, q, offset]);
    const mapParams = useMemo(() => ({ market, q }), [market, q]);

    const listQuery = useMarketRoasteries(listParams);
    const mapQuery = useMarketRoasteriesMap(mapParams, view === 'map');

    const byMarket = (view === 'map' ? mapQuery.data?.byMarket : listQuery.data?.byMarket) ?? {};
    const generatedAt = view === 'map' ? mapQuery.data?.generatedAt : listQuery.data?.generatedAt;
    const marketTotal = Object.values(byMarket).reduce((a, b) => a + b, 0);

    if (view === 'list' && listQuery.isPending && !listQuery.data) {
        return <QueryLoading label="Loading market roasteries" />;
    }
    if (view === 'list' && (listQuery.isError || !listQuery.data)) {
        return <QueryError message={listQuery.error?.message} />;
    }

    const data = listQuery.data;
    const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
    const page = data ? Math.floor(offset / PAGE_SIZE) + 1 : 1;

    return (
        <>
            <TopBar
                title="Market Roasteries"
                subtitle="Global specialty coffee / roastery directory · lat/lng · ops prospecting"
                refreshedAt={generatedAt}
            />
            <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
                <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                    <KpiCard label="Total DB" value={fmtNum(marketTotal)} />
                    {MARKETS.filter((m) => m.code !== 'ALL').map((m) => (
                        <KpiCard
                            key={m.code}
                            label={m.label}
                            value={fmtNum(byMarket[m.code] ?? 0)}
                            tone={market === m.code ? 'accent' : 'default'}
                        />
                    ))}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <div className="flex flex-wrap gap-1">
                        {(['list', 'map'] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setView(mode)}
                                className={
                                    view === mode
                                        ? 'inline-flex items-center gap-1.5 border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2.5 py-1 font-mono text-[11px] text-[var(--accent)]'
                                        : 'inline-flex items-center gap-1.5 border border-[var(--border)] px-2.5 py-1 font-mono text-[11px] text-[var(--muted)] hover:text-[var(--fg)]'
                                }
                            >
                                {mode === 'list' ? <List size={12} /> : <MapIcon size={12} />}
                                {mode === 'list' ? 'List' : 'Map'}
                            </button>
                        ))}
                    </div>

                    <div className="h-4 w-px bg-[var(--border)]" />

                    <div className="flex flex-wrap gap-1">
                        {MARKETS.map((m) => (
                            <button
                                key={m.code}
                                type="button"
                                onClick={() => {
                                    setMarket(m.code);
                                    setOffset(0);
                                }}
                                className={
                                    market === m.code
                                        ? 'border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-1 font-mono text-[11px] text-[var(--accent)]'
                                        : 'border border-[var(--border)] px-2 py-1 font-mono text-[11px] text-[var(--muted)] hover:text-[var(--fg)]'
                                }
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <form
                        className="ml-auto flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-md"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setQ(qDraft.trim());
                            setOffset(0);
                        }}
                    >
                        <input
                            value={qDraft}
                            onChange={(e) => setQDraft(e.target.value)}
                            placeholder="Search name / address / phone"
                            className="w-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 font-mono text-[12px] text-[var(--fg)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--accent)]/50"
                        />
                        <button
                            type="submit"
                            className="shrink-0 border border-[var(--border)] px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {view === 'map' ? (
                    <Panel
                        title="Map"
                        subtitle={
                            mapQuery.isPending && !mapQuery.data
                                ? 'Loading points…'
                                : mapQuery.data
                                  ? `${fmtNum(mapQuery.data.total)} points · cluster click to expand${mapQuery.isFetching ? ' · updating…' : ''}`
                                  : '—'
                        }
                        className="flex min-h-0 flex-1 flex-col"
                        bodyClassName="min-h-0 flex-1 overflow-hidden p-0"
                    >
                        {mapQuery.isPending && !mapQuery.data ? (
                            <div className="flex h-full min-h-[420px] items-center justify-center">
                                <QueryLoading label="Loading map points" />
                            </div>
                        ) : mapQuery.isError || !mapQuery.data ? (
                            <div className="p-4">
                                <QueryError message={mapQuery.error?.message} />
                            </div>
                        ) : (
                            <RoasteriesMap
                                points={mapQuery.data.points}
                                market={market}
                                label={`${market === 'ALL' ? 'All markets' : market} · ${fmtNum(mapQuery.data.total)}`}
                                className="relative h-full min-h-[min(70vh,640px)] w-full overflow-hidden bg-[#0a0d10]"
                            />
                        )}
                    </Panel>
                ) : (
                    data && (
                        <Panel
                            title="Directory"
                            subtitle={`${fmtNum(data.total)} match · page ${page}/${totalPages}${listQuery.isFetching ? ' · updating…' : ''}`}
                            className="flex min-h-0 flex-1 flex-col"
                            bodyClassName="min-h-0 flex-1 overflow-auto p-0"
                            action={
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={offset <= 0}
                                        onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                                        className="border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--muted)] disabled:opacity-40"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        type="button"
                                        disabled={offset + PAGE_SIZE >= data.total}
                                        onClick={() => setOffset(offset + PAGE_SIZE)}
                                        className="border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--muted)] disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            }
                        >
                            <table className="w-full min-w-[980px] text-left text-[12px]">
                                <thead className="sticky top-0 bg-[var(--panel)]">
                                    <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                        <th className="px-3 py-2 font-medium">Market</th>
                                        <th className="px-3 py-2 font-medium">Name</th>
                                        <th className="px-3 py-2 font-medium">Address</th>
                                        <th className="px-3 py-2 font-medium">Coords</th>
                                        <th className="px-3 py-2 font-medium">Rating</th>
                                        <th className="px-3 py-2 font-medium">Source</th>
                                        <th className="px-3 py-2 font-medium">Map</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-3 py-10 text-center text-[var(--muted)]">
                                                No roasteries match
                                            </td>
                                        </tr>
                                    )}
                                    {data.items.map((r) => (
                                        <tr
                                            key={r.id}
                                            className="border-b border-[var(--border)]/50 hover:bg-[var(--surface)]/40"
                                        >
                                            <td className="px-3 py-2">
                                                <Badge>{r.market}</Badge>
                                                {r.country && r.country !== r.market && (
                                                    <div className="mt-0.5 font-mono text-[10px] text-[var(--faint)]">
                                                        {r.country}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-[var(--fg)]">{r.name}</div>
                                                {r.g_status && r.g_status !== 'matched' && (
                                                    <div className="mt-0.5 font-mono text-[10px] text-[var(--warn)]">
                                                        g:{r.g_status}
                                                        {r.g_name ? ` · ${r.g_name}` : ''}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="max-w-[320px] truncate px-3 py-2 text-[var(--muted)]">
                                                {r.addr || '—'}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-[10px] tabular-nums text-[var(--faint)]">
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin size={10} />
                                                    {Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 tabular-nums">
                                                {r.rating != null ? (
                                                    <>
                                                        {r.rating}
                                                        {r.rating_count != null && (
                                                            <span className="text-[var(--faint)]">
                                                                {' '}
                                                                ({r.rating_count})
                                                            </span>
                                                        )}
                                                    </>
                                                ) : r.score != null ? (
                                                    <span title="DiningCode score">{r.score}pt</span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-[10px] text-[var(--muted)]">
                                                {r.source}
                                            </td>
                                            <td className="px-3 py-2">
                                                {r.maps_url ? (
                                                    <a
                                                        href={r.maps_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                                                    >
                                                        Open <ExternalLink size={11} />
                                                    </a>
                                                ) : (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.lat},${r.lng}`)}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--accent)]"
                                                    >
                                                        Pin <ExternalLink size={11} />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Panel>
                    )
                )}
            </main>
        </>
    );
}
