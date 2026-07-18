import 'server-only';

/** Coupon product scope at create time → Polar `products` filter. */
export type CouponProductScope = 'monthly' | 'yearly' | 'all';

const PRODUCT_KEYS = {
    monthly: [
        'POLAR_PRO_PRODUCT_ID_US',
        'POLAR_PRO_PLUS_PRODUCT_ID_US',
        'POLAR_PRO_PRODUCT_ID_KR',
        'POLAR_PRO_PLUS_PRODUCT_ID_KR',
        'POLAR_PRO_PRODUCT_ID_JP',
        'POLAR_PRO_PLUS_PRODUCT_ID_JP',
    ],
    yearly: [
        'POLAR_PRO_PRODUCT_ID_US_YEARLY',
        'POLAR_PRO_PLUS_PRODUCT_ID_US_YEARLY',
        'POLAR_PRO_PRODUCT_ID_KR_YEARLY',
        'POLAR_PRO_PLUS_PRODUCT_ID_KR_YEARLY',
        'POLAR_PRO_PRODUCT_ID_JP_YEARLY',
        'POLAR_PRO_PLUS_PRODUCT_ID_JP_YEARLY',
    ],
} as const;

/** SSOT: apps/landing/src/lib/polarProducts.ts — env overrides when set. */
const FALLBACK: Record<string, string> = {
    POLAR_PRO_PRODUCT_ID_US: 'b817c76f-5b9d-4085-88eb-dd993e886a9c',
    POLAR_PRO_PLUS_PRODUCT_ID_US: 'f88d8ab8-ebb6-4c97-8f02-ea92571d721b',
    POLAR_PRO_PRODUCT_ID_KR: 'c9e97af0-2e98-4e30-a28b-ec1c75e63529',
    POLAR_PRO_PLUS_PRODUCT_ID_KR: '55119320-3b13-461a-857c-7a7657869727',
    POLAR_PRO_PRODUCT_ID_JP: '07481758-40bd-4459-837d-b92aa662b41b',
    POLAR_PRO_PLUS_PRODUCT_ID_JP: 'cf68bf22-3353-4793-82dc-c8f5e40ed60e',
    POLAR_PRO_PRODUCT_ID_US_YEARLY: 'e7d8843c-c26a-4c60-9e0a-e1d4154425e8',
    POLAR_PRO_PLUS_PRODUCT_ID_US_YEARLY: '542e9b99-e940-48bf-b625-1f8b8375613d',
    POLAR_PRO_PRODUCT_ID_KR_YEARLY: '9e300e90-abad-4736-aa90-09a32ebcbf91',
    POLAR_PRO_PLUS_PRODUCT_ID_KR_YEARLY: '67836c96-774e-41fe-a908-79379a1f1674',
    POLAR_PRO_PRODUCT_ID_JP_YEARLY: '6591afbd-b3b3-4854-a457-8f3f62709be2',
    POLAR_PRO_PLUS_PRODUCT_ID_JP_YEARLY: 'b3ac9c69-b562-4f8c-af74-3da2c9435c10',
};

function resolveIds(keys: readonly string[]): string[] {
    const ids = keys.map((key) => process.env[key]?.trim() || FALLBACK[key] || '').filter((id) => id.length > 0);
    return [...new Set(ids)];
}

/**
 * Product UUIDs for Polar discount `products` field.
 * `all` → undefined (no filter — applies to every product).
 */
export function productIdsForScope(scope: CouponProductScope): string[] | undefined {
    if (scope === 'all') return undefined;
    const ids = resolveIds(PRODUCT_KEYS[scope]);
    if (ids.length === 0) {
        throw new Error(`No Polar product IDs for scope=${scope}`);
    }
    return ids;
}

export function parseCouponProductScope(raw: unknown): CouponProductScope {
    if (raw === 'monthly' || raw === 'yearly' || raw === 'all') return raw;
    // default: monthly (safer for promos)
    return 'monthly';
}
