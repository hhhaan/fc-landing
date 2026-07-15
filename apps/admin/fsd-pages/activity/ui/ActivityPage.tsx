"use client";

import { TopBar } from "@/widgets/shell/TopBar";
import { Badge, KpiCard, Panel } from "@/shared/ui/Panel";
import { RoastBarChart } from "@/widgets/charts/SimpleCharts";
import { WorldMap } from "@/widgets/map/WorldMap";
import { useActivity } from "@/shared/api/activity/queries";
import type { ActivityEvent, ActivityKind } from "@/shared/api/activity/types";
import { QueryError, QueryLoading } from "@/shared/ui/QueryState";
import { fmtNum, fmtRel } from "@/shared/lib/format";

function kindTone(
  kind: ActivityKind,
  summary: string,
): "default" | "good" | "warn" | "accent" {
  if (kind === "roast") return "good";
  if (kind === "auth") return "default";
  if (summary.includes("fail")) return "warn";
  return "accent";
}

function userLabel(e: Pick<ActivityEvent, "displayName" | "email" | "userId">) {
  return e.displayName || e.email || e.userId.slice(0, 8);
}

export default function ActivityPage() {
  const { data, isPending, isError, error } = useActivity();

  if (isPending) return <QueryLoading label="Loading activity" />;
  if (isError || !data) return <QueryError message={error?.message} />;

  const { kpis, map } = data;
  const dauChart = data.dauSeries.map((d) => ({
    date: d.date,
    count: d.users,
  }));
  const roastChart = data.dauSeries.map((d) => ({
    date: d.date,
    count: d.roasts,
  }));

  return (
    <>
      <TopBar
        title="Activity"
        subtitle="Product usage · DAU · map · recent events"
        refreshedAt={data.generatedAt}
      />
      <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
        <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Product 24h"
            value={fmtNum(kpis.productActive24h)}
            hint="roast or machine"
            tone="good"
          />
          <KpiCard
            label="Product 7d"
            value={fmtNum(kpis.productActive7d)}
            hint="active users"
            tone="good"
          />
          <KpiCard
            label="Product 30d"
            value={fmtNum(kpis.productActive30d)}
            hint="active users"
          />
          <KpiCard
            label="Roasts 7d"
            value={fmtNum(kpis.roasts7d)}
            hint="sessions"
          />
          <KpiCard
            label="Machine 7d"
            value={fmtNum(kpis.machineConnects7d)}
            hint="connects"
          />
          <KpiCard
            label="Auth 7d"
            value={fmtNum(kpis.authActive7d)}
            hint="session may be sticky"
            tone="default"
          />
        </div>

        {/* Charts 2/3 · map 1/3 · share remaining height */}
        <div className="grid min-h-0 flex-[1.05] grid-cols-1 gap-2 xl:grid-cols-3 xl:grid-rows-2">
          <Panel
            title="DAU · 30d"
            subtitle="Product-active users / day"
            className="flex min-h-0 flex-col xl:col-span-2 xl:col-start-1 xl:row-start-1"
            bodyClassName="min-h-0 flex-1 p-2"
          >
            <RoastBarChart data={dauChart} className="h-full min-h-0 w-full" />
          </Panel>
          <Panel
            title="Roasts · 30d"
            subtitle="Sessions / day"
            className="flex min-h-0 flex-col xl:col-span-2 xl:col-start-1 xl:row-start-2"
            bodyClassName="min-h-0 flex-1 p-2"
          >
            <RoastBarChart
              data={roastChart}
              className="h-full min-h-0 w-full"
            />
          </Panel>
          <div className="relative min-h-[160px] overflow-hidden border border-[var(--border)] bg-[#0a0d10] xl:col-start-3 xl:row-span-2 xl:row-start-1 xl:min-h-0">
            <WorldMap
              countries={map.countries}
              points={map.points}
              label="Product-active · 30d"
              className="absolute inset-0 h-full w-full min-h-0 border-0 bg-transparent"
            />
            {(map.unresolved.length > 0 || map.missingIpUsers > 0) && (
              <p className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[90%] font-mono text-[10px] text-[var(--warn)]">
                {map.unresolved.length > 0 &&
                  `${map.unresolved.length} IP unresolved`}
                {map.unresolved.length > 0 && map.missingIpUsers > 0 && " · "}
                {map.missingIpUsers > 0 &&
                  `${map.missingIpUsers} no session IP`}
              </p>
            )}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-5">
          <Panel
            title="Feed"
            subtitle="Recent product + sign-in"
            className="flex min-h-0 flex-col xl:col-span-3"
            bodyClassName="min-h-0 flex-1 overflow-auto p-0"
          >
            {data.feed.length === 0 ? (
              <div className="p-3 font-mono text-[12px] text-[var(--faint)]">
                No events in the last 30 days
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]/50">
                {data.feed.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 px-3 py-1.5 hover:bg-[var(--surface)]/40"
                  >
                    <Badge tone={kindTone(e.kind, e.summary)}>{e.kind}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-[var(--fg)]">
                        {userLabel(e)}
                        <span className="ml-2 font-mono text-[10px] text-[var(--faint)]">
                          {e.plan}
                        </span>
                      </div>
                      <div className="truncate font-mono text-[11px] text-[var(--muted)]">
                        {e.summary}
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--faint)]">
                      {fmtRel(e.at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Top active · 7d"
            subtitle="By product events"
            className="flex min-h-0 flex-col xl:col-span-2"
            bodyClassName="min-h-0 flex-1 overflow-auto p-0"
          >
            {data.topUsers.length === 0 ? (
              <div className="p-3 font-mono text-[12px] text-[var(--faint)]">
                No product activity in 7d
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-left text-[12px]">
                  <thead className="sticky top-0 bg-[var(--panel)]">
                    <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                      <th className="px-3 pb-2 pt-2 font-medium">User</th>
                      <th className="pb-2 pr-3 font-medium">Plan</th>
                      <th className="pb-2 pr-3 font-medium">Evt</th>
                      <th className="pb-2 pr-3 font-medium">Product</th>
                      <th className="pb-2 pr-3 font-medium">Auth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((u) => (
                      <tr
                        key={u.userId}
                        className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--surface)]/40"
                      >
                        <td className="px-3 py-1.5">
                          <div className="truncate font-medium">
                            {u.displayName || u.email || u.userId.slice(0, 8)}
                          </div>
                        </td>
                        <td className="py-1.5 pr-3">
                          <Badge
                            tone={u.plan === "free" ? "default" : "good"}
                          >
                            {u.plan}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-3 font-mono tabular-nums text-[var(--fg)]">
                          {u.events7d}
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-[11px] text-[var(--muted)]">
                          {fmtRel(u.lastProductAt)}
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-[11px] text-[var(--muted)]">
                          {fmtRel(u.lastAuthAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </main>
    </>
  );
}
