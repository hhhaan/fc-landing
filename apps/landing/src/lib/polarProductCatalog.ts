import type { BillingMarket } from './market';
import { POLAR_PRODUCT_IDS, type PolarProductEnvKey } from './polarProducts';

export type PolarPlan = 'pro' | 'pro_plus';

export type PolarProductMeta = {
    plan: PolarPlan;
    market: BillingMarket;
};

type PolarEnv = ImportMetaEnv & Record<string, string | undefined>;

function parseEnvKey(key: string): PolarProductMeta | null {
    const match = key.match(/^POLAR_(PRO|PRO_PLUS)_PRODUCT_ID_(US|KR|JP)(?:_YEARLY)?$/);
    if (!match) return null;
    return {
        plan: match[1] === 'PRO_PLUS' ? 'pro_plus' : 'pro',
        market: match[2] as BillingMarket,
    };
}

/** product_id → plan + billing market. SSOT: fc-desktop/docs/pricing/04-geo-pricing.md */
export function buildPolarProductCatalog(env: PolarEnv = {}): Record<string, PolarProductMeta> {
    const catalog: Record<string, PolarProductMeta> = {};

    for (const key of Object.keys(POLAR_PRODUCT_IDS) as PolarProductEnvKey[]) {
        const meta = parseEnvKey(key);
        const id = env[key] || POLAR_PRODUCT_IDS[key];
        if (meta && id) catalog[id] = meta;
    }

    return catalog;
}

export function resolvePolarProduct(productId: string | null | undefined, env: PolarEnv = {}): PolarProductMeta | null {
    if (!productId) return null;
    return buildPolarProductCatalog(env)[productId] ?? null;
}

/** Checkout metadata plan slug → canonical plan id. */
export function normalizePlanFromMetadata(raw: string | null | undefined): PolarPlan | null {
    if (!raw) return null;
    const v = raw.toLowerCase();
    if (v.includes('pro-plus') || v.includes('pro_plus')) return 'pro_plus';
    if (v.startsWith('pro') || v === 'monthly' || v === 'yearly') return 'pro';
    return null;
}

export function normalizeMarketFromMetadata(raw: string | null | undefined): BillingMarket | null {
    if (!raw) return null;
    const v = raw.toUpperCase();
    if (v === 'KR' || v === 'JP' || v === 'US') return v;
    return null;
}
