export type IdleUser = {
    userId: string;
    email: string | null;
    displayName: string | null;
    plan: string;
    interval: string;
    status: string;
    startedAt: string | null;
    periodEnd: string | null;
    lastProductAt: string | null;
    lastSignInAt: string | null;
    daysSinceProduct: number | null;
    cancelAtPeriodEnd: boolean;
};

export type IntervalHealth = {
    interval: string;
    billable: number;
    canceling: number;
    canceled: number;
    total: number;
    churnRate: number | null;
    cancelingRate: number | null;
    idle30d: number;
};

export type SignupCohort = {
    month: string;
    size: number;
    /** % with product activity in signup month (M0) */
    m0: number | null;
    m1: number | null;
    m2: number | null;
    m3: number | null;
    m0Count: number;
    m1Count: number;
    m2Count: number;
    m3Count: number;
};

export type Reactivation = {
    userId: string;
    email: string | null;
    displayName: string | null;
    canceledAt: string;
    reactivatedAt: string;
    daysAway: number;
    interval: string;
};

export type RetentionData = {
    kpis: {
        paidBillable: number;
        paidIdle30d: number;
        paidIdleRate: number | null;
        canceling: number;
        reactivated: number;
        monthlyChurnRate: number | null;
        yearlyChurnRate: number | null;
    };
    intervalHealth: IntervalHealth[];
    paidIdle: IdleUser[];
    cohorts: SignupCohort[];
    reactivations: Reactivation[];
    generatedAt: string;
};
