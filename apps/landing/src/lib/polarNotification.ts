type RpcResult = { data: unknown; error: unknown };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

/** Durable shared claim; never acknowledge an undelivered notification. */
export async function deliverPolarNotification(
    rpc: Rpc,
    orgId: string,
    eventKey: string,
    payload: { text: string },
    send: (payload: { text: string }) => Promise<boolean>,
    enabled = true,
): Promise<boolean> {
    // Slack was always optional. Disabled integration must not enqueue impossible deliveries.
    if (!enabled) return true;
    const args = { p_org_id: orgId, p_event_id: eventKey };
    const claim = await rpc('claim_polar_notification', { ...args, p_payload: payload });
    if (claim.error) return false;
    const lease = claim.data as { status?: string; lease_id?: string; payload?: { text: string } } | null;
    if (lease?.status === 'sent') return true;
    if (lease?.status !== 'claimed' || !lease.lease_id) return false;
    let sent = false;
    try {
        if (!lease.payload || typeof lease.payload.text !== 'string') throw new Error('Invalid durable payload');
        sent = await send(lease.payload);
    } catch {
        /* release failed delivery for retry */
    }
    const finish = await rpc('finish_polar_notification', { ...args, p_lease_id: lease.lease_id, p_sent: sent });
    return sent && !finish.error && finish.data === true;
}

export function polarPaymentMessage(
    type: string,
    data: Record<string, any>,
    userId: string | null,
    plan?: string,
    market?: string,
): { text: string } {
    const clean = (value: unknown) =>
        String(value ?? 'unknown')
            .replace(/[\r\n`]/g, ' ')
            .trim();
    const trial = data.status === 'trialing' || Boolean(data.trial_end_at);
    const title =
        type === 'order.paid'
            ? 'Payment received (order.paid)'
            : trial
              ? 'Subscription trial started'
              : 'Payment / subscription';
    const amount = data.amount ?? data.total_amount;
    const money =
        typeof amount === 'number'
            ? `${String(data.currency ?? 'usd').toUpperCase()} ${(amount / 100).toFixed(2)}`
            : '—';
    return {
        text: [
            `*${title}*`,
            `• event: \`${clean(type)}\``,
            `• user: \`${clean(userId)}\``,
            ...(plan ? [`• plan: \`${clean(plan)}\``] : []),
            `• status: \`${clean(data.status ?? (type === 'order.paid' ? 'paid' : ''))}\``,
            `• amount: \`${clean(money)}\``,
            ...(data.recurring_interval ? [`• interval: \`${clean(data.recurring_interval)}\``] : []),
            ...(market ? [`• market: \`${clean(market)}\``] : []),
            ...(type === 'order.paid' && data.product_id ? [`• product: \`${clean(data.product_id)}\``] : []),
        ].join('\n'),
    };
}
