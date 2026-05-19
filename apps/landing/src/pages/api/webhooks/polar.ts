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

  try {
    switch (type) {
      case 'subscription.created':
      case 'subscription.active': {
        if (!userId) {
          console.error(`[Polar webhook] ${type}: user_id missing in metadata`);
          break;
        }

        await supabase.from('subscriptions').upsert(
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
            cancel_at_period_end: (data.cancel_at_period_end as boolean) ?? false,
            started_at: data.started_at as string | null,
            trial_end: data.trial_end_at as string | null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'polar_subscription_id' }
        );

        await supabase
          .from('profiles')
          .update({
            plan: 'pro',
            polar_customer_id: data.customer_id as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        break;
      }

      case 'subscription.updated': {
        await supabase
          .from('subscriptions')
          .update({
            status: data.status as string,
            cancel_at_period_end: (data.cancel_at_period_end as boolean) ?? false,
            current_period_start: data.current_period_start as string | null,
            current_period_end: data.current_period_end as string | null,
            ends_at: data.ends_at as string | null,
            updated_at: new Date().toISOString(),
          })
          .eq('polar_subscription_id', data.id as string);
        break;
      }

      case 'subscription.canceled': {
        // 기간 끝까지 유지, plan은 아직 pro
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
            canceled_at: data.canceled_at as string | null,
            ends_at: data.ends_at as string | null,
            updated_at: new Date().toISOString(),
          })
          .eq('polar_subscription_id', data.id as string);
        break;
      }

      case 'subscription.revoked': {
        // 즉시 종료 → plan을 free로
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            ends_at: data.ends_at as string | null,
            updated_at: new Date().toISOString(),
          })
          .eq('polar_subscription_id', data.id as string);

        if (userId) {
          await supabase
            .from('profiles')
            .update({ plan: 'free', updated_at: new Date().toISOString() })
            .eq('id', userId);
        } else {
          // metadata 없으면 subscription DB에서 역조회
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('polar_subscription_id', data.id as string)
            .single();
          if (sub?.user_id) {
            await supabase
              .from('profiles')
              .update({ plan: 'free', updated_at: new Date().toISOString() })
              .eq('id', sub.user_id);
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[Polar webhook] error handling ${type}:`, err);
    return new Response('Internal error', { status: 500 });
  }

  return new Response(null, { status: 200 });
};
