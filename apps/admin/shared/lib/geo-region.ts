/**
 * CF-IPCountry → pricing region.
 * KR · JP only get local shelf; every other country code → US (USD).
 * SSOT: fc-desktop/docs/pricing/04-geo-pricing.md
 */

export type PricingRegion = "KR" | "JP" | "US";

export const PRICING_REGIONS: PricingRegion[] = ["KR", "JP", "US"];

/** When CF/Vercel country header is missing or unknown → USD (US). */
export const FALLBACK_REGION: PricingRegion = "US";

export const REGION_COOKIE = "fc_region";
export const REGION_HEADER = "x-fc-region";
export const COUNTRY_HEADER = "x-fc-country";

export function isPricingRegion(v: string | null | undefined): v is PricingRegion {
  return v === "KR" || v === "JP" || v === "US";
}

/** ISO 3166-1 alpha-2 from CF-IPCountry → KR | JP | US (USD). */
export function countryToRegion(countryCode: string | null | undefined): PricingRegion {
  if (!countryCode) return FALLBACK_REGION;
  const cc = countryCode.trim().toUpperCase();
  if (cc === "KR" || cc === "KP") return "KR";
  if (cc === "JP") return "JP";
  return "US";
}

export type GeoSource = "cf-ipcountry" | "vercel" | "cloudfront" | "default";

export type RequestGeo = {
  countryCode: string;
  region: PricingRegion;
  source: GeoSource;
};

type HeaderBag = { get(name: string): string | null };

function readCountryHeader(headers: HeaderBag): string | null {
  return (
    headers.get("cf-ipcountry") ??
    headers.get("CF-IPCountry") ??
    null
  );
}

/**
 * Resolve geo from (priority high → low):
 * 1. Cloudflare `CF-IPCountry` / `cf-ipcountry`
 * 2. Vercel `x-vercel-ip-country`
 * 3. CloudFront `cloudfront-viewer-country`
 * 4. default US (USD)
 *
 * No query/cookie overrides — users must not pick a market via URL.
 */
export function resolveRequestGeo(opts: { headers: HeaderBag }): RequestGeo {
  const cf = readCountryHeader(opts.headers)?.toUpperCase() ?? null;
  if (cf && /^[A-Z]{2}$/.test(cf)) {
    return { countryCode: cf, region: countryToRegion(cf), source: "cf-ipcountry" };
  }

  const vercel = opts.headers.get("x-vercel-ip-country")?.toUpperCase() ?? null;
  if (vercel && /^[A-Z]{2}$/.test(vercel)) {
    return { countryCode: vercel, region: countryToRegion(vercel), source: "vercel" };
  }

  const cfront = opts.headers.get("cloudfront-viewer-country")?.toUpperCase() ?? null;
  if (cfront && /^[A-Z]{2}$/.test(cfront)) {
    return {
      countryCode: cfront,
      region: countryToRegion(cfront),
      source: "cloudfront",
    };
  }

  return { countryCode: "XX", region: FALLBACK_REGION, source: "default" };
}

/** NextRequest-like: headers only (no URL market override). */
export function resolveRequestGeoFromNext(req: { headers: HeaderBag }): RequestGeo {
  return resolveRequestGeo({ headers: req.headers });
}