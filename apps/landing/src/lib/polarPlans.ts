import type { AstroCookies } from "astro";
import { POLAR_PRODUCT_IDS, type PolarProductEnvKey } from "./polarProducts";

export const CHECKOUT_PLANS = [
  "pro-monthly",
  "pro-yearly",
  "pro-plus-monthly",
  "pro-plus-yearly",
  "enterprise-monthly",
  "enterprise-yearly",
  "monthly",
  "yearly",
] as const;

export type CheckoutPlan = (typeof CHECKOUT_PLANS)[number];
export type BillingMarket = "US" | "KR" | "JP";

const LEGACY_PLAN: Record<string, CheckoutPlan> = {
  monthly: "pro-monthly",
  yearly: "pro-yearly",
};

const MARKET_COOKIE = "fc_market";

export function normalizeCheckoutPlan(raw: string | null | undefined): CheckoutPlan {
  if (raw && LEGACY_PLAN[raw]) return LEGACY_PLAN[raw];
  if (raw && (CHECKOUT_PLANS as readonly string[]).includes(raw)) {
    return raw as CheckoutPlan;
  }
  return "pro-monthly";
}

/** Billing market for Polar product routing (SSOT: fc-desktop/docs/pricing/04-geo-pricing.md). */
export function resolveBillingMarket(
  request: Request,
  cookies: AstroCookies,
): BillingMarket {
  const query = new URL(request.url).searchParams.get("market")?.toLowerCase();
  const cookie = cookies.get(MARKET_COOKIE)?.value?.toLowerCase();
  const country = request.headers.get("CF-IPCountry")?.toUpperCase();

  const raw = query ?? cookie ?? country ?? "US";
  if (raw === "kr" || raw === "KR") return "KR";
  if (raw === "jp" || raw === "JP") return "JP";
  return "US";
}

type PolarEnv = ImportMetaEnv & Record<string, string | undefined>;

function envProduct(env: PolarEnv, key: PolarProductEnvKey): string | undefined {
  const fromEnv = env[key];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return POLAR_PRODUCT_IDS[key];
}

/** Polar product UUID for plan × market (not legacy price_id). */
export function polarProductId(
  plan: CheckoutPlan,
  market: BillingMarket,
  env: PolarEnv,
): string | undefined {
  const yearly = plan.endsWith("yearly");
  const proPlus = plan.includes("pro-plus");
  const enterprise = plan.startsWith("enterprise");

  if (enterprise) {
    if (yearly) return envProduct(env, "POLAR_PRICE_ENTERPRISE_YEARLY_SBX")
      ?? envProduct(env, "POLAR_PRICE_ENTERPRISE_YEARLY_PROD");
    return envProduct(env, "POLAR_PRICE_ENTERPRISE_MONTHLY_SBX")
      ?? envProduct(env, "POLAR_PRICE_ENTERPRISE_MONTHLY_PROD");
  }

  const planKey = proPlus ? "PRO_PLUS" : "PRO";
  const intervalKey = yearly ? "_YEARLY" : "";
  const envKey =
    `POLAR_${planKey}_PRODUCT_ID_${market}${intervalKey}` as PolarProductEnvKey;
  return envProduct(env, envKey);
}

export function isCheckoutPlanReady(
  plan: CheckoutPlan,
  market: BillingMarket,
  env: PolarEnv,
): boolean {
  return !!polarProductId(plan, market, env);
}

export function polarServer(env: ImportMetaEnv): "sandbox" | "production" {
  return env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";
}

export function polarApiBase(env: ImportMetaEnv): string {
  return polarServer(env) === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";
}

/** @deprecated Use polarProductId — kept for callers migrating from price_id. */
export function polarPriceId(
  plan: CheckoutPlan,
  env: ImportMetaEnv,
): string | undefined {
  return polarProductId(plan, "US", env as PolarEnv);
}