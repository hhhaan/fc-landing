export type SeoTotals = {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
};

export type SeoDailyPoint = {
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
};

export type SeoQueryRow = {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
};

export type SeoPageRow = {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
};

export type SeoCountryRow = {
    country: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
};

export type SeoIndexStatus = {
    url: string;
    verdict: string | null;
    coverageState: string | null;
    indexingState: string | null;
    robotsTxtState: string | null;
    lastCrawlTime: string | null;
    pageFetchState: string | null;
    error: string | null;
};

export type SeoData = {
    configured: boolean;
    siteUrl: string;
    startDate: string;
    endDate: string;
    setupHint: string | null;
    totals: SeoTotals;
    daily: SeoDailyPoint[];
    queries: SeoQueryRow[];
    pages: SeoPageRow[];
    countries: SeoCountryRow[];
    indexStatus: SeoIndexStatus[];
    generatedAt: string;
};
