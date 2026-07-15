import type { CatalogPlan } from "@/shared/lib/pricing";

export type SubscriptionRow = {
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
  // joined
  email: string | null;
  display_name: string | null;
  profile_plan: string | null;
  mrrUsd: number;
  periodUsd: number | null;
  catalogLabel: string | null;
};

export type RevenueKpis = {
  mrrUsd: number;
  arrUsd: number;
  activeSubs: number;
  trialing: number;
  pastDue: number;
  canceling: number; // cancel_at_period_end
  canceled: number;
  arpuUsd: number;
  conversionRate: number; // paid profiles / total profiles
  polarConversionRate: number; // polar linked / total
  paidProfiles: number;
  freeProfiles: number;
  polarLinked: number;
  totalProfiles: number;
  /** Pipeline: polar checkout done but plan still free */
  incompleteCheckout: number;
  /** Theoretical MRR if all free→pro monthly converted (not pipeline) */
  catalogProMonthly: number;
};

export type BillingData = {
  kpis: RevenueKpis;
  planDistribution: { plan: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  intervalDistribution: { interval: string; count: number; mrrUsd: number }[];
  catalog: CatalogPlan[];
  subscriptions: SubscriptionRow[];
  polarProfiles: {
    id: string;
    display_name: string | null;
    plan: string;
    polar_customer_id: string | null;
    email: string | null;
  }[];
  /** New profiles per day last 30d for growth context */
  signupSeries: { date: string; count: number }[];
  /** Cumulative estimated MRR timeline from subscription started_at / created_at */
  mrrTimeline: { date: string; mrrUsd: number }[];
  generatedAt: string;
};
