import { PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { POLAR_WEBHOOK_SECRET, POLAR_WEBHOOK_SECRET_NEW, SUPABASE_SERVICE_ROLE_KEY, SLACK_WEBHOOK_URL, SENTRY_DSN } from 'astro:env/server';
import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';
import { resolvePolarProduct } from '../../../lib/polarProductCatalog';
import { LEGACY_POLAR_PRODUCT_IDS, POLAR_PRODUCT_IDS } from '../../../lib/polarProducts';
import { deliverPolarNotification, polarPaymentMessage } from '../../../lib/polarNotification';
import { postSlack } from '../../../lib/slack';
import { captureServerException } from '../../../lib/sentryServer';
import { polarUserId, preparePolarSubscription, verifyPolarSignature } from '../../../lib/polarWebhook';

const OLD_ORG = 'f0ef6666-e89c-4a50-8808-78ff4b4d3a1d';
const NEW_ORG = '3b6494cb-8248-47d1-a5f2-65ff7ca9b8a8';

export const POST: APIRoute = async ({ request }) => {
    const rawBody = await request.text();
    // Resolve organization from the verified endpoint secret, never from payload metadata.
    const [oldValid, newValid] = await Promise.all([
        verifyPolarSignature(rawBody, request.headers, POLAR_WEBHOOK_SECRET, true),
        verifyPolarSignature(rawBody, request.headers, POLAR_WEBHOOK_SECRET_NEW),
    ]);
    if (oldValid === newValid) return new Response('Unauthorized', { status: 401 });
    const organizationId = newValid ? NEW_ORG : OLD_ORG;
    let event: { type: string; timestamp?: string; data: Record<string, any> };
    try { event = JSON.parse(rawBody); } catch { return new Response('Invalid JSON', { status: 400 }); }
    if (!event || typeof event.type !== 'string' || !event.data || typeof event.data !== 'object') {
        return new Response('Invalid event', { status: 400 });
    }
    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const notify = (key: string, payload: { text: string }) => {
        if (!SLACK_WEBHOOK_URL) console.info('[Polar webhook] optional Slack notifications disabled');
        return deliverPolarNotification(
            (name, args) => supabase.rpc(name, args), organizationId, key, payload,
            message => postSlack(SLACK_WEBHOOK_URL, message), Boolean(SLACK_WEBHOOK_URL),
        );
    };
    const retryNotification = () => new Response('Notification delivery pending', { status: 503, headers: { 'Retry-After': '60' } });
    if (event.type === 'order.paid') {
        if (typeof event.data.id !== 'string' || !event.data.id) return new Response('Invalid order', { status: 400 });
        const sent = await notify(`${event.type}:${event.data.id}`, polarPaymentMessage(event.type, event.data, polarUserId(event.data)));
        return sent ? new Response(null, { status: 200 }) : retryNotification();
    }
    if (!['subscription.created', 'subscription.active', 'subscription.updated', 'subscription.canceled', 'subscription.revoked', 'subscription.uncanceled'].includes(event.type)) {
        return new Response(null, { status: 200 });
    }
    const data = event.data;
    const products = newValid ? POLAR_PRODUCT_IDS : LEGACY_POLAR_PRODUCT_IDS;
    const knownProduct = Object.values(products).some(id => id && id === data.product_id);
    const product = knownProduct ? resolvePolarProduct(data.product_id) : null;
    let prepared: ReturnType<typeof preparePolarSubscription>;
    try { prepared = preparePolarSubscription(event.type, data, organizationId, Boolean(product)); }
    catch { return new Response('Invalid subscription identity or product', { status: 400 }); }
    const { userId, subscription } = prepared;
    const signedTimestamp = request.headers.get('webhook-timestamp');
    const eventAt = event.timestamp ?? (signedTimestamp ? new Date(Number(signedTimestamp) * 1000).toISOString() : null);
    if (!eventAt || !Number.isFinite(Date.parse(eventAt))) return new Response('Invalid event timestamp', { status: 400 });
    const { error } = await supabase.rpc('apply_polar_subscription_event', {
        p_org_id: organizationId,
        p_event_id: request.headers.get('webhook-id'),
        p_event_at: eventAt,
        p_user_id: userId,
        p_customer_id: data.customer_id,
        p_subscription: subscription,
        p_plan: product?.plan ?? null,
    });
    if (error) {
        // Do not log raw requests, credentials, or provider response bodies.
        console.error('[Polar webhook] billing transaction failed', error.code);
        await Promise.all([
            captureServerException(new Error('Polar billing transaction failed'), SENTRY_DSN, { tags: { component: 'polar-webhook', event_type: event.type } }),
            postSlack(SLACK_WEBHOOK_URL, { text: `*Polar webhook error*\n• event: ${event.type}\n• billing transaction failed` }),
        ]);
        return new Response('Internal error', { status: 500 });
    }
    if (event.type === 'subscription.created') {
        const sent = await notify(`${event.type}:${data.id}`, polarPaymentMessage(event.type, data, userId, product?.plan, product?.market));
        if (!sent) return retryNotification();
    }
    return new Response(null, { status: 200 });
};
