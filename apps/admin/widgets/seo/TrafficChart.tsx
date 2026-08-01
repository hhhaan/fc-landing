'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function TrafficChart({ data }: { data: { date: string; clicks: number; impressions: number }[] }) {
    const compact = data.map((d) => ({
        ...d,
        label: d.date.slice(5),
    }));

    return (
        <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compact} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                        dataKey="label"
                        tick={{
                            fill: '#6b7280',
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                        }}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                        interval="preserveStartEnd"
                        minTickGap={28}
                    />
                    <YAxis
                        yAxisId="imp"
                        tick={{
                            fill: '#6b7280',
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                        allowDecimals={false}
                    />
                    <YAxis
                        yAxisId="clk"
                        orientation="right"
                        tick={{
                            fill: '#6b7280',
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#0e1114',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 0,
                            fontSize: 12,
                            fontFamily: 'var(--font-mono)',
                        }}
                        labelStyle={{ color: '#9ca3af' }}
                        itemStyle={{ color: '#e5e7eb' }}
                    />
                    <Legend
                        wrapperStyle={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            color: '#9ca3af',
                        }}
                    />
                    <Line
                        yAxisId="imp"
                        type="monotone"
                        dataKey="impressions"
                        name="Impressions"
                        stroke="#60a5fa"
                        strokeWidth={1.5}
                        dot={false}
                    />
                    <Line
                        yAxisId="clk"
                        type="monotone"
                        dataKey="clicks"
                        name="Clicks"
                        stroke="#81FBA5"
                        strokeWidth={1.5}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
