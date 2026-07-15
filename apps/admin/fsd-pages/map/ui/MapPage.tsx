"use client";

import { TopBar } from "@/widgets/shell/TopBar";
import { Panel } from "@/shared/ui/Panel";
import { WorldMap } from "@/widgets/map/WorldMap";
import { useGeo } from "@/shared/api/geo/queries";
import { QueryError, QueryLoading } from "@/shared/ui/QueryState";
import { fmtNum, fmtRel } from "@/shared/lib/format";

export default function MapPage() {
  const { data, isPending, isError, error } = useGeo();
  if (isPending) return <QueryLoading label="Loading map" />;
  if (isError || !data) return <QueryError message={error?.message} />;

  return (
    <>
      <TopBar
        title="Global Map"
        subtitle="Active regions inferred from auth.sessions IP geolocation"
        refreshedAt={data.generatedAt}
      />
      <main className="flex-1 space-y-3 overflow-auto p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_300px]">
          <WorldMap countries={data.countries} points={data.points} />

          <div className="flex flex-col gap-3">
            <Panel title="Country rank" subtitle="By session volume">
              {data.countries.length === 0 ? (
                <p className="font-mono text-[12px] text-[var(--muted)]">
                  No geolocated sessions yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.countries.map((c, i) => (
                    <li
                      key={c.countryCode}
                      className="flex items-center justify-between gap-2 border-b border-[var(--border)]/50 pb-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[var(--faint)]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="truncate text-[13px] font-medium">
                            {c.country}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--muted)]">
                            {c.countryCode}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-[var(--faint)]">
                          {c.ips} IP · {c.users} users
                        </div>
                      </div>
                      <div className="font-mono text-[13px] tabular-nums text-[var(--accent)]">
                        {fmtNum(c.sessions)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="IP samples" subtitle="Resolved endpoints">
              <ul className="max-h-64 space-y-2 overflow-auto">
                {data.points.map((p) => (
                  <li
                    key={p.ip}
                    className="border-b border-[var(--border)]/40 pb-2 last:border-0"
                  >
                    <div className="font-mono text-[11px] text-[var(--cyan)]">
                      {p.ip}
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {[p.city, p.country].filter(Boolean).join(" · ")}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[var(--faint)]">
                      {p.session_count} sess · {fmtRel(p.last_seen)}
                    </div>
                  </li>
                ))}
              </ul>
              {data.unresolved.length > 0 && (
                <p className="mt-2 font-mono text-[10px] text-[var(--warn)]">
                  {data.unresolved.length} IP unresolved
                </p>
              )}
            </Panel>
          </div>
        </div>
      </main>
    </>
  );
}
