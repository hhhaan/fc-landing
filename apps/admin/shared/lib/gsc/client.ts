import 'server-only';
import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const SEARCH_ANALYTICS = 'https://www.googleapis.com/webmasters/v3/sites';
const URL_INSPECTION = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

export type GscCredentials = {
    clientEmail: string;
    privateKey: string;
    siteUrl: string;
};

export type SearchAnalyticsRow = {
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
};

export type SearchAnalyticsResponse = {
    rows?: SearchAnalyticsRow[];
    responseAggregationType?: string;
};

export type UrlInspectionResult = {
    inspectionResult?: {
        indexStatusResult?: {
            verdict?: string;
            coverageState?: string;
            robotsTxtState?: string;
            indexingState?: string;
            lastCrawlTime?: string;
            pageFetchState?: string;
            googleCanonical?: string;
            userCanonical?: string;
            crawledAs?: string;
        };
        inspectionResultLink?: string;
    };
};

type ServiceAccountJson = {
    client_email?: string;
    private_key?: string;
};

let cachedToken: { accessToken: string; expMs: number } | null = null;

function base64url(input: Buffer | string): string {
    const buf = typeof input === 'string' ? Buffer.from(input) : input;
    return buf.toString('base64url');
}

function normalizePem(key: string): string {
    return key.replace(/\\n/g, '\n').trim();
}

export function readGscCredentials(): GscCredentials | null {
    const siteUrl = process.env.GSC_SITE_URL?.trim() || 'https://firstcrackiscoming.com/';

    const jsonRaw = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim();
    if (jsonRaw) {
        try {
            const parsed = JSON.parse(jsonRaw) as ServiceAccountJson;
            if (parsed.client_email && parsed.private_key) {
                return {
                    clientEmail: parsed.client_email,
                    privateKey: normalizePem(parsed.private_key),
                    siteUrl,
                };
            }
        } catch {
            throw new Error('GSC_SERVICE_ACCOUNT_JSON is not valid JSON');
        }
    }

    const clientEmail = process.env.GSC_CLIENT_EMAIL?.trim();
    const privateKey = process.env.GSC_PRIVATE_KEY?.trim();
    if (clientEmail && privateKey) {
        return {
            clientEmail,
            privateKey: normalizePem(privateKey),
            siteUrl,
        };
    }

    return null;
}

function signServiceAccountJwt(clientEmail: string, privateKey: string): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: clientEmail,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
    };
    const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
    const sign = createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    const sig = sign.sign(privateKey);
    return `${data}.${base64url(sig)}`;
}

async function getAccessToken(creds: GscCredentials): Promise<string> {
    if (cachedToken && cachedToken.expMs > Date.now() + 60_000) {
        return cachedToken.accessToken;
    }

    const assertion = signServiceAccountJwt(creds.clientEmail, creds.privateKey);
    const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
    });

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`GSC token exchange failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
    };
    if (!json.access_token) {
        throw new Error('GSC token response missing access_token');
    }

    cachedToken = {
        accessToken: json.access_token,
        expMs: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return json.access_token;
}

async function gscFetch<T>(creds: GscCredentials, url: string, init?: RequestInit): Promise<T> {
    const token = await getAccessToken(creds);
    const res = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`GSC ${init?.method ?? 'GET'} ${url}: ${res.status} ${text}`);
    }

    return (await res.json()) as T;
}

export async function querySearchAnalytics(
    creds: GscCredentials,
    body: {
        startDate: string;
        endDate: string;
        dimensions?: string[];
        rowLimit?: number;
        startRow?: number;
        type?: string;
        aggregationType?: string;
    },
): Promise<SearchAnalyticsResponse> {
    const site = encodeURIComponent(creds.siteUrl);
    return gscFetch<SearchAnalyticsResponse>(creds, `${SEARCH_ANALYTICS}/${site}/searchAnalytics/query`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function inspectUrl(creds: GscCredentials, inspectionUrl: string): Promise<UrlInspectionResult> {
    return gscFetch<UrlInspectionResult>(creds, URL_INSPECTION, {
        method: 'POST',
        body: JSON.stringify({
            inspectionUrl,
            siteUrl: creds.siteUrl,
        }),
    });
}
