import "server-only";
import type { SubscriptionRow, RevenueKpis, BillingData } from "./types";
export type { SubscriptionRow, RevenueKpis, BillingData };

import { getAdminClient } from "@/shared/lib/supabase/admin";
import {
  BILLABLE_STATUSES,
  PRICE_CATALOG,
  amountToUsd,
  catalogByProductId,
  toMrrUsd,
  type CatalogPlan,
} from "@/shared/lib/pricing";

const CANCELED_STATUSES = new Set(["canceled", "cancelled", "revoked"]);
const PRO_MONTHLY_USD =
  PRICE_CATALOG.find((c) => c.key === "pro-monthly")?.monthlyUsd ?? 49;

function normalizeStatus(s: string | null | undefined) {
  return (s ?? "unknown").toLowerCase();
}

export async function getBillingData(): Promise<BillingData> {
  const sb = getAdminClient();

  const [profilesRes, subsRes, rosterRes] = await Promise.all([
    sb
      .from("profiles")
      .select("id, display_name, plan, polar_customer_id, created_at")
      .order("created_at", { ascending: false }),
    sb
      .from("subscriptions")
      .select(
        "id, user_id, status, polar_subscription_id, polar_product_id, amount, currency, recurring_interval, current_period_start, current_period_end, cancel_at_period_end, canceled_at, ends_at, started_at, trial_end, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    sb.rpc("admin_user_roster"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (subsRes.error) throw subsRes.error;
  if (rosterRes.error) throw rosterRes.error;

  const profiles = profilesRes.data ?? [];
  const roster = rosterRes.data ?? [];
  const rosterById = new Map(roster.map((u) => [u.id, u]));

  const planMap = new Map<string, number>();
  for (const p of profiles) {
    const plan = p.plan ?? "unknown";
    planMap.set(plan, (planMap.get(plan) ?? 0) + 1);
  }

  const subscriptions: SubscriptionRow[] = (subsRes.data ?? []).map((s) => {
    const user = rosterById.get(s.user_id);
    const catalog = catalogByProductId(s.polar_product_id);
    const mrrUsd = toMrrUsd({
      amount: s.amount,
      currency: s.currency,
      interval: s.recurring_interval,
      productId: s.polar_product_id,
    });
    const periodUsd = amountToUsd(s.amount, s.currency);
    return {
      ...s,
      email: user?.email ?? null,
      display_name: user?.display_name ?? null,
      profile_plan: user?.plan ?? null,
      mrrUsd,
      periodUsd,
      catalogLabel: catalog
        ? `${catalog.name} · ${catalog.interval}`
        : null,
    };
  });

  const statusMap = new Map<string, number>();
  const intervalMap = new Map<string, { count: number; mrrUsd: number }>();

  let mrrUsd = 0;
  let activeSubs = 0;
  let trialing = 0;
  let pastDue = 0;
  let canceling = 0;
  let canceled = 0;

  for (const s of subscriptions) {
    const st = normalizeStatus(s.status);
    statusMap.set(st, (statusMap.get(st) ?? 0) + 1);

    const interval = (s.recurring_interval ?? "unknown").toLowerCase();
    const iv = intervalMap.get(interval) ?? { count: 0, mrrUsd: 0 };
    iv.count += 1;

    if (BILLABLE_STATUSES.has(st) || st === "trialing") {
      // trialing: optional include — include for "committed MRR" soft view
      if (BILLABLE_STATUSES.has(st)) {
        mrrUsd += s.mrrUsd;
        iv.mrrUsd += s.mrrUsd;
        activeSubs += 1;
      }
      if (st === "trialing") trialing += 1;
      if (st === "past_due") pastDue += 1;
    }
    if (s.cancel_at_period_end) canceling += 1;
    if (CANCELED_STATUSES.has(st)) {
      canceled += 1;
    }
    intervalMap.set(interval, iv);
  }

  // If no subscription rows but profiles.plan is paid, estimate from catalog pro monthly
  const paidProfiles = profiles.filter(
    (p) => p.plan && p.plan !== "free" && p.plan !== "unknown",
  ).length;
  const freeProfiles = profiles.filter(
    (p) => !p.plan || p.plan === "free",
  ).length;
  const polarLinked = profiles.filter((p) => p.polar_customer_id).length;
  const incompleteCheckout = profiles.filter(
    (p) => p.polar_customer_id && (!p.plan || p.plan === "free"),
  ).length;

  // Fallback MRR estimate from profile.plan when webhook rows missing
  let estimatedFromProfiles = 0;
  if (subscriptions.length === 0 && paidProfiles > 0) {
    estimatedFromProfiles = paidProfiles * PRO_MONTHLY_USD;
    mrrUsd = estimatedFromProfiles;
    activeSubs = paidProfiles;
  }

  const totalProfiles = profiles.length;
  const arpuUsd = activeSubs > 0 ? mrrUsd / activeSubs : 0;

  // Signup series 30d
  const seriesMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    seriesMap.set(key, 0);
  }
  for (const p of profiles) {
    const key = p.created_at.slice(0, 10);
    if (seriesMap.has(key)) seriesMap.set(key, (seriesMap.get(key) ?? 0) + 1);
  }

  // MRR timeline (90d): cumulative billable MRR by start date
  const startOf = (s: SubscriptionRow) =>
    (s.started_at || s.created_at).slice(0, 10);
  const days: string[] = [];
  for (let i = 89; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  }
  const mrrTimeline = days.map((day) => {
    let dayMrr = 0;
    for (const s of subscriptions) {
      const st = normalizeStatus(s.status);
      if (!BILLABLE_STATUSES.has(st) && st !== "trialing") continue;
      if (startOf(s) > day) continue;
      const ended = s.ends_at?.slice(0, 10) || s.canceled_at?.slice(0, 10);
      if (ended && ended <= day) continue;
      // only count billable toward money line; trialing as soft (0 unless amount present)
      if (BILLABLE_STATUSES.has(st)) dayMrr += s.mrrUsd;
    }
    return { date: day, mrrUsd: Math.round(dayMrr * 100) / 100 };
  });

  const polarProfiles = profiles
    .filter((p) => p.polar_customer_id)
    .map((p) => ({
      id: p.id,
      display_name: p.display_name,
      plan: p.plan ?? "unknown",
      polar_customer_id: p.polar_customer_id,
      email: rosterById.get(p.id)?.email ?? null,
    }));

  return {
    kpis: {
      mrrUsd: Math.round(mrrUsd * 100) / 100,
      arrUsd: Math.round(mrrUsd * 12 * 100) / 100,
      activeSubs,
      trialing,
      pastDue,
      canceling,
      canceled,
      arpuUsd: Math.round(arpuUsd * 100) / 100,
      conversionRate:
        totalProfiles > 0
          ? Math.round((paidProfiles / totalProfiles) * 1000) / 10
          : 0,
      polarConversionRate:
        totalProfiles > 0
          ? Math.round((polarLinked / totalProfiles) * 1000) / 10
          : 0,
      paidProfiles,
      freeProfiles,
      polarLinked,
      totalProfiles,
      incompleteCheckout,
      catalogProMonthly: freeProfiles * PRO_MONTHLY_USD,
    },
    planDistribution: [...planMap.entries()].map(([plan, count]) => ({
      plan,
      count,
    })),
    statusDistribution: [...statusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    intervalDistribution: [...intervalMap.entries()]
      .map(([interval, v]) => ({
        interval,
        count: v.count,
        mrrUsd: Math.round(v.mrrUsd * 100) / 100,
      }))
      .sort((a, b) => b.mrrUsd - a.mrrUsd),
    catalog: PRICE_CATALOG,
    subscriptions,
    polarProfiles,
    signupSeries: [...seriesMap.entries()].map(([date, count]) => ({
      date,
      count,
    })),
    mrrTimeline,
    generatedAt: new Date().toISOString(),
  };
}
