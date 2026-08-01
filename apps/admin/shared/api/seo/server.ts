import 'server-only';
import type {
    SeoCountryRow,
    SeoDailyPoint,
    SeoData,
    SeoIndexStatus,
    SeoPageRow,
    SeoQueryRow,
    SeoTotals,
} from './types';

export type { SeoData };

import { inspectUrl, querySearchAnalytics, readGscCredentials, type SearchAnalyticsRow } from '@/shared/lib/gsc/client';

const INSPECT_URLS = [
    'https://firstcrackiscoming.com/',
    'https://firstcrackiscoming.com/download',
    'https://firstcrackiscoming.com/compare-plans',
    'https://firstcrackiscoming.com/faq',
    'https://firstcrackiscoming.com/about',
    'https://firstcrackiscoming.com/careers',
    'https://firstcrackiscoming.com/privacy',
    'https://firstcrackiscoming.com/terms',
] as const;

const SETUP_HINT =
    'Set GSC_SERVICE_ACCOUNT_JSON (or GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY) and add the service account as a GSC user. Optional: GSC_SITE_URL (default https://firstcrackiscoming.com/).';

function ymd(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/** GSC data lags ~2 days; window = 28 complete days ending then. */
function dateWindow(): { startDate: string; endDate: string } {
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    end.setUTCDate(end.getUTCDate() - 2);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 27);
    return { startDate: ymd(start), endDate: ymd(end) };
}

function emptyTotals(): SeoTotals {
    return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

function sumRows(rows: SearchAnalyticsRow[] | undefined): SeoTotals {
    if (!rows?.length) return emptyTotals();
    let clicks = 0;
    let impressions = 0;
    let posWeighted = 0;
    for (const r of rows) {
        clicks += r.clicks ?? 0;
        impressions += r.impressions ?? 0;
        posWeighted += (r.position ?? 0) * (r.impressions ?? 0);
    }
    return {
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: impressions > 0 ? posWeighted / impressions : 0,
    };
}

function mapMetric(r: SearchAnalyticsRow): Pick<SeoQueryRow, 'clicks' | 'impressions' | 'ctr' | 'position'> {
    return {
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
    };
}

function unconfigured(siteUrl: string, startDate: string, endDate: string): SeoData {
    return {
        configured: false,
        siteUrl,
        startDate,
        endDate,
        setupHint: SETUP_HINT,
        totals: emptyTotals(),
        daily: [],
        queries: [],
        pages: [],
        countries: [],
        indexStatus: [],
        generatedAt: new Date().toISOString(),
    };
}

async function safeInspect(
    creds: NonNullable<ReturnType<typeof readGscCredentials>>,
    url: string,
): Promise<SeoIndexStatus> {
    try {
        const res = await inspectUrl(creds, url);
        const idx = res.inspectionResult?.indexStatusResult;
        return {
            url,
            verdict: idx?.verdict ?? null,
            coverageState: idx?.coverageState ?? null,
            indexingState: idx?.indexingState ?? null,
            robotsTxtState: idx?.robotsTxtState ?? null,
            lastCrawlTime: idx?.lastCrawlTime ?? null,
            pageFetchState: idx?.pageFetchState ?? null,
            error: null,
        };
    } catch (err) {
        return {
            url,
            verdict: null,
            coverageState: null,
            indexingState: null,
            robotsTxtState: null,
            lastCrawlTime: null,
            pageFetchState: null,
            error: err instanceof Error ? err.message : 'inspect failed',
        };
    }
}

export async function getSeoData(): Promise<SeoData> {
    const { startDate, endDate } = dateWindow();
    const creds = readGscCredentials();

    if (!creds) {
        return unconfigured(process.env.GSC_SITE_URL?.trim() || 'https://firstcrackiscoming.com/', startDate, endDate);
    }

    const base = { startDate, endDate };

    const [totalsRes, dailyRes, queryRes, pageRes, countryRes, ...inspections] = await Promise.all([
        querySearchAnalytics(creds, { ...base, rowLimit: 1 }),
        querySearchAnalytics(creds, {
            ...base,
            dimensions: ['date'],
            rowLimit: 32,
        }),
        querySearchAnalytics(creds, {
            ...base,
            dimensions: ['query'],
            rowLimit: 25,
        }),
        querySearchAnalytics(creds, {
            ...base,
            dimensions: ['page'],
            rowLimit: 25,
        }),
        querySearchAnalytics(creds, {
            ...base,
            dimensions: ['country'],
            rowLimit: 15,
        }),
        ...INSPECT_URLS.map((url) => safeInspect(creds, url)),
    ]);

    // Totals without dimensions = site-level aggregates in one row
    const totals = sumRows(totalsRes.rows);

    const daily: SeoDailyPoint[] = (dailyRes.rows ?? [])
        .map((r) => ({
            date: r.keys?.[0] ?? '',
            ...mapMetric(r),
        }))
        .filter((d) => d.date)
        .sort((a, b) => a.date.localeCompare(b.date));

    const queries: SeoQueryRow[] = (queryRes.rows ?? []).map((r) => ({
        query: r.keys?.[0] ?? '(unknown)',
        ...mapMetric(r),
    }));

    const pages: SeoPageRow[] = (pageRes.rows ?? []).map((r) => ({
        page: r.keys?.[0] ?? '(unknown)',
        ...mapMetric(r),
    }));

    const countries: SeoCountryRow[] = (countryRes.rows ?? []).map((r) => ({
        country: (r.keys?.[0] ?? '??').toUpperCase(),
        ...mapMetric(r),
    }));

    const indexStatus = inspections as SeoIndexStatus[];

    return {
        configured: true,
        siteUrl: creds.siteUrl,
        startDate,
        endDate,
        setupHint: null,
        totals,
        daily,
        queries,
        pages,
        countries,
        indexStatus,
        generatedAt: new Date().toISOString(),
    };
}
