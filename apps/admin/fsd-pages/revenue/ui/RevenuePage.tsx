"use client";

import { TopBar } from "@/widgets/shell/TopBar";
import { Badge, KpiCard, Panel, StatusDot } from "@/shared/ui/Panel";
import {
  FunnelVisual,
  PlanDonut,
  RevenueMrrChart,
  SignupBarChart,
} from "@/widgets/revenue/RevenueCharts";
import { useRevenue } from "@/shared/api/revenue/queries";
import { QueryError, QueryLoading } from "@/shared/ui/QueryState";
import {
  fmtDate,
  fmtMoney,
  fmtMrrBuckets,
  fmtNum,
  fmtPct,
  fmtRel,
  fmtUsd,
  clsx,
} from "@/shared/lib/format";
import {
  FALLBACK_CURRENCY,
  PRICE_CATALOG,
  type MrrCurrencyBucket,
} from "@/shared/lib/pricing";


const PRO_MONTHLY_USD =
  PRICE_CATALOG.find((c) => c.key === "pro-monthly")?.monthlyUsd ?? 49;

function arrHint(buckets: MrrCurrencyBucket[]) {
  if (!buckets.length) return `ARR ${fmtMoney(0, FALLBACK_CURRENCY, { compact: true })}`;
  return buckets
    .map((b) => `ARR ${fmtMoney(b.arr, b.currency, { compact: true })}`)
    .join(" · ");
}

function sourceLabel(source: "subscriptions" | "profiles_estimate" | "empty") {
  if (source === "subscriptions")
    return { text: "Ledger · subscriptions", tone: "good" as const };
  if (source === "profiles_estimate")
    return { text: "Estimate · profiles.plan", tone: "warn" as const };
  return { text: "No recognized revenue", tone: "idle" as const };
}

function statusTone(
  status: string | null,
): "default" | "good" | "warn" | "accent" {
  switch (status) {
    case "active":
      return "good";
    case "trialing":
      return "accent";
    case "past_due":
      return "warn";
    default:
      return "default";
  }
}

function PipelineBadge({ pipeline }: { pipeline: string }) {
  if (pipeline === "paying") return <Badge tone="good">paying</Badge>;
  if (pipeline === "paid_no_sub")
    return <Badge tone="warn">paid · no sub</Badge>;
  if (pipeline === "polar_free")
    return <Badge tone="warn">polar · free</Badge>;
  return <Badge>free</Badge>;
}

export default function RevenuePage() {
  const { data, isPending, isError, error } = useRevenue();

  if (isPending) return <QueryLoading label="Loading revenue" />;
  if (isError || !data) return <QueryError message={error?.message} />;

  const { kpis, source, mrrByCurrency } = data;
  const src = sourceLabel(source);
  const chartCurrency = mrrByCurrency[0]?.currency ?? FALLBACK_CURRENCY;
  const mrrChartData = data.mrrTimeline.map((row) => ({
    date: row.date,
    label: row.label,
    mrr:
      row.mrrByCurrency.find((b) => b.currency === chartCurrency)?.mrr ?? 0,
  }));
  const mrrEmpty =
    mrrByCurrency.length === 0 && source !== "profiles_estimate";
  const hasLedgerMix =
    data.statusMix.length > 0 || data.intervalMix.length > 0;

  return (
    <>
      <TopBar
        title="Revenue"
        subtitle="MRR · pipeline · conversion · Polar"
        refreshedAt={data.generatedAt}
      />
      <main className="flex-1 space-y-3 overflow-auto p-4">
        {/* ── Hero: money first ── */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="border border-[var(--accent)]/30 bg-[var(--panel)] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                MRR
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--faint)]">
                <StatusDot tone={src.tone} />
                {src.text}
              </div>
            </div>
            <div className="mt-1 font-mono text-[32px] font-semibold leading-none tracking-tight text-[var(--accent)] tabular-nums">
              {fmtMrrBuckets(mrrByCurrency)}
            </div>
            <div className="mt-2 font-mono text-[11px] text-[var(--faint)]">
              {arrHint(mrrByCurrency)}
              {source === "profiles_estimate" && " · estimated"}
              {source === "empty" && " · no ledger"}
              {mrrByCurrency.length > 1 && " · Polar ledger"}
            </div>
          </div>

          <div className="border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Pipeline MRR
            </div>
            <div
              className={clsx(
                "mt-1 font-mono text-[32px] font-semibold leading-none tracking-tight tabular-nums",
                kpis.pipelineMrrByCurrency.length > 0
                  ? "text-[var(--warn)]"
                  : "text-[var(--fg)]",
              )}
            >
              {fmtMrrBuckets(kpis.pipelineMrrByCurrency)}
            </div>
            <div className="mt-2 font-mono text-[11px] text-[var(--faint)]">
              {kpis.incompleteCheckout} incomplete · est. Pro{" "}
              {fmtUsd(PRO_MONTHLY_USD)}
            </div>
          </div>

          <div className="border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Paying
            </div>
            <div className="mt-1 font-mono text-[32px] font-semibold leading-none tracking-tight tabular-nums">
              {fmtNum(kpis.payingCustomers)}
            </div>
            <div className="mt-2 font-mono text-[11px] text-[var(--faint)]">
              Polar billable seats
            </div>
          </div>

          <div className="border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Conversion
            </div>
            <div className="mt-1 font-mono text-[32px] font-semibold leading-none tracking-tight text-[var(--cyan)] tabular-nums">
              {fmtPct(kpis.conversionRate)}
            </div>
            <div className="mt-2 font-mono text-[11px] text-[var(--faint)]">
              {kpis.paidUsers} paid / {kpis.totalUsers} users
            </div>
          </div>
        </div>

        {/* ── Diagnostics: compact grid (not full-width banners) ── */}
        {data.alerts.length > 0 && (
          <div
            className={clsx(
              "grid gap-2",
              data.alerts.length === 1 && "grid-cols-1",
              data.alerts.length === 2 && "grid-cols-1 md:grid-cols-2",
              data.alerts.length >= 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
            )}
          >
            {data.alerts.map((a) => (
              <div
                key={a.title}
                className={clsx(
                  "border px-3 py-2",
                  a.tone === "bad" && "border-[var(--bad)]/40 bg-[var(--bad)]/5",
                  a.tone === "warn" &&
                    "border-[var(--warn)]/40 bg-[var(--warn)]/5",
                  a.tone === "info" &&
                    "border-[var(--border)] bg-[var(--panel)]",
                )}
              >
                <div
                  className={clsx(
                    "font-mono text-[10px] uppercase tracking-[0.14em]",
                    a.tone === "bad" && "text-[var(--bad)]",
                    a.tone === "warn" && "text-[var(--warn)]",
                    a.tone === "info" && "text-[var(--cyan)]",
                  )}
                >
                  {a.title}
                </div>
                <p className="mt-1 line-clamp-2 font-mono text-[11px] leading-snug text-[var(--muted)]">
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Health KPIs ── */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          <KpiCard
            label="MRR at risk"
            value={fmtMrrBuckets(kpis.mrrAtRiskByCurrency)}
            hint="past_due + canceling"
            tone={kpis.mrrAtRiskByCurrency.length > 0 ? "warn" : "default"}
          />
          <KpiCard
            label="Trial MRR"
            value={fmtMrrBuckets(kpis.mrrTrialByCurrency)}
            hint={`${kpis.trialing} trialing`}
          />
          <KpiCard
            label="Polar linked"
            value={fmtNum(kpis.polarLinked)}
            hint={fmtPct(kpis.polarRate)}
          />
          <KpiCard
            label="Polar→paid"
            value={fmtPct(kpis.paidToPolarRate)}
            hint="paid / polar"
          />
          <KpiCard
            label="Incomplete"
            value={fmtNum(kpis.incompleteCheckout)}
            hint="checkout gap"
            tone={kpis.incompleteCheckout > 0 ? "warn" : "default"}
          />
          <KpiCard label="Canceling" value={fmtNum(kpis.canceling)} />
          <KpiCard label="Canceled" value={fmtNum(kpis.canceled)} />
          <KpiCard
            label="New users 30d"
            value={fmtNum(kpis.netNewUsers30d)}
            hint="signups"
          />
        </div>

        {/* ── Primary charts ── */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Panel
            title="MRR · 90 days"
            subtitle={
              {
                subscriptions: "Recognized billable run-rate",
                profiles_estimate: "Flat estimate from paid plans",
                empty: "Awaiting billable subscriptions",
              }[source]
            }
            className="xl:col-span-2"
          >
            <RevenueMrrChart
              data={mrrChartData}
              currency={chartCurrency}
              empty={mrrEmpty}
            />
          </Panel>
          <Panel title="Conversion funnel" subtitle="% = step / previous">
            <FunnelVisual steps={data.funnel} />
          </Panel>
        </div>

        {/* ── Mix + catalog + growth ── */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Panel title="Plan mix" subtitle="profiles.plan">
            <PlanDonut
              data={data.planMix.map((p) => ({
                plan: p.plan,
                count: p.count,
              }))}
            />
            <ul className="mt-1 space-y-1 border-t border-[var(--border)] pt-2 font-mono text-[11px]">
              {data.planMix.map((p) => (
                <li key={p.plan} className="flex justify-between gap-2">
                  <span className="truncate text-[var(--muted)]">
                    {p.plan} · {fmtPct(p.pct)}
                  </span>
                  <span className="shrink-0 text-[var(--faint)]">
                    {p.mrrByCurrency.length > 0
                      ? `${fmtMrrBuckets(p.mrrByCurrency)}/mo`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Pricing catalog" subtitle="List price · active seats">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    <th className="pb-2 pr-2 font-medium">SKU</th>
                    <th className="pb-2 pr-2 font-medium">Bill</th>
                    <th className="pb-2 pr-2 font-medium">MRR</th>
                    <th className="pb-2 font-medium">Live</th>
                  </tr>
                </thead>
                <tbody>
                  {data.catalog.map((c) => (
                    <tr
                      key={c.key}
                      className="border-b border-[var(--border)]/40"
                    >
                      <td className="py-2 pr-2">
                        <div className="font-medium">{c.name}</div>
                        <div className="font-mono text-[10px] text-[var(--faint)]">
                          {c.interval}
                        </div>
                      </td>
                      <td className="py-2 pr-2 font-mono tabular-nums">
                        {fmtUsd(c.periodUsd)}
                      </td>
                      <td className="py-2 pr-2 font-mono tabular-nums text-[var(--accent)]">
                        {fmtUsd(c.monthlyUsd)}
                      </td>
                      <td className="py-2 font-mono tabular-nums">
                        {c.activeCount}
                        {c.mrrByCurrency.length > 0 && (
                          <span className="ml-1 text-[10px] text-[var(--faint)]">
                            ({fmtMrrBuckets(c.mrrByCurrency)})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Signups · 30d" subtitle="Top-of-funnel volume">
            <SignupBarChart data={data.signupSeries} />
          </Panel>
        </div>

        {/* ── Ledger breakdown (when subs exist) ── */}
        {hasLedgerMix && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Panel title="Subscription status" subtitle="ledger statuses">
              {data.statusMix.length === 0 ? (
                <p className="font-mono text-[12px] text-[var(--muted)]">—</p>
              ) : (
                <ul className="space-y-1.5 font-mono text-[12px]">
                  {data.statusMix.map((s) => (
                    <li
                      key={s.status}
                      className="flex items-center justify-between border-b border-[var(--border)]/40 py-1.5 last:border-0"
                    >
                      <span className="text-[var(--muted)]">{s.status}</span>
                      <span>
                        <span className="tabular-nums">{s.count}</span>
                        {s.mrrByCurrency.length > 0 && (
                          <span className="ml-2 text-[var(--accent)]">
                            {fmtMrrBuckets(s.mrrByCurrency)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Billing interval" subtitle="month vs year MRR">
              {data.intervalMix.length === 0 ? (
                <p className="font-mono text-[12px] text-[var(--muted)]">—</p>
              ) : (
                <ul className="space-y-1.5 font-mono text-[12px]">
                  {data.intervalMix.map((i) => (
                    <li
                      key={i.interval}
                      className="flex items-center justify-between border-b border-[var(--border)]/40 py-1.5 last:border-0"
                    >
                      <span className="text-[var(--muted)]">{i.interval}</span>
                      <span>
                        <span className="text-[var(--faint)]">{i.count} × </span>
                        <span className="text-[var(--accent)]">
                          {fmtMrrBuckets(i.mrrByCurrency)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {/* ── Customers ── */}
        <Panel
          title="Customers"
          subtitle={`${data.customers.length} · paying → gaps → polar free → free`}
          bodyClassName="p-0"
        >
          <div className="max-h-[min(52vh,480px)] overflow-auto">
            <table className="w-full min-w-[900px] text-left text-[12px]">
              <thead className="sticky top-0 z-[1] bg-[var(--panel)]">
                <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  <th className="px-3 pb-2 pt-2 pr-3 font-medium">Customer</th>
                  <th className="pb-2 pr-3 font-medium">Pipeline</th>
                  <th className="pb-2 pr-3 font-medium">Plan</th>
                  <th className="pb-2 pr-3 font-medium">MRR</th>
                  <th className="pb-2 pr-3 font-medium">Sub</th>
                  <th className="pb-2 pr-3 font-medium">Polar</th>
                  <th className="pb-2 pr-3 font-medium">Joined</th>
                  <th className="pb-2 pr-3 font-medium">Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--border)]/40 hover:bg-[var(--surface)]/30"
                  >
                    <td className="px-3 py-2 pr-3">
                      <div className="font-medium">
                        {c.display_name || c.email || c.id.slice(0, 8)}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--faint)]">
                        {c.email}
                        {c.business_name ? ` · ${c.business_name}` : ""}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <PipelineBadge pipeline={c.pipeline} />
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={c.plan === "free" ? "default" : "good"}>
                        {c.plan}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-[var(--accent)]">
                      {c.mrr > 0
                        ? fmtMoney(c.mrr, c.mrrCurrency, { digits: 2 })
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                      {c.subStatus ?? "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[10px] text-[var(--faint)]">
                      {c.polar_customer_id
                        ? `${c.polar_customer_id.slice(0, 8)}…`
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                      {fmtRel(c.created_at)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                      {fmtRel(c.last_sign_in_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* ── Subscription ledger ── */}
        <Panel
          title="Subscription ledger"
          subtitle={
            data.subscriptions.length > 0
              ? `${data.subscriptions.length} rows · public.subscriptions`
              : "public.subscriptions · empty"
          }
          bodyClassName={
            data.subscriptions.length > 0 ? "p-0" : undefined
          }
        >
          {data.subscriptions.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] px-4 py-8 text-center">
              <p className="font-mono text-[13px] text-[var(--muted)]">
                No subscription rows
              </p>
              <p className="mx-auto mt-2 max-w-lg font-mono text-[11px] leading-relaxed text-[var(--faint)]">
                Polar webhook should upsert on{" "}
                <code className="text-[var(--fg)]">subscription.created</code> /{" "}
                <code className="text-[var(--fg)]">subscription.active</code>
                {" "}with amount (cents), interval, status, polar_product_id.
                Until then MRR uses profiles + catalog.
              </p>
            </div>
          ) : (
            <div className="max-h-[min(48vh,420px)] overflow-auto">
              <table className="w-full min-w-[1000px] text-left text-[12px]">
                <thead className="sticky top-0 z-[1] bg-[var(--panel)]">
                  <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    <th className="px-3 pb-2 pt-2 pr-3 font-medium">
                      Customer
                    </th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">SKU</th>
                    <th className="pb-2 pr-3 font-medium">Period</th>
                    <th className="pb-2 pr-3 font-medium">MRR</th>
                    <th className="pb-2 pr-3 font-medium">Interval</th>
                    <th className="pb-2 pr-3 font-medium">Period end</th>
                    <th className="pb-2 pr-3 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--border)]/40 hover:bg-[var(--surface)]/30"
                    >
                      <td className="px-3 py-2 pr-3">
                        <div className="font-medium">
                          {s.display_name || s.email || s.user_id.slice(0, 8)}
                        </div>
                        <div className="font-mono text-[10px] text-[var(--faint)]">
                          {s.email}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={statusTone(s.status)}>
                            {s.status ?? "—"}
                          </Badge>
                          {s.cancel_at_period_end && (
                            <Badge tone="warn">canceling</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-[var(--muted)]">
                        {s.catalogLabel ||
                          s.polar_product_id?.slice(0, 10) ||
                          "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums">
                        {s.period != null
                          ? fmtMoney(s.period, s.periodCurrency, { digits: 2 })
                          : "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-[var(--accent)]">
                        {fmtMoney(s.mrr, s.mrrCurrency, { digits: 2 })}
                      </td>
                      <td className="py-2 pr-3 text-[var(--muted)]">
                        {s.recurring_interval ?? "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px]">
                        {fmtDate(s.current_period_end)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px]">
                        {fmtDate(s.started_at || s.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </main>
    </>
  );
}
