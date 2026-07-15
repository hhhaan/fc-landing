"use client";

import Link from "next/link";
import { TopBar } from "@/widgets/shell/TopBar";
import { Badge, KpiCard, Panel, StatusDot } from "@/shared/ui/Panel";
import { FunnelSteps, RoastBarChart } from "@/widgets/charts/SimpleCharts";
import { useOverview } from "@/shared/api/kpis/queries";
import type { OverviewData } from "@/shared/api/kpis/types";
import { QueryError, QueryLoading } from "@/shared/ui/QueryState";
import { fmtMoney, fmtMrrBuckets, fmtNum, fmtPct, fmtRel } from "@/shared/lib/format";
import { FALLBACK_CURRENCY } from "@/shared/lib/pricing";

function inventoryCronTone(ops: OverviewData["ops"]): "idle" | "warn" | "good" {
  if (!ops.inventoryLastStatus) return "idle";
  if (ops.inventoryFail7d > 0) return "warn";
  return "good";
}

function machineTone(
  logs: number,
  failRate: number | null,
): "idle" | "warn" | "good" {
  if (logs === 0) return "idle";
  if ((failRate ?? 0) > 20) return "warn";
  return "good";
}

const ROUTES = {
  system: "/system",
  revenue: "/revenue",
  users: "/users",
  map: "/map",
} as const;

export default function OverviewPage() {
  const { data, isPending, isError, error } = useOverview();

  if (isPending) return <QueryLoading label="Loading overview" />;
  if (isError || !data) return <QueryError message={error?.message} />;

  const { kpis, ops } = data;
  const cronTone = inventoryCronTone(ops);

  return (
    <>
      <TopBar
        title="Overview"
        subtitle="Business health · growth · revenue · service ops"
        refreshedAt={data.generatedAt}
      />
      <main className="flex-1 space-y-3 overflow-auto p-4">
        {/* Business KPIs */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          <KpiCard
            label="MRR"
            value={fmtMrrBuckets(data.mrrByCurrency)}
            hint={
              data.mrrByCurrency.length
                ? data.mrrByCurrency
                    .map((b) =>
                      `ARR ${new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: b.currency,
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(b.arr)}`,
                    )
                    .join(" · ")
                : `ARR ${fmtMoney(0, FALLBACK_CURRENCY, { compact: true })}`
            }
            tone="good"
          />
          <KpiCard
            label="Users"
            value={fmtNum(kpis.totalUsers)}
            hint={`+${kpis.newUsers7d} / 7d`}
          />
          <KpiCard
            label="Active 7d"
            value={fmtNum(kpis.activeSignins7d)}
            hint="signed in"
            tone="good"
          />
          <KpiCard
            label="Active 30d"
            value={fmtNum(kpis.activeSignins30d)}
            hint="signed in"
          />
          <KpiCard
            label="Paid"
            value={fmtNum(kpis.planPaid)}
            hint={`${fmtPct(kpis.conversionRate)} convert`}
            tone={kpis.planPaid > 0 ? "accent" : "default"}
          />
          <KpiCard
            label="Polar"
            value={fmtNum(kpis.polarLinked)}
            hint={`${kpis.subscriptions} sub rows`}
            tone={kpis.incompleteCheckout > 0 ? "warn" : "default"}
          />
          <KpiCard
            label="Activated"
            value={fmtNum(kpis.activatedUsers)}
            hint={`${fmtPct(kpis.activationRate)} ever used product`}
          />
          <KpiCard
            label="New 30d"
            value={fmtNum(kpis.newUsers30d)}
            hint="signups"
          />
        </div>

        {/* Ops strip */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
            <StatusDot tone={cronTone} />
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Inventory cron
              </div>
              <div className="truncate font-mono text-[11px] text-[var(--muted)]">
                {ops.inventoryLastAt
                  ? `${ops.inventoryLastStatus} · ${fmtRel(ops.inventoryLastAt)}`
                  : "no runs"}
                {ops.inventoryFail7d > 0 && (
                  <span className="text-[var(--warn)]">
                    {" "}
                    · {ops.inventoryFail7d} fail/7d
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
            <StatusDot
              tone={machineTone(ops.machineLogs, ops.machineFailRate)}
            />
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Hardware connect
              </div>
              <div className="truncate font-mono text-[11px] text-[var(--muted)]">
                {ops.machineLogs === 0
                  ? "no logs"
                  : `${ops.machineLogs} recent · fail ${ops.machineFailRate ?? 0}%`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
            <StatusDot
              tone={kpis.incompleteCheckout > 0 ? "warn" : "good"}
            />
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Billing pipeline
              </div>
              <div className="truncate font-mono text-[11px] text-[var(--muted)]">
                {kpis.incompleteCheckout > 0
                  ? `${kpis.incompleteCheckout} Polar→free gap`
                  : "no checkout/plan gaps"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
            <StatusDot tone={ops.authSessions > 0 ? "good" : "idle"} />
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Auth sessions
              </div>
              <div className="truncate font-mono text-[11px] text-[var(--muted)]">
                {fmtNum(ops.authSessions)} session records
              </div>
            </div>
            <Link
              href={ROUTES.system}
              className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] hover:underline"
            >
              Ops →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Panel
            title="Signups · 30d"
            subtitle="New accounts (not product usage)"
            className="xl:col-span-2"
          >
            <RoastBarChart data={data.signupSeries} />
          </Panel>

          <Panel title="Growth funnel" subtitle="Business conversion">
            <FunnelSteps
              steps={[
                { label: "Total users", value: kpis.totalUsers },
                {
                  label: "Activated",
                  value: kpis.activatedUsers,
                  hint: fmtPct(kpis.activationRate),
                },
                {
                  label: "Polar checkout",
                  value: kpis.polarLinked,
                },
                {
                  label: "Paid plan",
                  value: kpis.planPaid,
                  hint: fmtPct(kpis.conversionRate),
                },
              ]}
            />
          </Panel>

          <Panel
            title="Recent accounts"
            subtitle="Signup / plan / activation"
            className="xl:col-span-2"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    <th className="pb-2 pr-3 font-medium">User</th>
                    <th className="pb-2 pr-3 font-medium">Plan</th>
                    <th className="pb-2 pr-3 font-medium">Activated</th>
                    <th className="pb-2 pr-3 font-medium">Polar</th>
                    <th className="pb-2 pr-3 font-medium">Joined</th>
                    <th className="pb-2 font-medium">Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-[var(--border)]/60 last:border-0"
                    >
                      <td className="py-2 pr-3">
                        <div className="font-medium text-[var(--fg)]">
                          {u.display_name || u.email || u.id.slice(0, 8)}
                        </div>
                        <div className="font-mono text-[10px] text-[var(--faint)]">
                          {u.email}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={u.plan === "free" ? "default" : "good"}>
                          {u.plan}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={u.activated ? "good" : "default"}>
                          {u.activated ? "yes" : "no"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        {u.polar ? (
                          <Badge tone="accent">linked</Badge>
                        ) : (
                          <span className="text-[var(--faint)]">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                        {fmtRel(u.created_at)}
                      </td>
                      <td className="py-2 font-mono text-[11px] text-[var(--muted)]">
                        {fmtRel(u.last_sign_in_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Shortcuts" subtitle="Where to dig in">
            <ul className="space-y-2 font-mono text-[12px]">
              <li>
                <Link
                  href={ROUTES.revenue}
                  className="flex justify-between border border-[var(--border)] px-2 py-2 text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--fg)]"
                >
                  <span>Revenue</span>
                  <span className="text-[var(--accent)]">
                    {fmtMrrBuckets(data.mrrByCurrency)} MRR
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.users}
                  className="flex justify-between border border-[var(--border)] px-2 py-2 text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--fg)]"
                >
                  <span>Users</span>
                  <span className="text-[var(--faint)]">
                    {fmtNum(kpis.totalUsers)}
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.map}
                  className="flex justify-between border border-[var(--border)] px-2 py-2 text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--fg)]"
                >
                  <span>Global map</span>
                  <span className="text-[var(--faint)]">geo</span>
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.system}
                  className="flex justify-between border border-[var(--border)] px-2 py-2 text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--fg)]"
                >
                  <span>Service ops</span>
                  <span className="text-[var(--faint)]">health</span>
                </Link>
              </li>
            </ul>
          </Panel>
        </div>
      </main>
    </>
  );
}
