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

const LEGACY_PLAN: Record<string, CheckoutPlan> = {
  monthly: "pro-monthly",
  yearly: "pro-yearly",
};

export function normalizeCheckoutPlan(raw: string | null | undefined): CheckoutPlan {
  if (raw && LEGACY_PLAN[raw]) return LEGACY_PLAN[raw];
  if (raw && (CHECKOUT_PLANS as readonly string[]).includes(raw)) {
    return raw as CheckoutPlan;
  }
  return "pro-monthly";
}

export function polarPriceId(
  plan: CheckoutPlan,
  env: ImportMetaEnv,
): string | undefined {
  const isSandbox = env.POLAR_SERVER === "sandbox";

  const ids: Record<CheckoutPlan, string | undefined> = {
    "pro-monthly": isSandbox
      ? env.POLAR_PRICE_MONTHLY_SBX
      : env.POLAR_PRICE_MONTHLY_PROD,
    "pro-yearly": isSandbox
      ? env.POLAR_PRICE_YEARLY_SBX
      : env.POLAR_PRICE_YEARLY_PROD,
    "pro-plus-monthly": isSandbox
      ? env.POLAR_PRICE_PRO_PLUS_MONTHLY_SBX
      : env.POLAR_PRICE_PRO_PLUS_MONTHLY_PROD,
    "pro-plus-yearly": isSandbox
      ? env.POLAR_PRICE_PRO_PLUS_YEARLY_SBX
      : env.POLAR_PRICE_PRO_PLUS_YEARLY_PROD,
    "enterprise-monthly": isSandbox
      ? env.POLAR_PRICE_ENTERPRISE_MONTHLY_SBX
      : env.POLAR_PRICE_ENTERPRISE_MONTHLY_PROD,
    "enterprise-yearly": isSandbox
      ? env.POLAR_PRICE_ENTERPRISE_YEARLY_SBX
      : env.POLAR_PRICE_ENTERPRISE_YEARLY_PROD,
    monthly: isSandbox ? env.POLAR_PRICE_MONTHLY_SBX : env.POLAR_PRICE_MONTHLY_PROD,
    yearly: isSandbox ? env.POLAR_PRICE_YEARLY_SBX : env.POLAR_PRICE_YEARLY_PROD,
  };

  return ids[plan];
}

export function polarApiBase(env: ImportMetaEnv): string {
  return env.POLAR_SERVER === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";
}