'use client';

import { useOrganizations } from '@/shared/api/organizations/queries';
import { fmtNum, fmtRel } from '@/shared/lib/format';
import { Badge, KpiCard, Panel } from '@/shared/ui/Panel';
import { QueryError, QueryLoading } from '@/shared/ui/QueryState';
import { TopBar } from '@/widgets/shell/TopBar';

export default function OrganizationsPage() {
    const { data: orgs, isPending, isError, error } = useOrganizations();
    if (isPending) return <QueryLoading label="Loading organizations" />;
    if (isError || !orgs) return <QueryError message={error?.message} />;

    const totalSeats = orgs.reduce((n, o) => n + o.seat_limit, 0);
    const totalMembers = orgs.reduce((n, o) => n + o.member_count, 0);
    const teamPlan = orgs.filter((o) => o.plan === 'team' || o.plan === 'enterprise');

    return (
        <>
            <TopBar title="Organizations" subtitle="Team workspaces · seats · membership (ops view)" />
            <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
                <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
                    <KpiCard label="Orgs" value={fmtNum(orgs.length)} />
                    <KpiCard label="Seats" value={fmtNum(totalSeats)} />
                    <KpiCard label="Members" value={fmtNum(totalMembers)} tone="good" />
                    <KpiCard label="Team plan" value={fmtNum(teamPlan.length)} />
                </div>

                <Panel className="min-h-0 flex-1 overflow-auto p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-[var(--panel)] text-xs uppercase tracking-wide text-[var(--muted)]">
                            <tr className="border-b border-[var(--border)]">
                                <th className="px-3 py-2 font-medium">Org</th>
                                <th className="px-3 py-2 font-medium">Owner</th>
                                <th className="px-3 py-2 font-medium">Plan</th>
                                <th className="px-3 py-2 font-medium">Seats</th>
                                <th className="px-3 py-2 font-medium">Members</th>
                                <th className="px-3 py-2 font-medium">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orgs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-[var(--muted)]">
                                        No organizations yet
                                    </td>
                                </tr>
                            )}
                            {orgs.map((o) => (
                                <tr
                                    key={o.id}
                                    className="border-b border-[var(--border)]/60 hover:bg-[var(--surface)]/40"
                                >
                                    <td className="px-3 py-2 font-medium">{o.name}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col">
                                            <span>{o.owner_business_name || o.owner_display_name || '—'}</span>
                                            <span className="text-xs text-[var(--muted)]">
                                                {o.owner_email ?? o.owner_id.slice(0, 8)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <Badge>{o.plan}</Badge>
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">{o.seat_limit}</td>
                                    <td className="px-3 py-2 tabular-nums">{o.member_count}</td>
                                    <td className="px-3 py-2 text-[var(--muted)]">{fmtRel(o.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Panel>
            </main>
        </>
    );
}
