import type { MrrCurrencyBucket } from "@/shared/lib/pricing";

export type OverviewData = {
  mrrByCurrency: MrrCurrencyBucket[];
  kpis: {
    totalUsers: number;
    newUsers7d: number;
    newUsers30d: number;
    activeSignins7d: number;
    activeSignins30d: number;
    planFree: number;
    planPaid: number;
    polarLinked: number;
    incompleteCheckout: number;
    subscriptions: number;

    conversionRate: number;
    /** Users with any product activity (session count > 0) — activation, not roast detail */
    activatedUsers: number;
    activationRate: number;
  };
  ops: {
    inventoryRuns: number;
    inventoryFail7d: number;
    inventoryLastAt: string | null;
    inventoryLastStatus: string | null;
    machineLogs: number;
    machineFailRate: number | null;
    authSessions: number;
  };
  signupSeries: { date: string; count: number }[];
  recentUsers: {
    id: string;
    email: string | null;
    display_name: string | null;
    plan: string;
    created_at: string;
    last_sign_in_at: string | null;
    activated: boolean;
    polar: boolean;
  }[];
  generatedAt: string;
};
