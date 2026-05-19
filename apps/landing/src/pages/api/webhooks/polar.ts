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

  // polar_whs_ prefix 제거 후 base64url → base64 변환
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

  // "v1,<sig1> v1,<sig2>" 형식 처리
  return msgSignature.split(' ').some((s) => s.split(',')[1] === computed);
}

function getSupabase() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function findUserId(
  supabase: ReturnType<typeof getSupabase>,
  metadata: Record<string, string> | undefined,
  customerEmail: string | undefined
): Promise<string | null> {
  // 1) checkout link 에 붙인 metadata[user_id] 우선
  if (metadata?.user_id) return metadata.user_id;

  // 2) 이메일로 auth.users 조회 (metadata 미전달 시 폴백)
  if (customerEmail) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id',
        (await supabase.auth.admin.getUserByEmail(customerEmail)).data.user?.id ?? ''
      )
      .single();
    if (data?.id) return data.id;
  }

  return null;
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const secret = import.meta.env.POLAR_WEBHOOK_SECRET;

  if (!secret) return new Response('Webhook secret not configured', { status: 500 });

  const valid = await verifySignature(rawBody, request.headers, secret);
  if (!valid) return new Response('Unauthorized', { status: 401 });

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { type, data } = event;
  const supabase = getSupabase();

  console.log(`[Polar webhook] ${type}`);

  try {
    switch (type) {
      case 'subscription.created':
      case 'subscription.active': {
        const meta = data.metadata as Record<string, string> | undefined;
        const email = (data.customer as { email?: string } | undefined)?.email;
        const userId = await findUserId(supabase, meta, email);
        if (!userId) {
          console.error(`[Polar webhook] ${type}: user_id not found`, { meta, email });
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
        // 취소됨 — 구독은 기간 끝까지 유지, plan은 아직 'pro'
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
        // 즉시 종료 — plan을 free로 다운그레이드
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            ends_at: data.ends_at as string | null,
            updated_at: new Date().toISOString(),
          })
          .eq('polar_subscription_id', data.id as string);

        // user_id는 DB에서 역조회
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
        break;
      }
    }
  } catch (err) {
    console.error(`[Polar webhook] handler error for ${type}:`, err);
    return new Response('Internal error', { status: 500 });
  }

  return new Response(null, { status: 200 });
};
