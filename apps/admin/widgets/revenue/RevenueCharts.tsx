"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "#0e1114",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 0,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
} as const;

function currencySymbol(currency: string) {
  if (currency === "KRW") return "₩";
  if (currency === "JPY") return "¥";
  return "$";
}

export function RevenueMrrChart({
  data,
  currency = "USD",
  empty,
}: {
  data: { date: string; mrr: number; label: string }[];
  currency?: string;
  empty?: boolean;
}) {
  const sym = currencySymbol(currency);
  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revMrrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#81FBA5" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#81FBA5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{
              fill: "#6b7280",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            tick={{
              fill: "#6b7280",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[0, (max: number) => Math.max(max, 10)]}
            tickFormatter={(v) => `${sym}${v}`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#e5e7eb" }}
            formatter={(value) => [
              `${sym}${Number(value ?? 0).toLocaleString("en-US", {
                maximumFractionDigits: currency === "USD" ? 2 : 0,
              })}`,
              `MRR · ${currency}`,
            ]}
          />
          <Area
            type="monotone"
            dataKey="mrr"
            stroke="#81FBA5"
            fill="url(#revMrrFill)"
            strokeWidth={1.75}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="border border-[var(--border)] bg-[var(--panel)]/90 px-3 py-2 text-center font-mono text-[11px] text-[var(--muted)] backdrop-blur">
            No recognized MRR yet
            <div className="mt-0.5 text-[10px] text-[var(--faint)]">
              Chart populates when billable subscriptions exist
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SignupBarChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const compact = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={compact}
          margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{
              fill: "#6b7280",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{
              fill: "#6b7280",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#e5e7eb" }}
            cursor={{ fill: "rgba(68,191,252,0.08)" }}
          />
          <Bar
            dataKey="count"
            fill="#44BFFC"
            maxBarSize={10}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const PLAN_COLORS: Record<string, string> = {
  free: "#5c646e",
  pro: "#81FBA5",
  enterprise: "#44BFFC",
  unknown: "#756AFC",
};

export function PlanDonut({
  data,
}: {
  data: { plan: string; count: number }[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const chartData = data.map((d) => ({
    ...d,
    fill: PLAN_COLORS[d.plan.toLowerCase()] ?? "#A6B0FF",
  }));

  return (
    <div className="flex h-44 items-center gap-3">
      <div className="h-full w-[55%] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="plan"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.plan} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [
                `${value} (${Math.round((Number(value) / total) * 100)}%)`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 font-mono text-[11px]">
        {chartData.map((d) => (
          <li key={d.plan} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 truncate text-[var(--muted)]">
              <span
                className="inline-block h-2 w-2 shrink-0"
                style={{ background: d.fill }}
              />
              {d.plan}
            </span>
            <span className="tabular-nums text-[var(--fg)]">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FunnelVisual({
  steps,
}: {
  steps: {
    label: string;
    value: number;
    rateFromPrev: number | null;
  }[];
}) {
  const peak = Math.max(...steps.map((s) => s.value), 1);
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={step.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
              {String(i + 1).padStart(2, "0")} · {step.label}
            </span>
            <span className="font-mono text-[13px] tabular-nums">
              <span className="text-[var(--fg)]">{step.value}</span>
              {step.rateFromPrev != null && (
                <span className="ml-1.5 text-[10px] text-[var(--cyan)]">
                  {step.rateFromPrev}%
                </span>
              )}
            </span>
          </div>
          <div className="h-2.5 bg-[var(--surface)]">
            <div
              className="h-full transition-all"
              style={{
                width: `${(step.value / peak) * 100}%`,
                background:
                  i === steps.length - 1
                    ? "var(--accent)"
                    : "rgba(68,191,252,0.85)",
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
