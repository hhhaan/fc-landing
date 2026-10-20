import assert from 'node:assert/strict';
import { polarUserId, preparePolarSubscription, verifyPolarSignature } from '../src/lib/polarWebhook.ts';

const body = '{"type":"test"}';
const ts = String(Math.floor(Date.now() / 1000));
const id = 'test-id';
const bytes = new TextEncoder().encode('synthetic-test-only');
const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const signature = btoa(
    String.fromCharCode(
        ...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`))),
    ),
);
const headers = new Headers({
    'webhook-id': id,
    'webhook-timestamp': ts,
    'webhook-signature': `v2,garbage v1,${signature}`,
});
assert.equal(await verifyPolarSignature(body, headers, `whsec_${btoa('synthetic-test-only')}`), true);
assert.equal(await verifyPolarSignature(body, headers, `polar_whs_${btoa('synthetic-test-only')}`, true), true);
assert.equal(await verifyPolarSignature(body, headers, 'synthetic-test-only', true), true);
assert.equal(await verifyPolarSignature(body + 'x', headers, `whsec_${btoa('synthetic-test-only')}`), false);
headers.set('webhook-timestamp', String(Number(ts) - 301));
assert.equal(await verifyPolarSignature(body, headers, `whsec_${btoa('synthetic-test-only')}`), false);
const uid = '12345678-1234-4123-8123-123456789012';
assert.equal(polarUserId({ customer: { external_id: uid } }), uid);
assert.equal(polarUserId({ metadata: { user_id: uid } }), uid);
assert.equal(polarUserId({ customer: { external_id: uid }, metadata: { user_id: 'other' } }), null);
assert.equal(polarUserId({ metadata: { user_id: 'unknown' } }), null);
const legacySecret = 'whsec_' + btoa('legacy-synthetic-only');
const legacyKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(legacySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
);
headers.set('webhook-timestamp', ts);
const legacySignature = btoa(
    String.fromCharCode(
        ...new Uint8Array(await crypto.subtle.sign('HMAC', legacyKey, new TextEncoder().encode(`${id}.${ts}.${body}`))),
    ),
);
headers.set('webhook-signature', `v1,${legacySignature}`);
assert.equal(await verifyPolarSignature(body, headers, legacySecret, true), true);
assert.equal(await verifyPolarSignature(body, headers, legacySecret), false);

const mapped = {
    id: 'subscription',
    customer_id: 'polar-customer-not-app-uuid',
    product_id: 'known',
    status: 'active',
};
assert.equal(preparePolarSubscription('subscription.active', mapped, 'org', true).userId, null);
assert.equal(
    preparePolarSubscription('subscription.active', { ...mapped, metadata: { user_id: uid } }, 'org', true).userId,
    uid,
);
assert.throws(() =>
    preparePolarSubscription('subscription.active', { ...mapped, metadata: { user_id: 'invalid' } }, 'org', true),
);
assert.throws(() =>
    preparePolarSubscription(
        'subscription.active',
        { ...mapped, customer: { external_id: uid }, metadata: { user_id: 'other' } },
        'org',
        true,
    ),
);
assert.throws(() => preparePolarSubscription('subscription.active', mapped, 'org', false));
assert.equal(preparePolarSubscription('subscription.revoked', mapped, 'org', false).subscription.status, 'revoked');
assert.equal(
    preparePolarSubscription('subscription.updated', { ...mapped, status: 'ended' }, 'org', false).subscription.status,
    'ended',
);
assert.equal(
    preparePolarSubscription('subscription.canceled', mapped, 'org', true).subscription.cancel_at_period_end,
    true,
);
assert.equal(
    preparePolarSubscription('subscription.uncanceled', { ...mapped, cancel_at_period_end: true }, 'org', true)
        .subscription.cancel_at_period_end,
    false,
);
assert.throws(() =>
    preparePolarSubscription('subscription.active', { ...mapped, product: { organization_id: 'other' } }, 'org', true),
);
assert.equal(
    preparePolarSubscription('subscription.active', { ...mapped, trial_end_at: 'future' }, 'org', true).subscription
        .trial_end,
    'future',
);
console.log('22 signature, identity and subscription assertions passed');
