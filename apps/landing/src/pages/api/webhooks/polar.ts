import { PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { POLAR_WEBHOOK_SECRET, SENTRY_DSN, SLACK_WEBHOOK_URL, SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';
import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';
import type { BillingMarket } from '../../../lib/market';
import {
    normalizeMarketFromMetadata,
    normalizePlanFromMetadata,
    type PolarPlan,
    resolvePolarProduct,
} from '../../../lib/polarProductCatalog';
import { captureServerException } from '../../../lib/sentryServer';
import { postSlack, sanitizeSlackField } from '../../../lib/slack';

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

async function verifySignature(rawBody: string, headers: Headers, secret: string): Promise<boolean> {
    const msgId = headers.get('webhook-id');
    const msgTimestamp = headers.get('webhook-timestamp');
    const msgSignature = headers.get('webhook-signature');

    if (!msgId || !msgTimestamp || !msgSignature) return false;

    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(msgTimestamp, 10);
    if (Number.isNaN(ts) || Math.abs(now - ts) > TIMESTAMP_TOLERANCE_SECONDS) return false;

    const b64 = secret
        .replace(/^polar_whs_/, '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const secretBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

    const toSign = `${msgId}.${msgTimestamp}.${rawBody}`;
    const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

    return msgSignature.split(' ').some((s) => s.split(',')[1] === computed);
}

function getSupabase() {
    return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function resolveProfileFromSubscription(
    data: Record<string, unknown>,
    meta: Record<string, string> | undefined,
): { plan: PolarPlan; countryCode: BillingMarket | null } {
    const productId = data.product_id as string | undefined;
    const resolved = resolvePolarProduct(productId);

    const plan = resolved?.plan ?? normalizePlanFromMetadata(meta?.plan) ?? 'pro';

    const countryCode = resolved?.market ?? normalizeMarketFromMetadata(meta?.market) ?? null;

    if (!resolved && productId) {
        console.warn(
            `[Polar webhook] unknown product_id ${productId} — fallback plan=${plan} market=${countryCode ?? 'null'}`,
        );
    }

    return { plan, countryCode };
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
    if (amount === null || amount === undefined) return '—';
    const cur = (currency ?? 'usd').toUpperCase();
    // Polar amounts are typically minor units (cents)
    const major = amount / 100;
    return `${cur} ${major.toFixed(2)}`;
}

async function notifyPaymentSlack(opts: {
    title: string;
    userId: string | undefined;
    plan?: string;
    status?: string;
    amount?: number | null;
    currency?: string | null;
    interval?: string | null;
    market?: string | null;
    eventType: string;
    extraLines?: string[];
}): Promise<void> {
    const lines = [
        `*${opts.title}*`,
        `• event: \`${sanitizeSlackField(opts.eventType)}\``,
        `• user: \`${sanitizeSlackField(opts.userId ?? 'unknown')}\``,
        ...(opts.plan ? [`• plan: \`${sanitizeSlackField(opts.plan)}\``] : []),
        ...(opts.status ? [`• status: \`${sanitizeSlackField(opts.status)}\``] : []),
        `• amount: \`${sanitizeSlackField(formatMoney(opts.amount, opts.currency))}\``,
        ...(opts.interval ? [`• interval: \`${sanitizeSlackField(opts.interval)}\``] : []),
        ...(opts.market ? [`• market: \`${sanitizeSlackField(opts.market)}\``] : []),
        ...(opts.extraLines ?? []),
    ];
    await postSlack(SLACK_WEBHOOK_URL, { text: lines.join('\n') });
}

export const POST: APIRoute = async ({ request }) => {
    const rawBody = await request.text();

    if (!(await verifySignature(rawBody, request.headers, POLAR_WEBHOOK_SECRET))) {
        return new Response('Unauthorized', { status: 401 });
    }

    let event: { type: string; data: Record<string, unknown> };
    try {
        event = JSON.parse(rawBody);
    } catch {
        return new Response('Invalid JSON', { status: 400 });
    }

    const { type, data } = event;
    const meta = data.metadata as Record<string, string> | undefined;
    const userId = meta?.user_id;

    console.log(`[Polar webhook] ${type} | user_id: ${userId ?? 'unknown'}`);

    const supabase = getSupabase();
    const now = new Date().toISOString();

    try {
        switch (type) {
            case 'subscription.created':
            case 'subscription.active': {
                if (!userId) {
                    console.error(`[Polar webhook] ${type}: user_id missing in metadata`);
                    await postSlack(SLACK_WEBHOOK_URL, {
                        text: `*Polar webhook warning*\n• event: \`${sanitizeSlackField(type)}\`\n• missing \`user_id\` in metadata`,
                    });
                    break;
                }

                const { plan, countryCode } = resolveProfileFromSubscription(data, meta);
                console.log(`[Polar webhook] grant plan=${plan} country_code=${countryCode ?? 'null'}`);

                const [subResult, profileResult] = await Promise.all([
                    supabase.from('subscriptions').upsert(
                        {
                            user_id: userId,
                            polar_subscription_id: data.id as string,
                            polar_product_id: data.product_id as string,
                            polar_checkout_id: data.checkout_id as string | null,
                            status: data.status as string,
                            amount: data.amount as number | null,
                            currency: data.currency as string | null,
                            recurring_interval: data.recurring_interval as string | null,
                            current_period_start: data.current_period_start as string | null,
                            current_period_end: data.current_period_end as string | null,
                            cancel_at_period_end: (data.cancel_at_period_end ?? false) as boolean,
                            started_at: data.started_at as string | null,
                            trial_end: data.trial_end_at as string | null,
                            updated_at: now,
                        },
                        { onConflict: 'polar_subscription_id' },
                    ),
                    supabase
                        .from('profiles')
                        .update({
                            plan,
                            country_code: countryCode,
                            polar_customer_id: data.customer_id as string,
                            updated_at: now,
                        })
                        .eq('id', userId),
                ]);

                if (subResult.error) throw new Error(`subscriptions upsert failed: ${subResult.error.message}`);
                if (profileResult.error) throw new Error(`profiles update failed: ${profileResult.error.message}`);

                // Canonical new-sub notify: subscription.created only (avoid double with active).
                // Recurring charges: order.paid below.
                if (type === 'subscription.created') {
                    const status = (data.status as string) ?? '';
                    const isTrial = status === 'trialing' || Boolean(data.trial_end_at);
                    await notifyPaymentSlack({
                        title: isTrial ? 'Subscription trial started' : 'Payment / subscription',
                        userId,
                        plan,
                        status,
                        amount: data.amount as number | null,
                        currency: data.currency as string | null,
                        interval: data.recurring_interval as string | null,
                        market: countryCode,
                        eventType: type,
                    });
                }
                break;
            }

            case 'order.paid': {
                // Recurring charges / one-off paid orders
                const orderMeta = data.metadata as Record<string, string> | undefined;
                const orderUserId = orderMeta?.user_id ?? userId;
                const amount = (data.amount as number | undefined) ?? (data.total_amount as number | undefined) ?? null;
                const currency = (data.currency as string | undefined) ?? null;
                await notifyPaymentSlack({
                    title: 'Payment received (order.paid)',
                    userId: orderUserId,
                    amount,
                    currency,
                    status: (data.status as string) ?? 'paid',
                    eventType: type,
                    extraLines: data.product_id
                        ? [`• product: \`${sanitizeSlackField(String(data.product_id))}\``]
                        : undefined,
                });
                break;
            }

            case 'subscription.updated': {
                const productId = data.product_id as string | undefined;
                const { plan, countryCode } = resolveProfileFromSubscription(data, meta);

                const subUpdate: Record<string, unknown> = {
                    status: data.status as string,
                    cancel_at_period_end: (data.cancel_at_period_end ?? false) as boolean,
                    current_period_start: data.current_period_start as string | null,
                    current_period_end: data.current_period_end as string | null,
                    ends_at: data.ends_at as string | null,
                    updated_at: now,
                };
                if (productId) subUpdate.polar_product_id = productId;

                const { error: subError } = await supabase
                    .from('subscriptions')
                    .update(subUpdate)
                    .eq('polar_subscription_id', data.id as string);

                if (subError) throw new Error(`subscriptions update failed: ${subError.message}`);

                if (userId && productId && (data.status === 'active' || data.status === 'trialing')) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update({
                            plan,
                            country_code: countryCode,
                            updated_at: now,
                        })
                        .eq('id', userId);

                    if (profileError) throw new Error(`profiles update failed: ${profileError.message}`);
                }
                break;
            }

            case 'subscription.canceled': {
                const { error } = await supabase
                    .from('subscriptions')
                    .update({
                        status: 'canceled',
                        cancel_at_period_end: true,
                        canceled_at: data.canceled_at as string | null,
                        ends_at: data.ends_at as string | null,
                        updated_at: now,
                    })
                    .eq('polar_subscription_id', data.id as string);

                if (error) throw new Error(`subscriptions update failed: ${error.message}`);
                break;
            }

            case 'subscription.revoked': {
                const { data: updated, error: subError } = await supabase
                    .from('subscriptions')
                    .update({
                        status: 'canceled',
                        canceled_at: now,
                        ends_at: data.ends_at as string | null,
                        updated_at: now,
                    })
                    .eq('polar_subscription_id', data.id as string)
                    .select('user_id')
                    .single();

                if (subError) throw new Error(`subscriptions update failed: ${subError.message}`);

                const resolvedUserId = userId ?? updated?.user_id;
                if (resolvedUserId) {
                    const { error } = await supabase
                        .from('profiles')
                        .update({ plan: 'free', updated_at: now })
                        .eq('id', resolvedUserId);
                    if (error) throw new Error(`profiles update failed: ${error.message}`);
                }
                break;
            }

            default:
                console.log(`[Polar webhook] unhandled event type: ${type}`);
        }
    } catch (err) {
        console.error(`[Polar webhook] error handling ${type}:`, err);
        await Promise.all([
            captureServerException(err, SENTRY_DSN, {
                tags: { component: 'polar-webhook', event_type: type },
                extra: { userId: userId ?? null },
            }),
            postSlack(SLACK_WEBHOOK_URL, {
                text: [
                    '*Polar webhook error*',
                    `• event: \`${sanitizeSlackField(type)}\``,
                    `• user: \`${sanitizeSlackField(userId ?? 'unknown')}\``,
                    `• error: \`${sanitizeSlackField(err instanceof Error ? err.message : String(err))}\``,
                ].join('\n'),
            }),
        ]);
        return new Response('Internal error', { status: 500 });
    }

    return new Response(null, { status: 200 });
};
