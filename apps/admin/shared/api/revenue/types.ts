import type { CatalogPlan, MrrCurrencyBucket } from "@/shared/lib/pricing";

export type SubRow = {
  id: string;
  user_id: string;
  status: string | null;
  polar_subscription_id: string | null;
  polar_product_id: string | null;
  amount: number | null;
  currency: string | null;
  recurring_interval: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  ends_at: string | null;
  started_at: string | null;
  trial_end: string | null;
  created_at: string;
  email: string | null;
  display_name: string | null;
  business_name: string | null;
  profile_plan: string | null;
  mrr: number;
  mrrCurrency: string;
  period: number | null;
  periodCurrency: string;
  catalogLabel: string | null;
  catalogName: string | null;
};

export type CustomerRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  business_name: string | null;
  plan: string;
  polar_customer_id: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  /** recognized MRR from billable subs for this user (Polar currency) */
  mrr: number;
  mrrCurrency: string;
  subStatus: string | null;
  pipeline: "paying" | "polar_free" | "free" | "paid_no_sub";
};

export type RevenueData = {
  /** Where MRR numbers come from */
  source: "subscriptions" | "profiles_estimate" | "empty";
  mrrByCurrency: MrrCurrencyBucket[];
  kpis: {
    mrrAtRiskByCurrency: MrrCurrencyBucket[];
    mrrTrialByCurrency: MrrCurrencyBucket[];
    pipelineMrrByCurrency: MrrCurrencyBucket[];
    payingCustomers: number;
    trialing: number;
    pastDue: number;
    canceling: number;
    canceled: number;

    totalUsers: number;
    freeUsers: number;
    paidUsers: number;
    polarLinked: number;
    incompleteCheckout: number;
    conversionRate: number;
    polarRate: number;
    paidToPolarRate: number; // paid / polar when polar > 0
    netNewUsers30d: number;
  };
  funnel: { key: string; label: string; value: number; rateFromPrev: number | null }[];
  planMix: {
    plan: string;
    count: number;
    pct: number;
    mrrByCurrency: MrrCurrencyBucket[];
  }[];
  statusMix: {
    status: string;
    count: number;
    mrrByCurrency: MrrCurrencyBucket[];
  }[];
  intervalMix: {
    interval: string;
    count: number;
    mrrByCurrency: MrrCurrencyBucket[];
  }[];
  catalog: (CatalogPlan & {
    activeCount: number;
    mrrByCurrency: MrrCurrencyBucket[];
  })[];
  mrrTimeline: {
    date: string;
    label: string;
    mrrByCurrency: MrrCurrencyBucket[];
  }[];
  signupSeries: { date: string; count: number }[];
  customers: CustomerRow[];
  subscriptions: SubRow[];
  alerts: { tone: "warn" | "bad" | "info"; title: string; body: string }[];
  generatedAt: string;
};
