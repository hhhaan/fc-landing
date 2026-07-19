import type { User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { createClient } from './supabase';

export type TrialCta = {
    href: string;
    label: string;
};

const DEFAULT_CHECKOUT_HREF = '/start-pro?plan=pro-monthly';

/** Primary trial CTA: Polar checkout via /start-pro, or download when subscribed. */
export async function resolveTrialCta(context: {
    request: Request;
    cookies: AstroCookies;
    user: User | null;
}): Promise<TrialCta> {
    if (!context.user) {
        return { href: DEFAULT_CHECKOUT_HREF, label: 'Start 14-day trial' };
    }

    const supabase = createClient({
        request: context.request,
        cookies: context.cookies,
    });

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', context.user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (subscription) {
        return { href: '/download', label: 'Download app' };
    }

    return { href: DEFAULT_CHECKOUT_HREF, label: 'Start 14-day trial' };
}
