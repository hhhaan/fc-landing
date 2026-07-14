import {
  MARKETS,
  type BillingMarket,
  type MarketContent,
  type MarketPriceTier,
} from "../content/markets";

export type { BillingMarket, MarketContent, MarketPriceTier };
export { MARKETS };

/** CF geo unknown → USD shelf (US). */
export const FALLBACK_MARKET: BillingMarket = "US";

export type MarketPricingDisplay = {
  market: BillingMarket;
  pro: {
    monthly: string;
    monthlyAnchor?: string;
    yearlyEffective: string;
    yearlyTotal: string;
  };
  proPlus: {
    monthly: string;
    monthlyAnchor?: string;
    yearlyEffective: string;
    yearlyTotal: string;
  };
  heroProMonthly: string;
};

function formatUsd(amount: number): string {
  const rounded = Math.round(amount);
  return `$${rounded}`;
}

function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("en-US")}`;
}

function formatJpy(amount: number): string {
  return `¥${amount.toLocaleString("en-US")}`;
}

function formatTier(
  tier: MarketPriceTier,
  market: BillingMarket,
): MarketPricingDisplay["pro"] {
  const fmt =
    market === "KR" ? formatKrw : market === "JP" ? formatJpy : formatUsd;
  return {
    monthly: fmt(tier.monthly),
    monthlyAnchor: tier.monthlyAnchor ? fmt(tier.monthlyAnchor) : undefined,
    yearlyEffective: fmt(tier.yearlyEffective),
    yearlyTotal: `Billed ${fmt(tier.yearlyTotal)} / year`,
  };
}

export function getMarketPricing(market: BillingMarket): MarketPricingDisplay {
  const content = MARKETS[market];
  return {
    market,
    pro: formatTier(content.pro, market),
    proPlus: formatTier(content.proPlus, market),
    heroProMonthly: formatTier(content.pro, market).monthly,
  };
}

/**
 * CF-IPCountry → billing market.
 * KR · JP only; every other country (incl. US, EU, XX) → US (USD).
 */
export function countryToMarket(countryCode: string | null | undefined): BillingMarket {
  if (!countryCode) return FALLBACK_MARKET;
  const cc = countryCode.trim().toUpperCase();
  if (cc === "KR" || cc === "KP") return "KR";
  if (cc === "JP") return "JP";
  return "US";
}

/**
 * Resolve billing market for checkout + marketing display.
 * CF-IPCountry only — no URL/cookie override.
 */
export function resolveBillingMarket(request: Request): BillingMarket {
  const country =
    request.headers.get("CF-IPCountry") ??
    request.headers.get("cf-ipcountry");
  return countryToMarket(country);
}