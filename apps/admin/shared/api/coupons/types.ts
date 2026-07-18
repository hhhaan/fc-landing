export type CouponStatus = 'idle' | 'issued' | 'redeemed' | 'disabled';
export type CouponType = 'percentage' | 'fixed';
export type CouponDuration = 'once' | 'forever' | 'repeating';
/** Polar discount product filter at create time. */
export type CouponProductScope = 'monthly' | 'yearly' | 'all';

export type PolarCoupon = {
    id: string;
    code: string;
    polar_discount_id: string;
    name: string;
    type: CouponType;
    basis_points: number | null;
    amount_cents: number | null;
    currency: string | null;
    duration: CouponDuration;
    duration_in_months: number | null;
    product_scope: CouponProductScope;
    max_redemptions: number;
    redemptions_count: number;
    status: CouponStatus;
    batch_id: string | null;
    note: string | null;
    issued_at: string | null;
    redeemed_at: string | null;
    disabled_at: string | null;
    created_at: string;
    updated_at: string;
};

export type CreateCouponsInput = {
    count: number;
    name: string;
    type: CouponType;
    basis_points?: number;
    amount_cents?: number;
    currency?: string;
    duration: CouponDuration;
    duration_in_months?: number;
    /** default monthly */
    product_scope?: CouponProductScope;
    note?: string;
};

export type IssueCouponInput = {
    id?: string;
};

export type CouponsListResponse = {
    coupons: PolarCoupon[];
    counts: Record<CouponStatus, number>;
};
