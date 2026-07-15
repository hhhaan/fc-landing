import "server-only";
import type { SubRow, CustomerRow, RevenueData } from "./types";
export type { SubRow, CustomerRow, RevenueData };

import { getAdminClient } from "@/shared/lib/supabase/admin";
import {
  BILLABLE_STATUSES,
  PRICE_CATALOG,
  addMrrBucket,
  catalogByProductId,
  FALLBACK_CURRENCY,
  mrrBucketsFromMap,
  polarMrrFromSubscription,
  type MrrCurrencyBucket,
} from "@/shared/lib/pricing";
import { fmtMoney } from "@/shared/lib/format";

function norm(s: string | null | undefined) {
  return (s ?? "unknown").toLowerCase();
}

const PRO_MONTHLY_USD =
  PRICE_CATALOG.find((c) => c.key === "pro-monthly")?.monthlyUsd ?? 49;
const PRO_PLUS_MONTHLY_USD =
  PRICE_CATALOG.find((c) => c.key === "pro-plus-monthly")?.monthlyUsd ?? 79;
const ENTERPRISE_MONTHLY_USD =
  PRICE_CATALOG.find((c) => c.key === "enterprise-monthly")?.monthlyUsd ?? 300;
const CANCELED_STATUSES = new Set(["canceled", "cancelled", "revoked"]);

export async function getRevenueData(): Promise<RevenueData> {
  const sb = getAdminClient();
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();

  const [profilesRes, subsRes, rosterRes] = await Promise.all([
    sb
      .from("profiles")
      .select(
        "id, display_name, plan, polar_customer_id, created_at, business_name",
      )
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
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const subscriptions: SubRow[] = (subsRes.data ?? []).map((s) => {
    const user = rosterById.get(s.user_id);
    const prof = profileById.get(s.user_id);
    const catalog = catalogByProductId(s.polar_product_id);
    const polar = polarMrrFromSubscription({
      amount: s.amount,
      currency: s.currency,
      interval: s.recurring_interval,
      productId: s.polar_product_id,
    });
    return {
      ...s,
      email: user?.email ?? null,
      display_name: user?.display_name ?? prof?.display_name ?? null,
      business_name: prof?.business_name ?? null,
      profile_plan: user?.plan ?? prof?.plan ?? null,
      mrr: polar.mrr,
      mrrCurrency: polar.currency,
      period: polar.period,
      periodCurrency: polar.currency,
      catalogLabel: catalog
        ? `${catalog.name} · ${catalog.interval}`
        : null,
      catalogName: catalog?.name ?? null,
    };
  });

  // Per-user recognized MRR (billable only)
  const mrrByUser = new Map<string, { mrr: number; currency: string }>();
  const statusByUser = new Map<string, string>();
  const mrrTotalMap = new Map<string, number>();
  const mrrAtRiskMap = new Map<string, number>();
  const mrrTrialMap = new Map<string, number>();
  let payingCustomers = 0;
  let trialing = 0;
  let pastDue = 0;
  let canceling = 0;
  let canceled = 0;

  const statusMap = new Map<
    string,
    { count: number; mrrMap: Map<string, number> }
  >();
  const intervalMap = new Map<
    string,
    { count: number; mrrMap: Map<string, number> }
  >();
  const catalogCounts = new Map<
    string,
    { count: number; mrrMap: Map<string, number> }
  >();

  for (const s of subscriptions) {
    const st = norm(s.status);
    const sm = statusMap.get(st) ?? { count: 0, mrrMap: new Map() };
    sm.count += 1;

    const ivKey = (s.recurring_interval ?? "unknown").toLowerCase();
    const iv = intervalMap.get(ivKey) ?? { count: 0, mrrMap: new Map() };
    iv.count += 1;

    if (BILLABLE_STATUSES.has(st)) {
      addMrrBucket(mrrTotalMap, s.mrrCurrency, s.mrr);
      addMrrBucket(sm.mrrMap, s.mrrCurrency, s.mrr);
      addMrrBucket(iv.mrrMap, s.mrrCurrency, s.mrr);
      payingCustomers += 1;
      const prev = mrrByUser.get(s.user_id);
      mrrByUser.set(s.user_id, {
        mrr: (prev?.mrr ?? 0) + s.mrr,
        currency: s.mrrCurrency,
      });
      statusByUser.set(s.user_id, st);
      if (st === "past_due" || s.cancel_at_period_end) {
        addMrrBucket(mrrAtRiskMap, s.mrrCurrency, s.mrr);
      }
      if (s.polar_product_id) {
        const cat = catalogByProductId(s.polar_product_id);
        const key = cat?.key ?? s.polar_product_id;
        const cc = catalogCounts.get(key) ?? {
          count: 0,
          mrrMap: new Map(),
        };
        cc.count += 1;
        addMrrBucket(cc.mrrMap, s.mrrCurrency, s.mrr);
        catalogCounts.set(key, cc);
      }
    }
    if (st === "trialing") {
      trialing += 1;
      addMrrBucket(mrrTrialMap, s.mrrCurrency, s.mrr);
      statusByUser.set(s.user_id, st);
    }
    if (st === "past_due") pastDue += 1;
    if (s.cancel_at_period_end) canceling += 1;
    if (CANCELED_STATUSES.has(st)) canceled += 1;

    statusMap.set(st, sm);
    intervalMap.set(ivKey, iv);
  }

  const paidUsers = profiles.filter(
    (p) => p.plan && p.plan !== "free" && p.plan !== "unknown",
  ).length;
  const freeUsers = profiles.filter(
    (p) => !p.plan || p.plan === "free",
  ).length;
  const polarLinked = profiles.filter((p) => p.polar_customer_id).length;
  const incompleteCheckout = profiles.filter(
    (p) => p.polar_customer_id && (!p.plan || p.plan === "free"),
  ).length;
  const totalUsers = profiles.length;

  let source: RevenueData["source"] = "empty";
  const mrrByCurrency = mrrBucketsFromMap(mrrTotalMap);

  if (subscriptions.length > 0) {
    source = "subscriptions";
  } else if (paidUsers > 0) {
    source = "profiles_estimate";
    addMrrBucket(mrrTotalMap, FALLBACK_CURRENCY, paidUsers * PRO_MONTHLY_USD);
    payingCustomers = paidUsers;
  }

  const pipelineMrrMap = new Map<string, number>();
  if (incompleteCheckout > 0) {
    addMrrBucket(
      pipelineMrrMap,
      FALLBACK_CURRENCY,
      incompleteCheckout * PRO_MONTHLY_USD,
    );
  }

  // Plan mix with estimated mrr contribution
  const planMap = new Map<string, number>();
  for (const p of profiles) {
    const plan = p.plan ?? "unknown";
    planMap.set(plan, (planMap.get(plan) ?? 0) + 1);
  }
  const mrrByPlan = new Map<string, Map<string, number>>();
  if (source === "subscriptions") {
    for (const p of profiles) {
      const plan = p.plan ?? "unknown";
      const hit = mrrByUser.get(p.id);
      if (!hit) continue;
      const map = mrrByPlan.get(plan) ?? new Map();
      addMrrBucket(map, hit.currency, hit.mrr);
      mrrByPlan.set(plan, map);
    }
  }

  const planMix = [...planMap.entries()]
    .map(([plan, count]) => {
      let buckets: MrrCurrencyBucket[] = [];
      if (source === "subscriptions" && plan !== "free") {
        buckets = mrrBucketsFromMap(mrrByPlan.get(plan) ?? new Map());
      } else if (plan === "pro") {
        buckets = [
          {
            currency: FALLBACK_CURRENCY,
            mrr: count * PRO_MONTHLY_USD,
            arr: count * PRO_MONTHLY_USD * 12,
          },
        ];
      } else if (plan === "pro_plus" || plan === "pro+") {
        buckets = [
          {
            currency: FALLBACK_CURRENCY,
            mrr: count * PRO_PLUS_MONTHLY_USD,
            arr: count * PRO_PLUS_MONTHLY_USD * 12,
          },
        ];
      } else if (plan === "enterprise") {
        buckets = [
          {
            currency: FALLBACK_CURRENCY,
            mrr: count * ENTERPRISE_MONTHLY_USD,
            arr: count * ENTERPRISE_MONTHLY_USD * 12,
          },
        ];
      }
      return {
        plan,
        count,
        pct: totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
        mrrByCurrency: buckets,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Funnel
  const funnelRaw = [
    { key: "users", label: "Total users", value: totalUsers },
    { key: "polar", label: "Polar customer", value: polarLinked },
    { key: "paid", label: "Paid plan", value: paidUsers },
    {
      key: "paying",
      label: "Paying (billable)",
      value: source === "subscriptions" ? payingCustomers : paidUsers,
    },
  ];
  const funnel = funnelRaw.map((step, i) => {
    const prev = i === 0 ? null : funnelRaw[i - 1].value;
    const rateFromPrev =
      prev != null && prev > 0
        ? Math.round((step.value / prev) * 1000) / 10
        : null;
    return { ...step, rateFromPrev };
  });

  // Timeline 90d
  const days: string[] = [];
  for (let i = 89; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  }
  const mrrTimeline = days.map((day) => {
    const dayMap = new Map<string, number>();
    if (source === "subscriptions") {
      for (const s of subscriptions) {
        const st = norm(s.status);
        if (!BILLABLE_STATUSES.has(st)) continue;
        const started = (s.started_at || s.created_at).slice(0, 10);
        if (started > day) continue;
        const ended = s.ends_at?.slice(0, 10) || s.canceled_at?.slice(0, 10);
        if (ended && ended <= day) continue;
        addMrrBucket(dayMap, s.mrrCurrency, s.mrr);
      }
    } else if (source === "profiles_estimate") {
      for (const b of mrrBucketsFromMap(mrrTotalMap)) {
        addMrrBucket(dayMap, b.currency, b.mrr);
      }
    }
    return {
      date: day,
      label: day.slice(5),
      mrrByCurrency: mrrBucketsFromMap(dayMap),
    };
  });

  // Signups 30d
  const signupMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    signupMap.set(
      new Date(Date.now() - i * 864e5).toISOString().slice(0, 10),
      0,
    );
  }
  for (const p of profiles) {
    const key = p.created_at.slice(0, 10);
    if (signupMap.has(key)) signupMap.set(key, (signupMap.get(key) ?? 0) + 1);
  }

  // Customers (all profiles, ranked business-relevant first)
  const customers: CustomerRow[] = profiles.map((p) => {
    const rosterU = rosterById.get(p.id);
    const userMrr = mrrByUser.get(p.id);
    const isPaid = p.plan && p.plan !== "free" && p.plan !== "unknown";
    let pipeline: CustomerRow["pipeline"] = "free";
    if ((userMrr?.mrr ?? 0) > 0) pipeline = "paying";
    else if (isPaid) pipeline = "paid_no_sub";
    else if (p.polar_customer_id) pipeline = "polar_free";

    return {
      id: p.id,
      email: rosterU?.email ?? null,
      display_name: p.display_name,
      business_name: p.business_name,
      plan: p.plan ?? "unknown",
      polar_customer_id: p.polar_customer_id,
      created_at: p.created_at,
      last_sign_in_at: rosterU?.last_sign_in_at ?? null,
      mrr: userMrr?.mrr ?? 0,
      mrrCurrency: userMrr?.currency ?? FALLBACK_CURRENCY,
      subStatus: statusByUser.get(p.id) ?? null,
      pipeline,
    };
  });

  customers.sort((a, b) => {
    const rank = (p: CustomerRow["pipeline"]) =>
      ({ paying: 0, paid_no_sub: 1, polar_free: 2, free: 3 })[p];
    const d = rank(a.pipeline) - rank(b.pipeline);
    if (d !== 0) return d;
    return b.mrr - a.mrr;
  });

  const catalog = PRICE_CATALOG.map((c) => {
    const hit = catalogCounts.get(c.key);
    return {
      ...c,
      activeCount: hit?.count ?? 0,
      mrrByCurrency: mrrBucketsFromMap(hit?.mrrMap ?? new Map()),
    };
  });

  const alerts: RevenueData["alerts"] = [];
  if (source === "empty") {
    alerts.push({
      tone: "info",
      title: "No revenue recognized yet",
      body: "No billable subscriptions and no paid plans. Pipeline and catalog below show upside when Polar webhooks land.",
    });
  }
  if (source === "profiles_estimate") {
    alerts.push({
      tone: "warn",
      title: "MRR estimated from profiles.plan",
      body: "subscriptions table has no rows. Using Pro $29/mo × paid profiles. Connect Polar webhooks for ledger-accurate revenue.",
    });
  }
  if (incompleteCheckout > 0) {
    alerts.push({
      tone: "warn",
      title: `${incompleteCheckout} incomplete checkout${incompleteCheckout > 1 ? "s" : ""}`,
      body: "Polar customer exists but plan is still free — webhook may have missed plan upgrade or checkout abandoned after customer create.",
    });
  }
  if (polarLinked > 0 && subscriptions.length === 0) {
    alerts.push({
      tone: "bad",
      title: "Polar customers without subscription rows",
      body: "Check polar-webhook (landing / edge function) writes to public.subscriptions on subscription.created / active.",
    });
  }
  const mrrAtRiskByCurrency = mrrBucketsFromMap(mrrAtRiskMap);
  if (mrrAtRiskByCurrency.length > 0) {
    const label = mrrAtRiskByCurrency
      .map((b) => fmtMoney(b.mrr, b.currency))
      .join(" · ");
    alerts.push({
      tone: "warn",
      title: `${label} MRR at risk`,
      body: "Includes past_due and cancel-at-period-end seats.",
    });
  }

  const finalMrrByCurrency =
    source === "profiles_estimate"
      ? mrrBucketsFromMap(mrrTotalMap)
      : mrrByCurrency;

  return {
    source,
    mrrByCurrency: finalMrrByCurrency,
    kpis: {
      mrrAtRiskByCurrency,
      mrrTrialByCurrency: mrrBucketsFromMap(mrrTrialMap),
      pipelineMrrByCurrency: mrrBucketsFromMap(pipelineMrrMap),
      payingCustomers,
      trialing,
      pastDue,
      canceling,
      canceled,
      totalUsers,
      freeUsers,
      paidUsers,
      polarLinked,
      incompleteCheckout,
      conversionRate: pct(paidUsers, totalUsers),
      polarRate: pct(polarLinked, totalUsers),
      paidToPolarRate: pct(paidUsers, polarLinked),
      netNewUsers30d: profiles.filter((p) => p.created_at >= since30).length,
    },
    funnel,
    planMix,
    statusMix: [...statusMap.entries()]
      .map(([status, v]) => ({
        status,
        count: v.count,
        mrrByCurrency: mrrBucketsFromMap(v.mrrMap),
      }))
      .sort((a, b) => b.count - a.count),
    intervalMix: [...intervalMap.entries()]
      .map(([interval, v]) => ({
        interval,
        count: v.count,
        mrrByCurrency: mrrBucketsFromMap(v.mrrMap),
      }))
      .sort((a, b) => {
        const aSum = a.mrrByCurrency.reduce((s, b) => s + b.mrr, 0);
        const bSum = b.mrrByCurrency.reduce((s, b) => s + b.mrr, 0);
        return bSum - aSum;
      }),
    catalog,
    mrrTimeline,
    signupSeries: [...signupMap.entries()].map(([date, count]) => ({
      date,
      count,
    })),
    customers,
    subscriptions,
    alerts,
    generatedAt: new Date().toISOString(),
  };
}

function pct(num: number, den: number) {
  if (den <= 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}
