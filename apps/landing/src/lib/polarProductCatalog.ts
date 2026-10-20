import type { BillingMarket } from './market';
import {
    LEGACY_COMMON_POLAR_PRODUCT_IDS,
    LEGACY_POLAR_PRODUCT_IDS,
    POLAR_PRODUCT_IDS,
    type PolarProductEnvKey,
} from './polarProducts';

export type PolarPlan = 'pro' | 'pro_plus' | 'enterprise';

export type PolarProductMeta = {
    plan: PolarPlan;
    market?: BillingMarket;
};

type PolarEnv = Partial<ImportMetaEnv> & Record<string, string | undefined>;

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
        const id = env[key] ?? POLAR_PRODUCT_IDS[key];
        const legacyId = LEGACY_POLAR_PRODUCT_IDS[key];
        if (meta && legacyId) catalog[legacyId] = meta;
        const currentId = POLAR_PRODUCT_IDS[key];
        if (meta && currentId) catalog[currentId] = meta;
        if (meta && id) catalog[id] = meta;
    }

    for (const [plan, id] of Object.entries(LEGACY_COMMON_POLAR_PRODUCT_IDS)) {
        catalog[id] = { plan: plan as PolarPlan };
    }
    return catalog;
}

export function resolvePolarProduct(productId: string | null | undefined, env: PolarEnv = {}): PolarProductMeta | null {
    if (!productId) return null;
    return buildPolarProductCatalog(env)[productId] ?? null;
}

/** Scope accepted webhook products to the organization selected by verified secret. */
export function resolvePolarWebhookProduct(
    productId: string | null | undefined,
    legacyOrganization: boolean,
): PolarProductMeta | null {
    if (!productId) return null;
    if (!legacyOrganization && Object.values(LEGACY_COMMON_POLAR_PRODUCT_IDS).some((id) => id === productId)) {
        throw new Error('Legacy common product organization mismatch');
    }
    const allowed = legacyOrganization
        ? [...Object.values(LEGACY_POLAR_PRODUCT_IDS), ...Object.values(LEGACY_COMMON_POLAR_PRODUCT_IDS)]
        : Object.values(POLAR_PRODUCT_IDS);
    return allowed.some((id) => id && id === productId) ? resolvePolarProduct(productId) : null;
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
