"use client";

import { TopBar } from "@/widgets/shell/TopBar";
import { Badge, KpiCard, Panel, StatusDot } from "@/shared/ui/Panel";
import { useSystem } from "@/shared/api/system/queries";
import { QueryError, QueryLoading } from "@/shared/ui/QueryState";
import { fmtDate, fmtNum, fmtPct, fmtRel } from "@/shared/lib/format";

function toneToDot(
  s: "ok" | "warn" | "bad" | "idle",
): "good" | "warn" | "bad" | "idle" {
  if (s === "ok") return "good";
  return s;
}

function runStatusToTone(status: string): "good" | "warn" | "default" {
  if (status === "success" || status === "ok") return "good";
  if (status === "error") return "warn";
  return "default";
}

export default function SystemPage() {
  const { data, isPending, isError, error } = useSystem();
  if (isPending) return <QueryLoading label="Loading system" />;
  if (isError || !data) return <QueryError message={error?.message} />;
  const { health, billingIntegrity: bi, machineSummary: ms } = data;

  return (
    <>
      <TopBar
        title="Service Ops"
        subtitle="Health checks · cron · billing integrity · hardware · auth"
        refreshedAt={data.generatedAt}
      />
      <main className="flex-1 space-y-3 overflow-auto p-4">
        {/* Health board */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {health.map((h) => (
            <div
              key={h.id}
              className="border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5"
            >
              <div className="mb-1 flex items-center gap-2">
                <StatusDot tone={toneToDot(h.status)} />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {h.label}
                </span>
              </div>
              <p className="font-mono text-[11px] leading-snug text-[var(--fg)]">
                {h.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <KpiCard label="Profiles" value={fmtNum(
            data.tables.find((t) => t.name === "profiles")?.count ?? 0,
          )} />
          <KpiCard
            label="Sub rows"
            value={fmtNum(bi.subscriptionRows)}
            hint={`${bi.billableSubs} billable`}
          />
          <KpiCard
            label="Polar gaps"
            value={fmtNum(bi.incompleteCheckout)}
            tone={bi.incompleteCheckout > 0 ? "warn" : "default"}
            hint="linked but free"
          />
          <KpiCard
            label="Auth sessions"
            value={fmtNum(data.sessionGeo.totalSessions)}
            hint={`${data.sessionGeo.distinctIps} IPs`}
          />
          <KpiCard
            label="Machine fail %"
            value={
              ms.failRate === null ? "—" : fmtPct(ms.failRate)
            }
            hint={`${ms.ok}/${ms.total} ok`}
            tone={
              ms.failRate !== null && ms.failRate > 20 ? "warn" : "default"
            }
          />
          <KpiCard
            label="Cron runs"
            value={fmtNum(data.alertRuns.length)}
            hint="loaded window"
          />
        </div>

        {bi.orphanNote && (
          <div className="border border-[var(--warn)]/30 bg-[var(--warn)]/5 px-3 py-2 font-mono text-[11px] text-[var(--muted)]">
            <span className="text-[var(--warn)]">BILLING</span>
            {" · "}
            {bi.orphanNote}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Panel
            title="Inventory cron"
            subtitle="inventory_alert_runs · ops reliability"
          >
            {data.alertRuns.length === 0 ? (
              <p className="font-mono text-[12px] text-[var(--muted)]">
                No runs recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                      <th className="pb-2 pr-2 font-medium">Started</th>
                      <th className="pb-2 pr-2 font-medium">Status</th>
                      <th className="pb-2 pr-2 font-medium">Users</th>
                      <th className="pb-2 pr-2 font-medium">Finished</th>
                      <th className="pb-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.alertRuns.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--border)]/40"
                      >
                        <td className="py-2 pr-2 font-mono text-[11px] text-[var(--muted)]">
                          {fmtDate(r.started_at)}
                        </td>
                        <td className="py-2 pr-2">
                          <Badge
                            tone={runStatusToTone(r.status)}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-2 font-mono tabular-nums">
                          {r.users_processed}
                        </td>
                        <td className="py-2 pr-2 font-mono text-[10px] text-[var(--faint)]">
                          {r.finished_at ? fmtRel(r.finished_at) : "—"}
                        </td>
                        <td className="max-w-[160px] truncate py-2 font-mono text-[10px] text-[var(--faint)]">
                          {r.error_message || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel
            title="Billing integrity"
            subtitle="Polar checkout ↔ plan ↔ subscription rows"
          >
            <ul className="space-y-2 font-mono text-[12px]">
              <li className="flex justify-between border-b border-[var(--border)]/50 py-1.5">
                <span className="text-[var(--muted)]">Polar linked</span>
                <span>{fmtNum(bi.polarLinked)}</span>
              </li>
              <li className="flex justify-between border-b border-[var(--border)]/50 py-1.5">
                <span className="text-[var(--muted)]">Paid plans</span>
                <span>{fmtNum(bi.paidPlans)}</span>
              </li>
              <li className="flex justify-between border-b border-[var(--border)]/50 py-1.5">
                <span className="text-[var(--muted)]">Subscription rows</span>
                <span>{fmtNum(bi.subscriptionRows)}</span>
              </li>
              <li className="flex justify-between border-b border-[var(--border)]/50 py-1.5">
                <span className="text-[var(--muted)]">Billable status</span>
                <span>{fmtNum(bi.billableSubs)}</span>
              </li>
              <li className="flex justify-between py-1.5">
                <span className="text-[var(--muted)]">Incomplete checkout</span>
                <span
                  className={
                    bi.incompleteCheckout > 0
                      ? "text-[var(--warn)]"
                      : undefined
                  }
                >
                  {fmtNum(bi.incompleteCheckout)}
                </span>
              </li>
            </ul>
          </Panel>
        </div>

        <Panel
          title="Machine connection log"
          subtitle="Hardware path reliability (not roast content)"
        >
          {data.machineLogs.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] px-4 py-8 text-center font-mono text-[12px] text-[var(--muted)]">
              No machine_connection_logs yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    <th className="pb-2 pr-3 font-medium">Result</th>
                    <th className="pb-2 pr-3 font-medium">Device</th>
                    <th className="pb-2 pr-3 font-medium">Protocol</th>
                    <th className="pb-2 pr-3 font-medium">When</th>
                    <th className="pb-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {data.machineLogs.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-[var(--border)]/40"
                    >
                      <td className="py-2 pr-3">
                        <Badge tone={l.success ? "good" : "warn"}>
                          {l.success ? "ok" : "fail"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <div>{l.display_name}</div>
                        <div className="font-mono text-[10px] text-[var(--faint)]">
                          {l.roaster_key}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                        {l.protocol}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                        {fmtDate(l.created_at)}
                      </td>
                      <td className="max-w-[200px] truncate py-2 font-mono text-[10px] text-[var(--bad)]">
                        {l.error_message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Table volumes" subtitle="Quick capacity / growth read">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {data.tables.map((t) => (
              <div
                key={t.name}
                className="border border-[var(--border)] bg-[var(--surface)]/40 px-3 py-2"
              >
                <div className="truncate font-mono text-[10px] text-[var(--muted)]">
                  {t.name}
                </div>
                <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums">
                  {t.count < 0 ? "err" : fmtNum(t.count)}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </main>
    </>
  );
}
