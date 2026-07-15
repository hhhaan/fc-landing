import "server-only";
import type { OverviewData } from "./types";
export type { OverviewData };

import { getAdminClient } from "@/shared/lib/supabase/admin";
import {
  BILLABLE_STATUSES,
  PRICE_CATALOG,
  addMrrBucket,
  FALLBACK_CURRENCY,
  mrrBucketsFromMap,
  polarMrrFromSubscription,
} from "@/shared/lib/pricing";

const PRO_MONTHLY_USD = PRICE_CATALOG.find((c) => c.key === "pro-monthly")?.monthlyUsd ?? 29;

export async function getOverviewData(): Promise<OverviewData> {
  const sb = getAdminClient();
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();

  const [
    profilesRes,
    rosterRes,
    subRowsRes,
    subsCountRes,
    alertRunsRes,
    machineRes,
    sessionIpsRes,
  ] = await Promise.all([
    sb
      .from("profiles")
      .select("id, plan, polar_customer_id, created_at")
      .order("created_at", { ascending: false }),
    sb.rpc("admin_user_roster"),
    sb
      .from("subscriptions")
      .select("status, amount, currency, recurring_interval, polar_product_id"),
    sb.from("subscriptions").select("id", { count: "exact", head: true }),
    sb
      .from("inventory_alert_runs")
      .select("id, started_at, status, error_message")
      .order("started_at", { ascending: false })
      .gte("started_at", since7)
      .limit(100),
    sb
      .from("machine_connection_logs")
      .select("id, success, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    sb.rpc("admin_auth_session_ips"),
  ]);

  if (rosterRes.error) throw rosterRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (subRowsRes.error) throw subRowsRes.error;
  if (subsCountRes.error) throw subsCountRes.error;
  if (alertRunsRes.error) throw alertRunsRes.error;
  if (machineRes.error) throw machineRes.error;
  if (sessionIpsRes.error) throw sessionIpsRes.error;

  const profiles = profilesRes.data ?? [];
  const roster = rosterRes.data ?? [];
  const alertRuns = alertRunsRes.data ?? [];
  const machineLogs = machineRes.data ?? [];

  const mrrMap = new Map<string, number>();
  for (const s of subRowsRes.data ?? []) {
    const st = (s.status ?? "").toLowerCase();
    if (!BILLABLE_STATUSES.has(st)) continue;
    const polar = polarMrrFromSubscription({
      amount: s.amount,
      currency: s.currency,
      interval: s.recurring_interval,
      productId: s.polar_product_id,
    });
    addMrrBucket(mrrMap, polar.currency, polar.mrr);
  }
  const planPaid = profiles.filter(
    (p) => p.plan && p.plan !== "free" && p.plan !== "unknown",
  ).length;
  if (mrrMap.size === 0 && planPaid > 0) {
    addMrrBucket(mrrMap, FALLBACK_CURRENCY, planPaid * PRO_MONTHLY_USD);
  }
  const mrrByCurrency = mrrBucketsFromMap(mrrMap);

  const seriesMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    seriesMap.set(key, 0);
  }
  for (const p of profiles) {
    const key = p.created_at.slice(0, 10);
    if (seriesMap.has(key)) seriesMap.set(key, (seriesMap.get(key) ?? 0) + 1);
  }

  const activatedUsers = roster.filter((u) => Number(u.roast_count) > 0).length;
  const totalUsers = roster.length;
  const polarLinked = profiles.filter((p) => p.polar_customer_id).length;
  const incompleteCheckout = profiles.filter(
    (p) => p.polar_customer_id && (!p.plan || p.plan === "free"),
  ).length;

  const inventoryFail7d = alertRuns.filter(
    (r) =>
      r.started_at >= since7 &&
      (r.status === "error" || !!r.error_message),
  ).length;
  const lastRun = alertRuns[0] ?? null;

  const machineTotal = machineLogs.length;
  const machineFails = machineLogs.filter((m) => !m.success).length;

  const authSessions = (sessionIpsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.session_count),
    0,
  );

  return {
    mrrByCurrency,
    kpis: {
      totalUsers,
      newUsers7d: roster.filter((u) => u.created_at >= since7).length,
      newUsers30d: roster.filter((u) => u.created_at >= since30).length,
      activeSignins7d: roster.filter(
        (u) => u.last_sign_in_at && u.last_sign_in_at >= since7,
      ).length,
      activeSignins30d: roster.filter(
        (u) => u.last_sign_in_at && u.last_sign_in_at >= since30,
      ).length,
      planFree: profiles.filter((p) => !p.plan || p.plan === "free").length,
      planPaid,
      polarLinked,
      incompleteCheckout,
      subscriptions: subsCountRes.count ?? 0,

      conversionRate:
        totalUsers > 0
          ? Math.round((planPaid / totalUsers) * 1000) / 10
          : 0,
      activatedUsers,
      activationRate:
        totalUsers > 0
          ? Math.round((activatedUsers / totalUsers) * 1000) / 10
          : 0,
    },
    ops: {
      inventoryRuns: alertRuns.length,
      inventoryFail7d,
      inventoryLastAt: lastRun?.started_at ?? null,
      inventoryLastStatus: lastRun?.status ?? null,
      machineLogs: machineTotal,
      machineFailRate:
        machineTotal > 0
          ? Math.round((machineFails / machineTotal) * 1000) / 10
          : null,
      authSessions,
    },
    signupSeries: [...seriesMap.entries()].map(([date, count]) => ({
      date,
      count,
    })),
    recentUsers: roster.slice(0, 10).map((u) => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      plan: u.plan,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      activated: Number(u.roast_count) > 0,
      polar: !!u.polar_customer_id,
    })),
    generatedAt: new Date().toISOString(),
  };
}
