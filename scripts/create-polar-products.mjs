#!/usr/bin/env node
/**
 * Create First Crack Polar products per market × plan (SSOT docs/pricing).
 *
 * Usage:
 *   POLAR_ACCESS_TOKEN=polar_oat_... POLAR_SERVER=sandbox node scripts/create-polar-products.mjs
 *   POLAR_ACCESS_TOKEN=... POLAR_SERVER=production node scripts/create-polar-products.mjs --dry-run
 *
 * Token: Polar Dashboard → Settings → Developers → Organization Access Token
 *         scopes: products:write (and products:read)
 *
 * Writes: scripts/polar-products.out.env (gitignored pattern — do not commit secrets;
 *         this file only has product UUIDs which are not secret but env-specific)
 *
 * Amounts: minor units (cents / won / yen as Polar expects).
 * @see fc-desktop/docs/pricing/03-pricing.md, 04-geo-pricing.md (D-011)
 */

const SERVER = process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox';
const BASE =
  SERVER === 'production' ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh';
const TOKEN = process.env.POLAR_ACCESS_TOKEN;
const DRY = process.argv.includes('--dry-run');

if (!TOKEN && !DRY) {
  console.error('Set POLAR_ACCESS_TOKEN (OAT with products:write)');
  process.exit(1);
}

/**
 * Polar requires org default presentment currency (USD) in every product's prices.
 * Local markets: [{usd mirror}, {local shelf}].
 * @typedef {{ envKey: string, name: string, description: string, market: string, plan: string, prices: { currency: string, amount: number }[] }} Sku
 */

/** Monthly self-serve SKUs only (yearly Open in SSOT). */
const SKUS = /** @type {Sku[]} */ ([
  {
    envKey: 'POLAR_PRO_PRODUCT_ID_US',
    name: 'First Crack Pro (US)',
    description: 'Pro · 200 batches/mo · United States',
    market: 'US',
    plan: 'pro',
    prices: [{ currency: 'usd', amount: 4900 }],
  },
  {
    envKey: 'POLAR_PRO_PLUS_PRODUCT_ID_US',
    name: 'First Crack Pro+ (US)',
    description: 'Pro+ · unlimited batches + commerce · United States',
    market: 'US',
    plan: 'pro_plus',
    prices: [{ currency: 'usd', amount: 7900 }],
  },
  {
    envKey: 'POLAR_PRO_PRODUCT_ID_KR',
    name: 'First Crack Pro (KR)',
    description: 'Pro · 월 200배치 · 한국 런칭가 ₩44,900',
    market: 'KR',
    plan: 'pro',
    // usd ~$29.93 @ 1500 — required presentment currency
    prices: [
      { currency: 'usd', amount: 2993 },
      { currency: 'krw', amount: 44900 },
    ],
  },
  {
    envKey: 'POLAR_PRO_PLUS_PRODUCT_ID_KR',
    name: 'First Crack Pro+ (KR)',
    description: 'Pro+ · 무제한 배치 + 커머스 · 한국 ₩69,900',
    market: 'KR',
    plan: 'pro_plus',
    prices: [
      { currency: 'usd', amount: 4660 },
      { currency: 'krw', amount: 69900 },
    ],
  },
  {
    envKey: 'POLAR_PRO_PRODUCT_ID_JP',
    name: 'First Crack Pro (JP)',
    description: 'Pro · 月200バッチ · 日本 ¥7,390',
    market: 'JP',
    plan: 'pro',
    prices: [
      { currency: 'usd', amount: 4927 },
      { currency: 'jpy', amount: 7390 },
    ],
  },
  {
    envKey: 'POLAR_PRO_PLUS_PRODUCT_ID_JP',
    name: 'First Crack Pro+ (JP)',
    description: 'Pro+ · 無制限 + コマース · 日本 ¥11,900',
    market: 'JP',
    plan: 'pro_plus',
    prices: [
      { currency: 'usd', amount: 7933 },
      { currency: 'jpy', amount: 11900 },
    ],
  },
]);

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(`Polar ${res.status} ${path}: ${JSON.stringify(body)}`);
    // @ts-expect-error
    err.status = res.status;
    throw err;
  }
  return body;
}

async function createProduct(sku) {
  const payload = {
    name: sku.name,
    description: sku.description,
    recurring_interval: 'month',
    recurring_interval_count: 1,
    prices: sku.prices.map((p) => ({
      amount_type: 'fixed',
      price_currency: p.currency,
      price_amount: p.amount,
    })),
    metadata: {
      market: sku.market,
      plan: sku.plan,
      env_key: sku.envKey,
      ssot: 'fc-pricing-v0.1',
    },
  };

  if (DRY) {
    console.log('[dry-run]', sku.envKey, payload);
    return { id: `dry-run-${sku.envKey}` };
  }

  return api('/v1/products/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function main() {
  console.log(`Polar server=${SERVER} base=${BASE} dry=${DRY}`);

  if (!DRY) {
    // quick auth check — products:read is enough (orgs scope not required)
    try {
      const products = await api('/v1/products/?limit=1');
      console.log('auth ok, products total_hint=', products?.pagination?.total_count ?? (products?.items?.length ?? '?'));
    } catch (e) {
      console.error('Auth failed. Need OAT with products:read + products:write on production.');
      console.error(String(e.message || e));
      process.exit(1);
    }
  }

  const lines = [`# Generated ${new Date().toISOString()} server=${SERVER}`, ''];
  const results = [];

  for (const sku of SKUS) {
    try {
      const product = await createProduct(sku);
      const id = product.id;
      const priceSummary = sku.prices.map((p) => `${p.currency}:${p.amount}`).join(' ');
      console.log(`OK  ${sku.envKey}=${id}  (${priceSummary})`);
      lines.push(`${sku.envKey}=${id}`);
      results.push({ ...sku, id });
    } catch (e) {
      console.error(`FAIL ${sku.envKey}:`, e.message || e);
      process.exitCode = 1;
    }
  }

  if (!DRY && results.length) {
    const fs = await import('node:fs');
    const out = new URL('./polar-products.out.env', import.meta.url);
    fs.writeFileSync(out, lines.join('\n') + '\n');
    console.log('\nWrote', out.pathname);
    console.log('Copy these into wrangler.toml / Cloudflare secrets / Supabase Edge env.');
  }

  console.log('\n--- webhook MARKET_MAP sketch ---');
  for (const r of results) {
    console.log(`  '${r.id}': { plan: '${r.plan}', country: '${r.market}' },`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
