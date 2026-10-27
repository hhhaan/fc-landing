const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CONSENT_COOKIE = 'fc_mcp_consent_csrf';

/** Native Supabase tokens are not an isolated read-only credential for every Auth API. */
export async function decideNativeConsent(
    id: string,
    decision: 'approve' | 'deny',
    deny: (id: string) => Promise<{ data: unknown; error: unknown }>,
): Promise<{ data: unknown; error: unknown }> {
    if (decision === 'approve') return { data: null, error: new Error('Isolated MCP issuer required') };
    return deny(id);
}

export type ConsentPolicy = {
    enabled: boolean;
    readOnlyReady: boolean;
    clientIds: string[];
    redirectUris: string[];
    issuer: string;
    resource: string;
};
type Details = {
    authorization_id: string;
    redirect_uri: string;
    client: { id: string; name: string };
    user: { id: string };
    scope: string;
    issuer: string;
    resource: string;
    credential_kind: string;
    workspaces: { owner_id: string; name: string }[];
};
type ConsentAuth = {
    getUser(): Promise<{
        data: { user: { id: string; email?: string; is_anonymous?: boolean } | null };
        error: unknown;
    }>;
    getDetails(id: string): Promise<{ data: unknown; error: unknown }>;
    decide(id: string, decision: 'approve' | 'deny', owner?: string): Promise<{ data: unknown; error: unknown }>;
};
export type ConsentState =
    | { kind: 'unavailable'; status: number; message: string }
    | { kind: 'login'; location: string }
    | { kind: 'redirect'; location: string }
    | {
          kind: 'review';
          authorizationId: string;
          clientName: string;
          workspaceOwnerId: string;
          accountLabel: string;
          redirectUri: string;
          workspaces: { owner_id: string; name: string }[];
      };

const unavailable = (status = 503): ConsentState => ({
    kind: 'unavailable',
    status,
    message:
        status === 503
            ? 'This connection is not available yet. No access has been granted.'
            : 'This connection request could not be verified. Start a new connection.',
});

function allowedRedirect(value: unknown, registered: string[]): value is string {
    if (typeof value !== 'string') return false;
    try {
        const target = new URL(value);
        if (target.protocol !== 'https:' || target.username || target.password || target.hash) return false;
        return registered.some((uri) => {
            const expected = new URL(uri);
            return (
                expected.protocol === 'https:' &&
                !expected.username &&
                !expected.password &&
                !expected.hash &&
                target.origin === expected.origin &&
                target.pathname === expected.pathname &&
                [...expected.searchParams].every(([key, val]) => target.searchParams.get(key) === val) &&
                [...target.searchParams.keys()].every(
                    (key) =>
                        expected.searchParams.has(key) ||
                        ['code', 'state', 'error', 'error_description', 'error_uri', 'iss'].includes(key),
                )
            );
        });
    } catch {
        return false;
    }
}

/** Uses existing SSR cookies; it never signs in, signs out, stores tokens or approves access on GET. */
export async function handleMcpConsent(
    request: Request,
    auth: ConsentAuth,
    policy: ConsentPolicy,
    csrfCookie?: string,
    form?: FormData,
): Promise<ConsentState> {
    if (!policy.enabled || !policy.readOnlyReady || !policy.clientIds.length || !policy.redirectUris.length)
        return unavailable();
    const url = new URL(request.url);
    const id = url.searchParams.get('authorization_id');
    if (!id || !UUID.test(id)) return unavailable(400);
    if (!['GET', 'POST'].includes(request.method)) return unavailable(405);
    if (request.method === 'POST') {
        if (
            request.headers.get('Origin') !== url.origin ||
            !csrfCookie ||
            form?.get('csrf') !== csrfCookie ||
            !csrfCookie.startsWith(`${id}.`) ||
            !['approve', 'deny'].includes(String(form.get('decision')))
        )
            return unavailable(403);
    }
    try {
        const identity = await auth.getUser();
        const user = identity.data.user;
        if (identity.error || !user || user.is_anonymous) {
            return {
                kind: 'login',
                location: `/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${id}`)}`,
            };
        }
        const response = await auth.getDetails(id);
        if (response.error || !response.data || typeof response.data !== 'object') return unavailable(400);
        // Do not follow an automatically approved grant without a fresh review of its client and user.
        if ('redirect_url' in response.data) return unavailable(409);
        const details = response.data as Details;
        if (
            details.authorization_id !== id ||
            details.user?.id !== user.id ||
            !policy.clientIds.includes(details.client?.id) ||
            typeof details.client?.name !== 'string' ||
            !policy.redirectUris.includes(details.redirect_uri) ||
            !allowedRedirect(details.redirect_uri, policy.redirectUris) ||
            details.scope !== 'firstcrack:read' ||
            details.issuer !== policy.issuer ||
            details.resource !== policy.resource ||
            details.credential_kind !== 'mcp_opaque_v1' ||
            !Array.isArray(details.workspaces) ||
            !details.workspaces.length ||
            details.workspaces.some((workspace) => !UUID.test(workspace.owner_id) || typeof workspace.name !== 'string')
        )
            return unavailable(403);
        if (request.method === 'GET')
            return {
                kind: 'review',
                authorizationId: id,
                clientName: details.client.name,
                workspaceOwnerId: user.id,
                accountLabel: user.email ?? user.id,
                redirectUri: details.redirect_uri,
                workspaces: details.workspaces,
            };
        const decision = form?.get('decision') === 'approve' ? 'approve' : 'deny';
        const owner = form?.get('workspace_owner_id');
        if (
            decision === 'approve' &&
            (typeof owner !== 'string' || !details.workspaces.some((workspace) => workspace.owner_id === owner))
        )
            return unavailable(403);
        const result = await auth.decide(id, decision, typeof owner === 'string' ? owner : undefined);
        const redirect =
            result.data && typeof result.data === 'object' && 'redirect_url' in result.data
                ? result.data.redirect_url
                : null;
        if (result.error || !allowedRedirect(redirect, [details.redirect_uri])) return unavailable(400);
        return { kind: 'redirect', location: redirect };
    } catch {
        return unavailable();
    }
}
