#!/usr/bin/env node
/**
 * Verify POLAR_ACCESS_TOKEN + POLAR_SERVER + product IDs in apps/landing/.env
 *
 *   node scripts/verify-polar-env.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, 'apps/landing/.env');

function loadEnv(path) {
    const vars = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
    return vars;
}

const env = loadEnv(envPath);
const server = env.POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production';
const base = server === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
const token = env.POLAR_ACCESS_TOKEN;

if (!token) {
    console.error('POLAR_ACCESS_TOKEN missing in apps/landing/.env');
    process.exit(1);
}

const requiredProducts = [
    'POLAR_PRO_PRODUCT_ID_US',
    'POLAR_PRO_PLUS_PRODUCT_ID_US',
    'POLAR_PRO_PRODUCT_ID_KR',
    'POLAR_PRO_PLUS_PRODUCT_ID_KR',
    'POLAR_PRO_PRODUCT_ID_JP',
    'POLAR_PRO_PLUS_PRODUCT_ID_JP',
    'POLAR_PRO_PRODUCT_ID_US_YEARLY',
    'POLAR_PRO_PLUS_PRODUCT_ID_US_YEARLY',
    'POLAR_PRO_PRODUCT_ID_KR_YEARLY',
    'POLAR_PRO_PLUS_PRODUCT_ID_KR_YEARLY',
    'POLAR_PRO_PRODUCT_ID_JP_YEARLY',
    'POLAR_PRO_PLUS_PRODUCT_ID_JP_YEARLY',
];

const missing = requiredProducts.filter((k) => !env[k]);
if (missing.length) {
    console.error(`Missing product IDs in .env: ${missing.join(', ')}`);
    process.exit(1);
}

console.log(`Polar env: server=${server} api=${base}`);

const authRes = await fetch(`${base}/v1/products/?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
});
const authBody = await authRes.text();
if (!authRes.ok) {
    console.error(`Token check failed (${authRes.status}): ${authBody}`);
    console.error('Create a new OAT in Polar Dashboard with checkouts:write, products:read, customer_sessions:write.');
    process.exit(1);
}

console.log('Token OK (products:read)');

const sampleId = env.POLAR_PRO_PLUS_PRODUCT_ID_US;
const productRes = await fetch(`${base}/v1/products/${sampleId}`, {
    headers: { Authorization: `Bearer ${token}` },
});
if (!productRes.ok) {
    console.error(
        `Product ID mismatch (${productRes.status}): ${env.POLAR_PRO_PLUS_PRODUCT_ID_US} not found in ${server}.`,
    );
    console.error('POLAR_SERVER and product IDs must be from the same Polar environment.');
    process.exit(1);
}

console.log(`Product OK: Pro+ US → ${sampleId}`);
console.log('Polar env is aligned. /start-pro should reach Polar checkout.');
