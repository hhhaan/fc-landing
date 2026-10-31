const OPAQUE = /^fcmcp_at_[A-Za-z0-9_-]{43}$/;
const REFRESH = /^fcmcp_rt_[A-Za-z0-9_-]{43}$/;
type NativeClient = {
    auth: {
        getUser(): Promise<{
            data: { user: { id: string; email?: string; is_anonymous?: boolean } | null };
            error: unknown;
        }>;
        getSession(): Promise<{ data: { session: { access_token: string } | null }; error: unknown }>;
    };
};
function backendUrl(project: string, action: string) {
    const base = new URL(project);
    if (
        base.protocol !== 'https:' ||
        base.username ||
        base.password ||
        base.search ||
        base.hash ||
        base.pathname !== '/'
    )
        throw new Error('Invalid identity backend');
    return new URL(`/functions/v1/firstcrack-oauth/${action}`, base);
}
async function limitedText(request: Request | Response) {
    const reader = request.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const part = await reader.read();
            if (part.done) break;
            size += part.value.byteLength;
            if (size > 16384) {
                await reader.cancel();
                throw new Error('Issuer response exceeds limit');
            }
            chunks.push(part.value);
        }
    } finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of chunks) {
        bytes.set(part, offset);
        offset += part.byteLength;
    }
    return new TextDecoder().decode(bytes);
}

/** First-party bearer proof goes only to the project's fixed internal consent endpoint. */
export function issuerConsentClient(native: NativeClient, project: string, fetcher: typeof fetch = fetch) {
    const internal = async (action: string, query?: URLSearchParams, body?: Record<string, unknown>) => {
        const session = await native.auth.getSession();
        if (session.error || !session.data.session) return { data: null, error: true };
        const url = backendUrl(project, action);
        if (query) url.search = query.toString();
        const response = await fetcher(url, {
            method: body ? 'POST' : 'GET',
            // Workers throw on redirect:"error" before sending. manual surfaces 3xx so it is not followed.
            redirect: 'manual',
            headers: {
                Authorization: `Bearer ${session.data.session.access_token}`,
                ...(body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (response.status >= 300 && response.status < 400) return { data: null, error: true };
        const data = JSON.parse(await limitedText(response));
        return { data: response.ok ? data : null, error: !response.ok };
    };
    return {
        getUser: () => native.auth.getUser(),
        getDetails: (id: string) => internal('details', new URLSearchParams({ authorization_id: id })),
        decide: (id: string, decision: 'approve' | 'deny', owner?: string) =>
            internal('decision', undefined, {
                authorization_id: id,
                decision,
                ...(owner ? { workspace_owner_id: owner } : {}),
            }),
        getGrants: () => internal('grants'),
        revokeGrant: (id: string) => internal('revoke-grant', undefined, { grant_id: id }),
    };
}

/** Public OAuth forwarding never forwards session cookies or native Authorization headers. */
export async function proxyIssuerRequest(
    request: Request,
    action: string,
    config: {
        enabled: boolean;
        issuer: string;
        project: string;
    },
    fetcher: typeof fetch = fetch,
): Promise<Response> {
    const headers = new Headers({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer' });
    const failure = (status = 503) => Response.json({ error: 'temporarily_unavailable' }, { status, headers });
    if (!config.enabled) return failure();
    try {
        const issuer = new URL(config.issuer);
        if (
            issuer.protocol !== 'https:' ||
            issuer.pathname !== '/oauth/mcp' ||
            issuer.username ||
            issuer.password ||
            issuer.search ||
            issuer.hash
        )
            return failure();
        if (!['metadata', 'authorize', 'token', 'revoke'].includes(action)) return failure(404);
        const get = action === 'metadata' || action === 'authorize';
        if (request.method !== (get ? 'GET' : 'POST')) return failure(405);
        if (!get && request.headers.get('Content-Type')?.split(';')[0] !== 'application/x-www-form-urlencoded')
            return failure(415);
        const target = backendUrl(config.project, action);
        if (action === 'authorize') target.search = new URL(request.url).search;
        const body = get ? undefined : await limitedText(request);
        const response = await fetcher(target, {
            method: get ? 'GET' : 'POST',
            redirect: 'manual',
            headers: {
                Accept: 'application/json',
                ...(!get ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
            },
            body,
        });
        if (action === 'authorize' && response.status === 303) {
            const location = new URL(response.headers.get('Location') ?? '');
            if (location.origin !== issuer.origin || location.pathname !== '/oauth/consent') return failure();
            headers.set('Location', location.href);
            return new Response(null, { status: 303, headers });
        }
        const data = JSON.parse(await limitedText(response));
        if (response.ok && action === 'metadata' && data.issuer !== issuer.href.replace(/\/$/, '')) return failure();
        if (
            response.ok &&
            action === 'token' &&
            (!OPAQUE.test(data.access_token) ||
                !REFRESH.test(data.refresh_token) ||
                data.token_type !== 'Bearer' ||
                data.scope !== 'firstcrack:read' ||
                typeof data.expires_in !== 'number' ||
                data.expires_in <= 0 ||
                data.expires_in > 300)
        )
            return failure();
        if (!response.ok) {
            const allowed = [
                'invalid_request',
                'invalid_client',
                'invalid_grant',
                'unsupported_grant_type',
                'access_denied',
                'temporarily_unavailable',
            ];
            return Response.json(
                { error: allowed.includes(data.error) ? data.error : 'temporarily_unavailable' },
                { status: response.status, headers },
            );
        }
        if (action === 'token')
            return Response.json(
                {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    token_type: data.token_type,
                    expires_in: data.expires_in,
                    scope: data.scope,
                },
                { status: response.status, headers },
            );
        return Response.json(data, { status: response.status, headers });
    } catch {
        return failure();
    }
}
