import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

async function verifySignature(
  rawBody: string,
  headers: Headers,
  secret: string
): Promise<boolean> {
  const msgId = headers.get('webhook-id');
  const msgTimestamp = headers.get('webhook-timestamp');
  const msgSignature = headers.get('webhook-signature');

  if (!msgId || !msgTimestamp || !msgSignature) return false;

  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(msgTimestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const b64 = secret.replace(/^polar_whs_/, '').replace(/-/g, '+').replace(/_/g, '/');
  const secretBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const toSign = `${msgId}.${msgTimestamp}.${rawBody}`;
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  return msgSignature.split(' ').some((s) => s.split(',')[1] === computed);
}

// service-role 클라이언트 — RLS 우회, 쿠키 없는 서버사이드 전용
function getSupabase() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const secret = import.meta.env.POLAR_WEBHOOK_SECRET;

  if (!secret) return new Response('Webhook secret not configured', { status: 500 });
  if (!await verifySignature(rawBody, request.headers, secret)) {
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
      // created fires once on checkout; active fires when a trial converts to paid.
      // both events mean the subscription is now billable → grant pro access.
      case 'subscription.created':
      case 'subscription.active': {
        if (!userId) {
          console.error(`[Polar webhook] ${type}: user_id missing in metadata`);
          break;
        }

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
            { onConflict: 'polar_subscription_id' }
          ),
          supabase
            .from('profiles')
            .update({ plan: 'pro', polar_customer_id: data.customer_id as string, updated_at: now })
            .eq('id', userId),
        ]);

        if (subResult.error) throw new Error(`subscriptions upsert failed: ${subResult.error.message}`);
        if (profileResult.error) throw new Error(`profiles update failed: ${profileResult.error.message}`);
        break;
      }

      case 'subscription.updated': {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: data.status as string,
            cancel_at_period_end: (data.cancel_at_period_end ?? false) as boolean,
            current_period_start: data.current_period_start as string | null,
            current_period_end: data.current_period_end as string | null,
            ends_at: data.ends_at as string | null,
            updated_at: now,
          })
          .eq('polar_subscription_id', data.id as string);

        if (error) throw new Error(`subscriptions update failed: ${error.message}`);
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
        // update + select in one round-trip to avoid a separate SELECT for the fallback userId
        const { data: updated, error: subError } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: now, ends_at: data.ends_at as string | null, updated_at: now })
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
    return new Response('Internal error', { status: 500 });
  }

  return new Response(null, { status: 200 });
};
