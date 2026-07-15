"use client";

import { TopBar } from "@/widgets/shell/TopBar";
import { Badge, KpiCard, Panel } from "@/shared/ui/Panel";
import { useUsers } from "@/shared/api/users/queries";
import { QueryError, QueryLoading } from "@/shared/ui/QueryState";
import { fmtNum, fmtPct, fmtRel } from "@/shared/lib/format";

export default function UsersPage() {
  const { data: users, isPending, isError, error } = useUsers();
  if (isPending) return <QueryLoading label="Loading users" />;
  if (isError || !users) return <QueryError message={error?.message} />;
  const paid = users.filter((u) => u.plan !== "free" && u.plan !== "unknown");
  const activated = users.filter((u) => u.roast_count > 0);
  const polar = users.filter((u) => u.polar_customer_id);
  const active7 = users.filter((u) => {
    if (!u.last_sign_in_at) return false;
    return Date.now() - new Date(u.last_sign_in_at).getTime() < 7 * 864e5;
  });
  const neverSignedIn = users.filter((u) => !u.last_sign_in_at);

  return (
    <>
      <TopBar
        title="Users"
        subtitle="Accounts · plans · activation · engagement (business view)"
      />
      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
        <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Total" value={fmtNum(users.length)} />
          <KpiCard
            label="Active 7d"
            value={fmtNum(active7.length)}
            tone="good"
          />
          <KpiCard
            label="Paid"
            value={fmtNum(paid.length)}
            hint={
              users.length
                ? fmtPct(Math.round((paid.length / users.length) * 1000) / 10)
                : undefined
            }
          />
          <KpiCard
            label="Activated"
            value={fmtNum(activated.length)}
            hint="used product once+"
          />
          <KpiCard label="Polar" value={fmtNum(polar.length)} />
          <KpiCard
            label="Never signed in"
            value={fmtNum(neverSignedIn.length)}
            tone={neverSignedIn.length > 0 ? "warn" : "default"}
          />
        </div>

        <Panel
          title="Roster"
          subtitle="Billing mo = period cycle (started → current_period_start), not calendar tenure"
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="min-h-0 flex-1 overflow-auto"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  <th className="pb-2 pr-3 font-medium">Identity</th>
                  <th className="pb-2 pr-3 font-medium">Business</th>
                  <th className="pb-2 pr-3 font-medium">Plan</th>
                  <th className="pb-2 pr-3 font-medium">Billing mo</th>
                  <th className="pb-2 pr-3 font-medium">Provider</th>
                  <th className="pb-2 pr-3 font-medium">Activated</th>
                  <th className="pb-2 pr-3 font-medium">Polar</th>
                  <th className="pb-2 pr-3 font-medium">Joined</th>
                  <th className="pb-2 font-medium">Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--border)]/50 hover:bg-[var(--surface)]/40"
                  >
                    <td className="py-2.5 pr-3">
                      <div className="font-medium">
                        {u.display_name || "—"}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--faint)]">
                        {u.email || "—"}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--muted)]">
                      {u.business_name || "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={u.plan === "free" ? "default" : "good"}>
                        {u.plan}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      {u.billing_months != null ? (
                        <div>
                          <span className="font-mono tabular-nums text-[var(--accent)]">
                            {u.billing_months} mo
                          </span>
                          <div className="font-mono text-[10px] text-[var(--faint)]">
                            {u.billing_day != null ? `day ${u.billing_day}` : ""}
                            {u.recurring_interval
                              ? `${u.billing_day != null ? " · " : ""}${u.recurring_interval}`
                              : ""}
                            {u.subscription_status
                              ? `${u.billing_day != null || u.recurring_interval ? " · " : ""}${u.subscription_status}`
                              : ""}
                          </div>
                        </div>
                      ) : u.subscription_status?.toLowerCase() === "trialing" ? (
                        <span className="text-[var(--muted)]">trial</span>
                      ) : (
                        <span className="text-[var(--faint)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-[var(--muted)]">
                      {u.provider}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={u.roast_count > 0 ? "good" : "default"}>
                        {u.roast_count > 0 ? "yes" : "no"}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      {u.polar_customer_id ? (
                        <Badge tone="accent">linked</Badge>
                      ) : (
                        <span className="text-[var(--faint)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-[var(--muted)]">
                      {fmtRel(u.created_at)}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-[var(--muted)]">
                      {fmtRel(u.last_sign_in_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    </>
  );
}
