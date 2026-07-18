export type ComplianceDocKind = 'material' | 'production' | 'transaction';

export type ComplianceSubject = {
    userId: string;
    email: string | null;
    businessName: string | null;
    displayName: string | null;
    bizRegNo: string | null;
};

export type CompliancePeriod = {
    /** Inclusive start date YYYY-MM-DD */
    from: string;
    /** Inclusive end date YYYY-MM-DD */
    to: string;
};

/** 원료수불부 row */
export type MaterialLedgerRow = {
    date: string;
    beanName: string;
    origin: string | null;
    openingKg: number;
    inKg: number;
    outKg: number;
    closingKg: number;
    eventType: string;
    note: string | null;
};

/** 생산작업일지 row */
export type ProductionLogRow = {
    date: string;
    beanLot: string;
    inputKg: number;
    outputKg: number;
    lossKg: number;
    lossRate: number;
    measured: boolean;
    profile: string;
    roastLevel: string;
    note: string | null;
};

/** 거래기록서 row */
export type TransactionRow = {
    date: string;
    kind: 'purchase' | 'sale' | 'other';
    kindLabel: string;
    counterparty: string;
    item: string;
    qtyKg: number | null;
    unitPrice: number | null;
    amount: number | null;
    currency: string | null;
    note: string | null;
};

export type ComplianceBundle = {
    subject: ComplianceSubject;
    period: CompliancePeriod;
    materialLedger: MaterialLedgerRow[];
    productionLog: ProductionLogRow[];
    transactions: TransactionRow[];
    totals: {
        materialInKg: number;
        materialOutKg: number;
        productionInputKg: number;
        productionOutputKg: number;
        purchaseAmount: number;
        saleAmount: number;
    };
};
