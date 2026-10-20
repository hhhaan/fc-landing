import assert from 'node:assert/strict';
import { deliverPolarNotification, polarPaymentMessage } from '../src/lib/polarNotification.ts';

const payload = { text: 'canonical' };
async function scenario(claim, sendResult, finish = { data: true, error: null }) {
    const calls = [];
    const sends = [];
    const rpc = async (name, args) => {
        calls.push([name, args]);
        return name === 'claim_polar_notification' ? claim : finish;
    };
    const result = await deliverPolarNotification(rpc, 'org', 'order.paid:order', { text: 'local' }, async (p) => {
        sends.push(p);
        if (sendResult instanceof Error) throw sendResult;
        return sendResult;
    });
    return { result, calls, sends };
}
const claimed = { data: { status: 'claimed', lease_id: 'lease', payload }, error: null };
let r = await scenario(claimed, true);
assert.equal(r.result, true);
assert.deepEqual(r.sends, [payload]);
assert.equal(r.calls[1][1].p_sent, true);
r = await scenario({ data: { status: 'sent' }, error: null }, true);
assert.equal(r.result, true);
assert.equal(r.sends.length, 0);
assert.equal(r.calls.length, 1);
r = await scenario({ data: { status: 'busy' }, error: null }, true);
assert.equal(r.result, false);
assert.equal(r.sends.length, 0);
r = await scenario(claimed, false);
assert.equal(r.result, false);
assert.equal(r.calls[1][1].p_sent, false);
r = await scenario(claimed, new Error('network'));
assert.equal(r.result, false);
assert.equal(r.calls[1][1].p_sent, false);
r = await scenario(claimed, true, { data: false, error: null });
assert.equal(r.result, false);
r = await scenario({ data: null, error: { code: 'db' } }, true);
assert.equal(r.result, false);
r = await scenario({ data: { status: 'claimed', lease_id: 'lease' }, error: null }, true);
assert.equal(r.result, false);
assert.equal(r.calls[1][1].p_sent, false);
const order = polarPaymentMessage('order.paid', { total_amount: 1500, currency: 'usd', product_id: 'product' }, null);
assert.match(order.text, /Payment received \(order.paid\)/);
assert.match(order.text, /USD 15.00/);
assert.match(
    polarPaymentMessage('subscription.created', { status: 'trialing' }, 'user', 'pro', 'US').text,
    /Subscription trial started/,
);
assert.ok(!polarPaymentMessage('order.paid', { product_id: 'bad\n`value' }, null).text.includes('bad\n`value'));

let disabledRpcCalls = 0;
let disabledSends = 0;
const disabledResult = await deliverPolarNotification(
    async () => {
        disabledRpcCalls++;
        throw new Error('must not enqueue');
    },
    'org',
    'order.paid:order',
    { text: 'notice' },
    async () => {
        disabledSends++;
        return false;
    },
    false,
);
assert.equal(disabledResult, true);
assert.equal(disabledRpcCalls, 0);
assert.equal(disabledSends, 0);
console.log('23 notification assertions passed');
