/**
 * First Crack public pricing — aligned with fc-desktop/docs/pricing SSOT v0.1.x
 * Regional shelf prices for KR / US / JP; Polar IDs still env-driven.
 */

import type { PricingRegion } from "@/shared/lib/geo-region";

export type CatalogPlanKey =
  | "pro-monthly"
  | "pro-plus-monthly"
  | "enterprise-monthly"
  | "pro-yearly"
  | "pro-plus-yearly"
  | "enterprise-yearly";

export type CatalogPlan = {
  key: CatalogPlanKey;
  /** Canonical plan id */
  plan: "pro" | "pro_plus" | "enterprise";
  name: string;
  interval: "month" | "year";
  /** Display monthly equivalent in USD (US list / reporting) */
  monthlyUsd: number;
  /** Charge amount per billing period in USD (US list) */
  periodUsd: number;
  polarProductIds: string[];
  /** Completed batches / billing month; null = unlimited */
  batchCapPerMonth: number | null;
};

const envIds = {
  proMonthly:
    process.env.POLAR_PRICE_MONTHLY_SBX ||
    process.env.POLAR_PRICE_MONTHLY ||
    process.env.POLAR_PRO_PRODUCT_ID ||
    "b7a53b38-ebc6-4a07-9728-a23bc2a94883",
  proYearly:
    process.env.POLAR_PRICE_YEARLY_SBX ||
    process.env.POLAR_PRICE_YEARLY ||
    "7a4e2064-aa79-4f77-acf1-2d68b54f1e0d",
  proPlusMonthly:
    process.env.POLAR_PRO_PLUS_PRODUCT_ID ||
    process.env.POLAR_PRICE_PRO_PLUS_MONTHLY ||
    "",
  entMonthly:
    process.env.POLAR_PRICE_ENTERPRISE_MONTHLY_SBX ||
    process.env.POLAR_PRICE_ENTERPRISE_MONTHLY ||
    process.env.POLAR_ENTERPRISE_PRODUCT_ID ||
    "e3fac14e-bcff-47d0-8ec8-349ec4421021",
  entYearly:
    process.env.POLAR_PRICE_ENTERPRISE_YEARLY_SBX ||
    process.env.POLAR_PRICE_ENTERPRISE_YEARLY ||
    "8349ba5b-dadf-4f81-9dae-fcb546ff8d87",
};

export const PRICE_CATALOG: CatalogPlan[] = [
  {
    key: "pro-monthly",
    plan: "pro",
    name: "Pro",
    interval: "month",
    monthlyUsd: 49,
    periodUsd: 49,
    polarProductIds: [envIds.proMonthly].filter(Boolean),
    batchCapPerMonth: 200,
  },
  {
    key: "pro-plus-monthly",
    plan: "pro_plus",
    name: "Pro+",
    interval: "month",
    monthlyUsd: 79,
    periodUsd: 79,
    polarProductIds: [envIds.proPlusMonthly].filter(Boolean),
    batchCapPerMonth: null,
  },
  {
    key: "enterprise-monthly",
    plan: "enterprise",
    name: "Enterprise",
    interval: "month",
    monthlyUsd: 300,
    periodUsd: 300,
    polarProductIds: [envIds.entMonthly].filter(Boolean),
    batchCapPerMonth: null,
  },
  {
    key: "pro-yearly",
    plan: "pro",
    name: "Pro",
    interval: "year",
    monthlyUsd: 49,
    periodUsd: 490,
    polarProductIds: [envIds.proYearly].filter(Boolean),
    batchCapPerMonth: 200,
  },
  {
    key: "pro-plus-yearly",
    plan: "pro_plus",
    name: "Pro+",
    interval: "year",
    monthlyUsd: 79,
    periodUsd: 790,
    polarProductIds: [],
    batchCapPerMonth: null,
  },
  {
    key: "enterprise-yearly",
    plan: "enterprise",
    name: "Enterprise",
    interval: "year",
    monthlyUsd: 300,
    periodUsd: 3000,
    polarProductIds: [envIds.entYearly].filter(Boolean),
    batchCapPerMonth: null,
  },
];

/** Regional monthly shelf (launch prices). Enterprise = contact; anchors for ops. */
export type RegionalShelf = {
  region: PricingRegion;
  currency: "KRW" | "USD" | "JPY";
  /** minor-friendly integers for display */
  proMonthly: number;
  proPlusMonthly: number;
  /** KR only: list (strikethrough) before launch */
  proList?: number;
  proPlusList?: number;
  enterpriseBaseMonthly: number | null;
  enterpriseSeatMonthly: number | null;
  contactOnlyEnterprise: boolean;
};

export const REGIONAL_SHELF: Record<PricingRegion, RegionalShelf> = {
  US: {
    region: "US",
    currency: "USD",
    proMonthly: 49,
    proPlusMonthly: 79,
    enterpriseBaseMonthly: 300,
    enterpriseSeatMonthly: 19,
    contactOnlyEnterprise: true,
  },
  KR: {
    region: "KR",
    currency: "KRW",
    proMonthly: 44_000,
    proPlusMonthly: 67_000,
    proList: 59_000,
    proPlusList: 89_000,
    enterpriseBaseMonthly: 450_000,
    enterpriseSeatMonthly: 28_500,
    contactOnlyEnterprise: true,
  },
  JP: {
    region: "JP",
    currency: "JPY",
    proMonthly: 7_400,
    proPlusMonthly: 11_900,
    enterpriseBaseMonthly: 45_000,
    enterpriseSeatMonthly: 2_850,
    contactOnlyEnterprise: true,
  },
};

export function shelfForRegion(region: PricingRegion): RegionalShelf {
  return REGIONAL_SHELF[region] ?? REGIONAL_SHELF.US;
}

/** Polar product id env key pattern for plan × region (target; may be empty). */
export function polarEnvKeyFor(plan: "pro" | "pro_plus", region: PricingRegion): string {
  const p = plan === "pro" ? "PRO" : "PRO_PLUS";
  return `POLAR_${p}_PRODUCT_ID_${region}`;
}

export function catalogByProductId(productId: string | null | undefined) {
  if (!productId) return null;
  return (
    PRICE_CATALOG.find((p) => p.polarProductIds.includes(productId)) ?? null
  );
}

/** When Polar ledger or geo is ambiguous — always USD. */
export const FALLBACK_CURRENCY = "USD";

const LEDGER_CURRENCIES = new Set(["USD", "KRW", "JPY"]);

/** Polar-reported currency only; anything else → USD fallback. */
export function normalizeLedgerCurrency(currency?: string | null): string {
  const c = (currency ?? "").trim().toUpperCase();
  if (LEDGER_CURRENCIES.has(c)) return c;
  return FALLBACK_CURRENCY;
}

/** Polar bills KRW/JPY in whole units; USD etc. in minor (cents). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function polarAmountToMajor(
  amount: number | null | undefined,
  currency?: string | null,
): number | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;
  const c = normalizeLedgerCurrency(currency);
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return amount;
  return amount / 100;
}

export type PolarMrr = {
  mrr: number;
  period: number;
  currency: string;
};

function intervalToMrrFactor(interval: string | null | undefined): number {
  const iv = (interval ?? "month").toLowerCase();
  if (iv === "year" || iv === "yearly" || iv === "annual") return 1 / 12;
  if (iv === "week" || iv === "weekly") return 52 / 12;
  return 1;
}

/** MRR from Polar ledger amount + currency; catalog USD only when amount missing. */
export function polarMrrFromSubscription(opts: {
  amount: number | null | undefined;
  currency?: string | null;
  interval?: string | null;
  productId?: string | null;
}): PolarMrr {
  const currency = normalizeLedgerCurrency(opts.currency);
  const major = polarAmountToMajor(opts.amount, currency);
  if (major != null && major > 0) {
    const factor = intervalToMrrFactor(opts.interval);
    return { mrr: major * factor, period: major, currency };
  }

  const catalog = catalogByProductId(opts.productId);
  if (catalog) {
    return {
      mrr: catalog.monthlyUsd,
      period: catalog.periodUsd,
      currency: FALLBACK_CURRENCY,
    };
  }
  return { mrr: 0, period: 0, currency: FALLBACK_CURRENCY };
}

/** @deprecated Prefer polarMrrFromSubscription — kept for legacy USD-only call sites. */
export function amountToUsd(
  amount: number | null | undefined,
  currency?: string | null,
): number | null {
  return polarAmountToMajor(amount, currency);
}

/** @deprecated Prefer polarMrrFromSubscription.mrr when currency is USD. */
export function toMrrUsd(opts: {
  amount: number | null | undefined;
  currency?: string | null;
  interval?: string | null;
  productId?: string | null;
}): number {
  const { mrr, currency } = polarMrrFromSubscription(opts);
  return currency === "USD" ? mrr : 0;
}

export type MrrCurrencyBucket = {
  currency: string;
  mrr: number;
  arr: number;
};

export function addMrrBucket(
  map: Map<string, number>,
  currency: string,
  mrr: number,
) {
  const c = currency.toUpperCase();
  map.set(c, (map.get(c) ?? 0) + mrr);
}

export function mrrBucketsFromMap(map: Map<string, number>): MrrCurrencyBucket[] {
  return [...map.entries()]
    .map(([currency, mrr]) => ({
      currency,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
    }))
    .filter((b) => b.mrr > 0)
    .sort((a, b) => b.mrr - a.mrr);
}

export const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export const BILLABLE_STATUSES = new Set(["active", "past_due"]);
