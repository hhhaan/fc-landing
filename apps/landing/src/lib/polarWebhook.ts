/** Verify Standard Webhooks (whsec_ base64) and historical Polar encodings. */
export async function verifyPolarSignature(body: string, headers: Headers, secret?: string, allowLegacy = false): Promise<boolean> {
    if (!secret) return false;
    const id = headers.get('webhook-id');
    const timestamp = headers.get('webhook-timestamp');
    const signatures = headers.get('webhook-signature');
    if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false;
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
    const encoded = secret.replace(allowLegacy ? /^(whsec_|polar_whs_)/ : /^whsec_/, '').replace(/-/g, '+').replace(/_/g, '/');
    const keys: Uint8Array[] = [];
    try { keys.push(Uint8Array.from(atob(encoded), c => c.charCodeAt(0))); } catch { /* non-base64 historical secret */ }
    // Polar SDK historically signs with the UTF-8 secret itself.
    if (allowLegacy) keys.push(new TextEncoder().encode(secret));
    for (const bytes of keys) {
        const key = await crypto.subtle.importKey('raw', new Uint8Array(bytes).buffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
        for (const signature of signatures.split(/\s+/)) {
            const [version, value] = signature.split(',');
            if (version !== 'v1' || !value) continue;
            try {
                const decoded = Uint8Array.from(atob(value), c => c.charCodeAt(0));
                if (await crypto.subtle.verify('HMAC', key, decoded, new TextEncoder().encode(`${id}.${timestamp}.${body}`))) return true;
            } catch { /* invalid candidate */ }
        }
    }
    return false;
}
export function polarUserId(data: Record<string, any>): string | null {
    const external = data.customer?.external_id;
    const metadata = data.metadata?.user_id;
    if (external && metadata && external !== metadata) return null;
    const id = external ?? metadata;
    return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

/** Missing identity may be resolved only by the service-role RPC's stored customer mapping. */
export function preparePolarSubscription(type: string, data: Record<string, any>, organizationId: string, knownProduct: boolean): { userId: string | null; subscription: Record<string, any> } {
    const userId = polarUserId(data);
    const external = data.customer?.external_id;
    const metadata = data.metadata?.user_id;
    if (!userId && (external != null || metadata != null)) throw new Error('Invalid or conflicting identity');
    if (typeof data.id !== 'string' || !data.id || typeof data.customer_id !== 'string' || !data.customer_id) throw new Error('Missing subscription/customer ID');
    if (data.product?.organization_id && data.product.organization_id !== organizationId) throw new Error('Organization mismatch');
    const subscription = { ...data };
    if (type === 'subscription.revoked') subscription.status = 'revoked';
    if (type === 'subscription.canceled') { subscription.status = 'canceled'; subscription.cancel_at_period_end = true; }
    if (type === 'subscription.uncanceled') subscription.cancel_at_period_end = false;
    if (!knownProduct && !['revoked', 'ended'].includes(subscription.status)) throw new Error('Unsupported product');
    if (type === 'subscription.revoked') subscription.ended_at = data.ended_at ?? data.ends_at;
    if (data.trial_end_at !== undefined && data.trial_end === undefined) subscription.trial_end = data.trial_end_at;
    return { userId, subscription };
}
