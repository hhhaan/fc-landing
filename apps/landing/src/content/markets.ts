/**
 * Per-market pricing — SSOT: fc-desktop/docs/pricing/03-pricing.md
 * Do not hard-code prices elsewhere; derive display from these numbers.
 */

export type BillingMarket = "US" | "KR" | "JP";

export type MarketPriceTier = {
  /** Monthly shelf (minor units for USD cents are whole dollars here). */
  monthly: number;
  /** KR launch framing — list anchor for strikethrough. */
  monthlyAnchor?: number;
  /** Annual total (monthly × 10). */
  yearlyTotal: number;
  /** Effective monthly when billed annually (yearlyTotal ÷ 12). */
  yearlyEffective: number;
};

export type MarketContent = {
  market: BillingMarket;
  currency: "USD" | "KRW" | "JPY";
  pro: MarketPriceTier;
  proPlus: MarketPriceTier;
};

/** Locked v1.0 · 2026-07-13 — fc-desktop/docs/pricing/FINAL.md §4 */
export const MARKETS: Record<BillingMarket, MarketContent> = {
  US: {
    market: "US",
    currency: "USD",
    pro: { monthly: 49, yearlyTotal: 490, yearlyEffective: 40.83 },
    proPlus: { monthly: 79, yearlyTotal: 790, yearlyEffective: 65.83 },
  },
  KR: {
    market: "KR",
    currency: "KRW",
    pro: {
      monthly: 44_900,
      monthlyAnchor: 59_000,
      yearlyTotal: 449_000,
      yearlyEffective: 37_417,
    },
    proPlus: {
      monthly: 69_900,
      monthlyAnchor: 89_000,
      yearlyTotal: 699_000,
      yearlyEffective: 58_250,
    },
  },
  JP: {
    market: "JP",
    currency: "JPY",
    pro: { monthly: 7_390, yearlyTotal: 73_900, yearlyEffective: 6_158 },
    proPlus: { monthly: 11_900, yearlyTotal: 119_000, yearlyEffective: 9_917 },
  },
};