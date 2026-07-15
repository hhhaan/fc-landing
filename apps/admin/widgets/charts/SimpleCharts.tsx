"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtUsd } from "@/shared/lib/format";

export function RoastBarChart({
  data,
  className,
}: {
  data: { date: string; count: number }[];
  /** Default `h-44 w-full`. Use `h-full min-h-0` in flex/grid no-scroll layouts. */
  className?: string;
}) {
  const compact = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className={className ?? "h-44 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={compact} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "#0e1114",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#e5e7eb" }}
            cursor={{ fill: "rgba(129,251,165,0.08)" }}
          />
          <Bar dataKey="count" fill="#81FBA5" radius={[0, 0, 0, 0]} maxBarSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistList({
  items,
  max,
}: {
  items: { label: string; count: number }[];
  max?: number;
}) {
  const peak = max ?? Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[100px_1fr_40px] items-center gap-2">
          <span className="truncate font-mono text-[11px] text-[var(--muted)]">
            {item.label}
          </span>
          <div className="h-1.5 bg-[var(--surface)]">
            <div
              className="h-full bg-[var(--accent)]/80"
              style={{ width: `${(item.count / peak) * 100}%` }}
            />
          </div>
          <span className="text-right font-mono text-[11px] tabular-nums text-[var(--fg)]">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MrrAreaChart({
  data,
}: {
  data: { date: string; mrrUsd: number }[];
}) {
  const compact = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={compact}
          margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#81FBA5" stopOpacity={0.35} />
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
            minTickGap={28}
          />
          <YAxis
            tick={{
              fill: "#6b7280",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#0e1114",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#e5e7eb" }}
            formatter={(value) => [
              fmtUsd(Number(value ?? 0), { digits: 2 }),
              "MRR",
            ]}
          />
          <Area
            type="monotone"
            dataKey="mrrUsd"
            stroke="#81FBA5"
            fill="url(#mrrFill)"
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelSteps({
  steps,
}: {
  steps: { label: string; value: number; hint?: string }[];
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
            <span className="font-mono text-[13px] tabular-nums text-[var(--fg)]">
              {step.value}
              {step.hint && (
                <span className="ml-1.5 text-[10px] text-[var(--muted)]">
                  {step.hint}
                </span>
              )}
            </span>
          </div>
          <div className="h-2 bg-[var(--surface)]">
            <div
              className="h-full bg-[var(--cyan)]/80"
              style={{ width: `${(step.value / peak) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
